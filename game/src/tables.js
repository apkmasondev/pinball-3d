// The tables in the game. Everything that differs between them lives here; the engine is shared.
import { buildLayout } from './layout.js';
import { buildRyujinLayout } from './layout_ryujin.js';
import { buildInariLayout } from './layout_inari.js';
import LAMPS_TSUKIMI from './lamps.json';
import LAMPS_RYUJIN from './lamps_ryujin.json';
import LAMPS_INARI from './lamps_inari.json';
import { Rules } from './game/rules.js';
import { RyujinRules } from './game/rules_ryujin.js';
import { InariRules } from './game/rules_inari.js';

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
  inari: {
    id: 'inari',
    name: 'INARI', kanji: '稲荷',
    subtitle: { pl: 'Złoty Las Lisów', en: 'Golden Fox Forest' },
    blurb: {
      pl: 'Jesienne sanktuarium lisów kitsune. Rampa pod bramami torii kończy się w chramie, trzecia łapka czeka na lewym zboczu, a strażnik wyrasta między flipperami.',
      en: 'An autumn shrine of the kitsune. A ramp under the torii ends inside the shrine, a third flipper waits on the left slope and a guard post rises between the flippers.',
    },
    features: { pl: ['Senbon Torii', 'Dziewięć Ogonów', 'Noc Lampionów', 'Trzecia łapka'], en: ['Senbon Torii', 'Nine Tails', 'Lantern Night', 'Third flipper'] },
    loading: { pl: 'Zapalamy lampiony…', en: 'Lighting the lanterns…' },
    layout: buildInariLayout, lamps: LAMPS_INARI, Rules: InariRules,
    model: 'assets/models/inari.glb', tex: 'assets/inari/', preview: 'assets/ui/table_inari.jpg',
    hsKey: 'inari.hiscores',
    hsDefault: [['KYU', 5500000], ['BII', 3200000], ['FOX', 2000000], ['EMA', 1100000], ['AKI', 550000]],
    music: { main: 'in_main', multiball: 'in_multiball', frenzy: 'in_lantern', tsukimi: 'in_lantern' },
    songs: ['inari'],
    dmd: [255, 196, 96], dmdUnlit: 'rgba(255,180,80,0.07)',
    attract: { title: 'INARI', sub: 'GOLDEN FOX FOREST', anim: 'lanterns', anim2: 'fox' },
    hudNames: { tsukimi: 'KYUBI', frenzy: 'LANTERN', lock: 'KYUBI LIT' },
    cards: {
      pl: [
        { title: 'INARI', sub: '3 kulki · 1 gracz', lines: [['rampa, orbity, maski', 'OGONY LISA'], ['9 ogonów → chram', 'KYUBI MULTIBALL'], ['3 maski lisa', 'NOC LAMPIONÓW'], ['20 bumperów', 'STRAŻNIK']] },
        { title: 'PUNKTACJA', sub: 'Złoty Las Lisów', lines: [['Jackpot', '280 000+'], ['Super Jackpot', '1 200 000+'], ['Święto Lampionów', '750 000+'], ['100 bram torii', 'EXTRA BALL']] },
      ],
      en: [
        { title: 'INARI', sub: '3 balls · 1 player', lines: [['ramp, orbits, masks', 'FOX TAILS'], ['9 tails → shrine', 'KYUBI MULTIBALL'], ['3 fox masks', 'LANTERN NIGHT'], ['20 jet hits', 'KITSUNE GUARD']] },
        { title: 'SCORING', sub: 'Golden Fox Forest', lines: [['Jackpot', '280,000+'], ['Super Jackpot', '1,200,000+'], ['Lantern Festival', '750,000+'], ['100 torii gates', 'EXTRA BALL']] },
      ],
    },
    cardStyle: { paper0: '#f6ecd8', paper1: '#e8d9bc', accent: '#b8401c', ink: '#2a1a10', sub: '#8a4a1c', line: '#241810', seal: 'rgba(184,52,24,.9)', sealChar: '狐' },
    // lantern light in an autumn forest: warm key, dusky sky, amber GI
    lights: { key: 0xffe2b8, keyIntensity: 4.6, sky: 0xc88a50, ground: 0x1a120a, moon: 0xffc080, moonIntensity: 0.35 },
    giColor: [1.0, 0.58, 0.24],
    flashers: [[1.0, 0.55, 0.15], [1.0, 0.22, 0.08]],
    ui: 'inari',
    rules: {
      pl: [
        ['Dziewięć Ogonów', 'Rampa, orbity, sanktuarium, maski lisa i Skok Lisa dają ogony (wachlarz po lewej). Przy dziewięciu strzel w sanktuarium: KYUBI MULTIBALL z trzema kulkami, bez blokowania kulek.'],
        ['Senbon Torii', 'Rampa po prawej wspina się pod pięcioma bramami torii i kończy w sanktuarium, które odbija kulkę na górną łapkę. Każda brama punktuje, a szybkie rampy budują serię do 5X. Co 50 bram jest nagroda, przy 100 zapala się dodatkowa kulka.'],
        ['Noc Lampionów', 'Trzy maski lisa po prawej. Komplet daje dwa ogony i zapala Noc Lampionów: przez 25 sekund jeden strzał jest zapalony. Pięć trafionych lampionów to Święto Lampionów, 750 000 i więcej.'],
        ['Górna łapka i Skok Lisa', 'Trzecia łapka na lewym zboczu. Strzał z niej, który trafi bumpery albo sanktuarium, to Skok Lisa: premia i ogon.'],
        ['Żniwa i Strażnik', 'Co 20 trafień bumperów rosną żniwa (bumpery punktują więcej), a Strażnik Kitsune wysuwa się na 20 sekund: słupek między flipperami, który ratuje kulkę przed środkowym odpływem.'],
        ['Lisi Ogień', 'Po wystrzale jeden bumper miga (zanim wystrzelisz, flipperami przenosisz go na inny). Jeśli trafisz go jako pierwszy, dostajesz Skill Shot.'],
        ['Życzenie Ema', 'Bezpośredni strzał do sanktuarium losuje tabliczkę ema: punkty, kickback, ochronę kulki, ogony, bramy, strażnika, a czasem dodatkową kulkę.'],
        ['Multiball i kombo', 'W multiballu jackpoty świecą na rampie i obu orbitach, potem Super Jackpot w sanktuarium. Lewa i prawa orbita pod rząd to LISI BIEG.'],
      ],
      en: [
        ['Nine Tails', 'The ramp, the orbits, the shrine, the fox masks and Fox Leaps add tails (the fan on the left). At nine, shoot the shrine: KYUBI MULTIBALL with three balls, no locks needed.'],
        ['Senbon Torii', 'The ramp on the right climbs under five torii and ends inside the shrine, which kicks the ball to the upper flipper. Every gate scores; quick ramps build a chain up to 5X. Every 50 gates give an award, 100 light an extra ball.'],
        ['Lantern Night', 'Three fox masks on the right. The set adds two tails and starts Lantern Night: for 25 seconds one shot is lit. Five lit lanterns make the Lantern Festival, 750,000 and up.'],
        ['Upper flipper and Fox Leap', 'A third flipper sits on the left slope. A shot from it that reaches the jets or the shrine is a Fox Leap: a bonus and a tail.'],
        ['Harvest and Guard', 'Every 20 jet hits raise the harvest (jets score more) and lift the Kitsune Guard for 20 seconds: a post between the flippers that saves the ball from the centre drain.'],
        ['Fox Fire', 'After the launch one jet blinks (before the launch the flippers move it to another jet): make it the first one you hit for the Skill Shot.'],
        ['Ema wish', 'A direct shot into the shrine draws an ema plaque: points, kickback, ball save, tails, gates, the guard, sometimes an extra ball.'],
        ['Multiball and combos', 'During multiball, jackpots light on the ramp and both orbits, then the Super Jackpot at the shrine. Left and right orbit back to back make a FOX RUN.'],
      ],
    },
  },
};
export const TABLE_IDS = Object.keys(TABLES);
