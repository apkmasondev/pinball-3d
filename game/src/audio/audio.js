import MANIFEST from './manifest.json';
import { MusicPlayer, MENU_CUE, MENU_SONG } from './music.js';

const BASE = `${import.meta.env.BASE_URL}assets/audio/`;

// Per-sound mixing: volume, pitch jitter, bus
const DEF = {
  flipperUp: { v: 0.75, j: 0.04 }, flipperDown: { v: 0.35, j: 0.05 }, bumper: { v: 0.85, j: 0.05 }, sling: { v: 0.8, j: 0.05 },
  drop: { v: 0.8, j: 0.04 }, rubber: { v: 0.5, j: 0.08 }, wall: { v: 0.45, j: 0.08 }, metal: { v: 0.4, j: 0.06 }, rollover: { v: 0.45, j: 0.06 },
  spinner: { v: 0.5, j: 0.03 }, gate: { v: 0.5, j: 0.06 }, plungerPull: { v: 0.5 }, plungerRelease: { v: 0.8 }, ballClick: { v: 0.55, j: 0.08 },
  ballDrop: { v: 0.7, j: 0.05 }, saucer: { v: 0.8 }, scoop: { v: 0.85 }, saucerKick: { v: 0.8 }, vuk: { v: 0.8 }, kickback: { v: 0.9 },
  drain: { v: 0.8 }, drainSoft: { v: 0.5 }, ballServe: { v: 0.55 }, dropReset: { v: 0.7 }, knocker: { v: 0.9 }, ballSearch: { v: 0.4 },
  bonusTick: { v: 0.6, seq: true },
};

export class Audio {
  constructor(settings) {
    this.s = settings;
    this.ctx = null; this.buffers = new Map(); this.variants = new Map();
    this.ready = false; this.pendingMusic = null; this.curMusic = null; this.musicName = null;
    this.rolls = new Map();
    this.seq = {};
    this.lastPlay = new Map();
  }
  async init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const c = this.ctx;
    this.master = c.createGain(); this.master.connect(c.destination);
    // gentle bus compression keeps the mechanical hits punchy without clipping
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.knee.value = 10; this.comp.ratio.value = 3; this.comp.attack.value = 0.003; this.comp.release.value = 0.18;
    this.comp.connect(this.master);
    this.sfx = c.createGain(); this.sfx.connect(this.comp);
    this.mus = c.createGain(); this.mus.connect(this.master);
    this.duck = c.createGain(); this.duck.connect(this.mus);
    this.applyVolumes();
    this.player = new MusicPlayer(c, this.duck);
    await Promise.all([this._loadAll(), this.player.load(this.songs || undefined).catch(e => console.warn('music load failed', e))]);
    this.ready = true;
    if (this.pendingMusic) { const m = this.pendingMusic; this.pendingMusic = null; this.musicName = m; this.player.play(m); }
  }
  resume() { if (this.ctx && this.ctx.state !== 'running' && !document.hidden) this.ctx.resume(); }
  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  applyVolumes() {
    if (!this.ctx) return;
    const s = this.s;
    const m = s.mute ? 0 : s.master;
    this.master.gain.setTargetAtTime(m, this.ctx.currentTime, 0.02);
    this.sfx.gain.setTargetAtTime(s.sfx, this.ctx.currentTime, 0.02);
    this.mus.gain.setTargetAtTime(s.music * 0.8, this.ctx.currentTime, 0.02);
  }
  async _loadAll() {
    const c = this.ctx;
    await Promise.all(MANIFEST.map(async (f) => {
      try {
        const r = await fetch(BASE + f);
        const ab = await r.arrayBuffer();
        const buf = await c.decodeAudioData(ab);
        const name = f.replace(/\.(wav|mp3)$/, '');
        this.buffers.set(name, buf);
        const base = name.replace(/_\d+$/, '');
        if (!this.variants.has(base)) this.variants.set(base, []);
        this.variants.get(base).push(buf);
      } catch (e) { console.warn('audio load failed', f, e); }
    }));
    // bonus ticks are an ascending sequence
    this.bonusTicks = Array.from({ length: 8 }, (_, i) => this.buffers.get('bonusTick_' + i)).filter(Boolean);
  }

  play(name, vol = 1, opts = {}) {
    if (!this.ready) return;
    const c = this.ctx;
    const d = DEF[name] || { v: 0.8 };
    let buf;
    if (name === 'bonusTick') { this.seq.bonus = ((this.seq.bonus ?? -1) + 1) % this.bonusTicks.length; buf = this.bonusTicks[this.seq.bonus]; }
    else {
      const vs = this.variants.get(name);
      if (!vs || !vs.length) return;
      buf = vs[Math.floor(Math.random() * vs.length)];
    }
    if (!buf) return;
    // rate-limit identical sounds (e.g. many wall hits within one frame)
    const now = c.currentTime;
    const last = this.lastPlay.get(name) || 0;
    if (now - last < (opts.minGap ?? 0.018)) return;
    this.lastPlay.set(name, now);
    const src = c.createBufferSource(); src.buffer = buf;
    const j = d.j || 0;
    src.playbackRate.value = (opts.rate || 1) * (1 + (Math.random() * 2 - 1) * j);
    const g = c.createGain(); g.gain.value = d.v * vol;
    let node = g;
    if (opts.pan !== undefined && c.createStereoPanner) {
      const p = c.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, opts.pan)); g.connect(p); node = p;
    }
    src.connect(g); node.connect(this.sfx);
    src.start(now + (opts.delay || 0));
    if (opts.duck) this.duckMusic(opts.duck);
  }

  duckMusic(amount = 0.5, dur = 1.2) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, g = this.duck.gain;
    g.cancelScheduledValues(t); g.setTargetAtTime(1 - amount, t, 0.03); g.setTargetAtTime(1, t + dur, 0.4);
  }

  // music sits lower for as long as the game is paused
  pauseDuck(on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, g = this.duck.gain;
    g.cancelScheduledValues(t); g.setTargetAtTime(on ? 0.4 : 1, t, on ? 0.08 : 0.3);
  }

  // Tables own gameplay cues; menu music belongs to the application.
  setTable(def) {
    this.cueMap = def.music || {};
    this.songs = def.songs ? [...new Set([MENU_SONG, ...def.songs])] : undefined;
    if (this.player) {
      // a decoded song holds ~60 MB: keep only the menu song and this table's own
      if (this.songs) this.player.release(this.songs);
      this.player.load(this.songs).catch(e => console.warn('music load failed', e));
    }
  }
  music(name) {
    const cue = name === 'menu' ? MENU_CUE : (this.cueMap?.[name] ?? name);
    if (!this.ready) { this.pendingMusic = cue; return; }
    if (cue === this.musicName) return;
    this.musicName = cue;
    this.player && this.player.play(cue);
  }

  // continuous rolling noise per ball: volume & rate follow speed, voice follows surface
  // ramp: the layout's ramp, whose plastic part (in metres of path) sounds different from the wire habitrail
  updateRolling(balls, tableHalfW, ramp) {
    if (!this.ready) return;
    const c = this.ctx, t = c.currentTime;
    const stamp = this._rollStamp = (this._rollStamp || 0) + 1;
    for (const b of balls) {
      let r = this.rolls.get(b.id);
      if (!r) {
        r = { voices: {}, vol: -1, rate: -1, pan: -9 };
        for (const k of ['roll', 'wireRoll', 'rampRoll']) {
          const buf = this.buffers.get(k); if (!buf) continue;
          const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
          src.loopStart = 0; src.loopEnd = buf.duration;
          const g = c.createGain(); g.gain.value = 0;
          const p = c.createStereoPanner ? c.createStereoPanner() : null;
          src.connect(g); if (p) { g.connect(p); p.connect(this.sfx); } else g.connect(this.sfx);
          src.start(t + Math.random() * 0.1, Math.random() * buf.duration);
          r.voices[k] = { src, g, p };
        }
        this.rolls.set(b.id, r);
      }
      r.stamp = stamp;
      const sp = Math.hypot(b.vx, b.vy);
      let surface = 'roll';
      if (b.mode === 'path') {
        const plastic = ramp ? ramp.plasticLength ?? b.path.length * ramp.plasticUntil : b.path.length * 0.43;
        surface = (b.pathId === 'ramp' && b.s < plastic) ? 'rampRoll' : 'wireRoll';
      }
      const onGround = b.mode === 'field' ? b.z < 0.002 : b.mode === 'path';
      const vol = onGround ? Math.min(1, sp / 2.2) ** 1.3 * (surface === 'roll' ? 0.55 : 0.75) : 0;
      const rate = 0.55 + Math.min(1.6, sp * 0.45), pan = Math.max(-1, Math.min(1, b.x / tableHalfW)) * 0.7;
      // schedule automation only on an audible change: a new event per param per frame piles up in the audio thread
      const volCh = Math.abs(vol - r.vol) > 0.01 || surface !== r.surface, rateCh = Math.abs(rate - r.rate) > 0.01, panCh = Math.abs(pan - r.pan) > 0.02;
      if (volCh) { r.vol = vol; r.surface = surface; }
      if (rateCh) r.rate = rate;
      if (panCh) r.pan = pan;
      for (const k in r.voices) {
        const V = r.voices[k];
        if (volCh) V.g.gain.setTargetAtTime(k === surface ? vol : 0, t, 0.04);
        if (rateCh) V.src.playbackRate.setTargetAtTime(rate, t, 0.05);
        if (panCh && V.p) V.p.pan.setTargetAtTime(pan, t, 0.05);
      }
    }
    for (const [id, r] of this.rolls) if (r.stamp !== stamp) {
      for (const k in r.voices) { const V = r.voices[k]; V.g.gain.setTargetAtTime(0, t, 0.03); setTimeout(() => { try { V.src.stop(); } catch (e) { } }, 300); }
      this.rolls.delete(id);
    }
  }
}
