import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { nightEnvironment } from './env.js';

// Mirror-smooth lacquer and chrome turn a light into a pinpoint far brighter than a half-float target can hold
// on some (mobile) GPUs: the Inf/NaN then gets smeared over the whole frame by the bloom. Cap direct highlights
// on every lit material (they stay crisp, just finite)...
THREE.ShaderChunk.lights_fragment_end += `
  reflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(4.0));
  #ifdef USE_CLEARCOAT
    clearcoatSpecularDirect = min(clearcoatSpecularDirect, vec3(4.0));
  #endif`;
// ...and scrub whatever still overflows before it reaches the bloom.
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c.rgb)) || any(isinf(c.rgb))) c.rgb = vec3(0.0);
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 24.0), c.a);
    }`,
};

// Final grade: vignette + subtle warm/cool split tone + film grain. Runs before OutputPass (linear HDR).
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.32 }, uFlash: { value: 0 }, uFlashColor: { value: new THREE.Color(1, 0.8, 0.6) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uVignette; uniform float uFlash; uniform vec3 uFlashColor;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 q = vUv - 0.5;
      float v = 1.0 - uVignette * dot(q, q) * 2.6;
      c.rgb *= v;
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(c.rgb, c.rgb * vec3(0.93, 0.97, 1.08), clamp(0.6 - l, 0.0, 0.6) * 0.5); // cool shadows
      c.rgb += uFlashColor * uFlash * 0.07 * (0.4 + l);
      c.rgb += (hash(vUv * 1000.0 + uTime) - 0.5) * 0.012;
      gl_FragColor = c;
    }`,
};

// phones and tablets start one step down: the retina pixel count costs far more than it shows
export function autoQuality() {
  const touch = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(screen.width, screen.height) < 820;
  return touch || small ? 'medium' : 'high';
}

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05040a);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.02, 20);

    this.scene.environment = nightEnvironment(renderer);
    this.scene.environmentIntensity = 1.0;

    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, rt);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(new ShaderPass(SanitizeShader));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.62, 0.42, 1.55);
    this.composer.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
    this.quality = 'high';
    window.addEventListener('resize', () => this.resize());
    if (window.ResizeObserver) new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }
  // 'auto' picks a level for the device; the game may lower autoLevel later if frames stay slow
  setQuality(q) {
    if (q === 'auto') q = this.autoLevel ||= autoQuality();
    this.quality = q;
    this.renderer.setPixelRatio(this._pixelRatio());
    this.renderer.shadowMap.enabled = q !== 'low';
    this.bloom.enabled = q !== 'low';
    this.resize();
  }
  _pixelRatio() {
    const q = this.quality;
    return q === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : 1.5);
  }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    // a minimised or hidden window reports 0x0: keep the last valid size instead of zero-sized targets
    if (w < 2 || h < 2) { this.zeroSize = true; return; }
    this.zeroSize = false;
    // the window may have moved to a screen with another pixel density (or the page was zoomed)
    if (this._pixelRatio() !== this.renderer.getPixelRatio()) this.renderer.setPixelRatio(this._pixelRatio());
    // window resize and the ResizeObserver both land here: reallocate the render targets only on a real change
    const pr = this.renderer.getPixelRatio(), key = `${w}x${h}@${pr}`;
    if (key === this._sizeKey) return;
    this._sizeKey = key;
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.onResize && this.onResize(w, h);
  }
  render(dt, t) {
    // moving the window to another screen changes the pixel density without always firing a resize
    if (this._pixelRatio() !== this.renderer.getPixelRatio()) this.resize();
    if (this.zeroSize) return;
    this.grade.uniforms.uTime.value = t % 100;
    this.composer.render(dt);
  }
}
