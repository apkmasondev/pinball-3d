import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tv, clamp } from './util.js';
import LAMPS from '../lamps.json';
import { TABLE_W, TABLE_L } from '../layout.js';

// GI bulb positions on the playfield: x, y, radius (m)
const GI_SPOTS = [[-0.16, 0.26, 0.10], [0.16, 0.26, 0.10], [-0.17, 0.56, 0.11], [0.15, 0.54, 0.11], [0.0, 0.84, 0.12], [-0.1, 0.72, 0.1], [0.12, 0.72, 0.1], [0.0, 0.38, 0.12]];

const TEX = (p) => `${import.meta.env.BASE_URL}assets/tex/${p}`;

export function loadTexture(loader, url, { srgb = true, nearest = false, aniso = 8, flipY = true } = {}) {
  return new Promise((res, rej) => loader.load(url, (t) => {
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.flipY = flipY;
    if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
    t.anisotropy = aniso;
    res(t);
  }, undefined, rej));
}

// Lamp controller: named lamps with incandescent-style smoothing
export class Lamps {
  constructor() {
    this.list = LAMPS;
    this.byName = new Map(LAMPS.map(l => [l.name, l]));
    this.count = 128;
    this.target = new Float32Array(this.count);
    this.value = new Float32Array(this.count);
    this.state = new Map(); // name -> {mode, ...}
    this.t = 0;
    this.gi = 1;
    this.show = null;    // optional light show function(name, lamp, t) -> level | undefined
  }
  set(name, mode, opts = {}) { // mode: 'off' | 'on' | 'blink' | 'fastblink' | 'pulse' | 'level'
    if (mode === 'off') { this.state.delete(name); return; }
    const cur = this.state.get(name);
    if (cur && cur.mode === mode && cur.level === opts.level) return;
    this.state.set(name, { mode, ...opts, t0: this.t });
  }
  get(name) { return this.state.get(name)?.mode || 'off'; }
  flash(name, dur = 0.15) { this.state.set(name, { mode: 'flash', t0: this.t, dur, prev: this.state.get(name)?.mode === 'flash' ? this.state.get(name).prev : this.state.get(name) }); }
  update(dt) {
    this.t += dt;
    for (const l of this.list) {
      const s = this.state.get(l.name);
      let v = 0;
      if (s) {
        const ph = this.t - s.t0 + (s.phase || 0);
        switch (s.mode) {
          case 'on': v = s.level ?? 1; break;
          case 'blink': v = (Math.floor(ph * 2.4) % 2 === 0) ? 1 : 0; break;
          case 'fastblink': v = (Math.floor(ph * 7) % 2 === 0) ? 1 : 0; break;
          case 'pulse': v = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(ph * 6)); break;
          case 'flash': v = ph < s.dur ? 1 : 0; if (ph >= s.dur) { if (s.prev) this.state.set(l.name, s.prev); else this.state.delete(l.name); } break;
          case 'level': v = s.level; break;
        }
      }
      if (this.show) { const sv = this.show(l.name, l, this.t); if (sv !== undefined) v = Math.max(v * 0.35, sv); }
      if (l.group === 'lantern') {
        // candle flicker on the painted lanterns (part of the GI)
        const k = l.id * 1.7;
        v = Math.max(v, this.gi * (0.72 + 0.12 * Math.sin(this.t * 7.3 + k) + 0.08 * Math.sin(this.t * 13.1 + k * 2.1) + 0.05 * Math.sin(this.t * 23.0 + k)));
      }
      this.target[l.id] = v;
    }
    for (let i = 0; i < this.count; i++) {
      const tgt = this.target[i], cur = this.value[i];
      // incandescent: fast-ish on, slower off
      this.value[i] = cur + (tgt - cur) * Math.min(1, dt * (tgt > cur ? 38 : 14));
    }
  }
}

function playfieldMaterial(base, emit, lampId, lamps, ao) {
  const m = new THREE.MeshPhysicalMaterial({
    map: base, roughness: 0.4, metalness: 0.0,
    clearcoat: 0.85, clearcoatRoughness: 0.13, envMapIntensity: 0.55,
    aoMap: ao || null, aoMapIntensity: 1.0,
  });
  m.name = 'playfield_lamps';
  m.userData.uniforms = {
    uLampId: { value: lampId }, uLampEmit: { value: emit },
    uLamps: { value: lamps.value }, uLampBoost: { value: 3.0 },
    uAO: { value: ao }, uHasAO: { value: ao ? 1 : 0 },
    // warm "GI" bulbs under the plastics: diffuse only, so they never leave glints in the clearcoat
    uGI: { value: 1 }, uGISpots: { value: GI_SPOTS.map(s => new THREE.Vector3(...s)) }, uTable: { value: new THREE.Vector2(TABLE_W, TABLE_L) },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.uniforms);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uLampId; uniform sampler2D uLampEmit; uniform float uLamps[128]; uniform float uLampBoost;
        uniform sampler2D uAO; uniform float uHasAO;
        uniform float uGI; uniform vec3 uGISpots[${GI_SPOTS.length}]; uniform vec2 uTable;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        if (uHasAO > 0.5) { float aoV = texture2D(uAO, vMapUv).r; diffuseColor.rgb *= mix(1.0, aoV, 0.85); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float lid = floor(texture2D(uLampId, vMapUv).r * 255.0 + 0.5);
          int li = int(lid);
          float inten = li > 0 ? uLamps[li] : 0.0;
          vec3 lc = texture2D(uLampEmit, vMapUv).rgb;
          totalEmissiveRadiance += lc * inten * uLampBoost;
          diffuseColor.rgb += lc * inten * 0.3;
          vec2 tp = vec2((vMapUv.x - 0.5) * uTable.x, vMapUv.y * uTable.y);
          float g = 0.0;
          for (int i = 0; i < ${GI_SPOTS.length}; i++) { vec3 s = uGISpots[i]; float d = length(tp - s.xy) / s.z; g += 1.0 / (1.0 + d * d * d); }
          totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.62, 0.32) * g * 0.22 * uGI;
        }`)
      // the key/moon lights mirrored in the lacquer: keep them a soft sheen instead of a blooming hot spot
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        reflectedLight.directSpecular = min(reflectedLight.directSpecular, vec3(0.3));
        #ifdef USE_CLEARCOAT
          clearcoatSpecularDirect = min(clearcoatSpecularDirect, vec3(0.35));
        #endif`);
  };
  // the AO is applied manually above (the built-in aoMap only affects indirect light)
  m.aoMap = null;
  return m;
}

export class TableView {
  constructor(layout, world) {
    this.L = layout; this.w = world;
    this.root = new THREE.Group();
    this.root.name = 'tableRoot';
    this.lamps = new Lamps();
    this.dyn = {};
  }

  async build(renderer, onProgress) {
    const loader = new THREE.TextureLoader();
    const aniso = renderer.capabilities.getMaxAnisotropy();
    const gltfP = new Promise((res, rej) => new GLTFLoader().load(`${import.meta.env.BASE_URL}assets/models/table.glb`, res,
      (e) => { if (onProgress && e.total) onProgress(e.loaded / e.total); }, rej));
    const [base, emit, lampId, ao, gltf] = await Promise.all([
      loadTexture(loader, TEX('playfield_base.jpg'), { aniso }),
      loadTexture(loader, TEX('playfield_emit.jpg'), { aniso }),
      loadTexture(loader, TEX('playfield_lampid.png'), { srgb: false, nearest: true, aniso: 1 }),
      loadTexture(loader, TEX('playfield_ao.jpg'), { srgb: false, aniso: 4 }).catch(() => null),
      gltfP,
    ]);
    this.textures = { base, emit, lampId, ao };
    this.pfMat = playfieldMaterial(base, emit, lampId, this.lamps, ao);
    this._processGLB(gltf.scene);
    this._lights();
    return this;
  }

  _processGLB(scene) {
    const find = (n) => scene.getObjectByName(n);
    const d = this.dyn;
    d.flippers = this.L.flippers.map(f => find(f.id + '_pivot'));
    d.bumpers = this.L.bumpers.map((b, i) => ({ g: find('bumper' + i), ring: find(`bumper${i}_ring`), lip: find(`bumper${i}_ringlip`), cap: find(`bumper${i}_cap`), lit: 0.3 }));
    d.drops = this.L.drops.map(dd => find(dd.id));
    d.gates = this.L.gates.map(g => find(g.id + '_flap'));
    d.spinner = find('spinner_flap');
    d.plunger = find('plunger');
    d.spring = find('plunger_spring');
    d.kickback = find('kickback');
    d.turntable = find('turntable');
    d.slings = this.L.slings.map(s => find(s.id + '_rubber'));
    d.backglass = find('backglass');
    d.apron = find('apron');
    // flasher domes: own glowing material + a real light each
    d.flashers = [0, 1].map(i => {
      const g = find('flasher' + i); if (!g) return null;
      const dome = find(`flasher${i}_dome`);
      const col = i === 0 ? new THREE.Color(1.0, 0.18, 0.12) : new THREE.Color(1.0, 0.7, 0.35);
      let mat = null;
      dome && dome.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = col.clone(); o.material.emissiveIntensity = 0; o.material.transparent = true; o.material.opacity = 0.85; o.castShadow = false; mat = o.material; } });
      const light = new THREE.PointLight(col, 0, 0.6, 1.8); light.position.set(0, 0.03, 0); g.add(light);
      return { g, mat, light, level: 0 };
    });
    for (const o of [...d.gates, d.spinner]) if (o) o.userData.q0 = o.quaternion.clone();
    for (const o of [d.plunger, d.kickback, ...d.drops, ...d.slings]) if (o) o.userData.p0 = o.position.clone();
    for (const b of d.bumpers) {
      if (b.ring) b.ring.userData.p0 = b.ring.position.clone();
      if (b.lip) b.lip.userData.p0 = b.lip.position.clone();
      if (b.cap) {
        // own material instances so each cap glows independently (multi-material meshes load as groups)
        b.capMats = [];
        b.cap.traverse(o => {
          if (!o.isMesh) return;
          o.material = o.material.clone();
          if (o.material.map) { o.material.emissive = new THREE.Color(1.0, 0.62, 0.3); o.material.emissiveMap = o.material.map; o.material.emissiveIntensity = 0; b.capMats.unshift(o.material); }
          else b.capMats.push(o.material);
        });
      }
      const light = new THREE.PointLight(0xffa860, 0, 0.16, 2);
      light.position.set(0, 0.032, 0); b.g && b.g.add(light); b.light = light;
    }
    const dynSet = new Set();
    const markDyn = (o) => o && o.traverse(c => dynSet.add(c));
    [...d.flippers, ...d.bumpers.map(b => b.g), ...d.flashers.filter(Boolean).map(f => f.g), ...d.drops, ...d.gates, d.spinner, d.plunger, d.spring, d.kickback, d.turntable, ...d.slings, d.backglass, d.apron].forEach(markDyn);

    // ---- material fix-ups by name
    const fix = (m) => {
      if (!m || m.userData.fixed) return m;
      m.userData.fixed = true;
      const n = m.name || '';
      if (n.startsWith('plastic_') || n.startsWith('standee_') || n.startsWith('card_') || n.startsWith('postcap_')) {
        m.transparent = false; m.alphaTest = 0.5; m.side = THREE.DoubleSide; m.depthWrite = true;
        if (n.startsWith('plastic_')) { m.roughness = 0.16; m.metalness = 0; m.envMapIntensity = 0.9; m.emissive = new THREE.Color(1, 0.85, 0.7); m.emissiveMap = m.map; m.emissiveIntensity = 0.06; }
        if (n === 'plastic_apron' || n === 'plastic_shooterpanel') { m.roughness = 0.55; m.envMapIntensity = 0.35; m.clearcoat = 0; }
        if (n.startsWith('standee_')) { m.roughness = 0.5; m.emissive = new THREE.Color(1, 1, 1); m.emissiveMap = m.map; m.emissiveIntensity = 0.22; }
      }
      if (n.startsWith('acrylic')) { m.transparent = true; m.depthWrite = false; m.side = THREE.DoubleSide; m.roughness = 0.05; m.envMapIntensity = 1.2; }
      if (['gold', 'chrome', 'gold_dark', 'steel'].includes(n)) m.envMapIntensity = 1.0;
      if (n === 'wire') m.envMapIntensity = 0.75;
      if (n.startsWith('lacquer')) m.envMapIntensity = 0.8;
      if (n === 'innerwall_art') { m.clearcoat = 0.15; m.roughness = 0.55; m.envMapIntensity = 0.5; }
      // painted back panel: a touch of self-light so the moon halo reads behind the medallion
      if (n === 'backpanel_art') { m.clearcoat = 0.15; m.roughness = 0.55; m.envMapIntensity = 0.5; m.emissive = new THREE.Color(1, 0.92, 0.85); m.emissiveMap = m.map; m.emissiveIntensity = 0.28; }
      if (n === 'backglass') { m.emissive = new THREE.Color(1, 1, 1); m.emissiveMap = m.map; m.emissiveIntensity = 0.9; }   // backlit translite: the art glows, not a flat white
      // head panels around the display: a faint glow so the art reads in the dark room, never competing with the table
      if (n === 'speakerpanel_art' || n === 'neckpanel_art') { m.clearcoat = 0.2; m.roughness = 0.5; m.envMapIntensity = 0.4; m.emissive = new THREE.Color(1, 0.9, 0.82); m.emissiveMap = m.map; m.emissiveIntensity = n === 'neckpanel_art' ? 0.35 : 0.45; }
      if (m.map) m.map.anisotropy = 8;
      return m;
    };
    scene.traverse(o => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map(fix) : fix(o.material);
      o.castShadow = true; o.receiveShadow = true;
    });

    const pf = find('playfield');
    if (pf) { pf.material = this.pfMat; pf.castShadow = false; pf.receiveShadow = true; dynSet.add(pf); }
    this.playfieldMesh = pf;

    // ---- merge static meshes by material (far fewer draw calls)
    scene.updateMatrixWorld(true);
    const groups = new Map();
    const statics = [];
    scene.traverse(o => { if (o.isMesh && !dynSet.has(o)) statics.push(o); });
    for (const o of statics) {
      const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      if (Array.isArray(o.material)) {
        for (const grp of g.groups) {
          const m = o.material[grp.materialIndex];
          if (!groups.has(m)) groups.set(m, []);
          groups.get(m).push(extractGroup(g, grp));
        }
      } else {
        if (!groups.has(o.material)) groups.set(o.material, []);
        groups.get(o.material).push(g);
      }
    }
    for (const o of statics) o.parent && o.parent.remove(o);
    const merged = new THREE.Group(); merged.name = 'staticMerged';
    for (const [m, list] of groups) {
      const geo = mergeGeometries(list.map(normalizeAttrs), false);
      if (!geo) { console.warn('merge failed for', m.name); continue; }
      const mesh = new THREE.Mesh(geo, m);
      const n = m.name || '';
      mesh.castShadow = !m.transparent && !n.startsWith('card_') && n !== 'backglass';
      mesh.receiveShadow = true;
      mesh.name = 'merged_' + n;
      if (m.transparent) mesh.renderOrder = 5;
      merged.add(mesh);
    }
    this.root.add(merged);
    this.root.add(scene);
    this.gltfScene = scene;
  }

  _lights() {
    const L = this.L;
    // behind and above the player: its clearcoat glint then falls off the table for every camera
    const key = new THREE.SpotLight(0xe4ebff, 5.2, 4, Math.PI / 4.4, 0.7, 1.3);
    key.position.copy(tv(0.03, -0.30, 1.2));
    key.target.position.copy(tv(0, L.TABLE_L * 0.52, 0));
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.6; key.shadow.camera.far = 2.8;
    key.shadow.bias = -0.00008; key.shadow.normalBias = 0.0015; key.shadow.radius = 4;
    this.root.add(key, key.target);
    this.keyLight = key;
    this.hemi = new THREE.HemisphereLight(0x6a78c0, 0x3a1a10, 0.46);
    this.root.add(this.hemi);
    this.gi = [];
    // a small warm lamp over the plunger lane, like the one under a real shooter-lane plastic
    const pl = new THREE.PointLight(0xffb070, 0.008, 0.2, 1.6);
    pl.position.copy(tv(L.plunger.x - 0.02, 0.06, 0.04));
    this.root.add(pl); this.plungerLight = pl;
    // (placed nearly overhead so its clearcoat glint lands off the playfield from the player's view)
    const moon = new THREE.DirectionalLight(0x9fb4ff, 0.45);
    moon.position.copy(tv(-0.12, 0.62, 1.5)); moon.target.position.copy(tv(0, 0.32, 0));
    this.root.add(moon, moon.target);
    this.moonLight = moon;
  }

  // playfield glass: adds only a faint reflection of the room (additive, unlit -> no GI glints)
  addGlass(envMap) {
    const L = this.L;
    const len = L.TABLE_L + 0.05;            // cabinet front (-0.04) to just short of the back wall
    const geo = new THREE.PlaneGeometry(L.TABLE_W, len);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, envMap, reflectivity: 0.09, combine: THREE.AddOperation, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const g = new THREE.Mesh(geo, mat);
    g.rotation.x = -Math.PI / 2;
    g.position.copy(tv(0, len / 2 - 0.04, 0.108));
    g.renderOrder = 10; g.name = 'glass';
    this.root.add(g);
    this.glass = g;
    return g;
  }

  flash(which, level = 1) {
    for (const [i, f] of (this.dyn.flashers || []).entries()) if (f && (which === 'both' || which === i)) f.level = Math.max(f.level, level);
  }

  setGI(level) {
    this.lamps.gi = level;
    if (this.pfMat) this.pfMat.userData.uniforms.uGI.value = level;
    this.hemi.intensity = 0.42 * (0.55 + 0.45 * level);
  }

  // --------------------------------------------------------------- per-frame sync
  update(dt) {
    const w = this.w, d = this.dyn;
    this.lamps.update(dt);
    d.flippers.forEach((m, i) => { if (m) m.rotation.y = w.flippers[i].angle; });
    d.bumpers.forEach((b, i) => {
      const st = w.bumperState[i];
      if (b.ring) b.ring.position.y = b.ring.userData.p0.y - st.anim * 0.009;
      if (b.lip) b.lip.position.y = b.lip.userData.p0.y - st.anim * 0.009;
      const glow = b.lit + st.anim * 2.2;
      if (b.capMats) b.capMats[0].emissiveIntensity = glow * 0.55;
      if (b.light) b.light.intensity = 0.004 + st.anim * 0.28 + b.lit * 0.02;
    });
    d.slings.forEach((r, i) => {
      if (!r) return;
      const st = w.slingState[i]; const s = this.L.slings[i];
      const ax = s.T[0] - s.Bi[0], ay = s.T[1] - s.Bi[1]; const l = Math.hypot(ax, ay);
      let nx = -ay / l, ny = ax / l; if (s.side === 'R') { nx = -nx; ny = -ny; }
      const k = st.anim * 0.0035;
      r.position.set(r.userData.p0.x + nx * k, r.userData.p0.y, r.userData.p0.z - ny * k);
    });
    d.drops.forEach((o, i) => { if (o) { o.position.y = o.userData.p0.y - w.drops[i].anim * 0.0275; o.visible = w.drops[i].anim < 0.99; } });
    const rx = this._q || (this._q = new THREE.Quaternion()); const ax = this._ax || (this._ax = new THREE.Vector3(1, 0, 0));
    d.gates.forEach((o, i) => { if (o) { rx.setFromAxisAngle(ax, clamp(w.gates[i].swing, -1.4, 1.4)); o.quaternion.copy(o.userData.q0).multiply(rx); } });
    if (d.spinner) { rx.setFromAxisAngle(ax, w.spinner.angle); d.spinner.quaternion.copy(d.spinner.userData.q0).multiply(rx); }
    if (d.turntable) d.turntable.rotation.y = w.turntable.angle;
    if (d.plunger) d.plunger.position.z = d.plunger.userData.p0.z + w.plunger.pos;
    if (d.spring) {
      // the main spring is squeezed between the fixed housing and the collar on the rod
      const L0 = d.spring.userData.restLength || 0.1;
      d.spring.scale.z = Math.max(0.3, (L0 - w.plunger.pos) / L0);
    }
    for (const f of d.flashers || []) {
      if (!f) continue;
      f.level = Math.max(0, f.level - dt * 5.5);
      const v = f.level * f.level;
      if (f.mat) f.mat.emissiveIntensity = 0.12 + v * 3.2;
      f.light.intensity = v * 0.35;
    }
    if (d.kickback) d.kickback.position.z = d.kickback.userData.p0.z - w.kickback.anim * 0.012;
  }
}

function extractGroup(g, grp) {
  const sub = new THREE.BufferGeometry();
  for (const k in g.attributes) sub.setAttribute(k, g.attributes[k]);
  const src = g.index ? g.index.array : null;
  const arr = new Uint32Array(grp.count);
  for (let i = 0; i < grp.count; i++) arr[i] = src ? src[grp.start + i] : grp.start + i;
  sub.setIndex(new THREE.BufferAttribute(arr, 1));
  return sub.toNonIndexed();
}
function normalizeAttrs(g) {
  // mergeGeometries requires identical attribute sets
  const geo = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
  if (!geo.attributes.normal) geo.computeVertexNormals();
  geo.morphAttributes = {};
  geo.clearGroups();
  return geo;
}
