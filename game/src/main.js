import * as THREE from 'three';
import { World } from './physics/world.js';
import { TABLES, TABLE_IDS } from './tables.js';
import { loadHighScores } from './game/rules.js';
import { Stage } from './render/stage.js';
import { TableView } from './render/table.js';
import { BallsView } from './render/balls.js';
import { CameraRig } from './render/camera.js';
import { Input } from './input.js';
import { Display } from './game/display.js';
import { Audio } from './audio/audio.js';
import { UI } from './ui/ui.js';
import { Bot } from './game/bot.js';
import { ApronCards } from './render/cards.js';

// ------------------------------------------------------------------ settings
const DEFAULTS = { lang: (navigator.language || 'pl').startsWith('pl') ? 'pl' : 'en', camera: 'player', quality: 'auto', balls: 3, master: 0.85, music: 0.65, sfx: 0.9, mute: false, table: 'tsukimi' };
const settings = (() => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('tsukimi.settings') || '{}') }; } catch (e) { return { ...DEFAULTS }; } })();
const saveSettings = () => { try { localStorage.setItem('tsukimi.settings', JSON.stringify(settings)); } catch (e) { } };

if (!TABLES[settings.table]) settings.table = 'tsukimi';
const input = new Input();
const display = new Display();
const audio = new Audio(settings);
// the loaded table: its definition, layout, physics, view and rules are swapped together by loadTable()
let def = TABLES[settings.table], layout, world, table, rules, bot, cards;
let stage, rig, balls, ui;
let mode = 'loading';          // loading | title | game | pause | initials | switching
let paused = false;

let halfW = 0.27;
const panOf = (b) => b ? Math.max(-1, Math.min(1, b.x / halfW)) * 0.8 : 0;

// ------------------------------------------------------------------ effects
const fx = {
  flashV: 0, flashColor: new THREE.Color(1, 0.8, 0.6), giLevel: 1, giTarget: 1, show: null, showUntil: 0, tilted: false,
  flash(s, color = 0xffd0a0) { this.flashV = Math.max(this.flashV, s); this.flashColor.set(color); ui && ui.flash(s, '#' + this.flashColor.getHexString()); table.flash('both', Math.min(1, 0.5 + s * 0.5)); },
  kick(a) { rig && rig.kick(a); },
  lightShow(name, dur) { this.show = name; this.showUntil = performance.now() / 1000 + dur; },
  tilt(on) { this.tilted = on; },
  bumperLit(v) { for (const b of table.dyn.bumpers || []) b.lit = v; },
  gi(level) { this.giTarget = level; },
};

function lightShowFn(name, t0) {
  // returns lamp -> level for the running show
  return (lname, l, t) => {
    const k = t - t0;
    switch (name) {
      case 'jackpot': return (Math.sin(k * 18 - l.v / 60) > 0.3) ? 1 : 0;
      case 'super': return (Math.floor(k * 10) % 2) ? 1 : (Math.sin(k * 12 + l.u / 80) > 0 ? 0.6 : 0);
      case 'multiball': { const r = Math.hypot(l.u - 543, l.v - 900); return Math.abs(((k * 900) % 1400) - r) < 140 ? 1 : 0; }
      case 'tsukimi': { const r = Math.hypot(l.u - 548, l.v - 100); return Math.abs(((k * 700) % 1600) - r) < 180 ? 1 : 0.1; }
      case 'start': return (l.v > 1880 - ((k * 1600) % 2000)) ? 1 : 0;
    }
    return undefined;
  };
}

// ------------------------------------------------------------------ boot
async function boot() {
  ui = new UI(document.getElementById('ui'), settings, {
    start: () => startGame(),
    resume: () => setPaused(false),
    quit: () => quitToTitle(),
    setting: (k, v) => applySetting(k, v),
    press: (a, on) => input.press(a, on),
    initials: (name) => submitInitials(name),
    highScores: () => rules ? rules.highScores : [],
    sound: (n) => audio.play(n),
    tables: () => TABLE_IDS.map(id => ({ def: TABLES[id], best: loadHighScores(TABLES[id].hsKey, TABLES[id].hsDefault)[0], current: id === def.id })),
    selectTable: (id) => switchTable(id),
    cycleTable: (dir) => switchTable(otherTable(dir)),
  });
  ui.setTable(def);
  ui.show('loading');
  ui.setLoading(0.05);
  const canvas = document.getElementById('gl');
  try { stage = new Stage(canvas); } catch (e) {
    console.error(e);
    ui.setLoading(0, settings.lang === 'pl' ? 'Ta przeglądarka nie obsługuje grafiki WebGL 2' : 'This browser does not support WebGL 2 graphics');
    return;
  }
  // mobile browsers may drop the GPU context in the background; a fresh start is the only clean recovery
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); if (mode === 'game') setPaused(true); });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  display.lang = settings.lang;
  document.fonts && document.fonts.load('20px "Marcellus"').then(() => display.textCache.clear()).catch(() => { });

  audio.setTable(def);
  const audioP = (async () => { try { await audio.init(); } catch (e) { console.warn('audio init failed', e); } })();
  rig = new CameraRig(stage.camera, null);
  rig.setMode(settings.camera);
  balls = new BallsView(stage, null, 0.0135, []);
  // arcade floor with a soft pool of light under the machine
  {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g2 = c.getContext('2d'); const grd = g2.createRadialGradient(256, 256, 10, 256, 256, 256);
    grd.addColorStop(0, '#2c2024'); grd.addColorStop(0.45, '#140e12'); grd.addColorStop(1, '#050406');
    g2.fillStyle = grd; g2.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4000; i++) { g2.fillStyle = `rgba(255,255,255,${Math.random() * 0.025})`; g2.fillRect(Math.random() * 512, Math.random() * 512, 1, 1); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0, envMapIntensity: 0.2 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.88, -0.4); floor.receiveShadow = true;
    stage.scene.add(floor);
  }
  const hudCtx = ui.dmdCanvas.getContext('2d');
  ui.dmdCanvas.width = display.canvas.width; ui.dmdCanvas.height = display.canvas.height;

  await loadTable(settings.table, (p) => ui.setLoading(0.1 + p * 0.8));
  ui.setLoading(0.92);
  bindInput();
  if (import.meta.env.DEV) window.__game = { get world() { return world; }, get table() { return table; }, get rules() { return rules; }, get bot() { return bot; }, get layout() { return layout; }, stage, rig, audio, display, ui, fx, balls, input, settings, switchTable };
  await Promise.race([audioP, new Promise(r => setTimeout(r, 4000))]);
  ui.setLoading(1);
  setTimeout(() => toTitle(), 250);

  // warm up shaders
  stage.renderer.compile(stage.scene, stage.camera);

  let last = performance.now();
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    input.pollGamepads();
    watchPerf(dt);
    if (!paused) {
      bot.update(dt);
      demoTick(dt);
      world.update(dt);
      for (const e of world.drainEvents()) { eventSound(e); rules.handle(e); }
      rules.update(dt);
    }
    // effects
    fx.flashV = Math.max(0, fx.flashV - dt * 2.2);
    stage.grade.uniforms.uFlash.value = fx.flashV; stage.grade.uniforms.uFlashColor.value.copy(fx.flashColor);
    const tnow = now / 1000;
    if (fx.show && tnow < fx.showUntil) { if (!table.lamps.show || table.lamps.show._name !== fx.show) { table.lamps.show = lightShowFn(fx.show, table.lamps.t); table.lamps.show._name = fx.show; } }
    else { table.lamps.show = null; fx.show = null; }
    if (fx.show && tnow < fx.showUntil) { const ph = Math.floor(tnow * 8) % 2; table.flash(ph, 0.9); }
    fx.giLevel += ((fx.tilted ? 0.05 : fx.giTarget) - fx.giLevel) * Math.min(1, dt * 4);
    table.setGI(fx.giLevel);
    table.update(dt);
    balls.sync(world.balls, dt);
    audio.updateRolling(mode === 'title' || paused ? [] : world.balls, halfW);
    rig.viewW = innerWidth; rig.viewH = innerHeight;
    rig.hudPx = (mode === 'game' || mode === 'pause') && innerWidth / innerHeight < 1.25 ? hudBottom() : 0;
    rig.update(dt, world.balls, stage.camera.aspect, mode === 'title' ? 1 : 0);
    balls.updateReflection(stage.renderer, stage.scene);
    // display
    if (mode === 'game' || mode === 'pause') { display.mode = rules.state === 'initials' ? 'initials' : 'game'; display.hud = rules.hud(); }
    // the dot display is only on screen during play; it redraws only when a dot changes
    display.update(dt, ui.screen === 'game');
    if (display.dirty) hudCtx.drawImage(display.canvas, 0, 0);
    stage.render(dt, tnow);
  };
  requestAnimationFrame(frame);
}

let _hudB = 0, _hudT = 0;
function hudBottom() {
  const now = performance.now();
  if (now - _hudT > 500) { _hudT = now; const el = document.getElementById('hud'); _hudB = el ? el.getBoundingClientRect().bottom + 4 : 0; }
  return _hudB;
}

function applyQuality() {
  stage.setQuality(settings.quality);
  const q = stage.quality;
  table.setQuality(q);
  balls.every = q === 'high' ? 2 : q === 'medium' ? 3 : 6;
}

// 'auto' quality steps down once frames stay slow for a few seconds (a 30 Hz power-saving cap is not slow)
let frameAvg = 1 / 60, slowT = 0;
function watchPerf(dt) {
  if (settings.quality !== 'auto' || paused || (mode !== 'game' && mode !== 'title') || stage.quality === 'low') { slowT = 0; return; }
  frameAvg += (dt - frameAvg) * 0.05;
  slowT = frameAvg > 1 / 28 ? slowT + dt : 0;
  if (slowT > 4) {
    slowT = 0; frameAvg = 1 / 60;
    stage.autoLevel = stage.quality === 'high' ? 'medium' : 'low';
    applyQuality();
  }
}

// ------------------------------------------------------------------ tables
// Builds the whole table (layout, physics, 3D view, rules, attract bot, apron cards, theme) and swaps it in.
async function loadTable(id, onProgress) {
  const d = TABLES[id] || TABLES.tsukimi;
  const L = d.layout();
  const W = new World(L);
  const view = new TableView(L, W, d);
  await view.build(stage.renderer, onProgress);
  view.root.rotation.x = W.o.slopeDeg * Math.PI / 180;
  view.addGlass(stage.scene.environment);
  if (table) table.dispose();
  def = d; layout = L; world = W; table = view; halfW = L.TABLE_W / 2;
  stage.scene.add(view.root);
  balls.setRoot(view.root); balls.r = L.BALL_R; balls.holes = L.drainHoles;
  rig.root = view.root; rig.snap = true;
  if (cards) cards.dispose();
  cards = new ApronCards(view.root, d);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { if (cards && cards.def === d) cards.build(settings.lang); });
  rules = new d.Rules({
    world, lamps: view.lamps, display, audio, fx, layout, settings, table: d,
    onGameOver: () => toTitle(),
    onHighScore: (score) => { mode = 'initials'; display.mode = 'initials'; ui.startInitials(score); display.initials = ui.initials; },
  });
  bot = new Bot(world, layout, input);
  display.setTheme(d); audio.setTable(d);
  fx.show = null; fx.flashV = 0;
  applyQuality(); applyStrings();
  ui.setTable(d);
}

let switching = false;
async function switchTable(id) {
  if (switching || !TABLES[id]) return;
  if (id === def.id) { ui.show('title'); return; }
  switching = true; mode = 'switching';
  ui.veil(true, TABLES[id].loading[settings.lang] || TABLES[id].loading.en, TABLES[id].kanji);
  audio.music(null);
  bot && bot.stop();
  await new Promise(r => setTimeout(r, 450));
  try {
    for (const b of [...world.balls]) world.removeBall(b);
    await loadTable(id, (p) => ui.veilProgress(p));
    settings.table = id; saveSettings();
    await stage.renderer.compileAsync(stage.scene, stage.camera).catch(() => { });
  } catch (e) { console.error('table load failed', e); }
  switching = false;
  toTitle();
  ui.veil(false);
}
const otherTable = (dir = 1) => TABLE_IDS[(TABLE_IDS.indexOf(def.id) + dir + TABLE_IDS.length) % TABLE_IDS.length];

function applyStrings() {
  const RT = rules.T;
  const tr = RT[settings.lang] || RT.en;
  display.strings = { ball: tr.ball, highScore: tr.highScore, pressStart: tr.pressStart, enterInitials: tr.enterInitials };
  rules.lang = settings.lang;
  display.hiscores = rules.highScores;
}

function applySetting(k, v) {
  settings[k] = v; saveSettings();
  if (k === 'lang') { applyStrings(); cards && cards.build(v); ui.setTable(def); }
  if (k === 'camera') rig.setMode(v);
  if (k === 'quality') { if (v === 'auto') stage.autoLevel = null; applyQuality(); }
  if (['master', 'music', 'sfx', 'mute'].includes(k)) audio.applyVolumes();
}

// ------------------------------------------------------------------ flow
function toTitle() {
  mode = 'title'; paused = false;
  display.mode = 'attract'; display.hiscores = rules.highScores; display.clearQueue();
  for (const b of [...world.balls]) world.removeBall(b);
  fx.tilted = false; world.tiltDisabled = false; fx.giTarget = 1;
  audio.pauseDuck(false);
  world.turntable.target = 0.6;
  ui.show('title');
  audio.music('attract');
  demoT = 1.5;
}
let demoT = -1;
function demoTick(dt) {
  // the machine plays itself behind the title screen
  if (mode !== 'title' || switching) return;
  if (demoT > 0) { demoT -= dt; if (demoT <= 0) { world.addBall(layout.plunger.x, layout.plunger.ballY); bot.start(true); } return; }
  if (world.balls.length === 0 && demoT <= 0) demoT = 2.0;
}
function startGame() {
  if (switching) return;
  bot.stop(); demoT = -1;
  audio.init().then(() => audio.resume());
  mode = 'game'; paused = false;
  fx.tilted = false;
  ui.show('game');
  display.mode = 'game';
  rig.setMode(settings.camera); rig.snap = false;
  fx.lightShow('start', 1.2);
  rules.startGame();
}
function setPaused(p) {
  if (mode !== 'game' && mode !== 'pause') return;
  paused = p; mode = p ? 'pause' : 'game';
  ui.show(p ? 'pause' : 'game');
  if (p) { world.setFlipper('L', false); world.setFlipper('R', false); world.pullPlunger(false); }
  audio.pauseDuck(p);
}
function quitToTitle() {
  rules.abort();
  toTitle();
}
function submitInitials(name) {
  ui.rememberInitials(name);
  rules.submitInitials(name);
  audio.play('uiSelect');
}

// ------------------------------------------------------------------ input
function bindInput() {
  const gameActive = () => mode === 'game' && !paused;
  // on the title screen the flipper buttons browse the tables
  const browse = (dir) => { if (ui.screen === 'tables') ui.tablesMove(dir); else if (ui.screen === 'title') switchTable(otherTable(dir)); };
  input.on('left', (on) => {
    if (mode === 'initials') { if (on) ui.initialsCycle(-1); return; }
    if (mode === 'title') { if (on) browse(-1); return; }
    if (!gameActive()) return;
    world.setFlipper('L', on);
    if (!world.tiltDisabled) audio.play(on ? 'flipperUp' : 'flipperDown', 1, { pan: -0.35 });
    rules.flipper('L', on);
  });
  input.on('right', (on) => {
    if (mode === 'initials') { if (on) ui.initialsCycle(1); return; }
    if (mode === 'title') { if (on) browse(1); return; }
    if (!gameActive()) return;
    world.setFlipper('R', on);
    if (!world.tiltDisabled) audio.play(on ? 'flipperUp' : 'flipperDown', 1, { pan: 0.35 });
    rules.flipper('R', on);
  });
  input.on('plunger', (on, code) => {
    audio.resume();
    if (mode === 'title') {
      if (!on) return;
      if (ui.screen === 'tables') { ui.tablesConfirm(); return; }
      if (ui.screen === 'title' && (code === 'Enter' || code === 'Space' || code === 'NumpadEnter' || code === undefined)) {
        // Enter on a focused menu button runs that button (keyboard navigation); otherwise it starts a game
        const f = document.activeElement;
        if (f && f.dataset && f.dataset.a && f.dataset.a !== 'play' && code !== 'Space') ui.action(f.dataset.a); else startGame();
      }
      return;
    }
    if (mode === 'initials') { if (on && ui.initialsNext()) submitInitials(ui.initials.letters.join('')); return; }
    if (!gameActive()) return;
    if (world.ballInShooter()) { world.pullPlunger(on); if (on) audio.play('plungerPull'); }
    else if (!on) world.pullPlunger(false);
  });
  input.on('start', (on) => { if (on && mode === 'title' && ui.screen === 'title') startGame(); });
  const nudge = (dx, dy, cx, cy) => (on) => {
    if (!on || !gameActive()) return;
    world.nudge(dx, dy); rig.nudgeKick(cx, cy); rules.nudge(); audio.play('ballSearch', 0.8);
  };
  input.on('nudgeLeft', nudge(0.20, 0.06, -0.007, 0));
  input.on('nudgeRight', nudge(-0.20, 0.06, 0.007, 0));
  input.on('nudgeUp', nudge(0, 0.2, 0, 0.007));
  input.on('camera', (on) => { if (on && (mode === 'game' || mode === 'title')) { const m = rig.cycle(); settings.camera = m.id; saveSettings(); } });
  input.on('pause', (on) => {
    if (!on) return;
    // a sub-screen (settings / help / scores) closes first, also when it was opened from the pause menu
    if (['settings', 'help', 'scores', 'tables'].includes(ui.screen)) ui.action('back');
    else if (mode === 'game') setPaused(true);
    else if (mode === 'pause') setPaused(false);
  });
  // M is a letter like any other while the player types initials
  input.on('mute', (on) => { if (on && mode !== 'initials') applySetting('mute', !settings.mute); });
  // typed letters fill the initials; Enter / Space / ↓ step to the next letter and save on the last one (plunger action)
  window.addEventListener('keydown', (e) => { if (mode === 'initials' && ui.initialsKey(e)) e.preventDefault(); });
  // browsers only let audio start from a user gesture; iOS counts touchend, not touchstart
  for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, () => audio.resume(), { passive: true });
  document.addEventListener('visibilitychange', () => {
    // a hidden tab must be silent: pause the game and suspend all audio until the player returns
    if (document.hidden) { if (mode === 'game') setPaused(true); audio.suspend(); }
    else audio.resume();
  });
}

// ------------------------------------------------------------------ physics event sounds
function eventSound(e) {
  if (mode === 'title' || mode === 'switching') return;   // demo play stays silent under the music
  const pan = panOf(e.ball);
  switch (e.type) {
    case 'bumper': audio.play('bumper', 1, { pan }); rig.kick(0.12); break;
    case 'sling': audio.play('sling', 1, { pan: e.id === 'slingL' ? -0.5 : 0.5 }); rig.kick(0.08); break;
    case 'drop': audio.play('drop', 1, { pan }); break;
    case 'hit': {
      const v = Math.min(1, e.speed / 2.5);
      if (v < 0.04) break;
      const s = e.mat === 'rubber' || e.mat === 'post' ? 'rubber' : e.kind === 'gateBack' ? 'metal' : e.mat === 'metal' ? 'metal' : 'wall';
      audio.play(s, 0.25 + v * 0.9, { pan, rate: 0.9 + v * 0.2 });
      break;
    }
    case 'flipperHit': if (e.speed > 0.25) audio.play('rubber', Math.min(0.7, e.speed / 4), { pan }); break;
    case 'flipperRest': break;
    case 'rollover': audio.play('rollover', 0.9, { pan }); break;
    case 'spin': audio.play('spinner', 0.8, { pan: -0.8, minGap: 0.012 }); break;
    case 'gate': audio.play('gate', 0.7, { pan }); break;
    case 'land': audio.play('ballDrop', Math.min(1, e.speed), { pan }); break;
    case 'ballClick': audio.play('ballClick', Math.min(1, e.speed / 2), { pan }); break;
    case 'plungerRelease': audio.play('plungerRelease', 0.4 + e.pull * 0.6, { pan: 0.8 }); break;
    case 'autoLaunch': audio.play('plungerRelease', 0.9, { pan: 0.8 }); break;
    case 'saucerEject': audio.play('saucerKick', 1, { pan: -0.7 }); table.flash(0, 0.7); break;
    case 'scoopEject': audio.play('vuk', 1, { pan: 0 }); table.flash('both', 0.6); break;
    case 'pathDone': audio.play('ballDrop', 0.8, { pan }); break;
    case 'rampEnter': break;
  }
}

boot().catch(err => {
  console.error(err);
  const el = document.getElementById('loadtext'); if (el) el.textContent = 'Error: ' + err.message;
});
