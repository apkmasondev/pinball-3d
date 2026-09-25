# 月見 TSUKIMI · 竜神 RYŪJIN · 稲荷 INARI

Trójwymiarowy pinball działający w przeglądarce, z trzema stołami do wyboru:

- **月見 Tsukimi — Moonlit Koi Garden**: nocny ogród na wiśniowej lace: koi, sakura, latarnie, most nad stawem i brama torii pod pełnią księżyca. Cele opadające K-O-I, wirujący dysk koi.
- **竜神 Ryūjin — Pałac Smoczego Króla**: szafirowa posadzka pałacu z wygrawerowanym smokiem i własny, asymetryczny układ: Most Pereł wjeżdża z lewej i przechodzi łukiem nad stołem, pałac z bramą Ryūgū-jō stoi w prawym górnym rogu, wir po lewej naprawdę łapie kulkę. Perłowe muszle, cele przypływu, Perłowy Hurry-Up. Własna muzyka, paleta, obudowa i zasady.
- **稲荷 Inari — Złoty Las Lisów**: jesienne sanktuarium lisów kitsune w bursztynowym świetle lampionów. Najbardziej odmienny układ: bez górnych torów, z trzecią łapką na lewym zboczu, rampą Senbon Torii wspinającą się pod pięcioma bramami torii prosto do chramu, który odbija kulkę na górną łapkę, trzema maskami lisa i Strażnikiem Kitsune: słupkiem, który wysuwa się między flipperami. Dziewięć Ogonów, Noc Lampionów, Żniwa. Własna muzyka („狐の回遊路”), paleta, obudowa i zasady.

Stół wybierasz w menu **Wybierz stół**, strzałkami ← → (lub strzałkami przy logo) na ekranie tytułowym albo przesuwając palcem po ekranie tytułowym. Każdy stół ma własną tabelę rekordów i własną muzykę w grze; menu ma wspólny, spokojny motyw.

**▶ Zagraj online: https://apkmason.dev/pinball-3d/**

Najlepiej na komputerze z klawiaturą, ze słuchawkami lub głośnikami. Działa też na telefonie i tablecie (sterowanie dotykiem) oraz z padem.

## Uruchomienie lokalne

Wymagany Node.js 20.19+ lub 22.12+.

```bash
cd game
npm install
npm run dev
```

Gra otworzy się pod `http://localhost:5173`. Wersja produkcyjna powstaje poleceniem `npm run build` w folderze `game/` i trafia do `game/dist/`. To zwykła strona statyczna, którą można hostować na dowolnym serwerze.

## Publikacja na GitHub Pages

Repozytorium zawiera workflow `.github/workflows/deploy.yml`, który buduje grę i publikuje ją przy każdym pushu na gałąź `main`.

1. Wypchnij repozytorium na GitHuba.
2. Wejdź w **Settings → Pages** i jako **Source** wybierz **GitHub Actions**.
3. Po zakończeniu akcji gra będzie dostępna pod `https://<użytkownik>.github.io/<repozytorium>/` (albo pod własną domeną, jeśli jest ustawiona dla konta).

## Sterowanie

| Akcja | Klawiatura | Pad | Dotyk |
|---|---|---|---|
| Lewy flipper (w Inari także górna łapka) | Lewy Shift · Z · ← | LB / LT | lewa połowa ekranu |
| Prawy flipper | Prawy Shift · / · → | RB / RT | prawa połowa ekranu |
| Wyrzutnia (przytrzymaj i puść) | Spacja · Enter · ↓ | A | przycisk „Start” (prawy dolny róg) |
| Szturchnięcie stołu | X · . · ↑ | lewa gałka | — |
| Zmiana kamery | C | Y | — |
| Pauza | Esc · P | Select | ❚❚ |
| Wycisz | M | — | — |

Na ekranie dotykowym grę zaczyna też dotknięcie ekranu tytułowego, a inicjały rekordu ustawia się strzałkami nad i pod literami. Grafika domyślnie działa w trybie **Auto**: telefony i tablety startują w jakości średniej, a przy utrzymującym się spadku płynności gra sama obniża jakość (Ustawienia → Grafika).

## Zasady — Tsukimi

- **TSU · KI · MI**: trzy górne tory. Komplet podnosi mnożnik bonusu i zapala LOCK, a flipperami przesuwasz zapalone tory. Tor migający przy wyrzucie to **Skill Shot**.
- **Moon Multiball**: przy zapalonym LOCK trafiaj w chram pod bramą torii. Druga zablokowana kulka uruchamia multiball z trzema kulkami.
- **Jackpoty**: w multiballu czekają na rampie (Moon Bridge) i obu orbitach. Po zebraniu wszystkich w chramie czeka **Super Jackpot**.
- **Koi Frenzy**: zbij cele K-O-I. Dysk koi zaczyna wirować, a bumpery i spinner punktują wielokrotnie.
- **Fazy księżyca**: rampa i orbity przybliżają pełnię (ikona w rogu wyświetlacza). Przy pełni strzał w chram uruchamia tryb **TSUKIMI** z podwójnymi punktami i „Moon Shots” za 100 000.
- **Latarnia**: saucer po lewej przyznaje nagrodę-niespodziankę: punkty, kickback, ochronę kulki, poziom latarni, a czasem dodatkową kulkę.
- **Kombo i Koi Loop**: szybkie serie rampa/orbita budują kombo. Lewa i prawa orbita pod rząd to KOI LOOP.
- Kickback w lewym outlane'ie, ochrona kulki na starcie, tilt przy zbyt częstym szturchaniu, bonus na koniec kulki, tabela rekordów z inicjałami.

## Zasady — Ryūjin

- **R · Y · U**: trzy górne tory. Komplet podnosi mnożnik bonusu i zapala LOCK; tor migający przy wyrzucie to **Skill Shot**.
- **Most Pereł**: wjazd po lewej, łuk nad górą stołu, zjazd na prawą łapkę.
- **Dragon Multiball**: przy zapalonym LOCK trafiaj w pałac w prawym górnym rogu (powrót z pałacu prowadzi pod mostem na lewą łapkę). Druga zablokowana kulka budzi smoka: multiball z trzema kulkami, jackpoty na moście i orbitach, potem **Super Jackpot** w pałacu.
- **Wir Uzumaki**: trzy perłowe muszle po prawej rozkręcają wir. Przez 20 sekund wir wciąga kulkę na orbitę, punktuje każde okrążenie i wyrzuca ją z impetem; bumpery i spinner punktują wielokrotnie.
- **Przypływ i Perłowy Hurry-Up**: dwa cele na lewej ścianie. Komplet daje dwie perły, zapala kickback i uruchamia Hurry-Up: 400 000 maleje do 100 000 w 15 sekund (odliczanie na wyświetlaczu), zbierasz je na Moście Pereł. W multiballu komplet dokłada kulkę (raz na multiball), a co trzeci komplet zapala dodatkową kulkę.
- **Osiem pereł**: most, orbity i przypływ dokładają perły wokół wiru. Przy ośmiu strzał w pałac uruchamia tryb **Ryūgū-jō** z podwójnymi punktami i skarbami.
- **Koralowa grota** (kieszeń po prawej, nagroda-niespodzianka), **kombo** i **Pętla Smoka** (lewa i prawa orbita pod rząd).

## Zasady — Inari

- **Dziewięć Ogonów**: rampa, orbity, sanktuarium, maski lisa i Skok Lisa dokładają ogony (wachlarz po lewej). Przy dziewięciu strzał w sanktuarium uruchamia **Kyūbi Multiball** z trzema kulkami, bez blokowania kulek. Jackpoty czekają na rampie i orbitach, potem **Super Jackpot** w sanktuarium.
- **Senbon Torii**: rampa po prawej wspina się pod pięcioma bramami torii i kończy w chramie. Każda brama punktuje i zapala się na rampie; szybkie rampy budują serię do 5X. Co 50 bram nagroda, przy 100 zapala się dodatkowa kulka.
- **Sanktuarium** odbija kulkę prosto na górną łapkę. Bezpośredni strzał losuje **Życzenie Ema**: punkty, kickback, ochronę kulki, ogony, bramy, strażnika, czasem dodatkową kulkę.
- **Noc Lampionów**: trzy maski lisa po prawej. Komplet daje dwa ogony i na 25 sekund zapala jeden strzał; każdy trafiony lampion przenosi go dalej. Pięć lampionów to **Święto Lampionów** (750 000+).
- **Skok Lisa**: strzał z górnej łapki, który trafi bumpery albo sanktuarium, daje premię i ogon.
- **Żniwa i Strażnik Kitsune**: co 20 trafień bumperów rosną żniwa (bumpery punktują więcej), a między flipperami na 20 sekund wysuwa się słupek, który zatrzymuje kulkę przed środkowym odpływem.
- **Lisi Ogień** (Skill Shot: pierwszy trafiony bumper po wyrzucie musi być tym migającym), **kombo** i **Lisi Bieg** (lewa i prawa orbita pod rząd).

## Technologia

- **Three.js + Vite**: renderowanie PBR, bloom, dynamiczne odbicia w kulce, inserty zapalane shaderem dokładnie w kształcie namalowanych lamp.
- **Własny silnik fizyki pinballa** (`game/src/physics/world.js`): krok 2400 Hz, flippery z przekazywaniem pędu, rampy i druciane rurki jako ścieżki 3D, bramki jednokierunkowe, spinner, saucer, scoop z VUK albo z wyrzutem na łapkę, kickback, wir, wysuwany słupek i dowolna liczba flipperów.
- **Stoły i obudowy** modelowane w Blenderze na podstawie plików układu (`game/src/layout.js`, `game/src/layout_ryujin.js`, `game/src/layout_inari.js`), wspólnych dla grafiki, fizyki i nadruku lamp. Rejestr stołów: `game/src/tables.js`.
- **Obudowa** jak w prawdziwych automatach: płaskie szyny boczne wchodzące pod głowicę, odlewana listwa blokująca z zaokrąglonymi końcami, okucia zawiasów, osłony narożników; cztery kamery (gracz, z góry, śledząca, automat) dopasowują kadr do proporcji ekranu.
- **Nadruk pola** każdego stołu to jedna gotowa tekstura: ilustracja tła, wkładki lamp i napisy są składane przed publikacją, więc gra ładuje jeden obraz zamiast kilku warstw.
- **Muzyka adaptacyjna**: sekcje utworów zapętlane na granicach fraz, przejścia czekają na najbliższy takt (`game/src/audio/music.json`).

## Zasoby

- Grafiki stołu, plastików i zabawek oraz oba utwory muzyczne („月夜のピンボール”, „月庭の静けさ”) pochodzą od autora projektu.
- Grafiki stołu Ryūjin (smok, brama pałacu, perła, latarnia, bumpery, flippery, wizualizacja) i utwór „Zen Pinball Garden” również pochodzą od autora projektu; plastiki i obudowa Ryūjin zostały z nich skomponowane.
- Grafiki stołu Inari (jesienny las, lis o dziewięciu ogonach, brama sanktuarium, kapsle bumperów, łapki i slingshoty, lampiony, maski, ema, torii) i utwór „狐の回遊路” także pochodzą od autora projektu; nadruk pola, plastiki, cele i obudowa Inari zostały z nich skomponowane.
- Tła pól gry Tsukimi i Ryūjin (wiśniowa laka z koi, szafirowa posadzka ze smokiem) oraz grafiki celów Ryūjin powstały w narzędziu do generowania obrazów na zamówienie autora projektu.
- Mechaniczne efekty dźwiękowe są wycięte z nagrań społeczności freesound („pinball full game”, „ball in hole”, „instant drain”) i uzupełnione dźwiękami syntezowanymi (koto, taiko, shakuhachi, dzwony).
- Fonty: Marcellus, Shippori Mincho i Cormorant Garamond (SIL Open Font License) przez pakiety @fontsource.
- Silnik 3D: [three.js](https://threejs.org) (MIT).
