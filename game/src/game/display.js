// 128x32 dot-matrix display with 4 brightness levels, rendered as glowing amber dots.
const W = 128, H = 32;

// 5x7 bitmap font (rows top->bottom, 5 bits each). Missing glyphs fall back to '?'.
const F5 = {
  'A': '01110,10001,10001,11111,10001,10001,10001', 'B': '11110,10001,10001,11110,10001,10001,11110', 'C': '01110,10001,10000,10000,10000,10001,01110',
  'D': '11110,10001,10001,10001,10001,10001,11110', 'E': '11111,10000,10000,11110,10000,10000,11111', 'F': '11111,10000,10000,11110,10000,10000,10000',
  'G': '01110,10001,10000,10111,10001,10001,01111', 'H': '10001,10001,10001,11111,10001,10001,10001', 'I': '01110,00100,00100,00100,00100,00100,01110',
  'J': '00111,00010,00010,00010,00010,10010,01100', 'K': '10001,10010,10100,11000,10100,10010,10001', 'L': '10000,10000,10000,10000,10000,10000,11111',
  'M': '10001,11011,10101,10101,10001,10001,10001', 'N': '10001,10001,11001,10101,10011,10001,10001', 'O': '01110,10001,10001,10001,10001,10001,01110',
  'P': '11110,10001,10001,11110,10000,10000,10000', 'Q': '01110,10001,10001,10001,10101,10010,01101', 'R': '11110,10001,10001,11110,10100,10010,10001',
  'S': '01111,10000,10000,01110,00001,00001,11110', 'T': '11111,00100,00100,00100,00100,00100,00100', 'U': '10001,10001,10001,10001,10001,10001,01110',
  'V': '10001,10001,10001,10001,10001,01010,00100', 'W': '10001,10001,10001,10101,10101,10101,01010', 'X': '10001,10001,01010,00100,01010,10001,10001',
  'Y': '10001,10001,01010,00100,00100,00100,00100', 'Z': '11111,00001,00010,00100,01000,10000,11111',
  '0': '01110,10001,10011,10101,11001,10001,01110', '1': '00100,01100,00100,00100,00100,00100,01110', '2': '01110,10001,00001,00010,00100,01000,11111',
  '3': '11111,00010,00100,00010,00001,10001,01110', '4': '00010,00110,01010,10010,11111,00010,00010', '5': '11111,10000,11110,00001,00001,10001,01110',
  '6': '00110,01000,10000,11110,10001,10001,01110', '7': '11111,00001,00010,00100,01000,01000,01000', '8': '01110,10001,10001,01110,10001,10001,01110',
  '9': '01110,10001,10001,01111,00001,00010,01100', ' ': '00000,00000,00000,00000,00000,00000,00000', '.': '00000,00000,00000,00000,00000,01100,01100',
  ',': '00000,00000,00000,00000,01100,00100,01000', '!': '00100,00100,00100,00100,00100,00000,00100', '?': '01110,10001,00001,00010,00100,00000,00100',
  '-': '00000,00000,00000,11111,00000,00000,00000', '+': '00000,00100,00100,11111,00100,00100,00000', ':': '00000,01100,01100,00000,01100,01100,00000',
  '/': '00001,00010,00010,00100,01000,01000,10000', '·': '00000,00000,00000,01100,01100,00000,00000', '×': '00000,10001,01010,00100,01010,10001,00000',
  "'": '00100,00100,01000,00000,00000,00000,00000', '(': '00010,00100,01000,01000,01000,00100,00010', ')': '01000,00100,00010,00010,00010,00100,01000',
  '%': '11001,11010,00010,00100,01000,01011,10011', '#': '01010,11111,01010,01010,11111,01010,00000', '<': '00010,00100,01000,10000,01000,00100,00010', '>': '01000,00100,00010,00001,00010,00100,01000',
  '*': '00000,10101,01110,11111,01110,10101,00000', '●': '00000,01110,11111,11111,11111,01110,00000', '○': '00000,01110,10001,10001,10001,01110,00000',
};
const PL = { 'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z', 'Ū': 'U', 'Ō': 'O' };
const GLYPH = {};
for (const k in F5) GLYPH[k] = F5[k].split(',').map(r => [...r].map(c => c === '1'));

export class Display {
  constructor() {
    this.buf = new Float32Array(W * H);
    this.shown = new Float32Array(W * H).fill(-1);   // what the canvas currently shows
    this.dirty = false;
    this.queue = [];
    this.cur = null;
    this.popText = null; this.popT = 0;
    this.t = 0;
    this.mode = 'attract';
    this.hud = null;
    this.color = [255, 128, 48];
    this.hiscores = [];
    this.lang = 'en';
    this.strings = {};
    // text raster (antialiased font quantised to 4 levels)
    this.tc = document.createElement('canvas'); this.tc.width = W; this.tc.height = H;
    this.tctx = this.tc.getContext('2d', { willReadFrequently: true });
    // output canvas
    this.S = 6;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W * this.S; this.canvas.height = H * this.S;
    this.ctx = this.canvas.getContext('2d');
    this.low = document.createElement('canvas'); this.low.width = W; this.low.height = H;
    this.lctx = this.low.getContext('2d');
    this.img = this.lctx.createImageData(W, H);
    this._buildMask();
    this.textCache = new Map();
    this.fontFamily = '"Marcellus", "Shippori Mincho", serif';
  }

  // per-table look: dot colour, the faint unlit dots, attract texts
  setTheme(def) {
    this.color = def.dmd; this.unlitColor = def.dmdUnlit; this.attractDef = def.attract;
    this.hudNames = def.id === 'ryujin' ? { tsukimi: 'RYUGU', frenzy: 'UZUMAKI' } : { tsukimi: 'TSUKIMI', frenzy: 'FRENZY' };
    this._buildMask(); this.shown.fill(-1);
  }
  _buildMask() {
    const S = this.S;
    const m = document.createElement('canvas'); m.width = W * S; m.height = H * S;
    const c = m.getContext('2d');
    c.fillStyle = '#fff';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { c.beginPath(); c.arc(x * S + S / 2, y * S + S / 2, S * 0.43, 0, Math.PI * 2); c.fill(); }
    this.mask = m;
    const u = document.createElement('canvas'); u.width = W * S; u.height = H * S;
    const uc = u.getContext('2d');
    uc.fillStyle = this.unlitColor || 'rgba(255,120,40,0.075)';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { uc.beginPath(); uc.arc(x * S + S / 2, y * S + S / 2, S * 0.4, 0, Math.PI * 2); uc.fill(); }
    this.unlit = u;
    this.tmp = document.createElement('canvas'); this.tmp.width = W * S; this.tmp.height = H * S;
    this.tmpc = this.tmp.getContext('2d');
  }

  // ---------------------------------------------------------------- scene queue
  show(s) {
    s = { dur: 1.5, prio: 1, ...s, t: 0 };
    if (!this.cur || (s.prio >= (this.cur.prio || 0))) {
      if (this.cur && this.cur.t < this.cur.dur && (this.cur.prio || 0) > 3 && s.prio < this.cur.prio) { this.queue.push(s); return; }
      this.cur = s;
    } else {
      this.queue.push(s);
      this.queue.sort((a, b) => b.prio - a.prio);
      if (this.queue.length > 4) this.queue.length = 4;
    }
  }
  pop(text) { this.popText = text; this.popT = 1.0; }
  clearQueue() { this.queue = []; this.cur = null; }

  // ---------------------------------------------------------------- drawing primitives
  clear(v = 0) { this.buf.fill(v); }
  px(x, y, v) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (v > this.buf[i]) this.buf[i] = v; }
  text5(str, x, y, v = 1, align = 'left', spacing = 1) {
    str = [...String(str).toUpperCase()].map(c => PL[c] || c).join('');
    const w = str.length * (5 + spacing) - spacing;
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x = x - w;
    for (const ch of str) {
      const g = GLYPH[ch] || GLYPH['?'];
      for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) if (g[r][c]) this.px(x + c, y + r, v);
      x += 5 + spacing;
    }
    return w;
  }
  // antialiased TTF text, quantised to the 4 DMD levels, auto-fit to maxW
  textBig(str, cx, cy, size = 18, v = 1, maxW = 124, weight = '') {
    const key = str + '|' + size + '|' + maxW + '|' + weight;
    let entry = this.textCache.get(key);
    if (!entry) {
      const c = this.tctx;
      let sz = size;
      c.font = `${weight} ${sz}px ${this.fontFamily}`;
      let w = c.measureText(str).width;
      while (w > maxW && sz > 7) { sz--; c.font = `${weight} ${sz}px ${this.fontFamily}`; w = c.measureText(str).width; }
      const cw = Math.ceil(w) + 4, ch = Math.ceil(sz * 1.3) + 2;
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
      const cc = cv.getContext('2d', { willReadFrequently: true });
      cc.font = c.font; cc.fillStyle = '#fff'; cc.textBaseline = 'middle';
      cc.fillText(str, 2, ch / 2 + 1);
      const data = cc.getImageData(0, 0, cw, ch).data;
      const levels = new Float32Array(cw * ch);
      for (let i = 0; i < cw * ch; i++) { const a = data[i * 4 + 3] / 255; levels[i] = a < 0.2 ? 0 : a < 0.45 ? 0.33 : a < 0.7 ? 0.66 : 1; }
      entry = { cw, ch, levels };
      if (this.textCache.size > 300) this.textCache.clear();
      this.textCache.set(key, entry);
    }
    const x0 = Math.round(cx - entry.cw / 2), y0 = Math.round(cy - entry.ch / 2);
    for (let y = 0; y < entry.ch; y++) for (let x = 0; x < entry.cw; x++) { const l = entry.levels[y * entry.cw + x]; if (l) this.px(x0 + x, y0 + y, l * v); }
    return entry.cw;
  }
  circle(cx, cy, r, v = 1, fill = false) {
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
      const d = Math.hypot(x, y);
      if (fill ? d <= r : Math.abs(d - r) < 0.6) this.px(cx + x, cy + y, v);
    }
  }

  // ---------------------------------------------------------------- animations
  anim(name, t) {
    switch (name) {
      case 'moonrise': {
        const y = 40 - Math.min(1, t / 0.8) * 24;
        this.circle(108, y, 9, 0.5, true);
        this.circle(108, y, 11, 0.33);
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + t; this.px(108 + Math.cos(a) * 14, y + Math.sin(a) * 14, 0.33); }
        this.circle(20, y, 9, 0.5, true); this.circle(20, y, 11, 0.33);
        break;
      }
      case 'koi': case 'bridge': {
        const x = ((t * 70) % 190) - 30;
        this._koi(x, 24 + Math.sin(t * 6) * 2, 1, t);
        this._koi(160 - ((t * 55) % 190), 8 + Math.sin(t * 5) * 2, -1, t + 1);
        break;
      }
      case 'sparkle': case 'mystery':
        for (let i = 0; i < 26; i++) { const x = (i * 37 + Math.floor(t * 10) * 13) % W, y = (i * 17 + Math.floor(t * 10) * 7) % H; this.px(x, y, 0.66); }
        break;
      case 'jackpot': case 'super': {
        const r = (t * 60) % 80;
        for (let k = 0; k < 3; k++) this.circle(64, 16, r - k * 18, 0.4);
        if (name === 'super') for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + t * 2; for (let d = 18; d < 70; d += 3) this.px(64 + Math.cos(a) * d, 16 + Math.sin(a) * d * 0.5, 0.25); }
        break;
      }
      case 'multiball': {
        for (let i = 0; i < 3; i++) { const a = t * 3 + i * 2.1; this.circle(64 + Math.cos(a) * 52, 16 + Math.sin(a) * 10, 3, 0.66, true); }
        break;
      }
      case 'lock': {
        // little torii gate
        for (let x = 4; x < 26; x++) { this.px(x, 6, 0.66); this.px(x, 9, 0.5); }
        for (let y = 6; y < 28; y++) { this.px(9, y, 0.66); this.px(20, y, 0.66); }
        for (let x = 102; x < 124; x++) { this.px(x, 6, 0.66); this.px(x, 9, 0.5); }
        for (let y = 6; y < 28; y++) { this.px(107, y, 0.66); this.px(118, y, 0.66); }
        break;
      }
      case 'pearl': {
        // a pearl rising through water with drifting bubbles
        const y = 36 - Math.min(1, t / 0.7) * 20;
        for (const cx of [14, 114]) {
          this.circle(cx, y, 7, 0.66, true); this.circle(cx, y, 9, 0.33);
          this.px(cx - 3, y - 3, 1); this.px(cx - 2, y - 3, 1); this.px(cx - 3, y - 2, 1);
          for (let i = 0; i < 5; i++) { const by = (y - 10 - ((t * 14 + i * 7) % 26)); this.px(cx + Math.sin(t * 3 + i) * 4, by, 0.33); }
        }
        break;
      }
      case 'whirl': {
        // a spiral turning around the centre of the display
        for (let i = 0; i < 180; i++) {
          const a = i * 0.21 + t * 6, r = i * 0.33;
          this.px(64 + Math.cos(a) * r * 1.6, 16 + Math.sin(a) * r * 0.5, i % 3 === 0 ? 0.66 : 0.33);
        }
        break;
      }
      case 'waves': {
        for (let x = 0; x < W; x++) {
          const y1 = 27 + Math.sin(x * 0.18 + t * 6) * 2.5, y2 = 4 + Math.sin(x * 0.15 - t * 5) * 2;
          this.px(x, y1, 0.5); this.px(x, y1 + 1, 0.25); this.px(x, y2, 0.33);
        }
        break;
      }
      case 'dragon': {
        // a sea serpent swimming across, its body a travelling sine
        const hx = ((t * 80) % 200) - 36;
        for (let k = 0; k < 60; k++) {
          const x = hx - k, y = 16 + Math.sin(k * 0.22 - t * 8) * 7 * Math.min(1, k / 10);
          const w = k < 6 ? 2.5 : Math.max(0.5, 2.2 - k * 0.03);
          for (let j = -w; j <= w; j++) this.px(x, y + j, k < 6 ? 1 : 0.5);
        }
        this.px(hx + 2, 14, 0); this.px(hx + 3, 12, 1); this.px(hx + 4, 11, 1);
        break;
      }
      case 'lanes': {
        // three lamps lighting in sequence at the far edges
        for (let i = 0; i < 3; i++) { const on = t > i * 0.15; this.circle(4, 6 + i * 10, 2, on ? 0.8 : 0.2, true); this.circle(123, 6 + i * 10, 2, on ? 0.8 : 0.2, true); }
        break;
      }
    }
  }
  _koi(x, y, dir, t) {
    for (let i = -8; i <= 8; i++) {
      const hw = Math.max(0, 3.2 - Math.abs(i + 2) * 0.35);
      const wig = Math.sin(t * 9 + i * 0.5) * (i < -3 ? 1.2 : 0.3);
      for (let j = -hw; j <= hw; j++) this.px(x + i * dir, y + j + wig, i > 4 ? 1 : 0.66);
    }
    for (let j = -3; j <= 3; j++) this.px(x - 10 * dir, y + j + Math.sin(t * 9) * 1.5, 0.5);
    this.px(x + 6 * dir, y - 1, 0);
  }

  // ---------------------------------------------------------------- scenes
  _scoreScene(h) {
    const s = h.score.toLocaleString('en-US');
    this.textBig(s, 64, 12, 21, 1, 124);
    let left = `${this.strings.ball || 'BALL'} ${h.ball}`;
    let right = h.bonusX > 1 ? `${h.bonusX}X` : '';
    const hn = this.hudNames || { tsukimi: 'TSUKIMI', frenzy: 'FRENZY' };
    if (h.hurry > 0) right = `HURRY ${Math.round(h.hurry / 1000)}K`;
    else if (h.mb) right = 'MULTIBALL';
    else if (h.tsukimi > 0) right = `${hn.tsukimi} ${Math.ceil(h.tsukimi)}`;
    else if (h.frenzy > 0) right = `${hn.frenzy} ${Math.ceil(h.frenzy)}`;
    else if (h.lockLit) right = 'LOCK LIT';
    this.text5(left, 1, 25, 0.66);
    this.text5(right, 127, 25, 0.66, 'right');
    // moon phase icon (top-right): the lit part grows from the right as the moon fills
    const cx = 121, cy = 5, r = 4;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y > r * r + 1) continue;
      const lit = (x + r) / (2 * r) >= 1 - h.moon / 8;
      this.px(cx + x, cy + y, lit ? 1 : 0.18);
    }
    if (h.save > 0 && Math.floor(this.t * 4) % 2 === 0) this.px(0, 0, 1);
  }

  _attract() {
    const cycle = 16, t = this.t % cycle;
    const A = this.attractDef || { title: 'TSUKIMI', sub: 'MOONLIT KOI GARDEN', anim: 'moonrise' };
    if (t < 5) {
      this.anim(A.anim, t);
      this.textBig(A.title, 64, 12, 20, 1, 100);
      this.text5(A.sub, 64, 24, 0.5, 'center');
    } else if (t < 11) {
      const hs = this.hiscores;
      const k = Math.floor((t - 5) / 2);
      if (k === 0) { this.text5(this.strings.highScore || 'HIGH SCORES', 64, 1, 0.66, 'center'); if (hs[0]) { this.textBig(`${hs[0].name}  ${hs[0].score.toLocaleString('en-US')}`, 64, 19, 15, 1); } }
      else {
        for (let i = 0; i < 2; i++) { const e = hs[(k - 1) * 2 + 1 + i]; if (e) this.text5(`${(k - 1) * 2 + 2 + i}. ${e.name} ${e.score.toLocaleString('en-US')}`, 64, 4 + i * 13, 0.8, 'center'); }
      }
    } else {
      this.anim(A.anim === 'pearl' ? 'dragon' : 'koi', t);
      this.textBig(this.strings.pressStart || 'PRESS START', 64, 15, 13, Math.floor(this.t * 2) % 2 ? 1 : 0.66, 118);
    }
  }

  // advances the scenes; redraws the dot canvas only when it is on screen and a dot changed (sets this.dirty)
  update(dt, visible = true) {
    this.t += dt;
    this.dirty = false;
    this.clear(0);
    let s = this.cur;
    if (s) {
      s.t += dt;
      if (s.t >= s.dur) { this.cur = this.queue.shift() || null; s = this.cur; }
    }
    if (s) {
      if (s.anim) this.anim(s.anim, s.t);
      const vis = s.blink ? (Math.floor(s.t * 5) % 2 === 0) : true;
      const flashIn = Math.min(1, s.t / 0.08);
      if (vis) {
        if (s.small) {
          this.textBig(s.big, 64, 10, 16, flashIn, 124);
          this.textBig(s.small, 64, 25, 11, 0.9, 124);
        } else {
          this.textBig(s.big, 64, 16, 20, flashIn, 124);
        }
      }
    } else if (this.mode === 'game' && this.hud) {
      this._scoreScene(this.hud);
    } else if (this.mode === 'attract') {
      this._attract();
    } else if (this.mode === 'initials' && this.initials) {
      const I = this.initials;
      this.text5(this.strings.enterInitials || 'ENTER INITIALS', 64, 1, 0.66, 'center');
      for (let i = 0; i < 3; i++) {
        const ch = I.letters[i] || '_';
        const on = i !== I.pos || Math.floor(this.t * 4) % 2 === 0;
        this.textBig(ch, 44 + i * 20, 20, 16, on ? 1 : 0.33);
      }
    }
    if (this.popT > 0 && (!s || (s.prio || 0) < 3)) {
      this.popT -= dt;
      if (this.mode === 'game' && !s) {
        // points popup replaces the ball info line briefly
        for (let y = 24; y < 32; y++) for (let x = 0; x < W; x++) this.buf[y * W + x] = 0;
        this.text5(this.popText, 64, 25, 1, 'center');
      }
    }
    if (!visible) return;
    const buf = this.buf, shown = this.shown;
    let same = true;
    for (let i = 0; i < buf.length; i++) if (buf[i] !== shown[i]) { same = false; break; }
    if (same) return;
    shown.set(buf);
    this._render();
    this.dirty = true;
  }

  _render() {
    const d = this.img.data, [r, g, b] = this.color;
    for (let i = 0; i < W * H; i++) {
      const v = this.buf[i];
      d[i * 4] = r * v; d[i * 4 + 1] = g * v; d[i * 4 + 2] = b * v; d[i * 4 + 3] = 255;
    }
    this.lctx.putImageData(this.img, 0, 0);
    const c = this.ctx, S = this.S, cw = W * S, ch = H * S;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#080404'; c.fillRect(0, 0, cw, ch);
    c.drawImage(this.unlit, 0, 0);
    // lit dots: scaled pixels masked to round dots
    const t = this.tmpc;
    t.globalCompositeOperation = 'source-over';
    t.imageSmoothingEnabled = false;
    t.clearRect(0, 0, cw, ch);
    t.drawImage(this.low, 0, 0, cw, ch);
    t.globalCompositeOperation = 'destination-in';
    t.drawImage(this.mask, 0, 0);
    c.globalCompositeOperation = 'lighter';
    c.drawImage(this.tmp, 0, 0);
    // soft glow
    c.globalAlpha = 0.55;
    c.filter = 'blur(5px)';
    c.drawImage(this.tmp, 0, 0);
    c.filter = 'none';
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
}
