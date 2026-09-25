// The tables in the game. Everything that differs between them lives here; the engine is shared.
import { buildLayout } from './layout.js';
import { buildRyujinLayout } from './layout_ryujin.js';
import LAMPS_TSUKIMI from './lamps.json';
import LAMPS_RYUJIN from './lamps_ryujin.json';
import { Rules } from './game/rules.js';
import { RyujinRules } from './game/rules_ryujin.js';

export const TABLES = {
  tsukimi: {
    id: 'tsukimi',
    name: 'TSUKIMI', kanji: '月見',
    subtitle: { pl: 'Moonlit Koi Garden', en: 'Moonlit Koi Garden' },
    blurb: {
      pl: 'Nocny ogród koi pod pełnią księżyca. Most nad stawem, chram pod bramą torii i wirujący dysk koi.',
      en: 'A night koi garden under the full moon. A bridge over the pond, a shrine under the torii and a spinning koi disc.',
    },
    features: { pl: ['Moon Multiball', 'Koi Frenzy', 'Tryb Tsukimi'], en: ['Moon Multiball', 'Koi Frenzy', 'Tsukimi mode'] },
    loading: { pl: 'Wschodzi księżyc…', en: 'The moon is rising…' },
    layout: buildLayout, lamps: LAMPS_TSUKIMI, Rules,
    model: 'assets/models/table.glb', tex: 'assets/tex/', preview: 'assets/ui/table_tsukimi.jpg',
    hsKey: 'tsukimi.hiscores',
    hsDefault: [['KOI', 5000000], ['MOO', 3000000], ['SAK', 2000000], ['LAN', 1000000], ['ZEN', 500000]],
    music: { main: 'main', multiball: 'multiball', frenzy: 'frenzy', tsukimi: 'tsukimi' },
    songs: ['calm', 'st'],
    dmd: [255, 128, 48], dmdUnlit: 'rgba(255,120,40,0.075)',
    attract: { title: 'TSUKIMI', sub: 'MOONLIT KOI GARDEN', anim: 'moonrise' },
    cards: {
      pl: [
        { title: 'TSUKIMI', sub: '3 kulki · 1 gracz', lines: [['TSU · KI · MI', 'mnożnik + LOCK'], ['2 × LOCK w chramie', 'MOON MULTIBALL'], ['cele K · O · I', 'KOI FRENZY'], ['pełnia księżyca', 'tryb TSUKIMI 2×']] },
        { title: 'PUNKTACJA', sub: 'Moonlit Koi Garden', lines: [['Jackpot', '250 000+'], ['Super Jackpot', '1 000 000+'], ['Skill Shot', '50 000+'], ['Koi Loop', '50 000 ×']] },
      ],
      en: [
        { title: 'TSUKIMI', sub: '3 balls · 1 player', lines: [['TSU · KI · MI', 'bonus X + LOCK'], ['2 × LOCK at shrine', 'MOON MULTIBALL'], ['K · O · I targets', 'KOI FRENZY'], ['full moon', 'TSUKIMI mode 2×']] },
        { title: 'SCORING', sub: 'Moonlit Koi Garden', lines: [['Jackpot', '250,000+'], ['Super Jackpot', '1,000,000+'], ['Skill Shot', '50,000+'], ['Koi Loop', '50,000 ×']] },
      ],
    },
    cardStyle: {},
    lights: {},
    ui: 'tsukimi',
  },
  ryujin: {
    id: 'ryujin',
    name: 'RYŪJIN', kanji: '竜神',
    subtitle: { pl: 'Pałac Smoczego Króla', en: 'Palace of the Dragon King' },
    blurb: {
      pl: 'Szafirowy dziedziniec smoczego króla. Most Pereł wznosi się z lewej strony, pałac i muszle czekają po prawej, a wir zmienia tor kulki.',
      en: 'The dragon king\'s sapphire courtyard. The Pearl Bridge climbs from the left, the palace and shells await on the right, and a whirlpool bends the ball\'s path.',
    },
    features: { pl: ['Most Pereł', 'Wir, który łapie kulkę', 'Perłowy Hurry-Up', 'Dragon Multiball'], en: ['Pearl Bridge', 'Whirlpool that grabs the ball', 'Pearl Hurry-Up', 'Dragon Multiball'] },
    loading: { pl: 'Pałac wyłania się z głębin…', en: 'The palace rises from the deep…' },
    layout: buildRyujinLayout, lamps: LAMPS_RYUJIN, Rules: RyujinRules,
    model: 'assets/models/ryujin.glb', tex: 'assets/ryujin/', preview: 'assets/ui/table_ryujin.jpg',
    targetArt: { shell: 'target_shell_clear.jpg', tide: 'target_tide_clear.jpg' },
    hsKey: 'ryujin.hiscores',
    hsDefault: [['RYU', 6000000], ['JIN', 3500000], ['OTO', 2200000], ['HIM', 1200000], ['URA', 600000]],
    music: { main: 'ry_main', multiball: 'ry_multiball', frenzy: 'ry_whirl', tsukimi: 'ry_palace' },
    songs: ['zen'],
    dmd: [70, 225, 210], dmdUnlit: 'rgba(60,210,200,0.07)',
    attract: { title: 'RYŪJIN', sub: 'DRAGON KING PALACE', anim: 'pearl' },
    cards: {
      pl: [
        { title: 'RYŪJIN', sub: '3 kulki · 1 gracz', lines: [['RYU · tory górne', 'mnożnik + LOCK'], ['2 × LOCK w pałacu', 'DRAGON MULTIBALL'], ['3 muszle perłowe', 'WIR UZUMAKI'], ['8 pereł', 'tryb RYŪGŪ-JŌ 2×']] },
        { title: 'PUNKTACJA', sub: 'Pałac Smoczego Króla', lines: [['Jackpot', '300 000+'], ['Super Jackpot', '1 500 000+'], ['Przypływ → Most', 'HURRY-UP 400 000'], ['Dragon Loop', '60 000 ×']] },
      ],
      en: [
        { title: 'RYŪJIN', sub: '3 balls · 1 player', lines: [['RYU top lanes', 'bonus X + LOCK'], ['2 × LOCK at palace', 'DRAGON MULTIBALL'], ['3 pearl shells', 'UZUMAKI WHIRLPOOL'], ['8 pearls', 'RYŪGŪ-JŌ mode 2×']] },
        { title: 'SCORING', sub: 'Palace of the Dragon King', lines: [['Jackpot', '300,000+'], ['Super Jackpot', '1,500,000+'], ['Tide → Bridge', 'HURRY-UP 400,000'], ['Dragon Loop', '60,000 ×']] },
      ],
    },
    cardStyle: { paper0: '#f3eee0', paper1: '#e2dccb', accent: '#16706a', ink: '#0f2a40', sub: '#1d5a64', line: '#10202e', seal: 'rgba(20,110,104,.9)', sealChar: '竜' },
    // cool moonlight through water: the key light, sky and GI turn aqua
    lights: { key: 0xd6f2ff, keyIntensity: 5.0, sky: 0x4aa6c8, ground: 0x0a1830, moon: 0x8fdcff, moonIntensity: 0.5 },
    giColor: [0.55, 0.85, 0.82],
    ui: 'ryujin',
    rules: {
      pl: [
        ['R · Y · U', 'Przejedź przez trzy górne tory, by zwiększyć mnożnik bonusu i zapalić LOCK. Flipperami przesuwasz zapalone tory; tor migający przy wyrzucie to Skill Shot.'],
        ['Dragon Multiball', 'Gdy LOCK świeci, trafiaj w pałac w prawym górnym rogu. Druga zablokowana kulka budzi smoka: multiball z trzema kulkami. Powrót z pałacu prowadzi na lewą łapkę.'],
        ['Most Pereł i jackpoty', 'Wjazd na most jest po lewej, a zjazd prowadzi na prawą łapkę. W multiballu jackpoty czekają na moście i obu orbitach. Zbierz wszystkie, a potem Super Jackpot w pałacu.'],
        ['Wir Uzumaki', 'Trafiaj trzy perłowe muszle po prawej. Komplet rozkręca wir na lewo od środka stołu: wciąga kulkę na orbitę, punktuje każde okrążenie i wyrzuca ją z impetem. Bumpery i spinner punktują wtedy wielokrotnie.'],
        ['Osiem pereł', 'Rampa, orbity i cele przypływu dokładają perły wokół wiru. Przy ośmiu strzel w pałac: tryb Ryūgū-jō z podwójnymi punktami i skarbami.'],
        ['Przypływ i Hurry-Up', 'Dwa cele na lewej ścianie. Komplet daje dwie perły, zapala kickback i uruchamia Perłowy Hurry-Up: 400 000 maleje do 100 000 w 15 sekund, zbierasz je na Moście Pereł. W multiballu komplet dokłada kulkę, a co trzeci komplet zapala dodatkową kulkę.'],
        ['Koralowa grota', 'Kieszeń po prawej przyznaje nagrodę-niespodziankę: punkty, kickback, ochronę kulki, a czasem dodatkową kulkę.'],
        ['Kombo', 'Rampa i orbity trafione jedna po drugiej budują kombo. Lewa i prawa orbita pod rząd to PĘTLA SMOKA.'],
      ],
      en: [
        ['R · Y · U', 'Roll through the three top lanes to raise the bonus multiplier and light LOCK. The flippers rotate the lit lanes; the lane blinking at launch is the Skill Shot.'],
        ['Dragon Multiball', 'With LOCK lit, shoot the palace at the upper right. The second locked ball wakes the dragon: a three-ball multiball. The palace return feeds the left flipper.'],
        ['Pearl Bridge and jackpots', 'Enter the bridge on the left and return to the right flipper. During multiball, collect jackpots on the bridge and both orbits, then the Super Jackpot at the palace.'],
        ['Uzumaki Whirlpool', 'Hit the three pearl shells on the right. The set spins up the whirlpool left of centre: it pulls the ball into orbit, scores every turn and flings it back out. Bumpers and spinner score many times over.'],
        ['Eight pearls', 'The ramp, the orbits and the tide targets add pearls around the whirlpool. At eight, shoot the palace: Ryūgū-jō mode with double scoring and treasure shots.'],
        ['High tide and Hurry-Up', 'Two targets on the left wall. The pair adds two pearls, lights the kickback and starts the Pearl Hurry-Up: 400,000 counting down to 100,000 over 15 seconds, collected on the Pearl Bridge. During multiball the pair adds a ball; every third pair lights an extra ball.'],
        ['Coral cave', 'The pocket on the right gives a mystery award: points, kickback, ball save and sometimes an extra ball.'],
        ['Combos', 'Ramp and orbit shots in quick succession build a combo. Left and right orbit back to back make a DRAGON LOOP.'],
      ],
    },
  },
};
export const TABLE_IDS = Object.keys(TABLES);
