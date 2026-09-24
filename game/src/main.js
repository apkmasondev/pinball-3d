import * as THREE from 'three';
import { buildLayout } from './layout.js';
import { World } from './physics/world.js';
import { Stage } from './render/stage.js';
import { TableView } from './render/table.js';
import { BallsView } from './render/balls.js';
import { CameraRig } from './render/camera.js';
import { Input } from './input.js';
import { Display } from './game/display.js';
import { Rules, T as RT } from './game/rules.js';
import { Audio } from './audio/audio.js';
import { UI } from './ui/ui.js';
import { Bot } from './game/bot.js';
import { ApronCards } from './render/cards.js';

// ------------------------------------------------------------------ settings
const DEFAULTS = { lang: (navigator.language || 'pl').startsWith('pl') ? 'pl' : 'en', camera: 'player', quality: 'high', balls: 3, master: 0.85, music: 0.65, sfx: 0.9, mute: false };
const settings = (() => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('tsukimi.settings') || '{}') }; } catch (e) { return { ...DEFAULTS }; } })();
const saveSettings = () => { try { localStorage.setItem('tsukimi.settings', JSON.stringify(settings)); } catch (e) { } };

const layout = buildLayout();
const world = new World(layout);
const stage = new Stage(document.getElementById('gl'));
const table = new TableView(layout, world);
const input = new Input();
const display = new Display();
const audio = new Audio(settings);
let rules, rig, balls, ui, bot, cards;
let mode = 'loading';          // loading | title | game | pause | initials
let paused = false;

const halfW = layout.TABLE_W / 2;
const panOf = (b) => b ? Math.max(-1, Math.min(1, b.x / halfW)) * 0.8 : 0;

// ------------------------------------------------------------------ effects
const fx = {
  flashV: 0, flashColor: new THREE.Color(1, 0.8, 0.6), giLevel: 1, giTarget: 1, show: null, showUntil: 0, tilted: false,
  flash(s, color = 0xffd0a0) { this.flashV = Math.max(this.flashV, s); this.flashColor.set(color); ui && ui.flash(s, '#' + new THREE.Color(color).getHexString()); table.flash('both', Math.min(1, 0.5 + s * 0.5)); },
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
  });
  ui.show('loading');
  ui.setLoading(0.05);
  display.lang = settings.lang;
  document.fonts && document.fonts.load('20px "Marcellus"').then(() => display.textCache.clear()).catch(() => { });

  const audioP = (async () => { try { await audio.init(); } catch (e) { console.warn('audio init failed', e); } })();
  await table.build(stage.renderer, (p) => ui.setLoading(0.1 + p * 0.8));
  ui.setLoading(0.92);
  table.root.rotation.x = world.o.slopeDeg * Math.PI / 180;
  stage.scene.add(table.root);
  balls = new BallsView(stage, table.root, layout.BALL_R);
  rig = new CameraRig(stage.camera, table.root);
  rig.setMode(settings.camera);
  stage.setQuality(settings.quality);
  table.addGlass(stage.scene.environment);
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
  table.glass.visible = settings.quality !== 'low';

  // DMD on the backbox
  const dmdTex = new THREE.CanvasTexture(display.canvas);
  dmdTex.colorSpace = THREE.SRGBColorSpace;
  if (table.dyn.dmdScreen) {
    table.dyn.dmdScreen.traverse(o => { if (o.isMesh) o.material = new THREE.MeshBasicMaterial({ map: dmdTex, toneMapped: false }); });
  }
  table.dmdTex = dmdTex;
  cards = new ApronCards(table.root);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => cards.build(settings.lang));
  const hudCtx = ui.dmdCanvas.getContext('2d');
  ui.dmdCanvas.width = display.canvas.width; ui.dmdCanvas.height = display.canvas.height;

  rules = new Rules({
    world, lamps: table.lamps, display, audio, fx, layout, settings,
    onGameOver: () => toTitle(),
    onHighScore: (score) => { mode = 'initials'; display.mode = 'initials'; ui.startInitials(score); display.initials = ui.initials; },
  });
  applyStrings();
  bindInput();
  bot = new Bot(world, layout, input);
  if (import.meta.env.DEV) window.__game = { world, table, stage, rig, rules, audio, display, ui, layout, fx, balls, bot };
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
    audio.updateRolling(mode === 'title' ? [] : world.balls, halfW);
    rig.viewW = innerWidth; rig.viewH = innerHeight;
    rig.hudPx = (mode === 'game' || mode === 'pause') && innerWidth / innerHeight < 1.25 ? hudBottom() : 0;
    rig.update(dt, world.balls, stage.camera.aspect, mode === 'title' ? 1 : 0);
    balls.updateReflection(stage.renderer, stage.scene);
    // display
    if (mode === 'game' || mode === 'pause') { display.mode = rules.state === 'initials' ? 'initials' : 'game'; display.hud = rules.hud(); }
    display.update(dt);
    hudCtx.clearRect(0, 0, ui.dmdCanvas.width, ui.dmdCanvas.height);
    hudCtx.drawImage(display.canvas, 0, 0);
    dmdTex.needsUpdate = true;
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

function applyStrings() {
  const tr = RT[settings.lang] || RT.en;
  display.strings = { ball: tr.ball, highScore: tr.highScore, pressStart: tr.pressStart, enterInitials: tr.enterInitials };
  rules.lang = settings.lang;
  display.hiscores = rules.highScores;
}

function applySetting(k, v) {
  settings[k] = v; saveSettings();
  if (k === 'lang') { applyStrings(); cards && cards.build(v); }
  if (k === 'camera') rig.setMode(v);
  if (k === 'quality') { stage.setQuality(v); if (table.glass) table.glass.visible = v !== 'low'; }
  if (['master', 'music', 'sfx', 'mute'].includes(k)) audio.applyVolumes();
}

// ------------------------------------------------------------------ flow
function toTitle() {
  mode = 'title'; paused = false;
  display.mode = 'attract'; display.hiscores = rules.highScores; display.clearQueue();
  for (const b of [...world.balls]) world.removeBall(b);
  fx.tilted = false; world.tiltDisabled = false; fx.giTarget = 1;
  world.turntable.target = 0.6;
  ui.show('title');
  audio.music('attract');
  demoT = 1.5;
}
let demoT = -1;
function demoTick(dt) {
  // the machine plays itself behind the title screen
  if (mode !== 'title') return;
  if (demoT > 0) { demoT -= dt; if (demoT <= 0) { world.addBall(layout.plunger.x, layout.plunger.ballY); bot.start(true); } return; }
  if (world.balls.length === 0 && demoT <= 0) demoT = 2.0;
}
function startGame() {
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
  if (p) { world.setFlipper('L', false); world.setFlipper('R', false); world.pullPlunger(false); audio.duckMusic(0.6, 0.1); }
}
function quitToTitle() {
  rules.abort();
  toTitle();
}
function submitInitials(name) {
  rules.submitInitials(name);
  audio.play('uiSelect');
}

// ------------------------------------------------------------------ input
function bindInput() {
  const gameActive = () => mode === 'game' && !paused;
  input.on('left', (on) => {
    if (mode === 'initials') { if (on) ui.initialsCycle(-1); return; }
    if (!gameActive()) return;
    world.setFlipper('L', on);
    if (!world.tiltDisabled) audio.play(on ? 'flipperUp' : 'flipperDown', 1, { pan: -0.35 });
    rules.flipper('L', on);
  });
  input.on('right', (on) => {
    if (mode === 'initials') { if (on) ui.initialsCycle(1); return; }
    if (!gameActive()) return;
    world.setFlipper('R', on);
    if (!world.tiltDisabled) audio.play(on ? 'flipperUp' : 'flipperDown', 1, { pan: 0.35 });
    rules.flipper('R', on);
  });
  input.on('plunger', (on, code) => {
    audio.resume();
    if (mode === 'title') { if (on && (code === 'Enter' || code === 'Space' || code === 'NumpadEnter' || code === undefined)) startGame(); return; }
    if (mode === 'initials') { if (on && ui.initialsNext()) submitInitials(ui.initials.letters.join('')); return; }
    if (!gameActive()) return;
    if (world.ballInShooter()) { world.pullPlunger(on); if (on) audio.play('plungerPull'); }
    else if (!on) world.pullPlunger(false);
  });
  input.on('start', (on) => { if (on && mode === 'title') startGame(); });
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
    if (mode === 'game') setPaused(true);
    else if (mode === 'pause') setPaused(false);
    else if (['settings', 'help', 'scores'].includes(ui.screen)) ui.action('back');
  });
  input.on('mute', (on) => { if (on) applySetting('mute', !settings.mute); });
  window.addEventListener('keydown', (e) => {
    if (mode === 'initials') { if (ui.initialsKey(e)) e.preventDefault(); if (e.key === 'Enter') submitInitials(ui.initials.letters.join('')); }
  });
  window.addEventListener('pointerdown', () => audio.resume(), { once: false });
  document.addEventListener('visibilitychange', () => {
    // a hidden tab must be silent: pause the game and suspend all audio until the player returns
    if (document.hidden) { if (mode === 'game') setPaused(true); audio.suspend(); }
    else audio.resume();
  });
}

// ------------------------------------------------------------------ physics event sounds
function eventSound(e) {
  if (mode === 'title') return;   // demo play stays silent under the music
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
