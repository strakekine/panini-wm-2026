// Baut aus der Vorlage die App für einen Verein — ein fertiger Ordner, der als eigenes GitHub-Repo
// hochgeladen wird. fussball.html (FC Koeppchen) wird dafür weder gelesen noch angefasst.
//
//   node vorlage-verein/neu.mjs <verein.json> <logo.png|jpg|svg> [Zielordner] [--abruf]
//
// Zielordner: Standard vorlage-verein/ausgabe/<slug>/ (steht in .gitignore). Mit --abruf werden
// die Daten gleich einmal von der FLF geholt (in der Cloud-Umgebung: NODE_USE_ENV_PROXY=1).
// Ein schon vorhandener Zielordner wird aufgefrischt: Vorlage drüber, data/ bleibt.

import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HIER = dirname(fileURLToPath(import.meta.url));
const VORLAGE = join(HIER, "vorlage");

// ---- Farben ----
const hex = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h.trim()); if (!m) throw new Error("Farbe als #rrggbb: " + h); return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)); };
const alsHex = rgb => "#" + rgb.map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");
const misch = (a, b, t) => alsHex(hex(a).map((x, i) => x + (hex(b)[i] - x) * t));
const lum = h => { const [r, g, b] = hex(h).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const kontrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const farbton = h => { const [r, g, b] = hex(h).map(x => x / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return null; const t = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (t * 60 + 360) % 360; };

// Aus zwei Vereinsfarben alle Töne der App. Kopf = Kopfleiste/Kalenderknopf, Akzent = Linie unter
// dem Kopf, Siege, Knöpfe, eigene Zeile in der Tabelle (als heller Ton).
export function farben({ kopf, akzent }) {
  kopf = alsHex(hex(kopf)); akzent = alsHex(hex(akzent));
  const dunkel = kontrast("#ffffff", kopf) >= kontrast("#111111", kopf);
  const headT = dunkel ? "#ffffff" : "#111111";
  // Schrift auf dem Akzent: weiss, wenn es sich lesen lässt (3:1 reicht für fette Schrift), sonst schwarz.
  const onAccent = kontrast("#ffffff", akzent) >= 2.6 ? "#ffffff" : "#111111";
  // Akzent als Linkfarbe auf Weiss braucht 4,5:1 — so lange abdunkeln.
  let accentT = akzent;
  for (let t = 0.05; kontrast(accentT, "#ffffff") < 4.5 && t <= 1; t += 0.05) accentT = misch(akzent, "#000000", t);
  // Aufstieg in der Akzentfarbe nur, wenn sie grün bis blau und nicht fast schwarz ist — rot ist
  // Abstieg, schwarz/grau/gelb liest sich nicht als „hoch“.
  const ton = farbton(akzent), fastSchwarz = kontrast(akzent, "#111111") < 1.6;
  const good = ton != null && ton >= 75 && ton <= 250 && !fastSchwarz && kontrast(akzent, "#ffffff") >= 2 ? akzent : "#1f9d55";
  // Niederlage ist schwarz. Ist der Akzent (= Sieg) selbst fast schwarz, wird die Niederlage grau.
  const loss = fastSchwarz ? "#8a908d" : "#111111";
  const v = {
    accent: akzent, accentT, onAccent, good, loss, tint: misch(akzent, "#ffffff", 0.88),
    head: kopf, headT,
    segLine: dunkel ? misch(kopf, "#ffffff", 0.2) : misch(kopf, "#000000", 0.2),
    segBg: dunkel ? misch(kopf, "#ffffff", 0.08) : misch(kopf, "#000000", 0.06),
    segText: dunkel ? misch(kopf, "#ffffff", 0.72) : misch(kopf, "#000000", 0.7),
    segOn: dunkel ? "#ffffff" : "#111111", segOnT: dunkel ? "#111111" : "#ffffff",
  };
  return Object.entries(v).map(([k, x]) => `    --${k}:${x};`).join("\n");
}

// ---- Logo → 180×180 PNG auf Weiss (iOS füllt Durchsichtiges im Home-Icon schwarz) ----
export function logoPng(datei) {
  const versuche = [
    ["convert", [datei + "[0]", "-background", "white", "-alpha", "remove", "-resize", "164x164", "-gravity", "center",
                 "-extent", "180x180", "-colors", "128", "-strip", "png:-"]],
    ["python3", ["-I", "-c", `import sys,io
from PIL import Image
im=Image.open(sys.argv[1]).convert("RGBA"); im.thumbnail((164,164))
bg=Image.new("RGB",(180,180),"white"); bg.paste(im,((180-im.width)//2,(180-im.height)//2),im)
bg=bg.quantize(128); o=io.BytesIO(); bg.save(o,"PNG",optimize=True); sys.stdout.buffer.write(o.getvalue())`, datei]],
  ];
  for (const [prog, args] of versuche) {
    try { return execFileSync(prog, args, { maxBuffer: 1 << 24, stdio: ["ignore", "pipe", "ignore"] }); } catch (e) {}
  }
  if (/\.png$/i.test(datei)) { console.warn("⚠ Weder ImageMagick noch Pillow — Logo unverändert eingebettet"); return readFileSync(datei); }
  throw new Error("Logo lässt sich nicht umwandeln (ImageMagick oder Pillow fehlt)");
}

// ---- verein.json prüfen und ergänzen ----
export function pruefen(c) {
  const fehlt = ["name", "kurz", "flfName", "clubId", "repo"].filter(k => !c[k]);
  if (fehlt.length) throw new Error("verein.json: es fehlt " + fehlt.join(", "));
  if (!/^[\w.-]+\/[\w.-]+$/.test(c.repo)) throw new Error("repo als konto/name, z. B. strakekine/fc-beispiel");
  if (!c.farben?.kopf || !c.farben?.akzent) throw new Error("verein.json: farben.kopf und farben.akzent (#rrggbb)");
  return {
    slug: c.slug || c.repo.split("/")[1].toLowerCase(),
    start: "U13 1", von: "", bgl: true, nati: true, anstoss: false, worker: "", liveReiter: null, teilen: "",
    ...c, clubId: +c.clubId,
  };
}

const fuellen = (s, werte) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in werte)) throw new Error("Platzhalter ohne Wert: " + m); return werte[k]; });

export function erzeugen(cfg, logo, ziel, fassung) {
  mkdirSync(ziel, { recursive: true });
  // Vorlage drüberkopieren; data/ und kalender/ kommen vom Abruf und bleiben.
  cpSync(VORLAGE, ziel, { recursive: true });
  const app = { name: cfg.name, kurz: cfg.kurz, flfName: cfg.flfName, slug: cfg.slug, repo: cfg.repo, start: cfg.start,
                von: cfg.von, anstoss: !!cfg.anstoss, worker: cfg.worker, liveReiter: cfg.liveReiter, teilen: cfg.teilen };
  const html = fuellen(readFileSync(join(VORLAGE, "index.html"), "utf8"), {
    NAME: cfg.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"),
    KOPF: alsHex(hex(cfg.farben.kopf)),
    LOGO: "data:image/png;base64," + logo.toString("base64"),
    FARBEN: farben(cfg.farben),
    VEREIN: JSON.stringify(app).replace(/</g, "\\u003c"),
    FASSUNG: fassung,
  });
  writeFileSync(join(ziel, "index.html"), html);
  writeFileSync(join(ziel, "tools", "anstoss-worker.js"),
    fuellen(readFileSync(join(VORLAGE, "tools", "anstoss-worker.js"), "utf8"), { REPO: cfg.repo }));
  writeFileSync(join(ziel, "verein.json"), JSON.stringify(cfg, null, 2) + "\n");
  writeFileSync(join(ziel, ".nojekyll"), "");
  mkdirSync(join(ziel, "data"), { recursive: true });
  mkdirSync(join(ziel, "kalender"), { recursive: true });
  const [konto, repo] = cfg.repo.split("/");
  writeFileSync(join(ziel, "README.md"), `# ${cfg.name}

Spiele, Ergebnisse und Tabellen von der FLF, automatisch aktuell.
App: https://${konto.toLowerCase()}.github.io/${repo}/

- \`verein.json\` — Verein (FLF-Nummer ${cfg.clubId}, Name bei der FLF „${cfg.flfName}“).
- \`index.html\` — die App (eine Datei). Erzeugt aus der Vorlage; Änderungen am Verein in
  verein.json und neu erzeugen. Bei jeder Änderung \`FASSUNG\` hochzählen.
- \`.github/workflows/fussball.yml\` — holt die Daten (\`tools/fussball.mjs\`) und committet
  \`data/fussball.json\` und \`kalender/*.ics\`, nur bei Änderung.
- \`tools/anstoss-worker.js\` — freiwillig: Cloudflare-Worker, der den Abruf alle 15 min anstößt.
- Test: \`node test/fussball.mjs\`
`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2), abruf = args.includes("--abruf");
  const [cfgDatei, logoDatei, zielArg] = args.filter(a => !a.startsWith("--"));
  if (!cfgDatei || !logoDatei) {
    console.log("node vorlage-verein/neu.mjs <verein.json> <logo> [Zielordner] [--abruf]");
    process.exit(2);
  }
  const cfg = pruefen(JSON.parse(readFileSync(cfgDatei, "utf8")));
  const ziel = resolve(zielArg || join(HIER, "ausgabe", cfg.slug));
  const heute = new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Luxembourg", day: "2-digit", month: "2-digit", year: "numeric" });
  erzeugen(cfg, logoPng(logoDatei), ziel, heute + " a");
  console.log("erzeugt:", ziel);
  execFileSync(process.execPath, [join(ziel, "test", "fussball.mjs")], { stdio: "inherit" });
  if (abruf) execFileSync(process.execPath, [join(ziel, "tools", "fussball.mjs")], { stdio: "inherit", env: process.env });
  if (kontrast(cfg.farben.akzent, "#111111") < 1.6) console.log("⚠ Akzent fast schwarz: Siege schwarz, Niederlagen grau. Eine hellere Vereinsfarbe als Akzent sieht meist besser aus.");
  if (kontrast(cfg.farben.akzent, "#ffffff") < 1.4) console.log("⚠ Akzent fast weiss: auf weissem Grund kaum zu sehen.");
  const k = kontrast(cfg.farben.kopf, "#ffffff");
  console.log(`Kopf ${cfg.farben.kopf}: Schrift ${k >= kontrast(cfg.farben.kopf, "#111111") ? "weiss" : "schwarz"}.`);
}
