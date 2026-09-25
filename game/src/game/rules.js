// Game rules for "Tsukimi". Consumes physics events, drives lamps, display, audio and effects.
import { BALL_R } from '../layout.js';

export const T = {
  en: {
    ballSaved: 'BALL SAVED', skill: 'SKILL SHOT', lock: 'LOCK IS LIT', locked: 'BALL LOCKED', multiball: 'MOON MULTIBALL',
    jackpot: 'JACKPOT', superJackpot: 'SUPER JACKPOT', frenzy: 'KOI FRENZY', tsukimi: 'TSUKIMI', fullMoon: 'FULL MOON',
    fullMoonReady: 'SHOOT THE SHRINE', mystery: 'MYSTERY', extraBall: 'EXTRA BALL', extraBallLit: 'EXTRA BALL LIT',
    shootAgain: 'SHOOT AGAIN', tilt: 'TILT', danger: 'DANGER', bonus: 'BONUS', bonusX: 'BONUS X', kickbackLit: 'KICKBACK LIT',
    koiLoop: 'KOI LOOP', combo: 'MOON COMBO', ramp: 'MOON BRIDGE', orbit: 'ORBIT', lanes: 'TSU-KI-MI', gameOver: 'GAME OVER',
    ball: 'BALL', player: 'PLAYER', highScore: 'HIGH SCORE', enterInitials: 'ENTER INITIALS', lantern: 'LANTERN LEVEL',
    moonPhase: 'MOON PHASE', total: 'TOTAL', pressStart: 'PRESS START', ballSaveLit: 'BALL SAVE', lockN: 'LOCK', jackpotsLit: 'JACKPOTS LIT',
    points: 'POINTS', koiBank: 'KOI COMPLETE', timeLeft: 'TIME',
    tsukimiSub: '2X · MOON SHOTS 100K', moonShot: 'MOON SHOT', shrine: 'SHRINE', over: 'OVER', complete: 'COMPLETE',
    bonusDrops: 'KOI', bonusJets: 'LANTERNS', bonusSpinner: 'SPINNER',
  },
  pl: {
    ballSaved: 'KULKA URATOWANA', skill: 'SKILL SHOT', lock: 'LOCK AKTYWNY', locked: 'KULKA ZABLOKOWANA', multiball: 'MOON MULTIBALL',
    jackpot: 'JACKPOT', superJackpot: 'SUPER JACKPOT', frenzy: 'SZAŁ KOI', tsukimi: 'TSUKIMI', fullMoon: 'PEŁNIA',
    fullMoonReady: 'STRZEL W CHRAM', mystery: 'NIESPODZIANKA', extraBall: 'DODATKOWA KULKA', extraBallLit: 'EXTRA BALL AKTYWNY',
    shootAgain: 'GRAJ JESZCZE RAZ', tilt: 'TILT', danger: 'UWAGA', bonus: 'BONUS', bonusX: 'MNOŻNIK', kickbackLit: 'KICKBACK AKTYWNY',
    koiLoop: 'PĘTLA KOI', combo: 'KOMBO', ramp: 'KSIĘŻYCOWY MOST', orbit: 'ORBITA', lanes: 'TSU-KI-MI', gameOver: 'KONIEC GRY',
    ball: 'KULKA', player: 'GRACZ', highScore: 'REKORD', enterInitials: 'WPISZ INICJAŁY', lantern: 'POZIOM LATARNI',
    moonPhase: 'FAZA KSIĘŻYCA', total: 'SUMA', pressStart: 'NACIŚNIJ START', ballSaveLit: 'OCHRONA KULKI', lockN: 'LOCK', jackpotsLit: 'JACKPOTY AKTYWNE',
    points: 'PKT', koiBank: 'KOI KOMPLET', timeLeft: 'CZAS',
    tsukimiSub: '2X · MOON SHOTS 100K', moonShot: 'MOON SHOT', shrine: 'CHRAM', over: 'KONIEC', complete: 'UKOŃCZONY',
    bonusDrops: 'KOI', bonusJets: 'LATARNIE', bonusSpinner: 'SPINNER',
  },
};

const fmt = (n) => n.toLocaleString('en-US');

export class Rules {
  constructor(api) {
    this.api = api; // { world, lamps, display, audio, fx, layout, settings, onGameOver, table }
    this.def = api.table || {};
    this.T = T;
    this.jpBase0 = 250000; this.superBase = 1000000; this.loopBase = 50000;
    this.timers = [];
    this.state = 'attract';
    this.hsKey = this.def.hsKey || 'tsukimi.hiscores';
    this.highScores = loadHighScores(this.hsKey, this.def.hsDefault);
    this.t = 0;
    this.lang = api.settings.lang || 'en';
  }
  tr(k) { const S = this.T; return (S[this.lang] || S.en)[k] || S.en[k] || T.en[k] || k; }
  // table hooks: extra per-player / per-ball state
  _initPlayer(p) { }
  _initBall(b) { }

  // ------------------------------------------------------------------ game flow
  startGame() {
    const w = this.api.world;
    this.timers = [];
    for (const b of [...w.balls]) w.removeBall(b);
    this.state = 'playing';
    this.p = {
      score: 0, ball: 1, balls: this.api.settings.balls || 3, extraBalls: 0, extraBallLit: false, extraBallAwarded: 0,
      bonusX: 1, lanes: [false, false, false], lowerLanes: [false, false, false, false],
      lockLit: false, locked: 0, mbCount: 0, moon: 0, fullMoonReady: false, lanternLevel: 0, bumperHits: 0,
      dropBanks: 0, skillCount: 0, tiltWarnings: 0, mysteryCount: 0, jpBase: this.jpBase0,
    };
    this._initPlayer(this.p);
    this.api.world.kickback.lit = true;
    this.api.audio.play('start');
    this.api.audio.music('main');
    this.api.display.clearQueue();
    this.api.display.show({ big: this.tr('ball') + ' 1', small: this.def.name || 'TSUKIMI', dur: 1.6, anim: this.modeAnim || 'moonrise' });
    this._startBall(true);
  }

  _startBall(first = false) {
    const p = this.p;
    this.b = {
      ramps: 0, orbits: 0, drops: 0, lanes: 0, bumpers: 0, spins: 0, loops: 0, jackpots: 0,
      saveUntil: 0, saveArmed: true, skillLane: Math.floor(Math.random() * 3), skillUntil: 0, inShooter: true,
      tiltMeter: 0, tilted: false, lastShot: null, lastShotT: -9, lastSwitchT: this.t,
      mb: false, jpLit: [false, false, false], superLit: false, jpCollected: 0,
      frenzyUntil: 0, tsukimiUntil: 0, pendingBalls: 0, bonusCounting: false,
    };
    this._initBall(this.b);
    this.api.world.tiltDisabled = false;
    this.api.fx.tilt(false);
    for (const d of this.api.world.drops) { d.up = true; }
    this.api.world.segs.filter(s => s.kind === 'drop').forEach(s => s.enabled = true);
    this.api.world.turntable.target = 0;
    this.serveBall();
    this._lamps();
  }

  serveBall(auto = false) {
    const w = this.api.world, L = this.api.layout;
    if (this.state !== 'playing') return;
    // make sure the lane is clear
    if (w.ballInShooter()) { this.b.pendingBalls++; return; }
    const ball = w.addBall(L.plunger.x, L.plunger.ballY);
    ball.autoServed = auto;
    if (!auto) this.b.inShooter = true;
    this.api.audio.play('ballServe');
    if (auto) this.later(700, () => this.api.world.autoLaunch(0.86 + Math.random() * 0.1));
  }

  activeBalls() { return this.api.world.balls.filter(b => b.mode !== 'gone').length; }

  // ------------------------------------------------------------------ scoring
  add(points, opts = {}) {
    if (this.state !== 'playing' || this.b.tilted) return 0;
    let mult = 1;
    if (this.t < this.b.tsukimiUntil) mult *= 2;
    const v = Math.round(points * mult);
    this.p.score += v;
    if (opts.show) this.api.display.pop(fmt(v));
    return v;
  }

  // ------------------------------------------------------------------ physics events
  handle(e) {
    const A = this.api;
    if (this.state !== 'playing') {
      // attract-mode physics (demo balls) still make noise
      return;
    }
    const b = this.b, p = this.p;
    const tilted = b.tilted;
    if (!['hit', 'flipperHit', 'flipperEOS', 'flipperRest', 'land', 'ballClick'].includes(e.type)) b.lastSwitchT = this.t;
    switch (e.type) {
      case 'bumper': {
        if (tilted) break;
        b.bumpers++; p.bumperHits++;
        const frenzy = this.t < b.frenzyUntil ? 5 : 1;
        this.add((1000 + 250 * p.lanternLevel) * frenzy);
        if (p.bumperHits % 30 === 0 && p.lanternLevel < 5) {
          p.lanternLevel++; A.audio.play('levelUp');
          A.display.show({ big: this.tr('lantern') + ' ' + (p.lanternLevel + 1), small: fmt(1000 + 250 * p.lanternLevel) + ' ' + this.tr('points'), dur: 1.4, prio: 2 });
        }
        break;
      }
      case 'sling': if (!tilted) this.add(110); break;
      case 'drop': {
        if (tilted) break;
        b.drops++; this.add(3000);
        A.lamps.flash('drops', 0.2);
        const w = A.world;
        if (w.drops.every(d => !d.up)) {
          p.dropBanks++;
          const v = this.add(20000 * p.dropBanks);
          A.audio.play('bankComplete');
          this._startFrenzy();
          if (!p.lockLit && !b.mb) { p.lockLit = true; A.audio.play('lockLit', 0.4); }
          A.display.show({ big: this.tr('koiBank'), small: fmt(v), dur: 1.5, prio: 3, anim: 'koi' });
          this.later(1400, () => this._resetDrops());
        }
        break;
      }
      case 'rollover': this._rollover(e); break;
      case 'spinnerPass': break;
      case 'spin': if (!tilted) { b.spins++; this.add(this.t < b.frenzyUntil ? 1500 : 150); } break;
      case 'rampEnter': A.audio.play('rampEnter'); break;
      case 'pathDone':
        if (e.id === 'ramp') this._shot('ramp');
        break;
      case 'pathFail': A.audio.play('rampFail'); break;
      case 'saucer': this._saucer(e); break;
      case 'scoop': this._scoop(e); break;
      case 'kickback':
        A.audio.play('kickback'); A.fx.flash(0.6, 0xff6030); A.fx.kick(0.4);
        A.display.show({ big: 'KICKBACK', dur: 0.9, prio: 1 });
        break;
      case 'drain': this._drain(e); break;
      case 'gate': break;
    }
  }

  _rollover(e) {
    const A = this.api, b = this.b, p = this.p;
    if (b.tilted) return;
    const topIds = ['laneTSU', 'laneKI', 'laneMI'];
    const lowIds = ['outL', 'inL', 'inR', 'outR'];
    const ti = topIds.indexOf(e.id);
    if (ti >= 0) {
      if (e.vy > 0.05) return; // only balls rolling down through the lane
      b.lanes++;
      if (this.t < b.skillUntil && ti === b.skillLane) {
        p.skillCount++;
        const v = this.add(50000 + 25000 * (p.skillCount - 1));
        A.audio.play('skillShot'); A.fx.flash(0.8, 0xffe0a0);
        A.display.show({ big: this.tr('skill'), small: fmt(v), dur: 2.0, prio: 4, anim: 'sparkle' });
        b.skillUntil = 0;
      }
      if (!p.lanes[ti]) { p.lanes[ti] = true; this.add(4000); A.audio.play('laneLit'); }
      else { this.add(1000); A.audio.play('lane'); }
      if (p.lanes.every(Boolean)) {
        p.lanes = [false, false, false];
        const v = this.add(25000);
        if (p.bonusX < 6) p.bonusX++;
        if (!b.mb) p.lockLit = true;
        A.audio.play('laneComplete');
        A.display.show({ big: this.tr('lanes'), small: `${this.tr('bonusX')} ${p.bonusX}X` + (!b.mb ? ' · ' + this.tr('lock') : ''), dur: 1.8, prio: 3, anim: 'lanes' });
        A.lamps.flash('lock1', 0.6);
      }
      return;
    }
    const li = lowIds.indexOf(e.id);
    if (li >= 0) {
      if (e.vy > 0) return;
      const out = li === 0 || li === 3;
      this.add(out ? 10000 : 2500);
      A.audio.play(out ? 'outlane' : 'lane');
      p.lowerLanes[li] = true;
      if (p.lowerLanes.every(Boolean)) {
        p.lowerLanes = [false, false, false, false];
        if (p.bonusX < 6) p.bonusX++;
        let msg = `${this.tr('bonusX')} ${p.bonusX}X`;
        if (!A.world.kickback.lit) { A.world.kickback.lit = true; msg = this.tr('kickbackLit'); }
        A.audio.play('laneComplete');
        A.display.show({ big: msg, dur: 1.4, prio: 2 });
      }
      return;
    }
    if (e.id === 'shooterSw') {
      if (e.vy > 0.3) {
        e.ball.launchedAt = this.t;
        // ball launched: skill shot window + ball save starts
        if (b.inShooter) {
          b.inShooter = false; b.launchT = this.t;
          b.skillUntil = this.t + 5;
          if (b.saveArmed) { b.saveUntil = this.t + 12; b.saveArmed = false; }
          A.audio.play('launch');
        }
      }
      return;
    }
    if (e.id === 'orbitL' && e.vy > 0.2) { b.orbitLT = this.t; return; }
    if (e.id === 'orbitR') {
      if (e.vy < -0.2 && b.orbitLT && this.t - b.orbitLT < 3.5) { b.orbitLT = 0; this._shot('orbitL'); }
      else if (e.vy > 0.2 && !(e.ball.launchedAt !== undefined && this.t - e.ball.launchedAt < 3) && !b.inShooter) this._shot('orbitR');
    }
  }

  // a completed major shot
  _shot(kind) {
    const A = this.api, b = this.b, p = this.p;
    if (b.tilted) return;
    const now = this.t;
    let combo = false;
    if (b.lastShot && b.lastShot !== kind && now - b.lastShotT < 3.5) combo = true;
    // left orbit completes when the ball exits the right orbit mouth after entering left, handled as orbitR exit
    if (kind === 'ramp') {
      b.ramps++;
      const v = this.add(Math.min(60000, 20000 + 5000 * (b.ramps - 1)));
      A.audio.play('rampMade'); A.fx.flash(0.35, 0xffc070);
      this._moon(1);
      if (!this._jackpot(0)) A.display.show({ big: this.tr('ramp'), small: fmt(v), dur: 1.2, prio: 1, anim: 'bridge' });
    } else if (kind === 'orbitL' || kind === 'orbitR') {
      b.orbits++;
      const v = this.add(15000);
      A.audio.play('orbit');
      this._moon(1);
      const other = kind === 'orbitL' ? 'orbitR' : 'orbitL';
      if (b.lastShot === other && now - b.lastShotT < 4) {
        b.loops++; const lv = this.add(this.loopBase * b.loops);
        A.audio.play('koiLoop'); combo = false;
        if (!this._jackpot(kind === 'orbitL' ? 1 : 2)) A.display.show({ big: this.tr('koiLoop'), small: fmt(lv), dur: 1.4, prio: 2, anim: 'koi' });
      } else if (!this._jackpot(kind === 'orbitL' ? 1 : 2)) A.display.show({ big: this.tr('orbit'), small: fmt(v), dur: 1.0, prio: 1 });
    }
    if (this.t < b.tsukimiUntil) {
      const v = this.add(100000);
      A.audio.play('moonShot'); A.display.show({ big: this.tr('moonShot'), small: fmt(v), dur: 1.2, prio: 3, anim: this.modeAnim || 'moonrise' });
    }
    if (combo) {
      b.comboN = (b.comboN || 0) + 1;
      const v = this.add(25000 * b.comboN);
      A.audio.play('combo');
      A.display.show({ big: this.tr('combo') + ' ' + (b.comboN + 1) + 'X', small: fmt(v), dur: 1.2, prio: 2 });
    } else b.comboN = 0;
    b.lastShot = kind; b.lastShotT = now;
  }

  _jackpot(idx) {
    const A = this.api, b = this.b, p = this.p;
    if (!b.mb || !b.jpLit[idx]) return false;
    b.jpLit[idx] = false; b.jpCollected++; b.jackpots++;
    const v = this.add(p.jpBase + 50000 * (b.jpCollected - 1));
    A.audio.play('jackpot'); A.fx.flash(1.0, 0xffd080); A.fx.kick(0.6); A.fx.lightShow('jackpot', 1.6);
    A.display.show({ big: this.tr('jackpot'), small: fmt(v), dur: 2.2, prio: 5, anim: 'jackpot' });
    if (b.jpLit.every(x => !x)) { b.superLit = true; A.audio.play('superLit', 0.5); }
    return true;
  }

  _moon(n) {
    const p = this.p, A = this.api;
    if (this.t < this.b.tsukimiUntil) return;
    const before = p.moon;
    p.moon = Math.min(8, p.moon + n);
    if (p.moon >= 8 && before < 8) {
      p.fullMoonReady = true;
      A.audio.play('fullMoonReady');
      A.display.show({ big: this.tr('fullMoon'), small: this.tr('fullMoonReady'), dur: 2.0, prio: 3, anim: 'moonrise' });
    } else if (p.moon !== before) A.display.pop(`${this.tr('moonPhase')} ${p.moon}/8`);
  }

  _startFrenzy() {
    const A = this.api, b = this.b;
    const already = this.t < b.frenzyUntil;
    b.frenzyUntil = Math.max(this.t, b.frenzyUntil) + (already ? 10 : 20);
    A.world.turntable.target = 7.0;
    A.audio.play('frenzy');
    this._music();
  }

  _resetDrops() {
    const w = this.api.world;
    for (const d of w.drops) d.up = true;
    w.segs.filter(s => s.kind === 'drop').forEach(s => s.enabled = true);
    this.api.audio.play('dropReset');
  }

  _saucer(e) {
    const A = this.api, p = this.p, b = this.b;
    A.audio.play('saucer');
    if (b.tilted) { A.world.holdBall(e.ball, 0.5); return; }
    p.mysteryCount++;
    const awards = [
      { w: 22, k: 'pts', v: 25000 }, { w: 16, k: 'pts', v: 50000 }, { w: 8, k: 'pts', v: 100000 },
      { w: 10, k: 'kick' }, { w: 10, k: 'bx' }, { w: 10, k: 'save' }, { w: 8, k: 'lantern' },
      { w: 8, k: 'moon' }, { w: 6, k: 'lock' }, { w: p.extraBallAwarded || p.extraBallLit ? 0 : (p.mysteryCount > 2 ? 4 : 0), k: 'eb' },
    ].filter(a => a.w > 0);
    let r = Math.random() * awards.reduce((s, a) => s + a.w, 0), aw = awards[0];
    for (const a of awards) { if ((r -= a.w) <= 0) { aw = a; break; } }
    let txt = '';
    switch (aw.k) {
      case 'pts': txt = fmt(this.add(aw.v)) + ' ' + this.tr('points'); break;
      case 'kick': A.world.kickback.lit = true; txt = this.tr('kickbackLit'); break;
      case 'bx': p.bonusX = Math.min(6, p.bonusX + 1); txt = `${this.tr('bonusX')} ${p.bonusX}X`; break;
      case 'save': b.saveUntil = Math.max(b.saveUntil, this.t + 12); txt = this.tr('ballSaveLit') + ' 12s'; break;
      case 'lantern': p.lanternLevel = Math.min(5, p.lanternLevel + 1); txt = this.tr('lantern') + ' ' + (p.lanternLevel + 1); break;
      case 'moon': this._moon(2); txt = this.tr('moonPhase') + ' +2'; break;
      case 'lock': if (!b.mb) { p.lockLit = true; txt = this.tr('lock'); } else { txt = fmt(this.add(75000)); } break;
      case 'eb': p.extraBallLit = true; txt = this.tr('extraBallLit'); break;
    }
    A.audio.play('mystery', 0.9, { delay: 0.25 });
    A.display.show({ big: this.tr('mystery'), small: txt, dur: 2.0, prio: 3, anim: 'mystery' });
    A.world.holdBall(e.ball, 1.6);
  }

  _scoop(e) {
    const A = this.api, p = this.p, b = this.b;
    A.audio.play('scoop');
    let hold = 0.9;
    if (b.tilted) { A.world.holdBall(e.ball, 0.6); return; }
    this.add(10000);
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
    } else if (p.fullMoonReady && !b.mb) {
      p.fullMoonReady = false; p.moon = 0;
      b.tsukimiUntil = this.t + 30;
      A.world.turntable.target = 4.0;
      A.audio.play('tsukimiStart'); this._music();
      A.fx.lightShow('tsukimi', 2.5);
      A.display.show({ big: this.tr('tsukimi'), small: this.tr('tsukimiSub'), dur: 2.8, prio: 5, anim: this.modeAnim || 'moonrise' }); hold = 2.8;
    } else if (p.lockLit && !b.mb) {
      p.locked++;
      A.audio.play('lock'); A.fx.flash(0.6, 0xff8080);
      if (p.locked >= 2) {
        p.locked = 0; p.lockLit = false;
        hold = 3.2;
        this._startMultiball();
      } else {
        A.display.show({ big: this.tr('locked'), small: `${this.tr('lockN')} ${p.locked}/2`, dur: 1.8, prio: 4, anim: 'lock' }); hold = 1.6;
      }
    } else {
      A.display.show({ big: this.tr('shrine'), small: fmt(10000), dur: 0.9, prio: 1 });
    }
    A.world.holdBall(e.ball, hold);
  }

  _startMultiball() {
    const A = this.api, b = this.b, p = this.p;
    b.mb = true; p.mbCount++;
    b.jpLit = [true, true, true]; b.superLit = false; b.jpCollected = 0;
    b.saveUntil = this.t + 18;
    A.audio.play('multiball'); this._music();
    A.fx.flash(1.2, 0xffd0a0); A.fx.lightShow('multiball', 3.2);
    A.display.show({ big: this.tr('multiball'), small: this.tr('jackpotsLit'), dur: 3.2, prio: 6, anim: 'multiball' });
    if (p.mbCount === 2 && !p.extraBallAwarded) p.extraBallLit = true;
    this.later(1200, () => this.serveBall(true));
    this.later(2600, () => this.serveBall(true));
  }

  _drain(e) {
    const A = this.api, b = this.b, p = this.p;
    if (e.error) console.warn('ball lost (numerical)');
    const left = this.activeBalls();
    A.audio.play(left > 0 ? 'drainSoft' : 'drain');
    // ball save
    if (!b.tilted && this.t < b.saveUntil) {
      A.display.show({ big: this.tr('ballSaved'), dur: 1.6, prio: 4 });
      A.audio.play('ballSave');
      this.serveBall(true);
      return;
    }
    if (b.mb && left <= 1) {
      b.mb = false; b.jpLit = [false, false, false]; b.superLit = false;
      this._music();
      A.display.show({ big: this.tr('multiball'), small: 'TOTAL ' + fmt(b.jackpots) + ' JP', dur: 1.5, prio: 2 });
    }
    if (left > 0) return;
    this._endBall();
  }

  _endBall() {
    const A = this.api, b = this.b, p = this.p;
    b.frenzyUntil = 0; b.tsukimiUntil = 0; A.world.turntable.target = 0;
    A.audio.music(null);
    this.state = 'bonus';
    const lines = [];
    if (!b.tilted) {
      lines.push([this.tr('ramp'), b.ramps, 5000]);
      lines.push([this.tr('orbit'), b.orbits, 3000]);
      lines.push([this.tr('bonusDrops'), b.drops, 1500]);
      lines.push([this.tr('lanes'), b.lanes, 1000]);
      lines.push([this.tr('bonusJets'), b.bumpers, 100]);
      lines.push([this.tr('bonusSpinner'), b.spins, 20]);
    }
    let total = lines.reduce((s, l) => s + l[1] * l[2], 0);
    const seq = [];
    for (const [name, n, v] of lines) if (n > 0) seq.push({ big: `${name} ${n}`, small: fmt(n * v), dur: 0.55, tick: true });
    if (total > 0) {
      seq.push({ big: `${this.tr('bonusX')} ${p.bonusX}X`, small: fmt(total) + ' × ' + p.bonusX, dur: 0.9, tick: true });
      total *= p.bonusX;
      seq.push({ big: this.tr('total') + ' ' + this.tr('bonus'), small: fmt(total), dur: 1.3, tick: true });
    }
    p.score += total;
    A.display.clearQueue();
    let t = 0;
    for (const s of seq) {
      this.later(t * 1000, () => { A.display.show({ ...s, prio: 9 }); A.audio.play('bonusTick'); });
      t += s.dur;
    }
    this.later((t + 0.6) * 1000, () => this._nextBall());
  }

  _nextBall() {
    const A = this.api, p = this.p;
    p.bonusX = 1; p.tiltWarnings = 0;
    if (p.extraBalls > 0) {
      p.extraBalls--;
      this.state = 'playing';
      A.display.show({ big: this.tr('shootAgain'), dur: 2, prio: 5 });
      A.audio.play('shootAgain');
      A.audio.music('main');
      this._startBall();
      return;
    }
    if (p.ball >= p.balls) { this._gameOver(); return; }
    p.ball++;
    this.state = 'playing';
    A.display.show({ big: this.tr('ball') + ' ' + p.ball, dur: 1.6, prio: 5 });
    A.audio.music('main');
    this._startBall();
  }

  _gameOver() {
    const A = this.api, p = this.p;
    this.state = 'gameover';
    A.audio.play('gameOver');
    A.display.clearQueue();
    A.display.show({ big: this.tr('gameOver'), small: fmt(p.score), dur: 3.5, prio: 9 });
    const rank = this.highScores.findIndex(h => p.score > h.score);
    const qualifies = p.score > 0 && (rank >= 0 || this.highScores.length < 5);
    this.later(3200, () => {
      if (qualifies) { this.state = 'initials'; A.audio.play('highScore'); A.onHighScore && A.onHighScore(p.score); }
      else { this.state = 'attract'; A.onGameOver && A.onGameOver(p.score); }
    });
  }

  submitInitials(name) {
    if (this.state !== 'initials') return;
    const entry = { name: (name || 'KOI').toUpperCase().slice(0, 3), score: this.p.score, date: Date.now() };
    this.highScores.push(entry);
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, 5);
    saveHighScores(this.hsKey, this.highScores);
    this.state = 'attract';
    this.api.onGameOver && this.api.onGameOver(this.p.score);
  }

  // ------------------------------------------------------------------ player input hooks
  flipper(side, on) {
    if (this.state !== 'playing' || !on) return;
    const p = this.p, b = this.b;
    // lane change
    const rot = (arr, dir) => dir > 0 ? [arr[arr.length - 1], ...arr.slice(0, -1)] : [...arr.slice(1), arr[0]];
    const dir = side === 'R' ? 1 : -1;
    p.lanes = rot(p.lanes, dir);
    p.lowerLanes = rot(p.lowerLanes, dir);
    if (b.inShooter) { b.skillLane = (b.skillLane + dir + 3) % 3; this.api.audio.play('laneChange', 0.5); }
  }

  nudge() {
    if (this.state !== 'playing' || this.b.tilted) return;
    const b = this.b, p = this.p, A = this.api;
    b.tiltMeter += 1;
    if (b.tiltMeter >= 3.2) {
      b.tiltMeter = 0;
      p.tiltWarnings++;
      if (p.tiltWarnings >= 3) {
        b.tilted = true; A.world.tiltDisabled = true; A.world.kickback.lit = false;
        b.saveUntil = 0;
        A.audio.play('tilt'); A.audio.music(null);
        A.display.clearQueue(); A.display.show({ big: this.tr('tilt'), dur: 4, prio: 10, blink: true });
        A.fx.tilt(true);
      } else {
        A.audio.play('tiltWarn');
        A.display.show({ big: this.tr('danger'), small: p.tiltWarnings === 1 ? '!' : '! !', dur: 1.2, prio: 8, blink: true });
      }
    }
  }

  later(ms, fn) { this.timers.push({ at: this.t + ms / 1000, fn }); }

  // abandon a running game (quit to menu): no timer may fire into the attract mode
  abort() { this.timers = []; this.state = 'attract'; this.api.world.tiltDisabled = false; this.api.fx.tilt(false); }

  // one place decides which soundtrack section fits the current mix of modes
  _music() {
    const b = this.b, t = this.t;
    if (!b || this.state !== 'playing' || b.tilted) return;
    this.api.audio.music(b.mb ? 'multiball' : t < b.tsukimiUntil ? 'tsukimi' : t < b.frenzyUntil ? 'frenzy' : 'main');
  }

  // ------------------------------------------------------------------ per-frame
  update(dt) {
    this.t += dt;
    if (this.timers.length) {
      const due = this.timers.filter(x => x.at <= this.t);
      if (due.length) { this.timers = this.timers.filter(x => x.at > this.t); for (const x of due) x.fn(); }
    }
    if (this.state !== 'playing' && this.state !== 'bonus') { this._attractLamps(); return; }
    const b = this.b, A = this.api;
    b.tiltMeter = Math.max(0, b.tiltMeter - dt * 0.7);
    if (this.t > b.frenzyUntil && b.frenzyUntil > 0) {
      b.frenzyUntil = 0; A.world.turntable.target = this.t < b.tsukimiUntil ? 4 : 0;
      this._music();
      A.display.show({ big: this.tr('frenzy'), small: this.tr('over'), dur: 1.0, prio: 1 });
    }
    if (this.t > b.tsukimiUntil && b.tsukimiUntil > 0) {
      b.tsukimiUntil = 0; A.world.turntable.target = this.t < b.frenzyUntil ? 7 : 0;
      this._music();
      A.display.show({ big: this.tr('tsukimi'), small: this.tr('complete'), dur: 1.4, prio: 2 });
    }
    if (b.pendingBalls > 0 && !A.world.ballInShooter()) { b.pendingBalls--; this.serveBall(true); }
    // auto-launch balls sitting in the shooter lane during multiball / ball save
    if (b.mb || (this.t < b.saveUntil && !b.inShooter)) {
      const sb = A.world.ballInShooter();
      if (sb && Math.abs(sb.vy) < 0.01 && !A.world.plunger.pulling && A.world.plunger.pos === 0) {
        sb._waitT = (sb._waitT || 0) + dt;
        if (sb._waitT > 1.2) { sb._waitT = 0; A.world.autoLaunch(0.9); }
      }
    }
    this._ballSearch(dt);
    this._lamps();
  }

  _ballSearch(dt) {
    const w = this.api.world;
    for (const b of w.balls) {
      if (b.mode !== 'field') continue;
      const slow = Math.hypot(b.vx, b.vy) < 0.02;
      const nearFlip = w.time - b.onFlipperTime < 0.2;
      const inLane = Math.abs(b.x - this.api.layout.plunger.x) < 0.02 && b.y < 0.2;
      b._still = slow && !nearFlip && !inLane ? (b._still || 0) + dt : 0;
      if (b._still > 4) { b._still = 0; b.vx += (Math.random() - 0.5) * 0.3; b.vy += 0.2; this.api.audio.play('ballSearch', 0.3); }
    }
  }

  // ------------------------------------------------------------------ lamps
  _lamps() {
    const A = this.api, L = A.lamps, p = this.p, b = this.b;
    if (!p || !b) return;
    const set = (n, m, o) => L.set(n, m, o);
    const on = (n, cond, mode = 'on') => set(n, cond ? mode : 'off');
    const t = this.t;
    // top lanes: lit letters on; skill shot lane fast-blinks while the ball is in the shooter
    ['laneTSU', 'laneKI', 'laneMI'].forEach((n, i) => {
      if (b.inShooter || t < b.skillUntil) on(n, i === b.skillLane || p.lanes[i], i === b.skillLane ? 'fastblink' : 'on');
      else on(n, p.lanes[i]);
    });
    ['lTSU', 'lKI', 'lMI'].forEach((n, i) => on(n, p.lanes[i]));
    ['outL', 'inL', 'inR', 'outR'].forEach((n, i) => on(n, p.lowerLanes[i]));
    on('kickback', A.world.kickback.lit);
    on('shootAgain', p.extraBalls > 0 || (t < b.saveUntil), t < b.saveUntil && p.extraBalls === 0 ? (b.saveUntil - t < 3 ? 'fastblink' : 'blink') : 'on');
    on('ballSave', t < b.saveUntil, 'blink');
    // bonus multiplier ladder
    ['bonus2', 'bonus3', 'bonus4', 'bonus5'].forEach((n, i) => on(n, p.bonusX >= i + 2));
    // lock ladder
    on('lock1', p.lockLit && !b.mb, 'blink'); on('lock2', p.locked >= 1 || (p.lockLit && !b.mb), p.locked >= 1 ? 'on' : 'blink'); on('lock3', p.locked >= 2);
    on('scoopRing', (p.lockLit && !b.mb) || b.superLit || p.fullMoonReady || p.extraBallLit, b.superLit ? 'fastblink' : 'pulse');
    on('extraBallLit', p.extraBallLit, 'blink');
    on('multiLit', p.lockLit && !b.mb, 'blink');
    // jackpots
    on('rampJp', b.mb && b.jpLit[0], 'fastblink'); on('orbitLjp', b.mb && b.jpLit[1], 'fastblink'); on('orbitRjp', b.mb && b.jpLit[2], 'fastblink');
    on('jp1', b.mb && b.jpLit[0], 'blink'); on('jp2', b.mb && b.jpLit[1], 'blink'); on('jp3', b.mb && b.jpLit[2], 'blink');
    // shot arrows: chase when a combo/jackpot/moon shot is available
    const chase = (names, active, speed = 5) => names.forEach((n, i) => set(n, active ? 'level' : 'off', { level: active ? (Math.floor(t * speed - i) % names.length === 0 ? 1 : 0.15) : 0 }));
    const comboOpen = b.lastShot && t - b.lastShotT < 3.5;
    chase(['orbitL2', 'orbitL1'], (b.mb && b.jpLit[1]) || t < b.tsukimiUntil || (comboOpen && b.lastShot !== 'orbitL'));
    chase(['orbitR2', 'orbitR1'], (b.mb && b.jpLit[2]) || t < b.tsukimiUntil || (comboOpen && b.lastShot !== 'orbitR'));
    on('rampArrow', (b.mb && b.jpLit[0]) || t < b.tsukimiUntil || (comboOpen && b.lastShot !== 'ramp'), 'fastblink');
    chase(['moonPath1', 'moonPath2', 'moonPath3'], (p.lockLit && !b.mb) || b.superLit || p.fullMoonReady || p.extraBallLit, 6);
    // values
    on('orbitLval', b.orbits > 0); on('orbitRval', b.orbits > 1);
    on('rampLock', b.ramps > 0);
    on('drops', A.world.drops.some(d => !d.up), 'on'); on('dropsJp', t < b.frenzyUntil, 'fastblink');
    on('frenzy', t < b.frenzyUntil, b.frenzyUntil - t < 4 ? 'fastblink' : 'blink');
    on('mystery', true, 'pulse'); on('saucerRing', true, 'pulse');
    on('spinL1', t < b.frenzyUntil, 'blink'); on('spinL2', t < b.frenzyUntil, 'blink');
    on('skill1', b.inShooter, 'blink'); on('skill2', b.inShooter, 'blink');
    ['launch1', 'launch2', 'launch3'].forEach((n, i) => set(n, b.inShooter ? 'level' : 'off', { level: Math.floor(t * 6 - i) % 3 === 0 ? 1 : 0.1 }));
    on('plungerLamp', b.inShooter, 'pulse');
    on('bumperLitL', p.lanternLevel > 0, p.lanternLevel >= 5 ? 'fastblink' : 'on');
    on('pagoda', t < b.tsukimiUntil, 'blink');
    on('orbitTopL', b.orbits > 0); on('orbitTopR', b.ramps > 0);
    on('comboL', b.comboN > 0, 'blink'); on('comboR', b.comboN > 0, 'blink');
    // moon phase shown on the big painted moon
    set('moon', 'level', { level: p.fullMoonReady ? (0.6 + 0.4 * Math.sin(t * 4)) : t < b.tsukimiUntil ? 1 : p.moon / 8 * 0.8 });
    // bumpers glow with lantern level
    A.fx.bumperLit && A.fx.bumperLit(0.25 + p.lanternLevel * 0.12 + (t < b.frenzyUntil ? 0.5 : 0));
    A.fx.gi && A.fx.gi(b.tilted ? 0.1 : t < b.tsukimiUntil ? 0.45 : 1);
  }

  _attractLamps() {
    const A = this.api, L = A.lamps;
    // gentle waves of light across the playfield in attract mode
    for (const l of L.list) {
      if (l.group === 'lantern') continue;
      const ph = Math.sin(this.t * 1.6 - l.v / 260 + Math.sin(l.u / 200 + this.t * 0.4));
      L.set(l.name, 'level', { level: Math.max(0, ph) ** 3 });
    }
  }

  // info for HUD
  hud() {
    if (!this.p) return null;
    const b = this.b, t = this.t;
    return {
      score: this.p.score, ball: this.p.ball, balls: this.p.balls, bonusX: this.p.bonusX, moon: this.p.moon,
      mb: b.mb, frenzy: Math.max(0, b.frenzyUntil - t), tsukimi: Math.max(0, b.tsukimiUntil - t), save: Math.max(0, b.saveUntil - t),
      locked: this.p.locked, lockLit: this.p.lockLit, extra: this.p.extraBalls,
    };
  }
}

export function loadHighScores(key = 'tsukimi.hiscores', defaults = null) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    // stored data is outside our control: keep only well-formed entries
    const ok = Array.isArray(v) ? v.filter(h => h && typeof h.name === 'string' && Number.isFinite(h.score))
      .map(h => ({ name: h.name.slice(0, 3), score: h.score, date: h.date })).sort((a, b) => b.score - a.score).slice(0, 5) : [];
    if (ok.length) return ok;
  } catch (e) { }
  if (defaults) return defaults.map(([name, score]) => ({ name, score }));
  return [
    { name: 'KOI', score: 5000000 }, { name: 'MOO', score: 3000000 }, { name: 'SAK', score: 2000000 },
    { name: 'LAN', score: 1000000 }, { name: 'ZEN', score: 500000 },
  ];
}
function saveHighScores(key, h) { try { localStorage.setItem(key, JSON.stringify(h)); } catch (e) { } }
