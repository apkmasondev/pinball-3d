import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { nightEnvironment } from './env.js';

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
  setQuality(q) {
    this.quality = q;
    const pr = q === 'low' ? 1 : Math.min(window.devicePixelRatio, q === 'high' ? 2 : 1.5);
    this.renderer.setPixelRatio(pr);
    this.renderer.shadowMap.enabled = q !== 'low';
    this.bloom.enabled = q !== 'low';
    this.resize();
  }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    // a minimised or hidden window reports 0x0: keep the last valid size instead of zero-sized targets
    if (w < 2 || h < 2) { this.zeroSize = true; return; }
    this.zeroSize = false;
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.onResize && this.onResize(w, h);
  }
  render(dt, t) {
    if (this.zeroSize) return;
    this.grade.uniforms.uTime.value = t % 100;
    this.composer.render(dt);
  }
}
