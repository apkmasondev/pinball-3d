// Rules of "Inari — the Golden Fox Forest". Same flow as the other tables (ball save, tilt, bonus,
// multiball jackpots, extra balls); its own objectives:
//   Nine Tails      tails come from the ramp, orbits, shrine, fox masks and fox leaps; nine light
//                   Kyūbi Multiball at the shrine (no locks)
//   Senbon Torii    every torii on the ramp counts; quick ramps chain a multiplier; 50 gates award,
//                   100 gates light an extra ball
//   Lantern Night   the fox-mask bank starts a timed run of lit shots; five make the Lantern Festival
//   Harvest         every 20 jet hits raise the harvest and the Kitsune Guard post between the flippers
//   Fox Leap        a shot from the upper flipper that reaches the jets or the shrine
//   Fox Fire        skill shot: after launch, the first jet hit is the lit one
import { Rules, T as BASE } from './rules.js';

const fmt = (n) => n.toLocaleString('en-US');
const SHOTS = ['ramp', 'orbitL', 'orbitR', 'shrine', 'jets'];

export const T = {
  en: {
    ...BASE.en,
    multiball: 'KYUBI MULTIBALL', jackpot: 'JACKPOT', superJackpot: 'SUPER JACKPOT', ramp: 'SENBON TORII',
    koiLoop: 'FOX RUN', combo: 'COMBO', mystery: 'EMA WISH', shrine: 'SHRINE', lantern: 'HARVEST',
    frenzy: 'LANTERN NIGHT', tsukimi: 'LANTERN NIGHT', bonusDrops: 'MASKS', bonusJets: 'HARVEST', bonusSpinner: 'SPINNER',
    tail: 'TAIL', tails: 'NINE TAILS', kyubiReady: 'SHOOT THE SHRINE', gates: 'GATES', chain: 'CHAIN',
    senbon: 'SENBON TORII', masks: 'FOX MASKS', mask: 'MASK', lanternLit: 'LIT SHOT', festival: 'LANTERN FESTIVAL',
    guard: 'KITSUNE GUARD', leap: 'FOX LEAP', fire: 'FOX FIRE', harvest: 'HARVEST',
    shots: { ramp: 'RAMP', orbitL: 'LEFT ORBIT', orbitR: 'RIGHT ORBIT', shrine: 'SHRINE', jets: 'JETS' },
  },
  pl: {
    ...BASE.pl,
    multiball: 'KYUBI MULTIBALL', jackpot: 'JACKPOT', superJackpot: 'SUPER JACKPOT', ramp: 'SENBON TORII',
    koiLoop: 'LISI BIEG', combo: 'KOMBO', mystery: 'ŻYCZENIE EMA', shrine: 'SANKTUARIUM', lantern: 'ŻNIWA',
    frenzy: 'NOC LAMPIONÓW', tsukimi: 'NOC LAMPIONÓW', bonusDrops: 'MASKI', bonusJets: 'ŻNIWA', bonusSpinner: 'SPINNER',
    tail: 'OGON', tails: 'DZIEWIĘĆ OGONÓW', kyubiReady: 'STRZEL W SANKTUARIUM', gates: 'BRAMY', chain: 'SERIA',
    senbon: 'SENBON TORII', masks: 'MASKI LISA', mask: 'MASKA', lanternLit: 'ZAPALONY STRZAŁ', festival: 'ŚWIĘTO LAMPIONÓW',
    guard: 'STRAŻNIK KITSUNE', leap: 'SKOK LISA', fire: 'LISI OGIEŃ', harvest: 'ŻNIWA',
    shots: { ramp: 'RAMPA', orbitL: 'LEWA ORBITA', orbitR: 'PRAWA ORBITA', shrine: 'SANKTUARIUM', jets: 'BUMPERY' },
  },
};

export class InariRules extends Rules {
  constructor(api) {
    super(api);
    this.T = T;
    this.jpBase0 = 280000; this.superBase = 1200000; this.loopBase = 55000;
    this.modeAnim = 'lanterns';
  }
  _initPlayer(p) { p.tails = 0; p.kyubiReady = false; p.gates = 0; p.gateAwards = 0; p.harvest = 0; p.jetHits = 0; p.maskBanks = 0; p.festivals = 0; p.jpBase = this.jpBase0; }
  _initBall(b) {
    b.masks = [false, false, false]; b.chain = 0; b.lastRampT = -99;
    b.lanternUntil = 0; b.lanternShot = null; b.lanternN = 0; b.guardUntil = 0;
    b.leapT = -99; b.skillJet = Math.floor(Math.random() * 3); b.skillDone = false;
  }
  lanternOn() { return this.b && this.t < this.b.lanternUntil; }

  // no top lanes here: while the ball waits in the shooter the flippers move the Fox Fire to another jet
  flipper(side, on) {
    if (this.state !== 'playing' || !on) return;
    const p = this.p, b = this.b, dir = side === 'R' ? 1 : -1;
    p.lowerLanes = dir > 0 ? [p.lowerLanes[3], ...p.lowerLanes.slice(0, 3)] : [...p.lowerLanes.slice(1), p.lowerLanes[0]];
    if (b.inShooter) { b.skillJet = (b.skillJet + dir + 3) % 3; this.api.audio.play('laneChange', 0.5); }
  }

  _endBall() {
    // timed modes end with the ball, so their lamps do not keep running through the bonus count
    this.b.lanternUntil = 0; this.b.lanternShot = null; this.b.guardUntil = 0;
    super._endBall();
  }

  // ------------------------------------------------------------------ events
  handle(e) {
    if (this.state !== 'playing') { this._idle(e); return; }
    const b = this.b, p = this.p;
    if (e.type === 'flipperHit') {
      if (e.id === 'flipperU' && e.moving) { b.leapT = this.t; b.leapBall = e.ball; }
      return;
    }
    if (e.type === 'rampGate') { b.lastSwitchT = this.t; if (!b.tilted) this._gate(e); return; }
    if (e.type === 'target') { b.lastSwitchT = this.t; if (!b.tilted) this._mask(e); return; }
    if (e.type === 'bumper') { b.lastSwitchT = this.t; if (!b.tilted) this._jet(e); return; }
    super.handle(e);
  }

  _jet(e) {
    const A = this.api, b = this.b, p = this.p;
    b.bumpers++; p.jetHits++;
    const i = +e.id.slice(6);
    this.add(1000 + 500 * p.harvest);
    // Fox Fire: the first jet after the launch is the lit one
    if (this.t < b.skillUntil && !b.skillDone) {
      b.skillDone = true;
      if (i === b.skillJet) {
        p.skillCount++; const v = this.add(75000 + 25000 * (p.skillCount - 1));
        A.audio.play('skillShot'); A.fx.flash(0.8, 0xffc060);
        A.display.show({ big: this.tr('fire'), small: fmt(v), dur: 1.8, prio: 4, anim: 'sparkle' });
      }
      b.skillUntil = 0;
    }
    this._leap('jets');
    this._lanternHit('jets');
    if (p.jetHits % 20 === 0) {
      p.harvest = Math.min(6, p.harvest + 1);
      b.guardUntil = Math.max(b.guardUntil, this.t) + 20;
      A.audio.play('levelUp');
      A.display.show({ big: `${this.tr('harvest')} ${p.harvest}`, small: this.tr('guard'), dur: 1.6, prio: 3, anim: 'rice' });
    }
  }

  _mask(e) {
    const A = this.api, b = this.b, p = this.p;
    const i = +e.id.slice(4);
    b.drops++; this.add(5000);
    A.audio.play('drop', 0.9);
    if (b.masks[i]) return;
    b.masks[i] = true; A.lamps.flash('mask' + i, 0.25);
    if (!b.masks.every(Boolean)) { A.display.pop(`${this.tr('mask')} ${b.masks.filter(Boolean).length}/3`); return; }
    p.maskBanks++;
    const v = this.add(20000 * p.maskBanks);
    A.audio.play('bankComplete');
    this._tails(2, false);
    this.later(900, () => { b.masks = [false, false, false]; A.audio.play('dropReset', 0.6); });
    if (!this.lanternOn() && !b.mb) {
      // Lantern Night: 25 s to hit the lit shots
      b.lanternUntil = this.t + 25; b.lanternN = 0; b.lanternShot = this._nextShot(null);
      A.audio.play('frenzy'); this._music();
      A.display.show({ big: this.tr('frenzy'), small: this.tr('shots')[b.lanternShot], dur: 2.0, prio: 4, anim: 'lanterns' });
    } else A.display.show({ big: this.tr('masks'), small: fmt(v), dur: 1.4, prio: 3, anim: 'fox' });
  }

  _gate(e) {
    const A = this.api, b = this.b;
    this.add(1500 * Math.max(1, b.chain));
    A.audio.play('rollover', 0.5 + e.idx * 0.1, { rate: 1 + e.idx * 0.08 });
    A.lamps.flash('gate' + e.idx, 0.2);
    this._addGates(1);
  }

  // every 50th gate awards, every 100th lights an extra ball; the ema's +10 may step over a mark, which still counts
  _addGates(n) {
    const A = this.api, p = this.p;
    const before = p.gates; p.gates += n;
    for (let g = Math.floor(before / 50) + 1; g <= Math.floor(p.gates / 50); g++) {
      p.gateAwards++;
      const v = this.add(250000 * p.gateAwards);
      A.audio.play('jackpot'); A.fx.flash(0.8, 0xffb050); A.fx.lightShow('jackpot', 1.2);
      let small = `${g * 50} ${this.tr('gates')} · ${fmt(v)}`;
      if (g % 2 === 0 && !p.extraBallLit && p.extraBallAwarded < 2) { p.extraBallLit = true; small = this.tr('extraBallLit'); A.audio.play('knocker'); }
      A.display.show({ big: this.tr('senbon'), small, dur: 2.2, prio: 5, anim: 'torii' });
    }
  }

  // a completed ramp or orbit
  _shot(kind) {
    const A = this.api, b = this.b, p = this.p;
    if (b.tilted) return;
    const now = this.t;
    let combo = b.lastShot && b.lastShot !== kind && now - b.lastShotT < 3.5;
    if (kind === 'ramp') {
      b.ramps++;
      b.chain = now - b.lastRampT < 10 ? Math.min(5, b.chain + 1) : 1; b.lastRampT = now; b.rampShrineT = now;
      const v = this.add(25000 * b.chain);
      A.audio.play('rampMade'); A.fx.flash(0.35, 0xffb060);
      this._tails(1, true);
      if (!this._jackpot(0)) A.display.show({ big: this.tr('senbon'), small: `${this.tr('chain')} ${b.chain}X · ${fmt(v)}`, dur: 1.3, prio: 2, anim: 'torii' });
    } else {
      b.orbits++;
      const v = this.add(15000);
      A.audio.play('orbit');
      this._tails(1, true);
      const other = kind === 'orbitL' ? 'orbitR' : 'orbitL';
      if (b.lastShot === other && now - b.lastShotT < 4) {
        b.loops++; const lv = this.add(this.loopBase * b.loops);
        A.audio.play('koiLoop'); combo = false;
        if (!this._jackpot(kind === 'orbitL' ? 1 : 2)) A.display.show({ big: this.tr('koiLoop'), small: fmt(lv), dur: 1.4, prio: 2, anim: 'fox' });
      } else if (!this._jackpot(kind === 'orbitL' ? 1 : 2)) A.display.show({ big: this.tr('orbit'), small: fmt(v), dur: 1.0, prio: 1 });
    }
    this._lanternHit(kind);
    if (combo) {
      b.comboN = (b.comboN || 0) + 1;
      const v = this.add(25000 * b.comboN);
      A.audio.play('combo');
      A.display.show({ big: this.tr('combo') + ' ' + (b.comboN + 1) + 'X', small: fmt(v), dur: 1.2, prio: 2 });
    } else b.comboN = 0;
    b.lastShot = kind; b.lastShotT = now;
  }

  _tails(n, show) {
    const A = this.api, p = this.p, b = this.b;
    if (b.mb || p.kyubiReady) return;
    p.tails = Math.min(9, p.tails + n);
    if (p.tails >= 9) {
      p.kyubiReady = true;
      A.audio.play('fullMoonReady');
      A.display.show({ big: this.tr('tails'), small: this.tr('kyubiReady'), dur: 2.0, prio: 4, anim: 'fox' });
    } else if (show) A.display.pop(`${this.tr('tail')} ${p.tails}/9`);
  }

  _leap(target) {
    const A = this.api, b = this.b;
    if (this.t - b.leapT > 2.5) return;
    b.leapT = -99;
    const v = this.add(target === 'shrine' ? 150000 : 60000);
    A.audio.play('moonShot'); A.fx.flash(0.5, 0xffd080);
    A.display.show({ big: this.tr('leap'), small: fmt(v), dur: 1.4, prio: 3, anim: 'fox' });
    this._tails(1, false);
  }

  _nextShot(prev) { const opts = SHOTS.filter(s => s !== prev); return opts[Math.floor(Math.random() * opts.length)]; }
  _lanternHit(shot) {
    const A = this.api, b = this.b, p = this.p;
    if (!this.lanternOn() || b.lanternShot !== shot) return;
    b.lanternN++;
    const v = this.add(100000 * b.lanternN);
    A.audio.play('jackpot', 0.7); A.fx.flash(0.6, 0xffb040);
    if (b.lanternN >= 5) {
      p.festivals++;
      const f = this.add(750000 + 250000 * (p.festivals - 1));
      b.lanternUntil = 0; b.lanternShot = null; this._music();
      A.audio.play('superJackpot'); A.fx.lightShow('super', 2.5); A.fx.kick(0.8);
      A.display.show({ big: this.tr('festival'), small: fmt(f), dur: 3.0, prio: 6, anim: 'lanterns' });
      return;
    }
    b.lanternShot = this._nextShot(shot); b.lanternUntil = Math.max(b.lanternUntil, this.t + 12);
    A.display.show({ big: `${this.tr('lanternLit')} ${b.lanternN}/5`, small: `${fmt(v)} · ${this.tr('shots')[b.lanternShot]}`, dur: 1.6, prio: 4, anim: 'lanterns' });
  }

  // the shrine: super jackpot > extra ball > Kyūbi Multiball > lantern shot / ema wish
  _scoop(e) {
    const A = this.api, p = this.p, b = this.b;
    A.audio.play('scoop');
    if (b.tilted) { A.world.holdBall(e.ball, 0.6); return; }
    let hold = 1.0;
    this.add(10000);
    const leap = this.t - b.leapT <= 2.5;
    if (b.mb && b.superLit) {
      b.superLit = false;
      const v = this.add(this.superBase + 250000 * (p.mbCount - 1));
      A.audio.play('superJackpot'); A.fx.flash(1.4, 0xfff0c0); A.fx.kick(1); A.fx.lightShow('super', 3);
      A.display.show({ big: this.tr('superJackpot'), small: fmt(v), dur: 3.0, prio: 6, anim: 'super' });
      b.jpLit = [true, true, true]; p.jpBase *= 2; hold = 2.6;
    } else if (p.extraBallLit) {
      p.extraBallLit = false; p.extraBalls++; p.extraBallAwarded++;
      A.audio.play('extraBall'); A.audio.play('knocker'); A.fx.flash(1.0, 0xff5040);
      A.display.show({ big: this.tr('extraBall'), dur: 2.4, prio: 5, anim: 'sparkle' }); hold = 2.2;
    } else if (p.kyubiReady && !b.mb) {
      p.kyubiReady = false; p.tails = 0; hold = 3.2;
      this._startMultiball();
    } else if (this.lanternOn() && b.lanternShot === 'shrine') {
      this._lanternHit('shrine'); hold = 1.4;
    } else if (!b.mb && !(this.t - (b.rampShrineT ?? -99) < 1.5)) {
      // a direct shot draws an ema wish; the pilgrimage along the ramp is its own reward
      this._ema(); hold = 1.8;
    } else A.display.show({ big: this.tr('shrine'), small: fmt(10000), dur: 0.9, prio: 1 });
    if (leap) this._leap('shrine'); else if (!(this.t - (b.rampShrineT ?? -99) < 1.5)) this._tails(1, true);
    A.world.holdBall(e.ball, hold);
  }

  _ema() {
    const A = this.api, p = this.p, b = this.b;
    p.mysteryCount++;
    const awards = [
      { w: 22, k: 'pts', v: 25000 }, { w: 16, k: 'pts', v: 50000 }, { w: 8, k: 'pts', v: 100000 },
      { w: 10, k: 'kick' }, { w: 10, k: 'save' }, { w: 10, k: 'tails' }, { w: 8, k: 'gates' }, { w: 8, k: 'guard' },
      { w: p.extraBallAwarded || p.extraBallLit ? 0 : (p.mysteryCount > 2 ? 4 : 0), k: 'eb' },
    ].filter(a => a.w > 0);
    let r = Math.random() * awards.reduce((s, a) => s + a.w, 0), aw = awards[0];
    for (const a of awards) { if ((r -= a.w) <= 0) { aw = a; break; } }
    let txt = '';
    switch (aw.k) {
      case 'pts': txt = fmt(this.add(aw.v)) + ' ' + this.tr('points'); break;
      case 'kick': A.world.kickback.lit = true; txt = this.tr('kickbackLit'); break;
      case 'save': b.saveUntil = Math.max(b.saveUntil, this.t + 10); txt = this.tr('ballSaveLit') + ' 10s'; break;
      case 'tails': this._tails(2, false); txt = '+2 ' + this.tr('tail'); break;
      case 'gates': this._addGates(10); txt = '+10 ' + this.tr('gates'); break;
      case 'guard': b.guardUntil = Math.max(b.guardUntil, this.t) + 15; txt = this.tr('guard'); break;
      case 'eb': p.extraBallLit = true; txt = this.tr('extraBallLit'); break;
    }
    A.audio.play('mystery', 0.9, { delay: 0.25 });
    A.display.show({ big: this.tr('mystery'), small: txt, dur: 2.0, prio: 3, anim: 'mystery' });
  }

  _music() {
    const b = this.b, t = this.t;
    if (!b || this.state !== 'playing' || b.tilted) return;
    this.api.audio.music(b.mb ? 'multiball' : t < b.lanternUntil ? 'frenzy' : 'main');
  }

  update(dt) {
    super.update(dt);
    const b = this.b, A = this.api;
    if (!b) return;
    const playing = this.state === 'playing';
    if (b.lanternUntil > 0 && this.t > b.lanternUntil) {
      b.lanternUntil = 0; b.lanternShot = null; this._music();
      if (playing) A.display.show({ big: this.tr('frenzy'), small: this.tr('over'), dur: 1.0, prio: 1 });
    }
    // the guard post stands while the harvest keeps it up (never while tilted)
    const up = playing && !b.tilted && this.t < b.guardUntil;
    const g = A.world.popups && A.world.popups[0];
    if (g && g.up !== up) { g.up = up; A.audio.play(up ? 'kickback' : 'dropReset', 0.6); }
  }

  hud() {
    const h = super.hud(); if (!h) return h;
    const b = this.b, p = this.p;
    h.moon = Math.round(p.tails * 8 / 9);
    h.frenzy = Math.max(0, b.lanternUntil - this.t); h.tsukimi = 0;
    h.lockLit = p.kyubiReady;
    return h;
  }

  _lamps() {
    const A = this.api, L = A.lamps, p = this.p, b = this.b;
    if (!p || !b) return;
    const set = (n, m, o) => L.set(n, m, o);
    const on = (n, cond, mode = 'on') => set(n, cond ? mode : 'off');
    const t = this.t;
    const lantern = t < b.lanternUntil, shot = lantern ? b.lanternShot : null;
    ['outL', 'inL', 'inR', 'outR'].forEach((n, i) => on(n, p.lowerLanes[i]));
    on('kickback', A.world.kickback.lit);
    on('shootAgain', p.extraBalls > 0 || (t < b.saveUntil), t < b.saveUntil && p.extraBalls === 0 ? (b.saveUntil - t < 3 ? 'fastblink' : 'blink') : 'on');
    on('ballSave', t < b.saveUntil, 'blink');
    ['bonus2', 'bonus3', 'bonus4', 'bonus5'].forEach((n, i) => on(n, p.bonusX >= i + 2));
    // nine tails fan; the fox emblem pulses when Kyūbi is ready
    for (let i = 0; i < 9; i++) {
      if (b.mb) set('tail' + i, 'level', { level: Math.floor(t * 9 - i) % 9 === 0 ? 1 : 0.3 });
      else if (p.kyubiReady) on('tail' + i, true, 'fastblink');
      else on('tail' + i, i < p.tails);
    }
    on('kyubiLit', p.kyubiReady || b.mb, b.mb ? 'fastblink' : 'pulse');
    on('extraBall', p.extraBallLit, 'blink');
    // senbon torii: gate lamps glow with the chain, chain ladder
    for (let i = 0; i < 5; i++) on('gate' + i, b.chain > 0 && t - b.lastRampT < 10, 'blink');
    ['chain2', 'chain3', 'chain4', 'chain5'].forEach((n, i) => on(n, b.chain >= i + 2 && t - b.lastRampT < 10, t - b.lastRampT > 7 ? 'fastblink' : 'on'));
    // lanterns ladder and the lit shot
    for (let i = 0; i < 5; i++) on('lantern' + i, lantern && i < b.lanternN, 'on');
    if (lantern) set('lantern' + b.lanternN, 'blink');
    on('lanternLit', lantern, b.lanternUntil - t < 4 ? 'fastblink' : 'pulse');
    const shrineHot = p.kyubiReady || b.superLit || p.extraBallLit || shot === 'shrine';
    on('shrineRing', shrineHot || true, shrineHot ? 'fastblink' : 'pulse');
    on('superJp', b.superLit, 'fastblink');
    const chase = (names, active, speed = 5) => names.forEach((n, i) => set(n, active ? 'level' : 'off', { level: active ? (Math.floor(t * speed - i) % names.length === 0 ? 1 : 0.15) : 0 }));
    chase(['shrine1', 'shrine2', 'shrine3'], shrineHot, 6);
    const comboOpen = b.lastShot && t - b.lastShotT < 3.5;
    chase(['orbitL1', 'orbitL2'], (b.mb && b.jpLit[1]) || shot === 'orbitL' || (comboOpen && b.lastShot !== 'orbitL'));
    chase(['orbitR1', 'orbitR2'], (b.mb && b.jpLit[2]) || shot === 'orbitR' || (comboOpen && b.lastShot !== 'orbitR'));
    on('orbitLjp', b.mb && b.jpLit[1], 'blink'); on('orbitRjp', b.mb && b.jpLit[2], 'blink');
    on('rampArrow', (b.mb && b.jpLit[0]) || shot === 'ramp' || (comboOpen && b.lastShot !== 'ramp'), 'fastblink');
    on('rampJp', b.mb && b.jpLit[0], 'blink');
    on('jetArrow', shot === 'jets', 'fastblink');
    for (let i = 0; i < 3; i++) on('jet' + i, (b.inShooter || t < b.skillUntil) && !b.skillDone && i === b.skillJet, 'fastblink');
    b.masks.forEach((m, i) => on('mask' + i, m));
    on('masksLit', !lantern && !b.mb, 'pulse');
    on('foxLeap', t - b.leapT < 2.5, 'fastblink');
    on('guardLit', t < b.guardUntil, b.guardUntil - t < 4 ? 'fastblink' : 'on');
    for (let i = 0; i < 3; i++) on('harvest' + i, p.harvest > i * 2, 'on');
    on('orbitTopL', b.orbits > 0); on('orbitTopR', b.ramps > 0);
    on('spinL1', lantern, 'blink'); on('spinL2', lantern, 'blink');
    on('skill1', b.inShooter, 'blink'); on('skill2', b.inShooter, 'blink');
    ['launch1', 'launch2', 'launch3'].forEach((n, i) => set(n, b.inShooter ? 'level' : 'off', { level: Math.floor(t * 6 - i) % 3 === 0 ? 1 : 0.1 }));
    on('plungerLamp', b.inShooter, 'pulse');
    set('kitsune', 'level', { level: p.kyubiReady ? 0.6 + 0.4 * Math.sin(t * 4) : b.mb ? 1 : 0.2 + p.tails / 9 * 0.6 });
    A.fx.bumperLit && A.fx.bumperLit(0.25 + p.harvest * 0.12 + (shot === 'jets' ? 0.5 : 0));
    A.fx.gi && A.fx.gi(b.tilted ? 0.1 : lantern ? 0.55 : 1);
  }
}
