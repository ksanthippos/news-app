import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const configPath = path.join(rootDir, "src", "config.js");
const rootConfigPath = path.join(rootDir, "config.js");
const pkgPath = path.join(rootDir, "package.json");

function run(cmd) {
  return execSync(cmd, { cwd: rootDir, encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] }).trim();
}

async function main() {
  const commitMessage = process.argv.slice(2).join(" ").trim();
  if (!commitMessage) {
    console.error("❌ Anna commit-viesti! Esimerkki:\n   npm run commit \"Uusi ominaisuus lisatty\"");
    process.exit(1);
  }

  // 1. Luetaan nykyinen src/config.js
  const configContent = await fs.readFile(configPath, "utf8");
  const versionMatch = configContent.match(/export const APP_VERSION = ["']([^"']+)["'];/);
  if (!versionMatch) {
    console.error("❌ APP_VERSION -muuttujaa ei löytynyt tiedostosta src/config.js");
    process.exit(1);
  }

  const currentVersionStr = versionMatch[1];
  const currentVersionNum = parseFloat(currentVersionStr);

  // Tarkistetaan onko nykyinen versionumero jo olemassa viimeisimmässä git-commitissa
  let lastCommitMsg = "";
  try {
    lastCommitMsg = run("git log -1 --pretty=%B");
  } catch {
    lastCommitMsg = "";
  }

  let nextVersionStr = currentVersionStr;
  // Jos nykyinen versio on jo viimeisimmässä commitissa, kasvatetaan numeroa 0.01:llä
  if (lastCommitMsg.includes(`Versio ${currentVersionStr}`) || lastCommitMsg.includes(`v${currentVersionStr}`)) {
    const nextNum = Math.round((currentVersionNum + 0.01) * 100) / 100;
    nextVersionStr = nextNum.toFixed(2);
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // 2. Parsitaan ja päivitetään VERSION_HISTORY
  const historyMatch = configContent.match(/export const VERSION_HISTORY = (\[[\s\S]*?\]);/);
  let history = [];
  if (historyMatch) {
    try {
      history = JSON.parse(historyMatch[1]);
    } catch {
      // Käytetään eval-turvallisesti tai regexiä jos JSON ei ole puhdas
      history = [];
    }
  }

  // Lisätään uusi versiohistoriamerkintä
  const newEntry = {
    version: nextVersionStr,
    date: todayStr,
    message: commitMessage
  };

  // Jos uutta versiota ei ole jo listalla ensimmäisenä, lisätään alkuun
  if (!history.length || history[0].version !== nextVersionStr) {
    history.unshift(newEntry);
  } else {
    history[0] = newEntry;
  }

  const newConfigContent = `/**
 * Uutisapuri - Sovelluksen konfiguraatio ja versiohistoria
 * Versionumero kasvaa automaattisesti 0.01:llä jokaisen commitin yhteydessä.
 */
export const APP_VERSION = "${nextVersionStr}";

export const VERSION_HISTORY = ${JSON.stringify(history, null, 2)};
`;

  await fs.writeFile(configPath, newConfigContent, "utf8");
  await fs.writeFile(rootConfigPath, `// Projektin juuren config.js - viittaa src/config.js -tiedostoon\nexport { APP_VERSION, VERSION_HISTORY } from "./src/config.js";\n`, "utf8");

  // 3. Päivitetään myös package.json version
  try {
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
    pkg.version = `${nextVersionStr}.0`;
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
  } catch (err) {
    console.warn("package.json päivitys ohitettiin:", err.message);
  }

  console.log(`\n📦 Versio päivitetty: ${currentVersionStr} → ${nextVersionStr}`);
  console.log(`📝 Commit-viesti: "Versio ${nextVersionStr}: ${commitMessage}"`);

  // 4. Git add, commit ja push
  try {
    console.log("\n🚀 Suoritetaan git add ja commit...");
    run("git add .");
    const commitOut = run(`git commit -m "Versio ${nextVersionStr}: ${commitMessage}"`);
    console.log(commitOut);
  } catch (err) {
    console.error("❌ Git commit epäonnistui:", err.message);
    process.exit(1);
  }

  try {
    console.log("⬆️  Pusketaan muutokset GitHubiin (git push)...");
    const pushOut = run("git push");
    console.log(pushOut || "✓ Push suoritettu onnistuneesti!");
    console.log(`\n🎉 Valmis! Versio ${nextVersionStr} commitoitu ja julkaistu GitHubiin.`);
  } catch (err) {
    console.warn("\n⚠️  Commit onnistui paikallisesti, mutta push epäonnistui (esim. sandbox tai offline):", err.message);
    console.warn("👉 Voit puskea muutokset GitHubiin komennolla: git push");
  }
}

main().catch((err) => {
  console.error("Virhe:", err);
  process.exit(1);
});
