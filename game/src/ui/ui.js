// HTML overlay UI: title/menu, pause, settings, help, initials, HUD frame, touch controls.
const STR = {
  pl: {
    play: 'Zagraj', resume: 'Wznów', settings: 'Ustawienia', help: 'Jak grać', scores: 'Rekordy', quit: 'Menu główne', back: 'Wróć',
    subtitle: 'Moonlit Koi Garden', pressStart: 'Naciśnij Enter, aby zagrać', paused: 'Pauza', loading: 'Wschodzi księżyc…',
    lang: 'Język', camera: 'Kamera', quality: 'Grafika', balls: 'Kulki na grę', master: 'Głośność', music: 'Muzyka', sfx: 'Efekty',
    auto: 'Auto', low: 'Niska', medium: 'Średnia', high: 'Wysoka', camPlayer: 'Gracz', camHigh: 'Z góry', camFollow: 'Śledząca', camLow: 'Automat',
    controls: 'Sterowanie', rules: 'Zasady', highScores: 'Najlepsze wyniki', enterInitials: 'Nowy rekord! Wpisz inicjały', ok: 'Zapisz',
    gameOver: 'Koniec gry', finalScore: 'Wynik', tapToStart: 'Dotknij, aby zagrać', launch: 'Start',
    tables: 'Wybierz stół', chooseTable: 'Wybierz stół', current: 'Wybrany', record: 'Rekord', playThis: 'Zagraj', browse: '← → zmiana stołu',
    ctl: [
      ['Lewy flipper', 'Lewy Shift · Z · ←'], ['Prawy flipper', 'Prawy Shift · / · →'], ['Wyrzutnia (przytrzymaj)', 'Spacja · Enter · ↓'],
      ['Szturchnięcie', 'X · . · ↑'], ['Kamera', 'C'], ['Pauza', 'Esc · P'], ['Wycisz', 'M'], ['Zmiana stołu (menu)', '← · →'],
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
    auto: 'Auto', low: 'Low', medium: 'Medium', high: 'High', camPlayer: 'Player', camHigh: 'Overhead', camFollow: 'Follow', camLow: 'Cabinet',
    controls: 'Controls', rules: 'Rules', highScores: 'High scores', enterInitials: 'New high score! Enter your initials', ok: 'Save',
    gameOver: 'Game over', finalScore: 'Score', tapToStart: 'Tap to play', launch: 'Launch',
    tables: 'Choose table', chooseTable: 'Choose a table', current: 'Selected', record: 'Best', playThis: 'Play', browse: '← → change table',
    ctl: [
      ['Left flipper', 'Left Shift · Z · ←'], ['Right flipper', 'Right Shift · / · →'], ['Plunger (hold)', 'Space · Enter · ↓'],
      ['Nudge', 'X · . · ↑'], ['Camera', 'C'], ['Pause', 'Esc · P'], ['Mute', 'M'], ['Change table (menu)', '← · →'],
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

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';

export class UI {
  constructor(root, settings, handlers) {
    this.root = root; this.s = settings; this.h = handlers;
    this.screen = 'loading';
    this.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    root.innerHTML = `
      <div id="loading" class="screen show">
        <div class="moon-loader"><div class="moon-disc"></div></div>
        <div class="kanji small" id="loadKanji">月見</div>
        <div class="loadbar"><div id="loadfill"></div></div>
        <div id="loadtext" class="caption"></div>
      </div>
      <canvas id="petals"></canvas>
      <div id="hud"><div class="dmd-frame"><div class="dmd-corner l"></div><div class="dmd-corner r"></div><canvas id="dmd"></canvas></div></div>
      <div id="title" class="screen">
        <div class="title-row">
          <button class="chev l" data-a="prevTable" aria-label="prev"><span></span></button>
          <div class="title-block">
            <div class="kanji" id="tKanji">月見</div>
            <div class="latin" id="tLatin">TSUKIMI</div>
            <div class="sub" id="tSub"></div>
          </div>
          <button class="chev r" data-a="nextTable" aria-label="next"><span></span></button>
        </div>
        <nav class="menu" id="titleMenu">
          <button data-a="play" data-s="play"></button>
          <button data-a="tables" data-s="tables"></button>
          <button data-a="help" data-s="help"></button>
          <button data-a="scores" data-s="scores"></button>
          <button data-a="settings" data-s="settings"></button>
        </nav>
        <div class="hint" data-s="${this.touch ? 'tapToStart' : 'pressStart'}"></div>
        <div class="dots" id="tableDots"></div>
      </div>
      <div id="tablesScr" class="screen panel-screen">
        <div class="tables-wrap">
          <h2 data-s="chooseTable"></h2>
          <div class="table-cards" id="tableCards"></div>
          <nav class="menu row"><button data-a="back" data-s="back"></button></nav>
        </div>
      </div>
      <div id="veil"><div class="veil-in"><div class="kanji small" id="veilKanji"></div><div class="loadbar"><div id="veilFill"></div></div><div class="caption" id="veilText"></div></div></div>
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
        <div class="letters" id="letters">${[0, 1, 2].map(i => `<div class="lt"><button class="arr" data-i="${i}" data-d="1" aria-label="+">▲</button><span data-i="${i}"></span><button class="arr" data-i="${i}" data-d="-1" aria-label="−">▼</button></div>`).join('')}</div>
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
    root.addEventListener('mouseover', (e) => { const b = e.target.closest('button[data-a]'); if (b && b !== this._hovered) this.h.sound && this.h.sound('uiMove'); this._hovered = b; });
    // initials by pointer / touch: the arrows change a letter, tapping a letter selects it
    this.$('#letters').addEventListener('click', (e) => {
      const el = e.target.closest('[data-i]'); if (!el) return;
      this.initials.pos = +el.dataset.i;
      if (el.dataset.d) this.initialsCycle(+el.dataset.d); else this._renderInitials();
      this.h.sound && this.h.sound('uiMove');
    });
    // a horizontal swipe on the title browses the tables
    {
      let sx = null, sy = 0;
      const t = this.$('#title');
      t.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
      t.addEventListener('pointerup', (e) => {
        if (sx === null) return;
        const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && this.screen === 'title') { this._swiped = performance.now(); this.h.cycleTable(dx < 0 ? 1 : -1); }
      });
    }
    // touch screens: a tap anywhere on the title outside the menu starts a game (as the hint says)
    this.$('#title').addEventListener('click', (e) => { if (this.touch && this.screen === 'title' && performance.now() - this.shownAt > 1200 && performance.now() - (this._swiped || 0) > 600 && !e.target.closest('nav, .chev')) this.h.start(); });
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
    this.screen = name; this.shownAt = performance.now();
    this.root.querySelectorAll('.screen').forEach(el => el.classList.remove('show'));
    const map = { title: '#title', pause: '#pause', settings: '#settings', help: '#helpScr', scores: '#scoresScr', initials: '#initials', loading: '#loading', tables: '#tablesScr' };
    if (map[name]) this.$(map[name]).classList.add('show');
    this.$('#petals').classList.toggle('show', name === 'title');
    this.root.classList.toggle('in-game', name === 'game');
    this.root.classList.toggle('menu-open', name !== 'game');
    if (name === 'initials') this._renderInitials();
    const first = name === 'tables' ? this.$('.tcard.current') || this.$('.tcard') : name === 'title' ? this.$('#titleMenu button') : this.$(map[name] + ' button');
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
      case 'tables': this._buildTables(); this.returnTo = 'title'; this.show('tables'); break;
      case 'prevTable': this.h.cycleTable(-1); break;
      case 'nextTable': this.h.cycleTable(1); break;
      case 'back': back(); break;
      case 'saveInitials': this.h.initials(this.initials.letters.join('')); break;
    }
  }

  setLoading(p, text) {
    this.$('#loadfill').style.width = `${Math.round(p * 100)}%`;
    this.$('#loadtext').textContent = text || (this.table ? this.table.loading[this.s.lang] || this.table.loading.en : this.t('loading'));
  }

  // ---------------------------------------------------------------- tables
  setTable(def) {
    this.table = def;
    document.documentElement.dataset.table = def.ui;
    this.$('#tKanji').textContent = def.kanji;
    this.$('#tLatin').textContent = def.name;
    this.$('#tSub').textContent = def.subtitle[this.s.lang] || def.subtitle.en;
    this.$('#loadKanji').textContent = def.kanji;
    this._buildHelp();
    const list = this.h.tables ? this.h.tables() : [];
    this.$('#tableDots').innerHTML = list.map(t => `<span class="${t.def.id === def.id ? 'on' : ''}"></span>`).join('');
    // the new logo rises in
    const tb = this.$('#title .title-block'); tb.classList.remove('enter'); void tb.offsetWidth; tb.classList.add('enter');
  }
  veil(on, text, kanji) {
    const v = this.$('#veil');
    if (on) {
      this.$('#veilText').textContent = text || '';
      this.$('#veilKanji').textContent = kanji || '';
      this.$('#veilFill').style.width = '0%';
    }
    v.classList.toggle('show', on);
  }
  veilProgress(p) { this.$('#veilFill').style.width = `${Math.round(p * 100)}%`; }
  _buildTables() {
    const lang = this.s.lang;
    const list = this.h.tables ? this.h.tables() : [];
    this.$('#tableCards').innerHTML = list.map(({ def: d, best, current }) => `
      <button class="tcard${current ? ' current' : ''}" data-table="${d.id}" data-theme="${d.ui}">
        <div class="tc-img" style="background-image:url('${import.meta.env.BASE_URL}${d.preview}')"><div class="tc-kanji">${d.kanji}</div></div>
        <div class="tc-body">
          <div class="tc-name">${esc(d.name)}</div>
          <div class="tc-sub">${esc(d.subtitle[lang] || d.subtitle.en)}</div>
          <p class="tc-blurb">${esc(d.blurb[lang] || d.blurb.en)}</p>
          <ul class="tc-feat">${(d.features[lang] || d.features.en).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
          <div class="tc-best"><span>${this.t('record')}</span> ${best ? `${esc(best.name)} · ${best.score.toLocaleString('en-US')}` : '—'}</div>
        </div>
        ${current ? `<div class="tc-flag">${this.t('current')}</div>` : ''}
      </button>`).join('');
    this.$('#tableCards').querySelectorAll('.tcard').forEach(b => {
      b.addEventListener('click', () => { this.h.sound && this.h.sound('uiSelect'); this.h.selectTable(b.dataset.table); });
      b.addEventListener('mouseenter', () => { this.h.sound && this.h.sound('uiMove'); if (!this.touch) b.focus({ preventScroll: true }); });
    });
  }
  tablesMove(dir) {
    const cards = [...this.root.querySelectorAll('.tcard')]; if (!cards.length) return;
    const i = cards.indexOf(document.activeElement);
    const n = cards[(Math.max(0, i) + dir + cards.length) % cards.length];
    n.focus({ preventScroll: true }); n.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    this.h.sound && this.h.sound('uiMove');
  }
  tablesConfirm() {
    const f = document.activeElement;
    if (f && f.classList && f.classList.contains('tcard')) { this.h.sound && this.h.sound('uiSelect'); this.h.selectTable(f.dataset.table); }
    else if (f && f.dataset && f.dataset.a) this.action(f.dataset.a);
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
      <div class="row"><label>${t('quality')}</label>${seg('quality', [['auto', t('auto')], ['low', t('low')], ['medium', t('medium')], ['high', t('high')]])}</div>
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
        ${this.touch ? `<p class="note">${this.s.lang === 'pl' ? 'Na ekranie dotykowym: lewa i prawa połowa ekranu to flippery, przycisk Start wyrzuca kulkę. Stół zmienisz, przesuwając palcem po ekranie tytułowym.' : 'On touch screens: the left and right halves are the flippers; the Launch button fires the plunger. Swipe across the title screen to change the table.'}</p>` : ''}</section>
        <section><h2>${this.t('rules')}</h2><dl class="rules">${((this.table && this.table.rules && (this.table.rules[this.s.lang] || this.table.rules.en)) || L.rulesList).map(([h, d]) => `<dt>${h}</dt><dd>${d}</dd>`).join('')}</dl></section>
      </div>`;
  }
  _buildScores() {
    const hs = this.h.highScores ? this.h.highScores() : [];
    this.$('#scoreList').innerHTML = hs.map((h, i) => `<li><span class="rank">${i + 1}</span><span class="nm">${esc(h.name)}</span><span class="sc">${h.score.toLocaleString('en-US')}</span></li>`).join('');
  }

  // ---------------------------------------------------------------- initials
  startInitials(score) {
    this.$('#finalScore').textContent = score.toLocaleString('en-US');
    // start from the initials this browser used last time
    let last = 'AAA';
    try { last = localStorage.getItem('tsukimi.initials') || last; } catch (e) { }
    const letters = [...last.toUpperCase().padEnd(3).slice(0, 3)].map(c => LETTERS.includes(c) ? c : 'A');
    this.initials = { letters, pos: 0 };
    this.show('initials');
  }
  rememberInitials(name) { try { localStorage.setItem('tsukimi.initials', name); } catch (e) { } }
  initialsKey(e) {
    const I = this.initials;
    if (/^[a-zA-Z0-9]$/.test(e.key)) { I.letters[I.pos] = e.key.toUpperCase(); I.pos = Math.min(2, I.pos + 1); this._renderInitials(); return true; }
    if (e.key === 'Backspace') { I.pos = Math.max(0, I.pos - 1); this._renderInitials(); return true; }
    return false;
  }
  initialsCycle(dir) {
    const I = this.initials, A = LETTERS;
    const i = A.indexOf(I.letters[I.pos]); I.letters[I.pos] = A[(i + dir + A.length) % A.length]; this._renderInitials();
  }
  initialsNext() { const I = this.initials; if (I.pos < 2) { I.pos++; this._renderInitials(); return false; } return true; }
  _renderInitials() {
    const spans = this.$('#letters').querySelectorAll('span');
    for (let i = 0; i < 3; i++) { spans[i].textContent = this.initials.letters[i]; spans[i].classList.toggle('cur', i === this.initials.pos); }
  }

  // ---------------------------------------------------------------- touch
  _touch() {
    const t = this.$('#touch');
    const press = (el, on) => { const a = el.dataset.t; if (a) this.h.press(a, on); };
    t.addEventListener('contextmenu', (e) => e.preventDefault());   // long press must not open a menu
    t.querySelectorAll('[data-t]').forEach(el => {
      // several fingers may rest on one zone: it stays pressed until the last one lifts
      const fingers = new Set();
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (err) { }   // keeps the release on this zone if the finger slides off
        fingers.add(e.pointerId);
        if (fingers.size === 1) { el.classList.add('down'); press(el, true); }
      });
      const up = (e) => {
        if (!fingers.delete(e.pointerId) || fingers.size) return;
        el.classList.remove('down'); press(el, false);
      };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
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
      // Ryujin: bubbles rise instead of sakura falling
      if (document.documentElement.dataset.table === 'ryujin') {
        for (const p of P) {
          p.t += dt; p.x += Math.sin(p.t * p.w * 1.3) * 18 * dt; p.y -= (p.vy * 1.1 + 14) * dt;
          if (p.y < -30) { Object.assign(p, this._newPetal(false)); p.y = c.height + 20; }
          const r = p.s * 0.8;
          g.strokeStyle = `rgba(190,245,235,${p.a * 0.8})`; g.lineWidth = 1.2;
          g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.stroke();
          g.fillStyle = `rgba(230,255,250,${p.a * 0.7})`; g.beginPath(); g.arc(p.x - r * 0.35, p.y - r * 0.35, r * 0.25, 0, Math.PI * 2); g.fill();
        }
        return;
      }
      // Inari: copper and gold maple leaves tumble down
      if (document.documentElement.dataset.table === 'inari') {
        for (const p of P) {
          p.t += dt; p.x += (p.vx * 0.7 + Math.sin(p.t * p.w) * 30) * dt; p.y += p.vy * 0.8 * dt; p.r += p.vr * 1.4 * dt;
          if (p.y > c.height + 20 || p.x < -40 || p.x > c.width + 40) Object.assign(p, this._newPetal(false));
          const k = p.s * 1.25;
          g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(Math.abs(Math.sin(p.t * p.w * 0.6)) * 0.6 + 0.4, 1);
          g.fillStyle = p.c < 14 ? `rgba(230,${90 + p.c * 3},40,${p.a})` : p.c < 28 ? `rgba(200,${50 + p.c},28,${p.a})` : `rgba(236,${150 + p.c},60,${p.a})`;
          g.beginPath();
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i - 2) * 0.62, b = a + 0.31;
            g.lineTo(Math.cos(a) * k * (i === 2 ? 1 : 0.85), Math.sin(a) * k * (i === 2 ? 1 : 0.85));
            g.lineTo(Math.cos(b) * k * 0.38, Math.sin(b) * k * 0.38);
          }
          g.lineTo(0, k * 0.2); g.closePath(); g.fill();
          g.strokeStyle = `rgba(90,30,10,${p.a * 0.6})`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, k * 0.2); g.lineTo(0, k * 0.65); g.stroke();
          g.restore();
        }
        return;
      }
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
