import * as THREE from 'three';
import { damp } from './util.js';

// Camera presets are defined in table space relative to the tilted table root.
export const CAMERA_MODES = [
  { id: 'player', name: 'Player', pos: [0, -0.34, 0.74], look: [0, 0.445, 0], fov: 40, follow: 0.10 },
  { id: 'high', name: 'Overhead', pos: [0, 0.16, 1.18], look: [0, 0.47, 0], fov: 40, follow: 0.0 },
  { id: 'follow', name: 'Follow', pos: [0, -0.22, 0.42], look: [0, 0.4, 0], fov: 46, follow: 0.55 },
  { id: 'low', name: 'Cabinet', pos: [0, -0.50, 0.44], look: [0, 0.46, 0.02], fov: 38, follow: 0.05 },
];

export class CameraRig {
  constructor(camera, tableRoot) {
    this.cam = camera; this.root = tableRoot;
    this.modeIdx = 0;
    this.pos = new THREE.Vector3(); this.look = new THREE.Vector3();
    this.shake = 0; this.shakeT = 0;
    this.focusY = 0.4;
    this.nudge = new THREE.Vector3();
    this.intro = 0;
    this.aspectFit = 1;
    this._p = new THREE.Vector3(); this._l = new THREE.Vector3();
    this.snap = true;
  }
  get mode() { return CAMERA_MODES[this.modeIdx]; }
  cycle() { this.modeIdx = (this.modeIdx + 1) % CAMERA_MODES.length; return this.mode; }
  setMode(id) { const i = CAMERA_MODES.findIndex(m => m.id === id); if (i >= 0) this.modeIdx = i; }
  kick(amount) { this.shake = Math.min(1, this.shake + amount); }
  nudgeKick(dx, dy) { this.nudge.x += dx; this.nudge.y += dy; }
  update(dt, balls, aspect, attract = 0) {
    const m = this.mode;
    if (this.viewW && this.viewH) aspect = this.viewW / (this.viewH - (this.hudPx || 0));
    // follow the lowest active ball a little (keeps flippers in view, drifts up with the action)
    let target = 0.42;
    const active = balls.filter(b => b.mode !== 'gone');
    if (active.length) {
      const b = active.reduce((a, c) => (c.y < a.y ? c : a));
      target = 0.42 + (b.y - 0.42) * m.follow;
    }
    this.focusY = damp(this.focusY, target, 2.2, dt);
    let px = m.pos[0], py = m.pos[1] + (this.focusY - 0.42) * 0.9, pz = m.pos[2];
    let lx = m.look[0], ly = m.look[1] + (this.focusY - 0.42), lz = m.look[2];
    // tall screens: blend toward a steeper framing so the long table fills the height
    const pt = m.id === 'high' ? 0 : Math.min(1, Math.max(0, (1.15 - aspect) / 0.55));
    if (pt > 0) {
      const P = [0, -0.02 + (this.focusY - 0.42) * 0.4, 1.02], Lk = [0, 0.455 + (this.focusY - 0.42) * 0.3, 0];
      px += (P[0] - px) * pt; py += (P[1] - py) * pt; pz += (P[2] - pz) * pt;
      lx += (Lk[0] - lx) * pt; ly += (Lk[1] - ly) * pt; lz += (Lk[2] - lz) * pt;
    }
    // narrow screens: pull the camera back along its view axis until the full table width fits
    const fovY = m.fov * (aspect < 1 ? 1.12 : 1) * Math.PI / 180;
    const tanH = Math.tan(fovY / 2) * aspect;
    const dist = Math.hypot(px - lx, py - ly, pz - lz);
    const needW = m.id === 'follow' ? 0.24 : 0.305;
    const nearD = dist * (0.72 + 0.2 * pt);                          // distance to the lower (widest-looking) part of the table
    const fit = Math.max(1, needW / (tanH * nearD));
    if (fit > 1) { px = lx + (px - lx) * fit; py = ly + (py - ly) * fit; pz = lz + (pz - lz) * fit; }
    if (m.id === 'high') { py = m.pos[1]; ly = m.look[1]; }
    if (attract > 0) {
      const t = performance.now() / 1000 * 0.12;
      px += Math.sin(t) * 0.18 * attract; py += (Math.cos(t * 0.7) * 0.08 - 0.05) * attract; pz += 0.05 * attract;
    }
    // shake & nudge
    this.shakeT += dt * 60;
    const s = this.shake * this.shake * 0.006;
    px += (Math.sin(this.shakeT * 1.7) + Math.sin(this.shakeT * 3.1)) * s;
    pz += Math.sin(this.shakeT * 2.3) * s;
    this.shake = Math.max(0, this.shake - dt * 3.5);
    this.nudge.multiplyScalar(Math.exp(-dt * 9));
    px += this.nudge.x; py += this.nudge.y;
    this._p.set(px, pz, -py); this._l.set(lx, lz, -ly);
    this.root.localToWorld(this._p); this.root.localToWorld(this._l);
    if (this.snap) { this.pos.copy(this._p); this.look.copy(this._l); this.snap = false; }
    const k = 1 - Math.exp(-dt * 5);
    this.pos.lerp(this._p, k); this.look.lerp(this._l, k);
    this.cam.position.copy(this.pos);
    this.cam.lookAt(this.look);
    const fov = m.fov * (aspect < 1 ? 1.12 : 1);
    if (Math.abs(this.cam.fov - fov) > 0.01) { this.cam.fov = damp(this.cam.fov, fov, 5, dt); this.cam.updateProjectionMatrix(); }
    // keep the table clear of a HUD strip at the top (portrait layouts)
    const vw = this.viewW, vh = this.viewH, d = this.hudPx || 0;
    if (vw && vh) {
      if (d > 0 && d < vh * 0.4) {
        const a = vw / (vh - d);
        if (!this.cam.view || this.cam.view.fullHeight !== vh - d || this.cam.view.offsetY !== -d || Math.abs(this.cam.aspect - a) > 1e-4) {
          this.cam.aspect = a; this.cam.setViewOffset(vw, vh - d, 0, -d, vw, vh);
        }
      } else if (this.cam.view && this.cam.view.enabled) { this.cam.clearViewOffset(); this.cam.aspect = vw / vh; this.cam.updateProjectionMatrix(); }
    }
  }
}
