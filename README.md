# Uutisapuri

Henkilökohtainen uutisapuri-PWA (Local-first).

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

## Automaattiset commitit ja versionumerointi

Projektissa on automaattinen versiointi- ja julkaisukomento:
```bash
npm run commit "Kuvaus muutoksista"
```
Tämä komento:
1. Kasvattaa automaattisesti versionumeroa 0.01:llä (alkoi numerosta `1.09` → `1.10` jne.).
2. Tallentaa versionumeron ja commit-viestin tiedostoon [`src/config.js`](src/config.js) ja [`config.js`](config.js).
3. Suorittaa `git add .`, tekee commitin (`Versio X.XX: ...`) ja puskee automaattisesti GitHubiin (`git push`).

---

## Ominaisuudet ja arkkitehtuuri

1. **Uutisvirta ja lähteet:**
   - Hakee uutisia Yleltä, Ilta-Sanomilta ja BBC:ltä (`scripts/fetch-news.mjs`).
   - Automaattinen **ristiinduplikoinnin poisto**: jos Yle ja IS raportoivat samasta aiheesta, ne yhdistetään yhdeksi uutiskortiksi molempien lähteiden maininnalla.
   - Vanhentuneet (yli 4 päivää vanhat) uutiset karsiutuvat automaattisesti.

2. **Luettujen uutisten seuranta (7 päivän rullaava historia):**
   - Pitää kirjaa klikatuista uutisista `localStorage`-muistissa viikon ajalta.
   - Luetut uutiset piilotetaan automaattisesti etusivulta, jotta uutisvirta pysyy tuoreena.
   - Tähdellä merkityt suosikit säilyvät aina tallessa.
   - Mahdollisuus näyttää piilotetut luetut uutiset tai tyhjentää lukuhistoria Asetuksissa.

3. **Responsiivinen navigaatio:**
   - **Työpöytänäkymä (≥ 700px):** Ylävalikko otsikon vieressä (1. Koti, 2. Suosikit, 3. Asetukset).
   - **Mobiilinäkymä (< 700px):** Kiinteä alavalintanauha ruudun alareunassa: **Suosikit (vasemmalla) · Koti (keskellä) · Asetukset (oikealla)** safe-area-tuella.

4. **Leijuva "Alkuun"-nappi:**
   - Kun uutislistaa rullataan alas (> 280px), oikeaan alakulmaan ilmestyy huomaamaton, leijuva `↑ Alkuun` -painike, jolla pääsee yhdellä napautuksella sivun huipulle.

5. **Pull-to-refresh & manuaalipäivitys:**
   - Vedä etusivua alaspäin päivittääksesi uutiset milloin tahansa mobiilissa.
   - Nopea `↻`-päivityspainike yläpalkissa.
   - Automaattinen uutisten tarkistus aina kun sovellukseen palataan taustalta.

6. **Versiohistoria Asetuksissa:**
   - Asetukset-näkymässä on avattava ja skrollattava versioluettelo (esim. `Versio 1.09: -- commitin kuvaus --`), josta näkee kaikkien aiempien julkaisujen sisällön.

7. **Teemat:**
   - **Järjestelmä (Auto)** – mukautuu puhelimen / käyttöjärjestelmän tummaan tai vaaleaan tilaan reaaliajassa.
   - **Vaalea**
   - **Tumma**

8. **PWA & Offline:**
   - Asennettavissa kotivalikkoon Androidilla, iOS:lla ja tietokoneella.
   - Offline-tuki Service Workerin avulla.

---

## Automaattipäivitys (GitHub Actions)

Projektissa on valmis työnkulku [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), joka:
- Noutaa uutiset automaattisesti **15 minuutin välein** (`cron: '*/15 * * * *'`).
- Karsii duplikaatit, kääntää sovelluksen ja julkaisee sen suoraan GitHub Pagesiin.
