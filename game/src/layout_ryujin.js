// RYŪJIN — the sea dragon king's palace. Shares the cabinet frame of Tsukimi (outer arch, orbits, shooter,
// top lanes, jet pocket, flippers, slings, ramp and VUK paths: the tuned ball paths) and replaces the
// centre: stand-up shell targets instead of the drop bank, two wave targets on the right wall and the
// whirlpool instead of the koi disc. Art-pixel coordinates as in layout.js.
import { buildLayout, P, ART_W } from './layout.js';

const L = (px) => px * 0.0005;

export function buildRyujinLayout() {
  const T = buildLayout();
  const walls = T.walls.filter(w => w.id !== 'dropBack');

  // --- PEARL bank: three shell stand-ups where Tsukimi keeps its drop bank, square to the right flipper
  const standups = [];
  const dropC = P(372, 818), flipR = P(724 - 40, 1560);
  const toFlip = [flipR[0] - dropC[0], flipR[1] - dropC[1]];
  const tl = Math.hypot(toFlip[0], toFlip[1]);
  const face = [toFlip[0] / tl, toFlip[1] / tl];
  const dir = [-face[1], face[0]];
  const spacing = L(46);
  for (let i = 0; i < 3; i++) {
    const o = (i - 1) * spacing;
    standups.push({ id: 'shell' + i, bank: 'shell', c: [dropC[0] + dir[0] * o, dropC[1] + dir[1] * o], dir, n: face, half: L(18), thick: L(7) });
  }
  {
    const back = L(16), ext = L(28);
    const a = [dropC[0] - dir[0] * (spacing + ext) - face[0] * back, dropC[1] - dir[1] * (spacing + ext) - face[1] * back];
    const b = [dropC[0] + dir[0] * (spacing + ext) - face[0] * back, dropC[1] + dir[1] * (spacing + ext) - face[1] * back];
    walls.push({ id: 'shellBack', pts: [a, b], r: L(6), mat: 'metal', h: 0.03, style: 'dropback' });
  }
  // --- TIDE targets: a pair on the right wall (shooter lane side), facing the left flipper
  for (const [i, v] of [[0, 935], [1, 1005]]) {
    const c = P(954, v);
    standups.push({ id: 'tide' + i, bank: 'tide', c, dir: [0, 1], n: [-1, 0], half: L(19), thick: L(8) });
  }

  const bumpers = T.bumpers.map((b, i) => ({ ...b, cap: ['wave', 'dragon', 'pearl'][i] }));

  return {
    ...T,
    table: 'ryujin',
    walls, standups, bumpers,
    drops: [],
    lamps: [],
  };
}

export { ART_W };
