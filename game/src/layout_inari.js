// INARI — the Golden Fox Forest. Shares the cabinet, the shooter, the outer orbits and the lower
// flipper assembly with the other tables; everything above is its own: no top lanes, a third
// (upper-left) flipper fed by the left orbit, the Senbon Torii ramp that climbs the right side,
// passes under a row of torii and ends INSIDE the shrine, a shrine that kicks the ball back to the
// flippers, a jet cluster at the upper right, three fox-mask targets and a pop-up guard post.
import { buildLayout, P, PX, BALL_R, spline } from './layout.js';

const L = (px) => px * PX;
const path3 = (ctrl) => spline(ctrl, 10).map(([u, v, z]) => [...P(u, v), z]);

export function buildInariLayout() {
  const T = buildLayout();
  const drop = ['dropBack', 'scoopWall', 'scoopFill', 'rampWallL', 'rampWallR', 'rampBack', 'rampEdgeA', 'rampEdgeB', 'rampUnderCap'];
  const walls = T.walls.filter(w => !drop.includes(w.id) && !w.id.startsWith('laneGuide'));
  const posts = T.posts.filter(p => !/^pLane|^pScoop|^pRamp/.test(p.id) && p.kind !== 'support');
  const rollovers = T.rollovers.filter(r => r.group !== 'top');
  const wall = (id, pts, o = {}) => walls.push({ id, pts: pts.map(([u, v]) => P(u, v)), r: L(o.t ?? 10) / 2, mat: o.mat ?? 'metal', h: o.h ?? 0.034, style: o.style ?? 'rail', closed: false });
  const post = (id, u, v, r, kind = 'metal') => posts.push({ id, p: P(u, v), r: L(r), kind });

  // --- the shrine (kitsune jinja): upper left of centre, opens toward the player
  const shrineC = [405, 350];
  const pocket = Array.from({ length: 17 }, (_, i) => { const a = Math.PI * (1 + i / 16); return [shrineC[0] + Math.cos(a) * 64, shrineC[1] + Math.sin(a) * 58]; });
  wall('scoopWall', [[shrineC[0] - 64, 430], ...pocket, [shrineC[0] + 64, 430]]);
  post('pScoopL', shrineC[0] - 64, 430, 9); post('pScoopR', shrineC[0] + 64, 430, 9);
  // kick-out: straight back down between the jets and the upper flipper, toward the right flipper
  const scoop = { ...T.scoop, p: P(...shrineC), eject: [-0.25, -0.968], ejectSpeed: 0.9, ejectJitter: 0.06 };

  // --- upper-left flipper on the left bulge, fed by balls coming back down the left orbit and the bulge
  // (low on the bulge, clear of the left-orbit shot line; its pivot sits against the bulge so nothing slips behind)
  const flippers = [...T.flippers, {
    id: 'flipperU', side: 'L', pivot: P(140, 1112), len: L(88), r0: L(19), r1: L(10),
    rest: -34 * Math.PI / 180, up: 20 * Math.PI / 180,
  }];

  // guide from the bulge onto the flipper: no gap for a ball to sit in between the wall and the pivot
  wall('flipUGuide', [[84, 1036], [127, 1093]], { t: 8 });

  // --- jets: a tight triangle at the upper right
  const bumpers = [[640, 360], [742, 300], [728, 430]].map(([u, v], i) => ({ ...T.bumpers[i], p: P(u, v), r: L(42), cap: ['fox', 'maple', 'rice'][i] }));

  // --- three fox-mask stand-ups on the right, square to the left flipper
  const standups = [];
  const maskC = P(868, 1010), flipL = P(402, 1560);
  const toFlip = [flipL[0] - maskC[0], flipL[1] - maskC[1]], tl = Math.hypot(...toFlip);
  const face = toFlip.map(x => x / tl), dir = [-face[1], face[0]], spacing = L(44);
  for (let i = 0; i < 3; i++) {
    const o = (i - 1) * spacing;
    standups.push({ id: 'mask' + i, bank: 'mask', c: [maskC[0] + dir[0] * o, maskC[1] + dir[1] * o], dir, n: face, half: L(17), thick: L(7) });
  }
  {
    const back = L(15), ext = L(26);
    walls.push({ id: 'maskBack', pts: [-1, 1].map(s => [maskC[0] + s * dir[0] * (spacing + ext) - face[0] * back, maskC[1] + s * dir[1] * (spacing + ext) - face[1] * back]), r: L(6), mat: 'metal', h: 0.03, style: 'dropback' });
    // roof over the corner behind the bank, sloping back to the playfield: no ball may settle there
    const top = walls.at(-1).pts[0];
    walls.push({ id: 'maskRoof', pts: [top, P(962, 868)], r: L(8) / 2, mat: 'metal', h: 0.034, style: 'rail', closed: false });
  }

  // --- pop-up guard post between the flippers (Kitsune Guard)
  const popups = [{ id: 'guard', p: P(543, 1668), r: L(12) }];

  // --- Senbon Torii ramp: centre-right mouth, up the right side, across the top behind the jets,
  // down INTO the shrine from behind (the ball ends the ride captured in the shrine)
  const rampCtrl = [
    [700, 830, 0], [706, 740, 0.010], [724, 640, 0.028], [760, 545, 0.046], [812, 470, 0.060],
    [845, 390, 0.070], [838, 300, 0.077], [800, 222, 0.081], [720, 178, 0.083], [620, 172, 0.082],
    [530, 196, 0.076], [468, 232, 0.064], [432, 268, 0.050], [418, 296, 0.040], [410, 322, 0.014], [406, 342, 0.0],
  ];
  const ramp = {
    ...T.ramp,
    entry: { a: P(654, 840), b: P(746, 840), dir: [0, 1] },
    path: path3(rampCtrl), plasticUntil: 1.0, exitSpeedMin: 0.25, exitSpeedMax: 0.6, supports: [],
    // torii gate switches up the climb, where the player sees the gates face on (fractions of the path length)
    gates: [0.08, 0.15, 0.22, 0.29, 0.36],
  };
  ramp.plasticLength = ramp.path.slice(1).reduce((sum, p, i) => sum + Math.hypot(...p.map((v, k) => v - ramp.path[i][k])), 0);
  // mouth walls up to where the deck clears a ball
  const art = spline(rampCtrl, 10);
  const normal = (pts, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]; };
  let k = 0; while (art[k][2] < 2 * BALL_R + 0.0055) k++;
  const edges = [1, -1].map(s => art.slice(0, k + 1).map((q, i) => { const n = normal(art, i); return [q[0] + n[0] * 46 * s, q[1] + n[1] * 46 * s]; }));
  wall('rampWallL', edges[1], { t: 8, mat: 'plastic', style: 'rampside' });
  wall('rampWallR', edges[0], { t: 8, mat: 'plastic', style: 'rampside' });
  wall('rampUnderCap', [edges[0].at(-1), edges[1].at(-1)], { t: 6, mat: 'plastic', style: 'hidden' });
  post('pRampL', ...edges[1][0], 10, 'rubber'); post('pRampR', ...edges[0][0], 10, 'rubber');
  for (const i of [25, 45, 70, 95]) {
    const q = ramp.path[i], n = normal(ramp.path, i);
    for (const s of [-1, 1]) {
      const sp = { p: [q[0] + n[0] * 0.025 * s, q[1] + n[1] * 0.025 * s], h: q[2] - 0.002 };
      ramp.supports.push(sp);
      posts.push({ id: `rampSupport${i}_${s > 0 ? 'a' : 'b'}`, p: sp.p, r: 0.0018, kind: 'support' });
    }
  }
  // where the gates stand: the same arc-length fractions the physics uses
  const arc = [0]; for (let i = 1; i < ramp.path.length; i++) arc.push(arc[i - 1] + Math.hypot(...ramp.path[i].map((v, k) => v - ramp.path[i - 1][k])));
  const gateIdx = ramp.gates.map(f => arc.findIndex(x => x >= f * arc.at(-1)));
  const gateMarks = gateIdx.map(i => ramp.path[i]);
  ramp.gateIdx = gateIdx;

  return {
    ...T, table: 'inari', walls, posts, rollovers, flippers, bumpers, standups, popups, scoop, ramp,
    saucer: null, drops: [], lamps: [],
    turntable: { id: 'turntable', p: [0, -1], r: 0 },
    glassHeight: 0.13, gateMarks,
  };
}
