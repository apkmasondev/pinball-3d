// Pinball physics: fixed-step 2D rigid ball dynamics on an inclined plane, with a 1D
// path mode for ramps/habitrails. Pure JS, no rendering dependencies (runs in Node for tests).

const G = 9.81;

export const MATERIALS = {
  metal:   { e: 0.38, falloff: 0.05, mu: 0.08 },
  wood:    { e: 0.32, falloff: 0.05, mu: 0.10 },
  plastic: { e: 0.45, falloff: 0.06, mu: 0.08 },
  rubber:  { e: 0.78, falloff: 0.10, mu: 0.22 },
  post:    { e: 0.70, falloff: 0.10, mu: 0.20 },
  flipper: { e: 0.58, falloff: 0.10, mu: 0.30 },
  target:  { e: 0.30, falloff: 0.05, mu: 0.10 },
  bumper:  { e: 0.50, falloff: 0.05, mu: 0.10 },
  gate:    { e: 0.10, falloff: 0.00, mu: 0.05 },
};

export const DEFAULTS = {
  slopeDeg: 6.75,
  dt: 1 / 2400,
  rollDecel: 0.04,           // m/s^2 rolling resistance
  drag: 0.012,               // 1/m quadratic air drag
  flipperAccel: 20000,       // rad/s^2 while energised (full speed within ~4 ms)
  flipperMaxOmega: 72,       // rad/s (tip ~4.8 m/s)
  flipperReturnAccel: 1600,
  flipperReturnOmega: 28,
  bumperKick: 1.75,          // m/s outward
  slingKick: 1.45,
  plungerMaxPull: 0.042,     // m
  plungerK: 11800,           // spring constant (per unit mass)
  kickbackSpeed: 3.1,
  maxSpeed: 9.0,
};

const HOLES = ['saucer', 'scoop'];

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// Closest point on segment ab to p; returns t in [0,1]
function segT(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  if (l2 < 1e-12) return 0;
  return clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
}

// Polyline path with arc-length parameterisation (3D)
export class Path3 {
  constructor(pts) {
    this.pts = pts;
    this.s = [0];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      this.s.push(this.s[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    }
    this.length = this.s[this.s.length - 1];
  }
  _seg(s) {
    s = clamp(s, 0, this.length);
    let lo = 0, hi = this.s.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.s[m] <= s) lo = m; else hi = m; }
    return lo;
  }
  at(s, out = [0, 0, 0]) {
    const i = this._seg(s);
    const a = this.pts[i], b = this.pts[Math.min(i + 1, this.pts.length - 1)];
    const len = (this.s[i + 1] ?? this.s[i]) - this.s[i];
    const t = len > 0 ? (clamp(s, 0, this.length) - this.s[i]) / len : 0;
    out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t;
    return out;
  }
  tangent(s, out = [0, 0, 0]) {
    const h = 0.004;
    const p0 = this.at(s - h), p1 = this.at(s + h);
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2];
    const l = Math.hypot(dx, dy, dz) || 1;
    out[0] = dx / l; out[1] = dy / l; out[2] = dz / l;
    return out;
  }
  // signed horizontal curvature (1/m) at s — used for banking the ball in turns
  curvature(s) {
    const h = 0.02;
    const t0 = this.tangent(s - h), t1 = this.tangent(s + h);
    const a0 = Math.atan2(t0[1], t0[0]), a1 = Math.atan2(t1[1], t1[0]);
    let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    return d / (2 * h);
  }
}

let BALL_ID = 1;
export class Ball {
  constructor(x, y) {
    this.id = BALL_ID++;
    this.x = x; this.y = y; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.px = x; this.py = y;
    this.mode = 'field';      // field | path | captured | gone
    this.path = null; this.s = 0; this.u = 0; this.pathId = null; this.lat = 0;
    this.capture = null;
    this.gatePass = new Set();
    this.rolls = {};          // rollover switch states (lives with the ball)
    this.lastWallSound = 0;
    this.onFlipperTime = 0;
    // visual rolling state (quaternion)
    this.q = [0, 0, 0, 1];
    this.airborne = false;
  }
}

export class World {
  constructor(layout, opts = {}) {
    this.L = layout;
    this.o = { ...DEFAULTS, ...opts };
    this.r = layout.BALL_R;
    this.balls = [];
    this.events = [];
    this.time = 0;
    this.acc = 0;
    this.setSlope(this.o.slopeDeg);

    this.segs = [];     // {ax,ay,bx,by,r,mat,kind,id,enabled}
    this.circles = [];  // {x,y,r,mat,kind,id}
    this._buildStatic();
    this._buildGrid();

    this.flippers = layout.flippers.map(f => ({
      ...f, dir: f.side === 'L' ? 1 : -1, swing: Math.abs(f.up - f.rest),
      rel: 0, omegaRel: 0, pressed: false, enabled: true,
      angle: f.rest, omega: 0,
    }));
    this.plunger = { pos: 0, vel: 0, pulling: false, pull: 0, releasedAt: -1, autoFire: 0 };
    this.spinner = { angle: 0, omega: 0, ...layout.spinner };
    this.gates = layout.gates.map(g => {
      const dx = g.b[0] - g.a[0], dy = g.b[1] - g.a[1], l = Math.hypot(dx, dy);
      let nx = -dy / l, ny = dx / l;
      if (nx * g.pass[0] + ny * g.pass[1] < 0) { nx = -nx; ny = -ny; }
      return { ...g, nx, ny, len: l, swing: 0, swingV: 0 };
    });
    this.drops = layout.drops.map(d => ({ ...d, up: true, anim: 0 }));
    this.bumperState = layout.bumpers.map(b => ({ ...b, cool: 0, anim: 0 }));
    this.slingState = layout.slings.map(s => ({ ...s, cool: 0, anim: 0 }));
    this.rampPath = new Path3(layout.ramp.path);
    this.vukPath = new Path3(layout.vuk.path);
    this.turntable = { ...layout.turntable, omega: 0, target: 0, angle: 0 };
    this.kickback = { ...layout.kickback, lit: true, anim: 0, cool: 0 };
    this.saucerHold = null; this.scoopHold = null;
    this.tiltDisabled = false;
    this.nudgeV = [0, 0];
    this.magnet = null;
  }

  setSlope(deg) {
    this.o.slopeDeg = deg;
    const th = deg * Math.PI / 180;
    this.gPlane = G * Math.sin(th);          // along -y in the plane
    this.gNormal = G * Math.cos(th);         // into the plane
    this.gRoll = this.gPlane * 5 / 7;        // rolling solid sphere
  }

  emit(type, data) { this.events.push({ type, t: this.time, ...data }); }
  drainEvents() { const e = this.events; this.events = []; return e; }

  _buildStatic() {
    const L = this.L;
    const addPoly = (pts, r, mat, kind, id) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 1e-5) continue;
        this.segs.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1], r, mat, kind, id, enabled: true });
      }
    };
    for (const w of L.walls) addPoly(w.pts, w.r, w.mat, 'wall', w.id);
    for (const p of L.posts) this.circles.push({ x: p.p[0], y: p.p[1], r: p.r, mat: p.kind === 'metal' || p.kind === 'support' ? 'metal' : 'post', kind: 'post', id: p.id });
    for (const s of L.slings) {
      const rr = s.postR + s.rubberR;
      for (const v of [s.T, s.Bo, s.Bi]) this.circles.push({ x: v[0], y: v[1], r: rr, mat: 'rubber', kind: 'post', id: s.id + 'Post' });
      // rubber band: offset the kicker face outward by post radius
      const faces = [[s.Bi, s.T, 'slingFace'], [s.T, s.Bo, 'slingSide'], [s.Bo, s.Bi, 'slingSide']];
      const cx = (s.T[0] + s.Bo[0] + s.Bi[0]) / 3, cy = (s.T[1] + s.Bo[1] + s.Bi[1]) / 3;
      for (const [a, b, kind] of faces) {
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
        let nx = -dy / l, ny = dx / l;
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
        const off = s.postR;
        this.segs.push({ ax: a[0] + nx * off, ay: a[1] + ny * off, bx: b[0] + nx * off, by: b[1] + ny * off, r: s.rubberR, mat: 'rubber', kind, id: s.id, enabled: true, nx, ny });
      }
    }
    for (const b of L.bumpers) this.circles.push({ x: b.p[0], y: b.p[1], r: b.r, mat: 'bumper', kind: 'bumper', id: b.id });
    L.drops.forEach((d, i) => {
      const hx = d.dir[0] * d.half, hy = d.dir[1] * d.half;
      this.segs.push({ ax: d.c[0] - hx, ay: d.c[1] - hy, bx: d.c[0] + hx, by: d.c[1] + hy, r: d.thick / 2, mat: 'target', kind: 'drop', id: d.id, idx: i, enabled: true });
    });
  }

  _buildGrid() {
    const cs = 0.04;
    this.cell = cs;
    this.gx0 = -this.L.TABLE_W / 2 - 0.05; this.gy0 = -0.05;
    this.gnx = Math.ceil((this.L.TABLE_W + 0.1) / cs); this.gny = Math.ceil((this.L.TABLE_L + 0.1) / cs);
    this.grid = Array.from({ length: this.gnx * this.gny }, () => ({ segs: [], circles: [] }));
    const margin = this.r + 0.006;
    const put = (x0, y0, x1, y1, list, item) => {
      const i0 = clamp(Math.floor((x0 - margin - this.gx0) / cs), 0, this.gnx - 1);
      const i1 = clamp(Math.floor((x1 + margin - this.gx0) / cs), 0, this.gnx - 1);
      const j0 = clamp(Math.floor((y0 - margin - this.gy0) / cs), 0, this.gny - 1);
      const j1 = clamp(Math.floor((y1 + margin - this.gy0) / cs), 0, this.gny - 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) this.grid[j * this.gnx + i][list].push(item);
    };
    for (const s of this.segs) put(Math.min(s.ax, s.bx) - s.r, Math.min(s.ay, s.by) - s.r, Math.max(s.ax, s.bx) + s.r, Math.max(s.ay, s.by) + s.r, 'segs', s);
    for (const c of this.circles) put(c.x - c.r, c.y - c.r, c.x + c.r, c.y + c.r, 'circles', c);
  }

  cellAt(x, y) {
    const i = Math.floor((x - this.gx0) / this.cell), j = Math.floor((y - this.gy0) / this.cell);
    if (i < 0 || j < 0 || i >= this.gnx || j >= this.gny) return null;
    return this.grid[j * this.gnx + i];
  }

  addBall(x, y) { const b = new Ball(x, y); this.balls.push(b); return b; }
  removeBall(b) { this.balls = this.balls.filter(q => q !== b); }
  ballInShooter() {
    const P = this.L.plunger;
    return this.balls.find(b => b.mode === 'field' && Math.abs(b.x - P.x) < P.laneW / 2 && b.y < P.restY + this.r + 0.02);
  }

  setFlipper(side, on) {
    for (const f of this.flippers) if (f.side === side) f.pressed = on;
  }

  // ------------------------------------------------------------------ stepping
  update(frameDt) {
    this.acc += Math.min(frameDt, 0.05);
    const dt = this.o.dt;
    let n = 0;
    while (this.acc >= dt && n < 400) { this.step(dt); this.acc -= dt; n++; }
  }

  step(dt) {
    this.time += dt;
    this._stepFlippers(dt);
    this._stepPlunger(dt);
    this._stepMisc(dt);
    for (const b of this.balls) {
      if (b.mode === 'field') this._stepFieldBall(b, dt);
      else if (b.mode === 'path') this._stepPathBall(b, dt);
      else if (b.mode === 'captured') this._stepCaptured(b, dt);
    }
    this._ballBall();
    // 2400 steps a second: only build a new array when a ball actually left
    for (const b of this.balls) if (b.mode === 'gone') { this.balls = this.balls.filter(q => q.mode !== 'gone'); break; }
  }

  _stepFlippers(dt) {
    const o = this.o;
    for (const f of this.flippers) {
      const on = f.pressed && f.enabled && !this.tiltDisabled;
      const prevRel = f.rel;
      if (on) {
        f.omegaRel = Math.min(f.omegaRel + o.flipperAccel * dt, o.flipperMaxOmega);
        if (f.omegaRel < 0) f.omegaRel += o.flipperAccel * dt * 2;
      } else {
        f.omegaRel = Math.max(f.omegaRel - o.flipperReturnAccel * dt, -o.flipperReturnOmega);
      }
      f.rel += f.omegaRel * dt;
      if (f.rel >= f.swing) {
        if (f.omegaRel > 8) this.emit('flipperEOS', { side: f.side, speed: f.omegaRel });
        f.rel = f.swing; f.omegaRel = on ? 0 : Math.min(f.omegaRel, 0);
      }
      if (f.rel <= 0) {
        if (f.omegaRel < -8) this.emit('flipperRest', { side: f.side, speed: -f.omegaRel });
        f.rel = 0; f.omegaRel = on ? f.omegaRel : Math.max(0, -f.omegaRel * 0.12);
        if (!on && f.omegaRel < 0.5) f.omegaRel = 0;
      }
      f.angle = f.rest + f.dir * f.rel;
      f.omega = f.dir * (f.rel - prevRel) / dt;
    }
  }

  _stepPlunger(dt) {
    const P = this.plunger, o = this.o;
    if (P.pulling) {
      P.pull = Math.min(1, P.pull + dt / 1.05);
      const target = (0.3 + 0.7 * P.pull) * o.plungerMaxPull;
      P.pos += (target - P.pos) * Math.min(1, dt * 40);
      P.vel = 0;
    } else if (P.pos > 0 || P.vel !== 0) {
      P.vel += -o.plungerK * P.pos * dt;
      P.pos += P.vel * dt;
      if (P.pos <= 0) {
        P.pos = 0;
        if (P.vel < -0.3) this.emit('plungerHit', { speed: -P.vel });
        P.vel = -P.vel * 0.18; if (Math.abs(P.vel) < 0.05) P.vel = 0;
        if (P.vel > 0) P.vel = -P.vel;
        P.vel = 0;
      }
    }
  }
  pullPlunger(on) {
    const P = this.plunger;
    if (on && !P.pulling) { P.pulling = true; P.pull = 0; }
    if (!on && P.pulling) { P.pulling = false; this.emit('plungerRelease', { pull: P.pull }); }
  }
  autoLaunch(strength = 0.92) {
    const P = this.plunger;
    P.pulling = false; P.pos = strength * this.o.plungerMaxPull; P.vel = 0; P.pull = strength;
    // the ball rests on the tip: move it down with the (instantly) retracted plunger
    const b = this.ballInShooter();
    if (b) { b.y = this.L.plunger.restY - P.pos + this.r; b.vy = 0; }
    this.emit('autoLaunch', {});
  }

  _stepMisc(dt) {
    const sp = this.spinner;
    sp.angle += sp.omega * dt;
    sp.omega *= Math.exp(-dt * 1.6);
    if (Math.abs(sp.omega) < 0.6) {
      // settle to hanging position (angle multiple of 2pi)
      const target = Math.round(sp.angle / (2 * Math.PI)) * 2 * Math.PI;
      sp.omega += (target - sp.angle) * 30 * dt - sp.omega * 4 * dt;
    }
    const k = Math.floor(sp.angle / Math.PI);
    if (sp._k === undefined) sp._k = k;
    if (k !== sp._k) { this.emit('spin', {}); sp._k = k; }
    for (const g of this.gates) {
      g.swingV += (-g.swing * 180 - g.swingV * 9) * dt;
      g.swing += g.swingV * dt;
    }
    for (const b of this.bumperState) { b.cool -= dt; b.anim = Math.max(0, b.anim - dt * 12); }
    for (const s of this.slingState) { s.cool -= dt; s.anim = Math.max(0, s.anim - dt * 14); }
    for (const d of this.drops) d.anim += ((d.up ? 0 : 1) - d.anim) * Math.min(1, dt * 30);
    const tt = this.turntable;
    tt.omega += (tt.target - tt.omega) * Math.min(1, dt * 1.5);
    tt.angle += tt.omega * dt;
    const kb = this.kickback; kb.anim = Math.max(0, kb.anim - dt * 8); kb.cool -= dt;
  }

  // ---------------------------------------------------------------- field ball
  _stepFieldBall(b, dt) {
    const o = this.o, r = this.r;
    b.px = b.x; b.py = b.y;

    // gravity & rolling resistance
    b.vy -= this.gRoll * dt;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > 1e-6 && b.z <= 0.0005) {
      // rolling resistance fades out at crawl speed so balls never 'stick' on gentle slopes
      const dec = (o.rollDecel * Math.min(1, sp / 0.06) + o.drag * sp * sp) * dt;
      const f = Math.max(0, sp - dec) / sp;
      b.vx *= f; b.vy *= f;
    }
    // turntable drag
    const tt = this.turntable;
    if (Math.abs(tt.omega) > 0.05) {
      const dx = b.x - tt.p[0], dy = b.y - tt.p[1];
      if (dx * dx + dy * dy < tt.r * tt.r) {
        const sx = -tt.omega * dy, sy = tt.omega * dx;
        const k = 4.0 * dt;
        b.vx += (sx - b.vx) * k; b.vy += (sy - b.vy) * k;
      }
    }
    if (this.magnet) {
      const m = this.magnet; const dx = m.x - b.x, dy = m.y - b.y; const d = Math.hypot(dx, dy);
      if (d < m.r && d > 1e-4) { b.vx += dx / d * m.f * dt; b.vy += dy / d * m.f * dt; }
    }
    // real balls never balance: tiny noise when (almost) at rest away from flippers/plunger
    if (sp < 0.004 && this.time - b.onFlipperTime > 0.1 && b.y > this.L.plunger.restY + 0.05) {
      b.vx += (Math.random() - 0.5) * 0.02; b.vy += (Math.random() - 0.5) * 0.02;
    }
    // clamp speed
    const s2 = Math.hypot(b.vx, b.vy);
    if (s2 > o.maxSpeed) { b.vx *= o.maxSpeed / s2; b.vy *= o.maxSpeed / s2; }

    // vertical hop
    if (b.z > 0 || b.vz > 0) {
      b.vz -= this.gNormal * dt; b.z += b.vz * dt;
      if (b.z <= 0) { if (b.vz < -0.35) this.emit('land', { ball: b, speed: -b.vz }); b.z = 0; b.vz = b.vz < -0.3 ? -b.vz * 0.28 : 0; }
    }

    b.x += b.vx * dt; b.y += b.vy * dt;

    // static colliders
    const cell = this.cellAt(b.x, b.y);
    if (cell) {
      for (const s of cell.segs) if (s.enabled) this._collideSeg(b, s);
      for (const c of cell.circles) this._collideCircle(b, c);
    }
    for (const f of this.flippers) this._collideFlipper(b, f, dt);
    this._collidePlunger(b);
    this._gates(b);
    this._sensors(b);
    this._rampEntry(b);

    // rolling rotation (visual)
    const vxy = Math.hypot(b.vx, b.vy);
    if (vxy > 1e-5) {
      const ang = vxy * dt / r;
      // axis perpendicular to velocity in plane: (-vy, vx, 0)/|v| (table coords, z up)
      const ax = -b.vy / vxy, ay = b.vx / vxy;
      rotQuat(b.q, ax, ay, 0, ang);
    }

    if (b.y < this.L.drain.y) { b.mode = 'gone'; this.emit('drain', { ball: b }); }
    if (!(isFinite(b.x) && isFinite(b.y))) { b.mode = 'gone'; this.emit('drain', { ball: b, error: true }); }
  }

  _impulse(b, nx, ny, svx, svy, mat, extraE = 0) {
    // relative velocity
    const rvx = b.vx - svx, rvy = b.vy - svy;
    const vn = rvx * nx + rvy * ny;
    if (vn >= 0) return 0;
    const M = MATERIALS[mat] || MATERIALS.metal;
    const e = clamp(M.e / (1 + M.falloff * Math.abs(vn)) + extraE, 0, 0.98);
    const jn = -(1 + e) * vn;
    // tangential friction (Coulomb)
    const tvx = rvx - vn * nx, tvy = rvy - vn * ny;
    const tl = Math.hypot(tvx, tvy);
    let fx = 0, fy = 0;
    if (tl > 1e-6) {
      const jt = Math.min(M.mu * jn, tl * 0.4);
      fx = -tvx / tl * jt; fy = -tvy / tl * jt;
    }
    b.vx += nx * jn + fx; b.vy += ny * jn + fy;
    return -vn;
  }

  _collideSeg(b, s) {
    const r = this.r;
    const t = segT(b.x, b.y, s.ax, s.ay, s.bx, s.by);
    const qx = s.ax + (s.bx - s.ax) * t, qy = s.ay + (s.by - s.ay) * t;
    let dx = b.x - qx, dy = b.y - qy;
    const R = r + s.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return;
    let d = Math.sqrt(d2);
    if (d < 1e-7) { dx = s.nx ?? 0; dy = s.ny ?? 1; d = 1; }
    const nx = dx / d, ny = dy / d;
    b.x += nx * (R - d); b.y += ny * (R - d);
    const vin = this._impulse(b, nx, ny, 0, 0, s.mat);
    if (s.kind === 'slingFace' && t > 0.08 && t < 0.92) {
      const st = this.slingState.find(q => q.id === s.id);
      if (st && st.cool <= 0 && (vin > 0.04 || Math.hypot(b.vx, b.vy) < 0.3)) {
        const k = this.o.slingKick;
        b.vx += s.nx * k; b.vy += s.ny * k;
        st.cool = 0.09; st.anim = 1;
        this.emit('sling', { id: s.id, ball: b });
        return;
      }
    }
    if (s.kind === 'drop') {
      const d0 = this.drops[s.idx];
      if (d0.up && vin > 0.12) {
        d0.up = false; s.enabled = false;
        this.emit('drop', { id: d0.id, idx: s.idx, ball: b, speed: vin });
        return;
      }
    }
    if (vin > 0.05) this.emit('hit', { kind: s.kind, id: s.id, mat: s.mat, speed: vin, ball: b });
  }

  _collideCircle(b, c) {
    const r = this.r;
    let dx = b.x - c.x, dy = b.y - c.y;
    const R = r + c.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return;
    let d = Math.sqrt(d2);
    if (d < 1e-7) { dx = 0; dy = 1; d = 1; }
    const nx = dx / d, ny = dy / d;
    b.x += nx * (R - d); b.y += ny * (R - d);
    const vin = this._impulse(b, nx, ny, 0, 0, c.mat);
    if (c.kind === 'bumper') {
      const st = this.bumperState.find(q => q.id === c.id);
      if (st && st.cool <= 0) {
        // skirt geometry is never perfect: kick direction wobbles a little
        const wob = (Math.random() - 0.5) * 0.26;
        const kx = nx * Math.cos(wob) - ny * Math.sin(wob), ky = nx * Math.sin(wob) + ny * Math.cos(wob);
        const vn = b.vx * kx + b.vy * ky;
        const kick = this.o.bumperKick + 0.25 * vin;
        const add = Math.max(0, kick - vn);
        b.vx += kx * add; b.vy += ky * add;
        st.cool = 0.05; st.anim = 1;
        this.emit('bumper', { id: c.id, ball: b });
        return;
      }
    }
    if (vin > 0.05) this.emit('hit', { kind: c.kind, id: c.id, mat: c.mat, speed: vin, ball: b });
  }

  _collideFlipper(b, f, dt) {
    const r = this.r;
    const ca = Math.cos(f.angle), sa = Math.sin(f.angle);
    // local frame: +y along the flipper
    const px = b.x - f.pivot[0], py = b.y - f.pivot[1];
    const ly = px * ca + py * sa;          // along
    const lx = -px * sa + py * ca;         // across
    if (ly < -f.r0 - r - 0.01 || ly > f.len + f.r1 + r + 0.01) return;
    const ax = Math.abs(lx);
    const h = f.len, r1 = f.r0, r2 = f.r1;
    const bb = (r1 - r2) / h, aa = Math.sqrt(1 - bb * bb);
    const k = -bb * ax + aa * ly;
    let dist, nlx, nly;
    if (k < 0) { dist = Math.hypot(ax, ly) - r1; const l = Math.hypot(ax, ly) || 1; nlx = ax / l; nly = ly / l; }
    else if (k > aa * h) { const dy = ly - h; dist = Math.hypot(ax, dy) - r2; const l = Math.hypot(ax, dy) || 1; nlx = ax / l; nly = dy / l; }
    else { dist = ax * aa + ly * bb - r1; nlx = aa; nly = bb; }
    if (dist >= r) return;
    if (lx < 0) nlx = -nlx;
    // back to world
    const nx = nlx * (-sa) + nly * ca;
    const ny = nlx * ca + nly * sa;
    const pen = r - dist;
    b.x += nx * pen; b.y += ny * pen;
    // contact point & surface velocity
    const cx = b.x - nx * r - f.pivot[0], cy = b.y - ny * r - f.pivot[1];
    const svx = -f.omega * cy, svy = f.omega * cx;
    const vin = this._impulse(b, nx, ny, svx, svy, 'flipper');
    if (vin > 0.08) this.emit('flipperHit', { side: f.side, speed: vin, ball: b, moving: Math.abs(f.omega) > 1 });
    b.onFlipperTime = this.time;
  }

  _collidePlunger(b) {
    const P = this.L.plunger;
    if (Math.abs(b.x - P.x) > P.laneW / 2) return;
    const tipY = P.restY - this.plunger.pos;
    if (b.y - this.r < tipY && b.y > tipY - 0.03) {
      b.y = tipY + this.r;
      const pv = -this.plunger.vel; // plunger moving up (+y) when pos decreasing
      if (b.vy < pv) {
        b.vy = pv;
      } else if (b.vy < 0) {
        b.vy = -b.vy * 0.15;
      }
    }
  }

  _gates(b) {
    const r = this.r;
    for (const g of this.gates) {
      const t = segT(b.x, b.y, g.a[0], g.a[1], g.b[0], g.b[1]);
      const qx = g.a[0] + (g.b[0] - g.a[0]) * t, qy = g.a[1] + (g.b[1] - g.a[1]) * t;
      const dx = b.x - qx, dy = b.y - qy;
      const d = Math.hypot(dx, dy);
      const key = g.id;
      if (d >= r + 0.002) { b.gatePass.delete(key); continue; }
      const s = (b.x - g.a[0]) * g.nx + (b.y - g.a[1]) * g.ny;
      const vn = b.vx * g.nx + b.vy * g.ny;
      if (!b.gatePass.has(key) && (s < 0 || vn > 0.02) && t > 0.0 && t < 1.0) {
        // approaching from the pass side, or already moving through
        b.gatePass.add(key);
        this.emit('gate', { id: g.id, ball: b });
      }
      if (b.gatePass.has(key)) { g.swingV += Math.abs(vn) * 12 * 0.016; g.swing = Math.min(1.4, g.swing + Math.abs(vn) * 0.02); continue; }
      // blocked side: behave like a thin wall facing +n
      if (s > 0 && d < r + 0.002) {
        const nx = dx / (d || 1), ny = dy / (d || 1);
        b.x += nx * (r + 0.002 - d); b.y += ny * (r + 0.002 - d);
        const vin = this._impulse(b, nx, ny, 0, 0, 'gate');
        if (vin > 0.1) this.emit('hit', { kind: 'gateBack', id: g.id, mat: 'metal', speed: vin, ball: b });
      }
    }
  }

  _sensors(b) {
    const L = this.L, r = this.r;
    // rollovers
    for (const ro of L.rollovers) {
      const dx = b.x - ro.p[0], dy = b.y - ro.p[1];
      const inside = dx * dx + dy * dy < ro.r * ro.r;
      const was = b.rolls[ro.id] || false;
      if (inside && !was) this.emit('rollover', { id: ro.id, group: ro.group, ball: b, vy: b.vy, vx: b.vx });
      if (inside !== was) b.rolls[ro.id] = inside;
    }
    // spinner (line crossing)
    const sp = this.spinner;
    if ((b.py - sp.a[1]) * (b.y - sp.a[1]) <= 0 && b.py !== b.y) {
      const t = (b.x - sp.a[0]) / (sp.b[0] - sp.a[0]);
      if (t > -0.05 && t < 1.05) {
        const v = b.vy;
        sp.omega += v * 55;
        this.emit('spinnerPass', { ball: b, v });
      }
    }
    // kickback
    const kb = this.kickback;
    {
      const dx = b.x - kb.p[0], dy = b.y - kb.p[1];
      if (dx * dx + dy * dy < kb.r * kb.r && kb.cool <= 0) {
        if (kb.lit && !this.tiltDisabled) {
          b.vx = 0.05; b.vy = this.o.kickbackSpeed; kb.cool = 0.6; kb.anim = 1; kb.lit = false;
          this.emit('kickback', { ball: b });
        }
      }
    }
    // saucer & scoop capture
    for (const key of HOLES) {
      const h = L[key];
      const dx = b.x - h.p[0], dy = b.y - h.p[1];
      const d = Math.hypot(dx, dy);
      const spd = Math.hypot(b.vx, b.vy);
      const maxSpd = key === 'saucer' ? 1.15 : 2.6;
      if (d < h.capture && spd < maxSpd && !(b.ignoreHole === key && this.time < b.ignoreUntil)) {
        b.mode = 'captured';
        b.capture = { key, t: 0, x0: b.x, y0: b.y, cx: h.p[0], cy: h.p[1], hold: Infinity };
        b.vx = b.vy = 0;
        this.emit(key, { ball: b, speed: spd });
      } else if (d < h.r && d >= h.capture && spd < maxSpd * 1.5) {
        // gentle pull toward the cup (hole lip)
        const f = (key === 'saucer' ? 1.4 : 2.0) * this.o.dt;
        b.vx -= dx / d * f; b.vy -= dy / d * f;
      }
    }
  }

  _rampEntry(b) {
    const e = this.L.ramp.entry;
    // crossing the horizontal entry line moving up
    if (b.py < e.a[1] && b.y >= e.a[1] && b.vy > 0 && b.x > e.a[0] && b.x < e.b[0]) {
      const T = this.rampPath.tangent(0.01);
      const u = b.vx * T[0] + b.vy * T[1];
      this.putOnPath(b, this.rampPath, 'ramp', 0.005, Math.max(u, 0.05));
      this.emit('rampEnter', { ball: b, speed: u });
    }
  }

  putOnPath(b, path, id, s, u) {
    b.mode = 'path'; b.path = path; b.pathId = id; b.s = s; b.u = u; b.lat = 0; b.latV = 0;
    b.maxS = s;
  }

  // ---------------------------------------------------------------- path ball
  _stepPathBall(b, dt) {
    const path = b.path;
    const T = path.tangent(b.s);
    // gravity in table frame: (0, -gPlane, -gNormal)
    let a = (-this.gPlane * T[1] - this.gNormal * T[2]) * 5 / 7;
    const fr = (b.pathId === 'ramp' && b.s < path.length * this.L.ramp.plasticUntil) ? 0.10 : 0.16;
    a -= Math.sign(b.u) * fr;
    a -= Math.sign(b.u) * 0.02 * b.u * b.u;
    b.u += a * dt;
    b.s += b.u * dt;
    b.maxS = Math.max(b.maxS, b.s);
    // banking: lateral offset from centripetal acceleration
    const kap = path.curvature(b.s);
    const latTarget = clamp(kap * b.u * b.u / (this.gNormal) * 0.012, -0.012, 0.012);
    b.lat += (latTarget - b.lat) * Math.min(1, dt * 20);
    const p = path.at(b.s);
    const nx = -T[1], ny = T[0];
    const nl = Math.hypot(nx, ny) || 1;
    b.px = b.x; b.py = b.y;
    b.x = p[0] + nx / nl * b.lat; b.y = p[1] + ny / nl * b.lat; b.z = p[2] + Math.abs(b.lat) * 0.5;
    const vxy = Math.abs(b.u);
    b.vx = T[0] * b.u; b.vy = T[1] * b.u; b.vz = T[2] * b.u;
    if (vxy > 1e-5) rotQuat(b.q, -T[1], T[0], 0, b.u * dt / this.r);

    if (b.s <= 0 && b.u < 0) {
      // rolled back out of the entrance
      b.mode = 'field'; b.z = 0;
      const T0 = path.tangent(0);
      const q = path.at(0);
      b.x = q[0] - T0[0] * 0.004; b.y = q[1] - T0[1] * 0.004;
      b.vx = T0[0] * b.u; b.vy = T0[1] * b.u;
      this.emit('pathFail', { id: b.pathId, ball: b, maxS: b.maxS / path.length });
    } else if (b.s >= path.length) {
      const Te = path.tangent(path.length - 0.01);
      const q = path.at(path.length);
      b.mode = 'field';
      b.x = q[0]; b.y = q[1]; b.z = Math.max(0, q[2] - 0.004);
      const h = Math.hypot(Te[0], Te[1]) || 1;
      const u = Math.max(b.u, this.L.ramp.exitSpeedMin);
      b.vx = Te[0] / h * u; b.vy = Te[1] / h * u; b.vz = -0.05;
      this.emit('pathDone', { id: b.pathId, ball: b });
    }
  }

  // ---------------------------------------------------------------- captured
  _stepCaptured(b, dt) {
    const c = b.capture;
    c.t += dt;
    const k = Math.min(1, c.t / 0.12);
    b.px = b.x; b.py = b.y;
    b.x = c.x0 + (c.cx - c.x0) * k; b.y = c.y0 + (c.cy - c.y0) * k;
    b.z = -this.r * 0.55 * Math.min(1, c.t / 0.15);
    if (c.t >= c.hold) this._release(b);
  }
  holdBall(b, seconds) { if (b.capture) b.capture.hold = b.capture.t + seconds; }
  _release(b) {
    const key = b.capture.key;
    const h = this.L[key];
    if (key === 'saucer') {
      b.mode = 'field'; b.z = 0.0;
      b.x = h.p[0]; b.y = h.p[1];
      const j = (Math.random() - 0.5) * 0.08;
      b.vx = (h.eject[0] + j) * h.ejectSpeed; b.vy = (h.eject[1] + j) * h.ejectSpeed; b.vz = 0.25;
      b.ignoreHole = 'saucer'; b.ignoreUntil = this.time + 0.6;
      this.emit('saucerEject', { ball: b });
    } else {
      // VUK into the wire habitrail
      this.putOnPath(b, this.vukPath, 'vuk', 0.0, 2.35);
      this.emit('scoopEject', { ball: b });
    }
    b.capture = null;
  }

  // ---------------------------------------------------------------- ball-ball
  _ballBall() {
    const bs = this.balls, r = this.r;
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], c = bs[j];
      if (a.mode !== 'field' || c.mode !== 'field') continue;
      const dx = c.x - a.x, dy = c.y - a.y; const d2 = dx * dx + dy * dy;
      if (d2 >= 4 * r * r || d2 < 1e-12) continue;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
      const pen = 2 * r - d;
      a.x -= nx * pen / 2; a.y -= ny * pen / 2; c.x += nx * pen / 2; c.y += ny * pen / 2;
      const vn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
      if (vn < 0) {
        const jn = -(1 + 0.92) * vn / 2;
        a.vx -= nx * jn; a.vy -= ny * jn; c.vx += nx * jn; c.vy += ny * jn;
        if (-vn > 0.1) this.emit('ballClick', { speed: -vn, ball: a });
      }
    }
  }

  nudge(dx, dy) {
    for (const b of this.balls) if (b.mode === 'field') { b.vx += dx; b.vy += dy; }
  }
}

function rotQuat(q, ax, ay, az, ang) {
  const s = Math.sin(ang / 2), c = Math.cos(ang / 2);
  const rx = ax * s, ry = ay * s, rz = az * s, rw = c;
  const [x, y, z, w] = q;
  q[0] = rw * x + rx * w + ry * z - rz * y;
  q[1] = rw * y - rx * z + ry * w + rz * x;
  q[2] = rw * z + rx * y - ry * x + rz * w;
  q[3] = rw * w - rx * x - ry * y - rz * z;
  const l = Math.hypot(q[0], q[1], q[2], q[3]);
  q[0] /= l; q[1] /= l; q[2] /= l; q[3] /= l;
}
