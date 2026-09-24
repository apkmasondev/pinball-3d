# 月見 TSUKIMI — Moonlit Koi Garden

Trójwymiarowy pinball działający w przeglądarce. Nocny japoński ogród: koi, sakura, latarnie i brama torii pod pełnią księżyca.

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
| Lewy flipper | Lewy Shift · Z · ← | LB / LT | lewa połowa ekranu |
| Prawy flipper | Prawy Shift · / · → | RB / RT | prawa połowa ekranu |
| Wyrzutnia (przytrzymaj i puść) | Spacja · Enter · ↓ | A | przycisk „Start” |
| Szturchnięcie stołu | X · . · ↑ | lewa gałka | — |
| Zmiana kamery | C | Y | — |
| Pauza | Esc · P | Select | ❚❚ |
| Wycisz | M | — | — |

## Zasady

- **TSU · KI · MI**: trzy górne tory. Komplet podnosi mnożnik bonusu i zapala LOCK, a flipperami przesuwasz zapalone tory. Tor migający przy wyrzucie to **Skill Shot**.
- **Moon Multiball**: przy zapalonym LOCK trafiaj w chram pod bramą torii. Druga zablokowana kulka uruchamia multiball z trzema kulkami.
- **Jackpoty**: w multiballu czekają na rampie (Moon Bridge) i obu orbitach. Po zebraniu wszystkich w chramie czeka **Super Jackpot**.
- **Koi Frenzy**: zbij cele K-O-I. Dysk koi zaczyna wirować, a bumpery i spinner punktują wielokrotnie.
- **Fazy księżyca**: rampa i orbity przybliżają pełnię (ikona w rogu wyświetlacza). Przy pełni strzał w chram uruchamia tryb **TSUKIMI** z podwójnymi punktami i „Moon Shots” za 100 000.
- **Latarnia**: saucer po lewej przyznaje nagrodę-niespodziankę: punkty, kickback, ochronę kulki, poziom latarni, a czasem dodatkową kulkę.
- **Kombo i Koi Loop**: szybkie serie rampa/orbita budują kombo. Lewa i prawa orbita pod rząd to KOI LOOP.
- Kickback w lewym outlane'ie, ochrona kulki na starcie, tilt przy zbyt częstym szturchaniu, bonus na koniec kulki, tabela rekordów z inicjałami.

## Technologia

- **Three.js + Vite**: renderowanie PBR, bloom, dynamiczne odbicia w kulce, inserty zapalane shaderem dokładnie w kształcie namalowanych lamp.
- **Własny silnik fizyki pinballa** (`game/src/physics/world.js`): krok 2400 Hz, flippery z przekazywaniem pędu, rampy i druciane rurki jako ścieżki 3D, bramki jednokierunkowe, spinner, saucer, scoop z VUK, kickback.
- **Stół i obudowa** modelowane w Blenderze na podstawie jednego pliku układu (`game/src/layout.js`), wspólnego dla grafiki i fizyki.
- **Muzyka adaptacyjna**: sekcje utworów zapętlane na granicach fraz, przejścia czekają na najbliższy takt (`game/src/audio/music.json`).

## Zasoby

- Grafiki stołu, plastików i zabawek oraz oba utwory muzyczne („月夜のピンボール”, „月庭の静けさ”) pochodzą od autora projektu.
- Mechaniczne efekty dźwiękowe są wycięte z nagrań społeczności freesound („pinball full game”, „ball in hole”, „instant drain”) i uzupełnione dźwiękami syntezowanymi (koto, taiko, shakuhachi, dzwony).
- Fonty: Marcellus, Shippori Mincho i Cormorant Garamond (SIL Open Font License) przez pakiety @fontsource.
- Silnik 3D: [three.js](https://threejs.org) (MIT).
