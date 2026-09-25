import CUES from './music.json';

const BASE = `${import.meta.env.BASE_URL}assets/audio/`;

// Shared across table selection, settings and the title screen.
export const MENU_CUE = 'attract';
export const MENU_SONG = CUES.cues[MENU_CUE].song;

// Adaptive soundtrack: each cue is a section of one of the songs with its own loop range.
// Loops are stitched with short scheduled crossfades; switching between cues waits for the next
// downbeat of the playing song so transitions land on the bar.
export class MusicPlayer {
  constructor(ctx, out) {
    this.ctx = ctx; this.out = out;
    this.buffers = {}; this.offsetFix = {};
    this.cur = null;       // { cue, name, segs: [...] }
    this.want = null;
    this.xfade = 0.045;
    this.timer = setInterval(() => this._tick(), 90);
  }
  // songs load on demand (each table brings its own); concurrent requests share one fetch
  load(ids = Object.keys(CUES.songs)) { return Promise.all(ids.map(id => this.ensure(id))); }
  ensure(id) {
    this.loading ||= {};
    if (this.buffers[id]) return Promise.resolve(this.buffers[id]);
    if (this.loading[id]) return this.loading[id];
    const s = CUES.songs[id];
    const ogg = typeof Audio !== 'undefined' && new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== '';
    const tryLoad = async (ext) => {
      const r = await fetch(BASE + s.file + ext); if (!r.ok) throw new Error('http ' + r.status);
      return this.ctx.decodeAudioData(await r.arrayBuffer());
    };
    return this.loading[id] = (async () => {
      let buf;
      try { buf = await tryLoad(ogg ? '.ogg' : '.mp3'); } catch (e) { buf = await tryLoad(ogg ? '.mp3' : '.ogg'); }
      this.buffers[id] = buf;
      // decoders that keep MP3 encoder padding add a few ms at the start: shift the grid by that much
      const extra = buf.duration - s.samples / s.rate;
      this.offsetFix[id] = extra > 0 && extra < 0.1 ? extra * 0.5 : 0;
      return buf;
    })().catch(e => { delete this.loading[id]; throw e; });
  }

  play(name) {
    this.want = name;
    const cue0 = name && CUES.cues[name];
    if (cue0 && !this.buffers[cue0.song]) {
      this.ensure(cue0.song).then(() => { if (this.want === name) this.play(name); }).catch(e => console.warn('music load failed', e));
      return;
    }
    if (this.cur && this.cur.name === name) return;
    const now = this.ctx.currentTime;
    if (!name) { this._fadeOutAll(now, 0.9); this.cur = null; return; }
    const cue = CUES.cues[name];
    if (!cue) return;
    let at = now + 0.03, fadeIn = 0.6;
    if (this.cur) {
      // quantise to the next bar of the song that is playing now
      const c = this.cur, seg = c.segs[c.segs.length - 1], song = CUES.songs[c.cue.song];
      const pos = seg.offset + (now - seg.when);
      const k = Math.ceil((pos - song.barPhase) / song.barLen + 1e-3);
      let wait = song.barPhase + k * song.barLen - pos;
      if (wait < 0.12) wait += song.barLen;
      if (wait > 2.2) wait = 0.05;           // very slow bars: do not keep the player waiting
      at = now + wait; fadeIn = 0.03;
      this._fadeOutAll(at, 0.35);
    }
    const next = { name, cue, segs: [] };
    next.segs.push(this._seg(cue, at, cue.start, fadeIn));
    this.cur = next;
  }
  stop() { this.play(null); }

  _seg(cue, when, offset, fadeIn) {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.buffers[cue.song];
    const g = c.createGain();
    const vol = cue.gain ?? 1;
    g.gain.setValueAtTime(0, when); g.gain.linearRampToValueAtTime(vol, when + fadeIn);
    src.connect(g); g.connect(this.out);
    const fix = this.offsetFix[cue.song] || 0;
    src.start(when, Math.max(0, offset + fix));
    return { src, g, when, offset, end: when + (cue.loopEnd - offset), vol, next: false };
  }
  _fadeOutAll(at, dur) {
    if (!this.cur) return;
    for (const s of this.cur.segs) {
      s.g.gain.cancelScheduledValues(at); s.g.gain.setValueAtTime(s.vol, at); s.g.gain.linearRampToValueAtTime(0, at + dur);
      try { s.src.stop(at + dur + 0.05); } catch (e) { }
    }
  }
  _tick() {
    const c = this.cur; if (!c) return;
    const now = this.ctx.currentTime;
    const seg = c.segs[c.segs.length - 1];
    if (!seg.next && seg.end - now < 0.5) {
      // schedule the loop: the next segment starts at loopStart exactly when this one reaches loopEnd
      seg.next = true;
      const X = this.xfade;
      const nxt = this._seg(c.cue, seg.end - X, c.cue.loopStart - X, X);
      seg.g.gain.setValueAtTime(seg.vol, seg.end - X); seg.g.gain.linearRampToValueAtTime(0, seg.end);
      try { seg.src.stop(seg.end + 0.05); } catch (e) { }
      c.segs.push(nxt);
      if (c.segs.length > 3) c.segs.shift();
    }
  }
}
