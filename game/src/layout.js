// Table layout — single source of truth for physics, rendering and the Blender build.
// Authored in "flat art pixels": the unwarped playfield art is 1086 x 1880 px at 0.5 mm/px.
// U grows to the right, V grows toward the player. World: x right, y up the table, z up (m).

export const ART_W = 1086;
export const ART_H = 1880;
export const PX = 0.0005;                       // metres per art pixel
export const TABLE_W = ART_W * PX;              // 0.543 m
export const TABLE_L = ART_H * PX;              // 0.940 m
export const BALL_R = 0.0135;                   // 27 mm ball

export const P = (u, v) => [(u - ART_W / 2) * PX, (ART_H - v) * PX];
const L = (px) => px * PX;

// --- outer boundary (superellipse arch) -------------------------------------------------
const LEFT_T = 0.33;   // (see below)
const RIGHT_T = 0.525;  // arch parameter where the right (shooter) channel releases the ball over the top lanes
//   // arch parameter where the left orbit channel ends (one-way gate)
const ARCH = { cx: 540, cy: 470, a: 505, b: 455, n: 2.0 };   // true ellipse: the crown must have curvature
function archPoint(t) { // t: 0 = left (180deg) .. 1 = right (0deg)
  const ang = Math.PI * (1 - t);
  const c = Math.cos(ang), s = Math.sin(ang);
  const e = 2 / ARCH.n;
  const x = ARCH.cx + ARCH.a * Math.sign(c) * Math.pow(Math.abs(c), e);
  const y = ARCH.cy - ARCH.b * Math.sign(s) * Math.pow(Math.abs(s), e);
  return [x, y];
}
// Offset of the arch inward (toward its centre) by d px, sampled along t
function archOffset(t, d) {
  const e = 1e-4;
  const p0 = archPoint(Math.max(0, t - e)), p1 = archPoint(Math.min(1, t + e));
  const tx = p1[0] - p0[0], ty = p1[1] - p0[1];
  const len = Math.hypot(tx, ty);
  const nx = -ty / len, ny = tx / len; // inward normal for this sweep (v grows downward)
  const p = archPoint(t);
  return [p[0] + nx * d, p[1] + ny * d];
}
function sample(fn, t0, t1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) out.push(fn(t0 + (t1 - t0) * i / n));
  return out;
}
// Catmull-Rom through control points (art px), returns dense polyline
function spline(ctrl, perSeg = 8) {
  const out = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      const q = [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
      if (p0.length > 2) q.push(f(p0[2], p1[2], p2[2], p3[2]));
      out.push(q);
    }
  }
  out.push(ctrl[ctrl.length - 1].slice());
  return out;
}

export function buildLayout() {
  const W = [];   // walls: {id, pts:[[x,y]..] (m), r (half thickness, m), mat, h (height m), style}
  const wall = (id, ptsPx, opts = {}) => W.push({ id, pts: ptsPx.map(p => P(p[0], p[1])), r: L(opts.t ?? 10) / 2, mat: opts.mat ?? 'metal', h: opts.h ?? 0.032, style: opts.style ?? 'guide', closed: !!opts.closed });

  // Outer wall: left side, arch, right side (shooter lane outer)
  const outerL = 35, outerR = 1045;
  const arch = sample(archPoint, 0, 1, 90);
  wall('outer', [[outerL, 660], [outerL, 470], ...arch.slice(1, -1), [outerR, 470], [outerR, 1740]], { t: 24, mat: 'wood', h: 0.06, style: 'cabinet' });

  // Lower-left boundary: bulges in so balls rolling back out of the left orbit feed the saucer,
  // then keeps the lower playfield symmetric about the flippers; drain funnels below.
  wall('fillL', spline([[outerL, 660], [40, 740], [66, 810], [96, 868], [100, 930], [88, 1010], [84, 1080], [104, 1160], [118, 1220]], 6)
    .concat([[118, 1650], [150, 1700], [430, 1790]]), { t: 12, mat: 'metal', h: 0.04, style: 'rail' });
  wall('drainR', [[962, 1690], [650, 1790]], { t: 12, mat: 'metal', h: 0.04, style: 'hidden' });
  wall('drainBottom', [[100, 1830], [1000, 1830]], { t: 12, mat: 'metal', h: 0.04, style: 'hidden' });

  // Shooter lane inner wall (straight) — top end forms one side of the right-orbit mouth
  wall('shooterInner', [[968, 1760], [968, 792]], { t: 12, mat: 'metal', h: 0.034, style: 'rail' });

  // Right channel inner wall (right orbit / shooter arch): offset of the arch
  const rightInner = [];
  rightInner.push([955, 615]);
  for (let i = 0; i <= 24; i++) {
    const t = 1 - i * ((1 - RIGHT_T) / 24);
    // channel floor dips toward the release point so a slow ball never parks on the flat crown
    rightInner.push(archOffset(t, 84));
  }
  // prepend straight part so it starts at the orbit mouth
  const rightInnerPts = [[868, 748], [906, 660], [930, 590], ...rightInner.filter(p => p[1] < 540)];   // lane mouth faces the left flipper
  wall('rightInner', rightInnerPts, { t: 10, mat: 'metal', h: 0.032, style: 'rail' });
  // seal between the channel release point and the right-most top lane guide
  const rEnd = rightInnerPts[rightInnerPts.length - 1];

  // Left channel inner wall (left orbit)
  const leftInner = [];
  for (let i = 0; i <= 24; i++) {
    const t = i * (LEFT_T / 24);
    leftInner.push(archOffset(t, 92));
  }
  wall('leftInner', [[150, 668], ...leftInner.filter(p => p[1] < 600)], { t: 10, mat: 'metal', h: 0.032, style: 'rail' });
  const leftInnerEnd = leftInner[leftInner.length - 1];

  // Top lanes guides (TSU-KI-MI) above the jet bumpers
  const laneX = [248, 322, 396, 470];
  laneX.forEach((x, i) => wall('laneGuide' + i, i === 3 ? [rEnd, [x, 170], [x, 280]] : [[x, 205 + (i === 0 ? 20 : 0)], [x, 280]], { t: 8, mat: 'metal', h: 0.03, style: 'laneguide' }));

  // Scoop pocket (Shrine) at art hole (543, 370)
  const scoopC = [543, 372];
  const pocket = [];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI * (1.0 + i / 16); // from left, over the top, to right
    pocket.push([scoopC[0] + Math.cos(a) * 66, scoopC[1] + Math.sin(a) * 60]);
  }
  wall('scoopWall', [[scoopC[0] - 66, 450], ...pocket, [scoopC[0] + 66, 450]], { t: 10, mat: 'metal', h: 0.034, style: 'rail' });
  // fills the V between the last lane guide and the shrine hood so balls roll over the crown
  wall('scoopFill', [[470, 280], [scoopC[0], scoopC[1] - 60]], { t: 10, mat: 'metal', h: 0.034, style: 'rail' });

  // Ramp mouth side walls (Moon Bridge) — entrance at (705, 800)
  wall('rampWallL', [[652, 812], [668, 700], [690, 610]], { t: 8, mat: 'plastic', h: 0.03, style: 'rampside' });
  wall('rampWallR', [[760, 812], [768, 720], [785, 640]], { t: 8, mat: 'plastic', h: 0.03, style: 'rampside' });
  wall('rampBack', [[690, 610], [785, 640]], { t: 8, mat: 'plastic', h: 0.03, style: 'hidden' }); // only reached if ball rolls back weirdly — kept behind entrance sensor

  // Inlane guides
  // inlane guides end tangent to the resting flipper's upper surface so the ball rolls onto the bat
  const inlanePts = spline([[202, 1268], [202, 1440], [208, 1485], [240, 1514], [292, 1531], [347, 1550]], 5);
  wall('inlaneL', inlanePts, { t: 8, mat: 'metal', h: 0.03, style: 'rail' });
  wall('inlaneR', inlanePts.map(([u, v]) => [ART_W - u, v]), { t: 8, mat: 'metal', h: 0.03, style: 'rail' });

  // --- posts (rubber) ---
  const posts = [];
  const post = (id, u, v, rpx = 11, kind = 'rubber') => posts.push({ id, p: P(u, v), r: L(rpx), kind });
  post('pInL', 202, 1268, 11); post('pInR', 884, 1268, 11);
  post('pLeftOrbit', 150, 668, 12); post('pRightOrbit', 868, 748, 12);
  post('pShooterTop', 968, 792, 10, 'metal');
  laneX.forEach((x, i) => post('pLane' + i, x, 205 + (i === 0 ? 20 : 0), 8, 'metal'));
  post('pScoopL', scoopC[0] - 66, 450, 9, 'metal'); post('pScoopR', scoopC[0] + 66, 450, 9, 'metal');
  post('pRampL', 652, 812, 10); post('pRampR', 760, 812, 10);

  // --- slingshots ---
  const slings = [
    { id: 'slingL', side: 'L', T: P(286, 1296), Bo: P(282, 1418), Bi: P(394, 1446) },
    { id: 'slingR', side: 'R', T: P(ART_W - 286, 1296), Bo: P(ART_W - 282, 1418), Bi: P(ART_W - 394, 1446) },
  ];
  slings.forEach(s => { s.postR = L(11); s.rubberR = L(3); });

  // --- flippers ---
  const flippers = [
    { id: 'flipperL', side: 'L', pivot: P(362, 1582), len: L(132), r0: L(25), r1: L(13), rest: -28 * Math.PI / 180, up: 24 * Math.PI / 180 },
    { id: 'flipperR', side: 'R', pivot: P(724, 1582), len: L(132), r0: L(25), r1: L(13), rest: Math.PI + 28 * Math.PI / 180, up: Math.PI - 24 * Math.PI / 180 },
  ];

  // --- pop bumpers (jets) ---
  // one centred under the lane exits, two staggered below: lane balls strike a shoulder and fan out,
  // and every gap passes a ball cleanly (a ball-width gap under the lanes used to trap it for 10 s+)
  const bumpers = [
    { id: 'bumper0', p: P(274, 560), r: L(48), cap: 'lantern' },
    { id: 'bumper1', p: P(312, 391), r: L(48), cap: 'lotus' },
    { id: 'bumper2', p: P(422, 608), r: L(48), cap: 'koi' },
  ];

  // --- drop targets (K-O-I): bank square to the shot line from the right flipper ---
  const drops = [];
  const dropC = P(372, 818), flipR = P(724 - 40, 1560);
  const toFlip = [flipR[0] - dropC[0], flipR[1] - dropC[1]];
  const tl = Math.hypot(toFlip[0], toFlip[1]);
  const face = [toFlip[0] / tl, toFlip[1] / tl];            // faces the right flipper
  const dir = [-face[1], face[0]];                          // along the bank
  const spacing = L(46);
  for (let i = 0; i < 3; i++) {
    const o = (i - 1) * spacing;
    drops.push({ id: 'drop' + i, letter: 'KOI'[i], c: [dropC[0] + dir[0] * o, dropC[1] + dir[1] * o], dir, n: face, half: L(19), thick: L(6) });
  }
  // backstop behind the bank (visual housing + physics wall)
  {
    const back = L(16), ext = L(28);
    const a = [dropC[0] - dir[0] * (spacing + ext) - face[0] * back, dropC[1] - dir[1] * (spacing + ext) - face[1] * back];
    const b = [dropC[0] + dir[0] * (spacing + ext) - face[0] * back, dropC[1] + dir[1] * (spacing + ext) - face[1] * back];
    W.push({ id: 'dropBack', pts: [a, b], r: L(6), mat: 'metal', h: 0.03, style: 'dropback' });
  }

  // --- rollovers ---
  const rollovers = [];
  const roll = (id, u, v, group) => rollovers.push({ id, p: P(u, v), r: L(20), group });
  roll('laneTSU', (laneX[0] + laneX[1]) / 2, 245, 'top'); roll('laneKI', (laneX[1] + laneX[2]) / 2, 245, 'top'); roll('laneMI', (laneX[2] + laneX[3]) / 2, 245, 'top');
  roll('outL', 160, 1330, 'lower'); roll('inL', 242, 1350, 'lower'); roll('inR', 844, 1350, 'lower'); roll('outR', 925, 1330, 'lower');
  roll('shooterSw', 1009, 1480, 'shooter');
  roll('orbitL', 82, 500, 'orbit'); roll('orbitR', 1004, 560, 'orbitR');

  // --- spinner in the left orbit ---
  const spinner = { id: 'spinner', a: P(40, 560), b: P(127, 560), c: P(84, 560) };

  // --- one-way gates ---
  // pass = direction a ball may travel through freely
  const gates = [
    { id: 'gateLeftTop', a: P(...leftInnerEnd), b: P(...archPoint(LEFT_T)), pass: [1, 0] },
    { id: 'gateShooter', a: P(974, 783), b: P(1042, 751), pass: [0, 1] },
  ];

  // --- saucer & scoop ---
  const saucer = { id: 'saucer', p: P(145, 870), r: L(36), capture: L(22), eject: [0.94, -0.34], ejectSpeed: 1.25 };
  const scoop = { id: 'scoop', p: P(scoopC[0], scoopC[1]), r: L(44), capture: L(26) };

  // --- kickback (left outlane) ---
  const kickback = { id: 'kickback', p: P(160, 1560), r: L(30), speed: 3.2 };

  // --- turntable (koi disc) ---
  const turntable = { id: 'turntable', p: P(543, 990), r: L(78) };

  // --- plunger ---
  const plunger = { x: P(1009, 0)[0], restY: P(0, 1668)[1], ballY: P(0, 1668 - 27)[1], laneW: L(71) };

  // --- ramp (Moon Bridge): entrance line, then 3D path (x,y,z metres) ---
  const rampCtrl = [
    [706, 790, 0], [712, 700, 0.006], [728, 600, 0.02], [752, 500, 0.038], [782, 410, 0.056], [815, 330, 0.068],
    [858, 262, 0.075], [915, 238, 0.078], [972, 262, 0.078], [1004, 330, 0.076], [1010, 460, 0.072],
    [1008, 700, 0.064], [1004, 950, 0.056], [996, 1130, 0.048], [975, 1225, 0.040], [930, 1270, 0.030], [884, 1290, 0.024], [850, 1302, 0.018],
  ];
  const ramp = {
    id: 'ramp',
    entry: { a: P(660, 800), b: P(752, 800), dir: [0, 1] },
    path: spline(rampCtrl, 10).map(q => [...P(q[0], q[1]), q[2]]),
    plasticUntil: 0.43,     // fraction of path that is a plastic ramp; the rest is a wire habitrail
    exitSpeedMin: 0.5,
  };
  // Near its entrance the bridge deck hangs lower than a ball: close both edges (and cap them) up to
  // where the deck clears a ball, so nothing rolls through the bridge from the side.
  {
    const art = spline(rampCtrl, 10);
    const clear = 2 * BALL_R + 0.0055;                 // deck underside sits 3.5 mm below its surface
    let k = 0; while (k < art.length - 1 && art[k][2] < clear) k++;
    const nrm = (i) => {
      const a = art[Math.max(0, i - 1)], b = art[Math.min(art.length - 1, i + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
    };
    const edge = (sg) => art.slice(0, k + 1).map((q, i) => [q, nrm(i)]).filter(([q]) => q[1] < 660)
      .map(([q, n]) => [q[0] + n[0] * 46 * sg, q[1] + n[1] * 46 * sg]);
    const eA = edge(1), eB = edge(-1);
    wall('rampEdgeA', eA, { t: 6, mat: 'plastic', h: 0.03, style: 'hidden' });
    wall('rampEdgeB', eB, { t: 6, mat: 'plastic', h: 0.03, style: 'hidden' });
    wall('rampUnderCap', [eA[eA.length - 1], eB[eB.length - 1]], { t: 6, mat: 'plastic', h: 0.03, style: 'hidden' });
  }
  // gold posts carrying the plastic deck: solid for balls passing under the bridge (Blender builds them from here)
  ramp.supports = [];
  {
    const pts = ramp.path.slice(0, Math.floor(ramp.path.length * ramp.plasticUntil) + 1);
    const step = Math.floor(pts.length / 5);
    for (let i = step; i < pts.length; i += step) {
      const q = pts[i]; if (q[2] <= 0.02) continue;
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
      for (const sg of [1, -1]) {
        const sp = { p: [q[0] + nx * 0.025 * sg, q[1] + ny * 0.025 * sg], h: q[2] - 0.002 };
        ramp.supports.push(sp);
        posts.push({ id: `rampSupport${i}_${sg > 0 ? 'a' : 'b'}`, p: sp.p, r: 0.0018, kind: 'support' });
      }
    }
  }
  // Scoop VUK habitrail to the left inlane
  const vukCtrl = [
    [543, 300, 0.0], [543, 292, 0.05], [520, 268, 0.078], [470, 236, 0.086], [380, 212, 0.086], [290, 222, 0.084],
    [200, 270, 0.082], [120, 360, 0.08], [86, 480, 0.076], [80, 700, 0.066], [92, 950, 0.056], [110, 1120, 0.046], [150, 1230, 0.034], [200, 1285, 0.024], [236, 1306, 0.018],
  ];
  const vuk = { id: 'vuk', path: spline(vukCtrl, 10).map(q => [...P(q[0], q[1]), q[2]]) };

  // --- lamps (inserts) placed on the art's painted inserts ---
  const lamps = [];
  const lamp = (id, u, v, rpx, color, shape = 'circle', extra = {}) => lamps.push({ id, p: P(u, v), r: L(rpx), color, shape, ...extra });
  // top lanes indicator inserts on the art (pills near the lanes)
  lamp('lTSU', 285, 300, 12, '#ffd27a'); lamp('lKI', 359, 300, 12, '#ffd27a'); lamp('lMI', 433, 300, 12, '#ffd27a');
  // orbit arrows (art diagonal pills)
  lamp('arrowOrbitL', 205, 660, 22, '#ffe7c0', 'pill', { ang: -0.9, len: 58 });
  lamp('arrowOrbitR', 878, 650, 22, '#ffe7c0', 'pill', { ang: 0.9, len: 58 });
  // ramp arrow (art pill at 790,470 is under the ramp; use inserts at 710,480/530)
  lamp('arrowRamp', 712, 482, 22, '#ffb347');
  lamp('rampLock', 712, 530, 13, '#ffb347');
  // scoop / shrine inserts (art pills at 297,470 & 790,470)
  lamp('shrineL', 297, 470, 18, '#ff6a5a', 'pill', { ang: Math.PI / 2, len: 70 });
  lamp('shrineR', 790, 470, 18, '#ff6a5a', 'pill', { ang: Math.PI / 2, len: 70 });
  lamp('lockLit', 375, 480, 18, '#ff4d6d'); lamp('lockLit2', 375, 530, 11, '#ff4d6d');
  // left mid inserts (art round inserts)
  lamp('mysteryL', 150, 1005, 22, '#ffd27a');
  lamp('kickbackLit', 80, 1392, 20, '#ff5040');
  lamp('koiK', 228, 735, 22, '#ffd9a0'); lamp('koiO', 275, 680, 22, '#ffd9a0');
  lamp('dropsDone', 260, 935, 16, '#ffd27a');
  // right side
  lamp('multiball', 810, 670, 24, '#ffd27a'); lamp('jackpot', 858, 735, 24, '#ffd27a');
  lamp('frenzy', 880, 930, 22, '#ffd27a');
  lamp('comboA', 750, 1015, 24, '#ffe7c0'); lamp('comboB', 790, 1090, 24, '#ffe7c0'); lamp('comboC', 815, 1170, 22, '#ffe7c0');
  lamp('moon1', 598, 1060, 22, '#fff1c8'); lamp('moon2', 700, 1070, 0, '#fff1c8');
  lamp('extraBall', 543, 1600, 44, '#ff3b30');
  lamp('ballSave', 543, 1720, 16, '#ff9a3c');
  lamp('bonusX2', 988, 850, 22, '#ffffff', 'pill', { ang: 0.3, len: 60 });
  lamp('bonusX3', 988, 925, 22, '#ffffff', 'pill', { ang: 0.3, len: 60 });
  lamp('bonusX4', 988, 1000, 22, '#ffffff', 'pill', { ang: 0.3, len: 60 });
  lamp('inLlamp', 214, 1270, 18, '#ffffff', 'pill', { ang: Math.PI / 2, len: 70 });
  lamp('inRlamp', 885, 1250, 18, '#ffffff', 'pill', { ang: Math.PI / 2, len: 70 });

  const drain = { y: P(0, 1760)[1] };

  return {
    ART_W, ART_H, PX, TABLE_W, TABLE_L, BALL_R,
    walls: W, posts, slings, flippers, bumpers, drops, rollovers, spinner, gates, saucer, scoop, kickback, turntable,
    plunger, ramp, vuk, lamps, drain,
  };
}
