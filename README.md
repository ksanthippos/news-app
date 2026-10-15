# Uutiskoostaja

Henkilökohtainen uutiskoostaja-PWA (Local-first).

## Käynnistys paikallisesti

1. Asenna riippuvuudet (vain ensimmäisellä kerralla):
```bash
npm install
```

2. Hae tuoreimmat uutiset RSS-lähteistä:
```bash
npm run fetch:news
```

3. Käynnistä kehityspalvelin:
```bash
npm run dev
```

Avaa selaimessa Viten ilmoittama osoite (esim. `http://localhost:5173`).

---

## Uutisten haku ja arkkitehtuuri

Sovellus käyttää **staattista taustahakua (Local-first)**:
1. Skripti [`scripts/fetch-news.mjs`](scripts/fetch-news.mjs) hakee uutiset RSS-syötteistä (mm. Yle Uutiset ja BBC).
2. Skripti jäsentää XML:n, normalisoi kategoriat ja tallentaa tuoreet uutiset tiedostoon [`public/news.json`](public/news.json).
3. React-sovellus ([`src/App.jsx`](src/App.jsx)) lataa uutiset suoraan `news.json`-tiedostosta. Mikäli tiedostoa ei löydy, käytetään varalla demodataa ([`src/data/demoNews.js`](src/data/demoNews.js)).
4. Tämän ansiosta sovellus:
   - Latautuu välittömästi ilman ulkoisia API-viiveitä.
   - Välttää kaikki selaimen CORS- ja rate-limit -ongelmat.
   - Toimii täysin offline-tilassa Service Workerin avulla.

Voit lisätä uusia RSS-syötteitä helposti muokkaamalla `FEEDS`-taulukkoa tiedostossa [`scripts/fetch-news.mjs`](scripts/fetch-news.mjs).

---

## Tuotantoversio (Build)

```bash
npm run build
```

Tuotantoversio syntyy `dist/`-hakemistoon ja se on valmis julkaistavaksi esim. GitHub Pagesiin.

### GitHub Actions -automaatio (valinnainen)

Jos julkaiset sovelluksen GitHub Pagesiin, voit automatisoida uutisten noudon esim. 2 tunnin välein GitHub Actions -työnkululla (`.github/workflows/update-news.yml`):

```yaml
name: Update News
on:
  schedule:
    - cron: '0 */2 * * *' # 2 tunnin välein
  workflow_dispatch:

jobs:
  update-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run fetch:news
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## Mitä pohjassa on?

- React + Vite
- PWA / service worker `vite-plugin-pwa`:lla
- Responsiivinen puhelin- ja tablet-näkymä
- Suomi + englanti -kielisuodatus
- Kategoriapalkki
- Suosikit (tallentuvat selaimeen / localStorage)
- Tumma tila
- GitHub Pages -yhteensopivuus (`base: "./"`)
