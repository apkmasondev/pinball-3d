import * as THREE from 'three';
import { setTV } from './util.js';
import APRON_EDGE from '../apron_edge.json';

// y of the apron's lip at table-x (the drain gap runs in front of it); null outside the apron
function apronEdge(x) {
  const E = APRON_EDGE;
  if (x < E[0][0] || x > E[E.length - 1][0]) return null;
  let i = 1; while (i < E.length - 1 && E[i][0] < x) i++;
  const a = E[i - 1], b = E[i], t = (x - a[0]) / (b[0] - a[0] || 1);
  return a[1] + (b[1] - a[1]) * t;
}

// Chrome balls with a live cube-map reflection of the table and a soft contact shadow.
export class BallsView {
  constructor(stage, tableRoot, radius) {
    this.stage = stage; this.root = tableRoot; this.r = radius;
    this.cubeRT = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
    this.cubeCam = new THREE.CubeCamera(0.005, 3, this.cubeRT);
    stage.scene.add(this.cubeCam);
    // prefilter the live cube map ourselves (outside the post-processing passes)
    this.pmrem = new THREE.PMREMGenerator(stage.renderer);
    this.pmremRT = this.pmrem.fromCubemap(this.cubeRT.texture);
    this.geo = new THREE.SphereGeometry(radius, 40, 28);
    this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.05, envMap: this.pmremRT.texture, envMapIntensity: 1.5 });
    // a mirror-polished sphere turns the key light into a tiny, enormously bright point that bloom smears over
    // the whole ball; cap the direct highlight so it stays a crisp glint and the ball reads as chrome
    this.mat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>',
        '#include <lights_fragment_end>\n\treflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(2.5));');
    };
    this.mat.customProgramCacheKey = () => 'ball-chrome';
    this.meshes = new Map();
    // contact shadow
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32);
    grd.addColorStop(0, 'rgba(0,0,0,0.85)'); grd.addColorStop(0.45, 'rgba(0,0,0,0.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    this.shadowTex = new THREE.CanvasTexture(c);
    this.shadowMat = new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, opacity: 0.8 });
    this.shadowGeo = new THREE.PlaneGeometry(radius * 3.2, radius * 3.2).rotateX(-Math.PI / 2);
    this.frame = 0;
    this._q = new THREE.Quaternion();
    this._qt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    this._wp = new THREE.Vector3();
  }
  sync(balls, dt) {
    const seen = new Set();
    for (const b of balls) {
      seen.add(b.id);
      let e = this.meshes.get(b.id);
      if (!e) {
        const mesh = new THREE.Mesh(this.geo, this.mat); mesh.castShadow = true;
        const sh = new THREE.Mesh(this.shadowGeo, this.shadowMat.clone()); sh.renderOrder = 2;
        this.root.add(mesh, sh);
        e = { mesh, sh };
        this.meshes.set(b.id, e);
      }
      // past the apron lip a draining ball drops through the gap and out of sight
      let sink = 0;
      if (b.mode === 'field') {
        const ey = apronEdge(b.x);
        if (ey !== null && b.y < ey + this.r * 1.05) sink = Math.min(0.08, (ey + this.r * 1.05 - b.y) * 2.6);
      }
      setTV(e.mesh.position, b.x, b.y, b.z + this.r - sink);
      // ball quaternion is in table coords (x,y,z-up); convert to three local (x,z,-y)
      const q = b.q;
      e.mesh.quaternion.set(q[0], q[2], -q[1], q[3]);
      const hidden = b.mode === 'captured' && b.z < -this.r * 0.5;
      e.vis = !hidden && b.mode !== 'trough' && sink < this.r * 2.2; e.mesh.visible = e.vis;
      const onField = b.mode === 'field' || b.mode === 'captured';
      e.sh.visible = e.mesh.visible && sink === 0 && (onField || b.z < 0.12);
      const zf = onField ? Math.max(0, b.z) : b.z;
      setTV(e.sh.position, b.x + 0.004, b.y + 0.006, onField ? 0.0008 : Math.max(0.0008, b.z - this.r * 0.9) * 0 + 0.0008);
      const s = 1 + zf * 18;
      e.sh.scale.set(s, 1, s);
      e.sh.material.opacity = onField ? 0.8 / s : 0.35;
    }
    for (const [id, e] of this.meshes) if (!seen.has(id)) { this.root.remove(e.mesh, e.sh); e.sh.material.dispose(); this.meshes.delete(id); }
  }
  updateReflection(renderer, scene) {
    // refresh the cube map every other frame at the first ball's position
    this.frame++;
    if (this.frame % 2) return;
    const first = this.meshes.values().next().value;
    if (!first) return;
    first.mesh.getWorldPosition(this._wp);
    this.cubeCam.position.copy(this._wp);
    for (const e of this.meshes.values()) e.mesh.visible = false;
    // above the table the capture would only see the black room: let the reflection pick up the
    // soft night environment instead (moon panel, backbox glow), as a real ball mirrors the arcade around it
    const bg = scene.background, bgI = scene.backgroundIntensity, bgB = scene.backgroundBlurriness;
    scene.background = scene.environment; scene.backgroundIntensity = 2.4; scene.backgroundBlurriness = 0.15;
    this.cubeCam.update(renderer, scene);
    scene.background = bg; scene.backgroundIntensity = bgI; scene.backgroundBlurriness = bgB;
    this.pmrem.fromCubemap(this.cubeRT.texture, this.pmremRT);
    renderer.setRenderTarget(null);
    for (const e of this.meshes.values()) e.mesh.visible = e.vis;
  }
}
