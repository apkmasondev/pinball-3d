// HTML overlay UI: title/menu, pause, settings, help, initials, HUD frame, touch controls.
const STR = {
  pl: {
    play: 'Zagraj', resume: 'Wznów', settings: 'Ustawienia', help: 'Jak grać', scores: 'Rekordy', quit: 'Menu główne', back: 'Wróć',
    subtitle: 'Moonlit Koi Garden', pressStart: 'Naciśnij Enter, aby zagrać', paused: 'Pauza', loading: 'Wschodzi księżyc…',
    lang: 'Język', camera: 'Kamera', quality: 'Grafika', balls: 'Kulki na grę', master: 'Głośność', music: 'Muzyka', sfx: 'Efekty',
    low: 'Niska', medium: 'Średnia', high: 'Wysoka', camPlayer: 'Gracz', camHigh: 'Z góry', camFollow: 'Śledząca', camLow: 'Automat',
    controls: 'Sterowanie', rules: 'Zasady', highScores: 'Najlepsze wyniki', enterInitials: 'Nowy rekord! Wpisz inicjały', ok: 'Zapisz',
    gameOver: 'Koniec gry', finalScore: 'Wynik', tapToStart: 'Dotknij, aby zagrać', launch: 'Start',
    ctl: [
      ['Lewy flipper', 'Lewy Shift · Z · ←'], ['Prawy flipper', 'Prawy Shift · / · →'], ['Wyrzutnia (przytrzymaj)', 'Spacja · Enter · ↓'],
      ['Szturchnięcie', 'X · . · ↑'], ['Kamera', 'C'], ['Pauza', 'Esc · P'], ['Wycisz', 'M'],
    ],
    rulesList: [
      ['TSU · KI · MI', 'Przejedź przez trzy górne tory, by zwiększyć mnożnik bonusu i zapalić LOCK. Flipperami przesuwasz zapalone tory.'],
      ['Moon Multiball', 'Gdy LOCK świeci, trafiaj w chram pod bramą torii. Druga zablokowana kulka uruchamia multiball z trzema kulkami.'],
      ['Jackpoty', 'W multiballu jackpoty czekają na rampie i obu orbitach. Zbierz wszystkie, a potem Super Jackpot w chramie.'],
      ['Koi Frenzy', 'Zbij trzy cele K-O-I. Dysk koi zaczyna wirować, bumpery i spinner punktują wielokrotnie.'],
      ['Fazy księżyca', 'Rampa i orbity przybliżają pełnię. Przy pełni strzel w chram, by rozpocząć tryb TSUKIMI z podwójnymi punktami.'],
      ['Latarnia', 'Saucer po lewej przyznaje nagrodę-niespodziankę: punkty, kickback, ochronę kulki, a czasem dodatkową kulkę.'],
      ['Kombo', 'Rampa i orbity trafione jedna po drugiej dają rosnące kombo. Lewa i prawa orbita pod rząd to KOI LOOP.'],
    ],
  },
  en: {
    play: 'Play', resume: 'Resume', settings: 'Settings', help: 'How to play', scores: 'High scores', quit: 'Main menu', back: 'Back',
    subtitle: 'Moonlit Koi Garden', pressStart: 'Press Enter to play', paused: 'Paused', loading: 'The moon is rising…',
    lang: 'Language', camera: 'Camera', quality: 'Graphics', balls: 'Balls per game', master: 'Volume', music: 'Music', sfx: 'Effects',
    low: 'Low', medium: 'Medium', high: 'High', camPlayer: 'Player', camHigh: 'Overhead', camFollow: 'Follow', camLow: 'Cabinet',
    controls: 'Controls', rules: 'Rules', highScores: 'High scores', enterInitials: 'New high score! Enter your initials', ok: 'Save',
    gameOver: 'Game over', finalScore: 'Score', tapToStart: 'Tap to play', launch: 'Launch',
    ctl: [
      ['Left flipper', 'Left Shift · Z · ←'], ['Right flipper', 'Right Shift · / · →'], ['Plunger (hold)', 'Space · Enter · ↓'],
      ['Nudge', 'X · . · ↑'], ['Camera', 'C'], ['Pause', 'Esc · P'], ['Mute', 'M'],
    ],
    rulesList: [
      ['TSU · KI · MI', 'Roll through the three top lanes to raise the bonus multiplier and light LOCK. The flippers rotate the lit lanes.'],
      ['Moon Multiball', 'With LOCK lit, shoot the shrine under the torii gate. The second locked ball starts a three-ball multiball.'],
      ['Jackpots', 'During multiball jackpots wait on the ramp and both orbits. Collect them all, then the Super Jackpot at the shrine.'],
      ['Koi Frenzy', 'Knock down the K-O-I targets. The koi disc spins and the bumpers and spinner score many times over.'],
      ['Moon phases', 'The ramp and orbits bring the full moon closer. At full moon, shoot the shrine to start TSUKIMI with double scoring.'],
      ['Lantern hole', 'The saucer on the left gives a mystery award: points, kickback, ball save and sometimes an extra ball.'],
      ['Combos', 'Ramp and orbit shots in quick succession build a combo. Left and right orbit back to back make a KOI LOOP.'],
    ],
  },
};

export class UI {
  constructor(root, settings, handlers) {
    this.root = root; this.s = settings; this.h = handlers;
    this.screen = 'loading';
    this.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    root.innerHTML = `
      <div id="loading" class="screen show">
        <div class="moon-loader"><div class="moon-disc"></div></div>
        <div class="kanji small">月見</div>
        <div class="loadbar"><div id="loadfill"></div></div>
        <div id="loadtext" class="caption"></div>
      </div>
      <canvas id="petals"></canvas>
      <div id="hud"><div class="dmd-frame"><div class="dmd-corner l"></div><div class="dmd-corner r"></div><canvas id="dmd"></canvas></div></div>
      <div id="title" class="screen">
        <div class="title-block">
          <div class="kanji">月見</div>
          <div class="latin">TSUKIMI</div>
          <div class="sub" data-s="subtitle"></div>
        </div>
        <nav class="menu" id="titleMenu">
          <button data-a="play" data-s="play"></button>
          <button data-a="help" data-s="help"></button>
          <button data-a="scores" data-s="scores"></button>
          <button data-a="settings" data-s="settings"></button>
        </nav>
        <div class="hint" data-s="${this.touch ? 'tapToStart' : 'pressStart'}"></div>
      </div>
      <div id="pause" class="screen panel-screen">
        <div class="panel narrow">
          <h2 data-s="paused"></h2>
          <nav class="menu">
            <button data-a="resume" data-s="resume"></button>
            <button data-a="help" data-s="help"></button>
            <button data-a="settings" data-s="settings"></button>
            <button data-a="quit" data-s="quit"></button>
          </nav>
        </div>
      </div>
      <div id="settings" class="screen panel-screen"><div class="panel"><h2 data-s="settings"></h2><div id="settingsBody"></div><nav class="menu row"><button data-a="back" data-s="back"></button></nav></div></div>
      <div id="helpScr" class="screen panel-screen"><div class="panel wide"><div id="helpBody"></div><nav class="menu row"><button data-a="back" data-s="back"></button></nav></div></div>
      <div id="scoresScr" class="screen panel-screen"><div class="panel narrow"><h2 data-s="highScores"></h2><ol id="scoreList"></ol><nav class="menu row"><button data-a="back" data-s="back"></button></nav></div></div>
      <div id="initials" class="screen panel-screen"><div class="panel narrow">
        <h2 data-s="enterInitials"></h2>
        <div class="final" id="finalScore"></div>
        <div class="letters" id="letters"><span></span><span></span><span></span></div>
        <nav class="menu row"><button data-a="saveInitials" data-s="ok"></button></nav>
      </div></div>
      <div id="touch" class="${this.touch ? 'on' : ''}">
        <div class="tz left" data-t="left"></div><div class="tz right" data-t="right"></div>
        <button class="tbtn launch" data-t="plunger"><span data-s="launch"></span></button>
        <button class="tbtn pause" data-t="pause">❚❚</button>
      </div>
      <div id="flash"></div>`;
    this.$ = (sel) => root.querySelector(sel);
    this.dmdCanvas = this.$('#dmd');
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-a]'); if (!b) return;
      this.h.sound && this.h.sound('uiSelect');
      this.action(b.dataset.a);
    });
    root.addEventListener('mouseover', (e) => { if (e.target.closest('button[data-a]')) this.h.sound && this.h.sound('uiMove'); });
    this._touch();
    this._petals();
    this.initials = { letters: ['K', 'O', 'I'], pos: 0 };
    this.applyLang();
  }

  t(k) { return (STR[this.s.lang] || STR.en)[k] ?? k; }
  applyLang() {
    this.root.querySelectorAll('[data-s]').forEach(el => { el.textContent = this.t(el.dataset.s); });
    document.documentElement.lang = this.s.lang;
    this._buildSettings(); this._buildHelp(); this._buildScores();
  }

  show(name) {
    this.prev = this.screen;
    this.screen = name;
    this.root.querySelectorAll('.screen').forEach(el => el.classList.remove('show'));
    const map = { title: '#title', pause: '#pause', settings: '#settings', help: '#helpScr', scores: '#scoresScr', initials: '#initials', loading: '#loading' };
    if (map[name]) this.$(map[name]).classList.add('show');
    this.$('#petals').classList.toggle('show', name === 'title');
    this.root.classList.toggle('in-game', name === 'game');
    this.root.classList.toggle('menu-open', name !== 'game');
    if (name === 'initials') this._renderInitials();
    const first = this.$(map[name] + ' button');
    if (first && !this.touch) first.focus({ preventScroll: true });
  }

  action(a) {
    const back = () => this.show(this.returnTo || 'title');
    switch (a) {
      case 'play': this.h.start(); break;
      case 'resume': this.h.resume(); break;
      case 'quit': this.h.quit(); break;
      case 'settings': this.returnTo = this.screen; this.show('settings'); break;
      case 'help': this.returnTo = this.screen; this.show('help'); break;
      case 'scores': this._buildScores(); this.returnTo = this.screen; this.show('scores'); break;
      case 'back': back(); break;
      case 'saveInitials': this.h.initials(this.initials.letters.join('')); break;
    }
  }

  setLoading(p, text) {
    this.$('#loadfill').style.width = `${Math.round(p * 100)}%`;
    this.$('#loadtext').textContent = text || this.t('loading');
  }

  flash(strength, color = '#ffd8a0') {
    const f = this.$('#flash');
    f.style.background = `radial-gradient(ellipse at 50% 55%, ${color}, transparent 70%)`;
    f.style.transition = 'none'; f.style.opacity = Math.min(0.2, strength * 0.14);
    requestAnimationFrame(() => { f.style.transition = 'opacity 0.35s ease-out'; f.style.opacity = 0; });
  }

  // ---------------------------------------------------------------- settings
  _buildSettings() {
    const s = this.s, t = (k) => this.t(k);
    const seg = (key, opts) => `<div class="seg" data-key="${key}">${opts.map(([v, l]) => `<button class="${String(s[key]) === String(v) ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>`;
    const slider = (key) => `<input type="range" min="0" max="1" step="0.05" value="${s[key]}" data-key="${key}">`;
    this.$('#settingsBody').innerHTML = `
      <div class="row"><label>${t('lang')}</label>${seg('lang', [['pl', 'Polski'], ['en', 'English']])}</div>
      <div class="row"><label>${t('camera')}</label>${seg('camera', [['player', t('camPlayer')], ['high', t('camHigh')], ['follow', t('camFollow')], ['low', t('camLow')]])}</div>
      <div class="row"><label>${t('quality')}</label>${seg('quality', [['low', t('low')], ['medium', t('medium')], ['high', t('high')]])}</div>
      <div class="row"><label>${t('balls')}</label>${seg('balls', [[3, '3'], [5, '5']])}</div>
      <div class="row"><label>${t('master')}</label>${slider('master')}</div>
      <div class="row"><label>${t('music')}</label>${slider('music')}</div>
      <div class="row"><label>${t('sfx')}</label>${slider('sfx')}</div>`;
    this.$('#settingsBody').querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
      const key = b.parentElement.dataset.key; let v = b.dataset.v;
      if (key === 'balls') v = +v;
      this.h.setting(key, v);
      if (key === 'lang') this.applyLang(); else this._buildSettings();
    }));
    this.$('#settingsBody').querySelectorAll('input[type=range]').forEach(r => r.addEventListener('input', () => this.h.setting(r.dataset.key, +r.value)));
  }
  _buildHelp() {
    const L = STR[this.s.lang] || STR.en;
    this.$('#helpBody').innerHTML = `
      <div class="cols">
        <section><h2>${this.t('controls')}</h2><table class="keys">${L.ctl.map(([a, k]) => `<tr><td>${a}</td><td><kbd>${k}</kbd></td></tr>`).join('')}</table>
        ${this.touch ? `<p class="note">${this.s.lang === 'pl' ? 'Na ekranie dotykowym: lewa i prawa połowa ekranu to flippery, przycisk Start wyrzuca kulkę.' : 'On touch screens: the left and right halves are the flippers; the Launch button fires the plunger.'}</p>` : ''}</section>
        <section><h2>${this.t('rules')}</h2><dl class="rules">${L.rulesList.map(([h, d]) => `<dt>${h}</dt><dd>${d}</dd>`).join('')}</dl></section>
      </div>`;
  }
  _buildScores() {
    const hs = this.h.highScores ? this.h.highScores() : [];
    this.$('#scoreList').innerHTML = hs.map((h, i) => `<li><span class="rank">${i + 1}</span><span class="nm">${h.name}</span><span class="sc">${h.score.toLocaleString('en-US')}</span></li>`).join('');
  }

  // ---------------------------------------------------------------- initials
  startInitials(score) {
    this.$('#finalScore').textContent = score.toLocaleString('en-US');
    this.initials = { letters: ['A', 'A', 'A'], pos: 0 };
    this.show('initials');
  }
  initialsKey(e) {
    const I = this.initials;
    if (/^[a-zA-Z0-9]$/.test(e.key)) { I.letters[I.pos] = e.key.toUpperCase(); I.pos = Math.min(2, I.pos + 1); this._renderInitials(); return true; }
    if (e.key === 'Backspace') { I.pos = Math.max(0, I.pos - 1); this._renderInitials(); return true; }
    return false;
  }
  initialsCycle(dir) {
    const I = this.initials; const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
    const i = A.indexOf(I.letters[I.pos]); I.letters[I.pos] = A[(i + dir + A.length) % A.length]; this._renderInitials();
  }
  initialsNext() { const I = this.initials; if (I.pos < 2) { I.pos++; this._renderInitials(); return false; } return true; }
  _renderInitials() {
    const spans = this.$('#letters').children;
    for (let i = 0; i < 3; i++) { spans[i].textContent = this.initials.letters[i]; spans[i].classList.toggle('cur', i === this.initials.pos); }
  }

  // ---------------------------------------------------------------- touch
  _touch() {
    const t = this.$('#touch');
    const press = (el, on) => { const a = el.dataset.t; if (a) this.h.press(a, on); };
    t.querySelectorAll('[data-t]').forEach(el => {
      el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); el.classList.add('down'); press(el, true); });
      const up = (e) => { el.classList.remove('down'); press(el, false); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    });
  }

  // ---------------------------------------------------------------- sakura petals on the title screen
  _petals() {
    const c = this.$('#petals'), g = c.getContext('2d');
    const P = Array.from({ length: 38 }, () => this._newPetal(true));
    let last = performance.now();
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (!c.classList.contains('show')) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (c.width !== innerWidth || c.height !== innerHeight) { c.width = innerWidth; c.height = innerHeight; }
      g.clearRect(0, 0, c.width, c.height);
      for (const p of P) {
        p.t += dt; p.x += (p.vx + Math.sin(p.t * p.w) * 22) * dt; p.y += p.vy * dt; p.r += p.vr * dt;
        if (p.y > c.height + 20 || p.x < -40 || p.x > c.width + 40) Object.assign(p, this._newPetal(false));
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.abs(Math.sin(p.t * p.w * 0.7)) * 0.7 + 0.3);
        g.fillStyle = `rgba(255,${170 + p.c},${190 + p.c / 2},${p.a})`;
        g.beginPath(); g.moveTo(0, -p.s); g.bezierCurveTo(p.s, -p.s * 0.6, p.s * 0.7, p.s * 0.8, 0, p.s); g.bezierCurveTo(-p.s * 0.7, p.s * 0.8, -p.s, -p.s * 0.6, 0, -p.s); g.fill();
        g.restore();
      }
    };
    requestAnimationFrame(loop);
  }
  _newPetal(init) {
    return { x: Math.random() * innerWidth * 1.1 - 20, y: init ? Math.random() * innerHeight : -20, vx: 10 + Math.random() * 30, vy: 22 + Math.random() * 38, r: Math.random() * 6, vr: (Math.random() - 0.5) * 2, s: 4 + Math.random() * 6, t: Math.random() * 10, w: 0.8 + Math.random() * 1.5, a: 0.35 + Math.random() * 0.5, c: Math.floor(Math.random() * 40) };
  }
}
