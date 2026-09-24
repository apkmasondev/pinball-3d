import * as THREE from 'three';
import { tv } from './util.js';

const CARDS = {
  pl: [
    { title: 'TSUKIMI', sub: '3 kulki · 1 gracz', lines: [['TSU · KI · MI', 'mnożnik + LOCK'], ['2 × LOCK w chramie', 'MOON MULTIBALL'], ['cele K · O · I', 'KOI FRENZY'], ['pełnia księżyca', 'tryb TSUKIMI 2×']] },
    { title: 'PUNKTACJA', sub: 'Moonlit Koi Garden', lines: [['Jackpot', '250 000+'], ['Super Jackpot', '1 000 000+'], ['Skill Shot', '50 000+'], ['Koi Loop', '50 000 ×']] },
  ],
  en: [
    { title: 'TSUKIMI', sub: '3 balls · 1 player', lines: [['TSU · KI · MI', 'bonus X + LOCK'], ['2 × LOCK at shrine', 'MOON MULTIBALL'], ['K · O · I targets', 'KOI FRENZY'], ['full moon', 'TSUKIMI mode 2×']] },
    { title: 'SCORING', sub: 'Moonlit Koi Garden', lines: [['Jackpot', '250,000+'], ['Super Jackpot', '1,000,000+'], ['Skill Shot', '50,000+'], ['Koi Loop', '50,000 ×']] },
  ],
};

function drawCard(c) {
  const W = 512, H = 304;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#f6ecd8'); grd.addColorStop(1, '#e9dbc0');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // paper fibres
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,90,60,${Math.random() * 0.05})`; g.fillRect(Math.random() * W, Math.random() * H, Math.random() * 3, 1); }
  g.strokeStyle = '#9c1c1c'; g.lineWidth = 6; g.strokeRect(10, 10, W - 20, H - 20);
  g.strokeStyle = '#b8893a'; g.lineWidth = 1.5; g.strokeRect(20, 20, W - 40, H - 40);
  g.fillStyle = '#3a1410'; g.textAlign = 'center';
  g.font = '44px Marcellus, serif'; g.fillText(c.title, W / 2, 72);
  g.font = 'italic 22px "Cormorant Garamond", serif'; g.fillStyle = '#8a3a2a'; g.fillText(c.sub, W / 2, 100);
  g.textAlign = 'left';
  c.lines.forEach(([a, b], i) => {
    const y = 146 + i * 38;
    g.font = '600 23px "Cormorant Garamond", serif'; g.fillStyle = '#2c1510'; g.fillText(a, 44, y);
    g.textAlign = 'right'; g.font = '19px Marcellus, serif'; g.fillStyle = '#9c1c1c'; g.fillText(b, W - 44, y); g.textAlign = 'left';
    g.strokeStyle = 'rgba(150,110,60,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(44, y + 12); g.lineTo(W - 44, y + 12); g.stroke();
  });
  // hanko seal
  g.save(); g.translate(W - 62, 62); g.rotate(-0.08);
  g.fillStyle = 'rgba(176,20,24,.88)'; g.fillRect(-26, -26, 52, 52);
  g.fillStyle = '#f6ecd8'; g.font = '800 34px "Shippori Mincho", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('月', 0, 2);
  g.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export class ApronCards {
  constructor(root) {
    this.root = root; this.meshes = [];
    // window rectangles measured on the apron art (table metres)
    // window rectangles measured on the apron art, mapped onto the apron (x -0.2735..0.2095)
    const ax0 = -0.2735, aw = 0.2095 - ax0, top = 0.122, h = 0.125;
    const r = (u0, u1) => [ax0 + u0 * aw, ax0 + u1 * aw, top - 0.643 * h, top - 0.366 * h];
    this.rects = [r(0.2987, 0.4062), r(0.6044, 0.7110)];
  }
  build(lang) {
    for (const m of this.meshes) { this.root.remove(m); m.material.map.dispose(); m.material.dispose(); }
    this.meshes = [];
    (CARDS[lang] || CARDS.en).forEach((c, i) => {
      const [x0, x1, y0, y1] = this.rects[i];
      const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
      const mat = new THREE.MeshStandardMaterial({ map: drawCard(c), roughness: 0.8, metalness: 0, emissive: 0xffffff, emissiveIntensity: 0.12 });
      mat.emissiveMap = mat.map;
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.copy(tv((x0 + x1) / 2, (y0 + y1) / 2, 0.0345));   // just above the apron plate
      m.receiveShadow = true;
      this.root.add(m); this.meshes.push(m);
    });
  }
}
