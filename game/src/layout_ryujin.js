// RYŪJIN — asymmetric lagoon. Cabinet, outer orbits, launcher and lower
// flipper assembly are shared; attractions and both elevated routes are unique.
// This layout drives physics, Blender geometry and the printed lamp artwork.
import { buildLayout, P, ART_W, PX, BALL_R, spline } from './layout.js';

const L = (px) => px * PX;
const path3 = (ctrl) => spline(ctrl, 10).map(([u, v, z]) => [...P(u, v), z]);

export function buildRyujinLayout() {
  const T = buildLayout();
  const walls = T.walls.filter(w => !['dropBack', 'scoopWall', 'scoopFill'].includes(w.id) && !w.id.startsWith('ramp'));
  const posts = T.posts.filter(p => !p.id.startsWith('pScoop') && !p.id.startsWith('pRamp') && p.kind !== 'support');
  const wall = (id, pts, style = 'rail', mat = 'metal', thick = 10) => walls.push({
    id, pts: pts.map(([u, v]) => P(u, v)), r: L(thick) / 2, mat, h: 0.034, style, closed: false,
  });
  const post = (id, u, v, r, kind = 'metal') => posts.push({ id, p: P(u, v), r: L(r), kind });

  // A separate diagonal palace shot from the left flipper.
  const palace = [725, 470];
  const pocket = Array.from({ length: 17 }, (_, i) => {
    const a = Math.PI * (1 + i / 16);
    return [palace[0] + Math.cos(a) * 66, palace[1] + Math.sin(a) * 60];
  });
  wall('scoopWall', [[659, 548], ...pocket, [791, 548]]);
  post('pScoopL', 659, 548, 9); post('pScoopR', 791, 548, 9);
  const scoop = { ...T.scoop, p: P(...palace) };
  const bumpers = [[400, 390], [570, 340], [520, 570]].map(([u, v], i) => ({
    ...T.bumpers[i], p: P(u, v), cap: ['wave', 'dragon', 'pearl'][i],
  }));

  const standups = [];
  const shellC = P(765, 835), flipL = P(402, 1560);
  const toFlip = [flipL[0] - shellC[0], flipL[1] - shellC[1]];
  const tl = Math.hypot(...toFlip);
  const face = toFlip.map(x => x / tl), dir = [-face[1], face[0]], spacing = L(46);
  for (let i = 0; i < 3; i++) {
    const o = (i - 1) * spacing;
    standups.push({ id: 'shell' + i, bank: 'shell', c: [shellC[0] + dir[0] * o, shellC[1] + dir[1] * o], dir, n: face, half: L(18), thick: L(7) });
  }
  const back = L(16), ext = L(28);
  walls.push({ id: 'shellBack', pts: [-1, 1].map(s => [shellC[0] + s * dir[0] * (spacing + ext) - face[0] * back, shellC[1] + s * dir[1] * (spacing + ext) - face[1] * back]), r: L(6), mat: 'metal', h: 0.03, style: 'dropback' });
  for (const [i, u, v] of [[0, 114, 935], [1, 105, 1035]]) {
    standups.push({ id: 'tide' + i, bank: 'tide', c: P(u, v), dir: [0, 1], n: [1, 0], half: L(19), thick: L(8) });
  }
  // Leave a full ball lane between the cave and the shooter wall. The softer,
  // steeper eject feeds the flippers instead of the left sling/right-wall loop.
  const cave = [830, 1080];
  const saucer = { ...T.saucer, p: P(...cave), eject: [-0.8, -0.6], ejectSpeed: 0.95 };
  const turntable = { ...T.turntable, p: P(450, 1040) };

  // Jade bridge: left entrance, broad upper sweep, right inlane return.
  const rampCtrl = [
    [335, 880, 0], [323, 785, 0.010], [295, 675, 0.030], [265, 555, 0.052],
    [248, 435, 0.074], [305, 310, 0.091], [440, 235, 0.098], [620, 225, 0.099],
    [785, 260, 0.098], [925, 350, 0.094], [1008, 470, 0.085],
    [1008, 700, 0.072], [1004, 950, 0.056], [996, 1130, 0.048],
    [975, 1225, 0.040], [930, 1270, 0.030], [884, 1290, 0.024], [850, 1302, 0.018],
  ];
  const ramp = {
    ...T.ramp, entry: { a: P(289, 880), b: P(381, 880), dir: [0, 1] },
    path: path3(rampCtrl), plasticUntil: 100 / 170, supports: [],
  };
  // Rendering selects samples, whereas rolling friction uses distance in metres.
  ramp.plasticLength = ramp.path.slice(1, 101).reduce((sum, p, i) => sum + Math.hypot(...p.map((v, k) => v - ramp.path[i][k])), 0);
  // Guard the deck until there is a full ball's clearance underneath it.
  const art = spline(rampCtrl, 10);
  const normal = (pts, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  };
  let k = 0; while (art[k][2] < 2 * BALL_R + 0.0055) k++;
  const edges = [1, -1].map(s => art.slice(0, k + 1).map((q, i) => {
    const n = normal(art, i); return [q[0] + n[0] * 46 * s, q[1] + n[1] * 46 * s];
  }));
  wall('rampWallL', edges[1], 'rampside', 'plastic', 8);
  wall('rampWallR', edges[0], 'rampside', 'plastic', 8);
  wall('rampUnderCap', [edges[0].at(-1), edges[1].at(-1)], 'hidden', 'plastic', 6);
  post('pRampL', ...edges[1][0], 10, 'rubber'); post('pRampR', ...edges[0][0], 10, 'rubber');
  for (const i of [30, 40, 80, 88]) {
    const q = ramp.path[i], n = normal(ramp.path, i);
    for (const s of [-1, 1]) {
      // The outer leg at the right bend would stand inside the shooter/orbit
      // channel. Carry that bend from its inner leg and the adjoining span.
      // (The inner leg sits a full ball's width off the orbit rail: nearer, it pinned balls against it.)
      if (i === 88 && s === 1) continue;
      const sp = { p: [q[0] + n[0] * 0.025 * s, q[1] + n[1] * 0.025 * s], h: q[2] - 0.002 };
      ramp.supports.push(sp);
      posts.push({ id: 'rampSupport' + i + '_' + s, p: sp.p, r: 0.0018, kind: 'support' });
    }
  }
  // Palace return travels beneath the bridge, then into the left inlane.
  const vuk = { ...T.vuk, path: path3([
    [725, 470, 0], [725, 440, 0.018], [725, 405, 0.033], [690, 360, 0.042],
    [630, 302, 0.043], [520, 270, 0.043], [390, 262, 0.041], [245, 310, 0.038],
    [135, 405, 0.036], [86, 480, 0.033], [80, 700, 0.032], [92, 950, 0.030],
    [110, 1120, 0.028], [150, 1230, 0.025], [200, 1285, 0.021], [236, 1306, 0.018],
  ]) };
  return {
    ...T, table: 'ryujin', walls, posts, standups, bumpers, scoop, saucer, turntable, ramp, vuk,
    drops: [], lamps: [], glassHeight: 0.145,
    decorations: { pearl: [855, 215, 0.111], coral: [cave[0] + 43, cave[1] + 78], roof: [360, 150] },
  };
}

export { ART_W };
