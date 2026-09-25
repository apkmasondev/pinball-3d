// Rules of "Ryūjin — Palace of the Dragon King". Same game flow as Tsukimi (ball save, tilt, bonus,
// multiball, combos, mystery), its own objectives: pearl shells, tide targets, the eight pearls and
// the palace mode Ryūgū-jō.
import { Rules, T as BASE } from './rules.js';

const fmt = (n) => n.toLocaleString('en-US');

export const T = {
  en: {
    ...BASE.en,
    lock: 'LOCK IS LIT', locked: 'BALL LOCKED', multiball: 'DRAGON MULTIBALL', jackpot: 'JACKPOT', superJackpot: 'SUPER JACKPOT',
    frenzy: 'UZUMAKI', tsukimi: 'RYUGU-JO', fullMoon: 'EIGHT PEARLS', fullMoonReady: 'ENTER THE PALACE',
    mystery: 'CORAL CAVE', koiLoop: 'DRAGON LOOP', combo: 'TIDE COMBO', ramp: 'JADE RAMP', lanes: 'R-Y-U',
    lantern: 'DRAGON SCALE', moonPhase: 'PEARL', koiBank: 'PEARL SHELLS', tsukimiSub: '2X · TREASURE 100K', moonShot: 'TREASURE',
    shrine: 'PALACE', bonusDrops: 'SHELLS', bonusJets: 'SCALES', bonusSpinner: 'SPINNER',
    shellLit: 'SHELL', tide: 'TIDE', tideRises: 'HIGH TIDE', whirlLit: 'WHIRLPOOL',
  },
  pl: {
    ...BASE.pl,
    lock: 'LOCK AKTYWNY', locked: 'KULKA ZABLOKOWANA', multiball: 'DRAGON MULTIBALL', jackpot: 'JACKPOT', superJackpot: 'SUPER JACKPOT',
    frenzy: 'UZUMAKI', tsukimi: 'RYUGU-JO', fullMoon: 'OSIEM PEREŁ', fullMoonReady: 'WEJDŹ DO PAŁACU',
    mystery: 'KORALOWA GROTA', koiLoop: 'PĘTLA SMOKA', combo: 'KOMBO PRZYPŁYWU', ramp: 'JADEITOWA RAMPA', lanes: 'R-Y-U',
    lantern: 'ŁUSKA SMOKA', moonPhase: 'PERŁA', koiBank: 'PERŁOWE MUSZLE', tsukimiSub: '2X · SKARBY 100K', moonShot: 'SKARB',
    shrine: 'PAŁAC', bonusDrops: 'MUSZLE', bonusJets: 'ŁUSKI', bonusSpinner: 'SPINNER',
    shellLit: 'MUSZLA', tide: 'PRZYPŁYW', tideRises: 'WYSOKI PRZYPŁYW', whirlLit: 'WIR',
  },
};

export class RyujinRules extends Rules {
  constructor(api) {
    super(api);
    this.T = T;
    this.jpBase0 = 300000; this.superBase = 1500000; this.loopBase = 60000;
    this.modeAnim = 'pearl';
  }
  _initPlayer(p) { p.tide = [false, false]; p.tideCount = 0; p.jpBase = this.jpBase0; }
  _initBall(b) { b.shells = [false, false, false]; b.shellT = -9; }

  handle(e) {
    if (e.type === 'target') {
      if (this.state !== 'playing') return;
      this.b.lastSwitchT = this.t;
      if (!this.b.tilted) this._target(e);
      return;
    }
    super.handle(e);
  }

  _target(e) {
    const A = this.api, b = this.b, p = this.p;
    if (e.bank === 'shell') {
      const i = +e.id.slice(5);
      b.drops++;
      const frenzy = this.t < b.frenzyUntil;
      this.add(frenzy ? 12000 : 4000);
      A.audio.play('drop', 0.9);
      if (!b.shells[i]) {
        b.shells[i] = true; A.lamps.flash('shell' + i, 0.25);
        if (b.shells.every(Boolean)) {
          p.dropBanks++;
          const v = this.add(20000 * p.dropBanks);
          A.audio.play('bankComplete');
          this._startFrenzy();
          if (!p.lockLit && !b.mb) { p.lockLit = true; A.audio.play('lockLit', 0.4); }
          A.display.show({ big: this.tr('koiBank'), small: fmt(v) + ' · ' + this.tr('frenzy'), dur: 1.6, prio: 3, anim: 'whirl' });
          this.later(900, () => { b.shells = [false, false, false]; A.audio.play('dropReset', 0.6); });
        } else A.display.pop(`${this.tr('shellLit')} ${b.shells.filter(Boolean).length}/3`);
      }
      return;
    }
    if (e.bank === 'tide') {
      const i = +e.id.slice(4);
      this.add(6000);
      A.audio.play('rollover', 0.9);
      if (!p.tide[i]) {
        p.tide[i] = true;
        if (p.tide.every(Boolean)) {
          p.tide = [false, false]; p.tideCount++;
          const v = this.add(25000 * p.tideCount);
          A.audio.play('laneComplete');
          let small = fmt(v) + ' · +2 ' + this.tr('moonPhase');
          if (!A.world.kickback.lit) { A.world.kickback.lit = true; small = this.tr('kickbackLit'); }
          if (p.tideCount % 3 === 0 && !p.extraBallAwarded && !p.extraBallLit) { p.extraBallLit = true; small = this.tr('extraBallLit'); A.audio.play('knocker'); }
          A.display.show({ big: this.tr('tideRises'), small, dur: 1.6, prio: 3, anim: 'waves' });
          this._moon(2);
        } else A.display.pop(`${this.tr('tide')} ${p.tide.filter(Boolean).length}/2`);
      }
    }
  }

  _lamps() {
    const A = this.api, L = A.lamps, p = this.p, b = this.b;
    if (!p || !b) return;
    const set = (n, m, o) => L.set(n, m, o);
    const on = (n, cond, mode = 'on') => set(n, cond ? mode : 'off');
    const t = this.t;
    const mode = t < b.tsukimiUntil, whirl = t < b.frenzyUntil;
    ['laneR', 'laneY', 'laneU'].forEach((n, i) => {
      if (b.inShooter || t < b.skillUntil) on(n, i === b.skillLane || p.lanes[i], i === b.skillLane ? 'fastblink' : 'on');
      else on(n, p.lanes[i]);
    });
    ['outL', 'inL', 'inR', 'outR'].forEach((n, i) => on(n, p.lowerLanes[i]));
    on('kickback', A.world.kickback.lit);
    on('shootAgain', p.extraBalls > 0 || (t < b.saveUntil), t < b.saveUntil && p.extraBalls === 0 ? (b.saveUntil - t < 3 ? 'fastblink' : 'blink') : 'on');
    on('ballSave', t < b.saveUntil, 'blink');
    ['bonus2', 'bonus3', 'bonus4', 'bonus5'].forEach((n, i) => on(n, p.bonusX >= i + 2));
    const lockOpen = p.lockLit && !b.mb;
    on('lock1', p.locked >= 1 || lockOpen, p.locked >= 1 ? 'on' : 'blink');
    on('lock2', lockOpen && p.locked >= 1, 'blink');
    on('multiLit', lockOpen, 'blink');
    on('extraBall', p.extraBallLit, 'blink');
    const palaceHot = lockOpen || b.superLit || p.fullMoonReady || p.extraBallLit;
    on('palaceRing', palaceHot || mode, b.superLit ? 'fastblink' : 'pulse');
    on('superJp', b.superLit, 'fastblink');
    const chase = (names, active, speed = 5) => names.forEach((n, i) => set(n, active ? 'level' : 'off', { level: active ? (Math.floor(t * speed - i) % names.length === 0 ? 1 : 0.15) : 0 }));
    chase(['path1', 'path2', 'path3'], palaceHot, 6);
    const comboOpen = b.lastShot && t - b.lastShotT < 3.5;
    chase(['orbitL1', 'orbitL2'], (b.mb && b.jpLit[1]) || mode || (comboOpen && b.lastShot !== 'orbitL'));
    chase(['orbitR1', 'orbitR2'], (b.mb && b.jpLit[2]) || mode || (comboOpen && b.lastShot !== 'orbitR'));
    on('orbitLjp', b.mb && b.jpLit[1], 'blink'); on('orbitRjp', b.mb && b.jpLit[2], 'blink');
    on('rampArrow', (b.mb && b.jpLit[0]) || mode || (comboOpen && b.lastShot !== 'ramp'), 'fastblink');
    on('rampJp', b.mb && b.jpLit[0], 'blink');
    on('orbitTopL', b.orbits > 0); on('orbitTopR', b.ramps > 0);
    b.shells.forEach((s, i) => on('shell' + i, s || whirl, whirl ? 'blink' : 'on'));
    on('whirlLit', whirl || b.shells.some(Boolean), whirl ? 'fastblink' : 'blink');
    set('whirlRing', whirl ? 'level' : 'off', { level: whirl ? (b.frenzyUntil - t < 4 ? (Math.floor(t * 7) % 2 ? 1 : 0.2) : 0.55 + 0.45 * Math.sin(t * 5)) : 0 });
    p.tide.forEach((s, i) => on('tide' + i, s));
    for (let i = 0; i < 8; i++) {
      if (mode) set('pearl' + i, 'level', { level: Math.floor(t * 8 - i) % 8 === 0 ? 1 : 0.35 });
      else if (p.fullMoonReady) on('pearl' + i, true, 'fastblink');
      else on('pearl' + i, i < p.moon);
    }
    on('saucerRing', true, 'pulse'); on('mystery', true, 'pulse');
    on('spinL1', whirl, 'blink'); on('spinL2', whirl, 'blink');
    on('skill1', b.inShooter, 'blink'); on('skill2', b.inShooter, 'blink');
    ['launch1', 'launch2', 'launch3'].forEach((n, i) => set(n, b.inShooter ? 'level' : 'off', { level: Math.floor(t * 6 - i) % 3 === 0 ? 1 : 0.1 }));
    on('plungerLamp', b.inShooter, 'pulse');
    set('pearl', 'level', { level: p.fullMoonReady ? (0.6 + 0.4 * Math.sin(t * 4)) : mode ? 1 : 0.15 + p.moon / 8 * 0.7 });
    A.fx.bumperLit && A.fx.bumperLit(0.25 + p.lanternLevel * 0.12 + (whirl ? 0.5 : 0));
    A.fx.gi && A.fx.gi(b.tilted ? 0.1 : mode ? 0.45 : 1);
  }
}
