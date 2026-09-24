// Simple autopilot: flips when a ball is about to reach a flipper, plunges, occasionally cradles.
export class Bot {
  constructor(world, layout, input) { this.w = world; this.L = layout; this.input = input; this.on = false; this.t = 0; this.hold = {}; this.plT = -1; this.direct = false; }
  press(a, on) {
    if (!this.direct) return this.input.press(a, on);
    if (a === 'plunger') this.w.pullPlunger(on); else this.w.setFlipper(a === 'left' ? 'L' : 'R', on);
  }
  start(direct = false) { this.on = true; this.direct = direct; } stop() { if (!this.on) return; for (const s of ['left', 'right']) this.press(s, false); this.press('plunger', false); this.on = false; this.plT = -1; }
  update(dt) {
    if (!this.on) return;
    this.t += dt;
    const w = this.w;
    // plunger
    const sb = w.ballInShooter();
    if (sb && Math.abs(sb.vy) < 0.02 && this.plT < 0) { this.plT = this.t; this.plHold = 0.25 + Math.random() * 0.7; this.press('plunger', true); }
    if (this.plT >= 0 && this.t - this.plT > this.plHold) { this.press('plunger', false); if (this.t - this.plT > this.plHold + 1.2) this.plT = -1; }
    for (const f of w.flippers) {
      const side = f.side === 'L' ? 'left' : 'right';
      let want = false;
      for (const b of w.balls) {
        if (b.mode !== 'field') continue;
        const dx = b.x - f.pivot[0], dy = b.y - f.pivot[1];
        const along = dx * Math.cos(f.rest) + dy * Math.sin(f.rest);
        const d = Math.hypot(dx, dy);
        // predicted position 60 ms ahead
        const px = b.x + b.vx * 0.06, py = b.y + b.vy * 0.06;
        const pdx = px - f.pivot[0], pdy = py - f.pivot[1];
        const palong = pdx * Math.cos(f.rest) + pdy * Math.sin(f.rest);
        if (d < f.len + 0.03 && palong > f.len * (0.35 + Math.random() * 0.4) && palong < f.len + 0.01 && b.vy < 0.2) want = true;
      }
      const held = this.hold[side] || 0;
      if (want && !f.pressed) { this.press(side, true); this.hold[side] = this.t; }
      else if (f.pressed && this.t - held > 0.18 + Math.random() * 0.1 && !want) this.press(side, false);
    }
  }
}
