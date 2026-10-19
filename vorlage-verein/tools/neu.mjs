// Trägt einen Verein ein oder frischt ihn auf: <ordner>/verein.json, logo.png, index.html, dazu
// vereine.json (die Liste für den Worker). Die App fussball.html (FC Koeppchen) gehört nicht dazu.
//
//   node tools/neu.mjs <verein.json> <logo.png|jpg|svg> [--abruf]   Verein neu oder geändert
//   node tools/neu.mjs --alle                                       alle neu bauen (nach Änderung
//                                                                   an vorlage/ oder repo.json)
//
// Mit --abruf werden die Daten gleich einmal von der FLF geholt (Cloud-Umgebung: NODE_USE_ENV_PROXY=1).

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { WURZEL, vereinsOrdner } from "./fussball.mjs";

const VORLAGE = join(WURZEL, "vorlage", "index.html");

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
    accent: akzent, accentT, onAccent, good, goodTint: misch(good, "#ffffff", 0.88), loss, tint: misch(akzent, "#ffffff", 0.88),
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
  const fehlt = ["name", "kurz", "flfName", "clubId", "slug"].filter(k => !c[k]);
  if (fehlt.length) throw new Error("verein.json: es fehlt " + fehlt.join(", "));
  if (!/^[a-z0-9][a-z0-9-]*$/.test(c.slug)) throw new Error("slug: Kleinbuchstaben, Ziffern, Bindestrich (wird Ordner und Adresse)");
  if (!c.farben?.kopf || !c.farben?.akzent) throw new Error("verein.json: farben.kopf und farben.akzent (#rrggbb)");
  hex(c.farben.kopf); hex(c.farben.akzent);
  return { start: "U13 1", von: "", bgl: true, nati: true, fupa: "", teilen: "", ...c, clubId: +c.clubId };
}

export const fuellen = (s, werte) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => { if (!(k in werte)) throw new Error("Platzhalter ohne Wert: " + m); return werte[k]; });

// Was die App über den Verein wissen muss (der Rest von verein.json ist für den Abruf).
export function appWerte(cfg, repo) {
  return { name: cfg.name, kurz: cfg.kurz, flfName: cfg.flfName, slug: cfg.slug, repo: repo.repo, start: cfg.start,
           von: cfg.von, anstoss: !!repo.worker, worker: repo.worker || "", fupa: cfg.fupa || "",
           liveReiter: cfg.liveReiter || null, teilen: cfg.teilen || "" };
}

export function html(cfg, repo, logo, fassung) {
  return fuellen(readFileSync(VORLAGE, "utf8"), {
    NAME: cfg.name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"),
    KOPF: alsHex(hex(cfg.farben.kopf)),
    LOGO: "data:image/png;base64," + logo.toString("base64"),
    FARBEN: farben(cfg.farben),
    VEREIN: JSON.stringify(appWerte(cfg, repo)).replace(/</g, "\\u003c"),
    FASSUNG: fassung,
  });
}

// Fassung „19.10.2026 a“; am selben Tag neu gebaut → b, c …
function fassungFuer(datei) {
  const heute = new Date().toLocaleDateString("de-DE", { timeZone: "Europe/Luxembourg", day: "2-digit", month: "2-digit", year: "numeric" });
  const alt = existsSync(datei) && /const FASSUNG = "([\d.]+) ([a-z])"/.exec(readFileSync(datei, "utf8"));
  return heute + " " + (alt && alt[1] === heute ? String.fromCharCode(alt[2].charCodeAt(0) + 1) : "a");
}

export const repoCfg = () => JSON.parse(readFileSync(join(WURZEL, "repo.json"), "utf8"));

// Einen Verein (neu) bauen. logo = PNG-Inhalt oder null (dann das vorhandene logo.png).
export function bauen(cfg, logo) {
  const repo = repoCfg(), dir = join(WURZEL, cfg.slug);
  mkdirSync(dir, { recursive: true });
  if (logo) writeFileSync(join(dir, "logo.png"), logo);
  else logo = readFileSync(join(dir, "logo.png"));
  writeFileSync(join(dir, "verein.json"), JSON.stringify(cfg, null, 2) + "\n");
  const datei = join(dir, "index.html");
  writeFileSync(datei, html(cfg, repo, logo, fassungFuer(datei)));
}

// vereine.json (Liste für Worker und Übersicht) und die Repo-Adresse im Worker nachziehen.
export function listeSchreiben() {
  const repo = repoCfg(), liste = {};
  for (const v of vereinsOrdner()) {
    const c = JSON.parse(readFileSync(join(WURZEL, v, "verein.json"), "utf8"));
    liste[v] = { name: c.name, fupa: c.fupa || "" };
  }
  writeFileSync(join(WURZEL, "vereine.json"), JSON.stringify(liste, null, 1) + "\n");
  const w = join(WURZEL, "tools", "worker.js"), alt = readFileSync(w, "utf8");
  const neu = alt.replace(/^const REPO = "[^"]*"/m, `const REPO = ${JSON.stringify(repo.repo)}`);
  if (neu !== alt) writeFileSync(w, neu);
  return liste;
}

function hinweise(cfg) {
  if (kontrast(cfg.farben.akzent, "#111111") < 1.6) console.log("⚠ Akzent fast schwarz: Siege schwarz, Niederlagen grau. Eine hellere Vereinsfarbe als Akzent sieht meist besser aus.");
  if (kontrast(cfg.farben.akzent, "#ffffff") < 1.4) console.log("⚠ Akzent fast weiss: auf weissem Grund kaum zu sehen.");
  if (!cfg.fupa) console.log("ℹ Ohne `fupa` (FuPa-Vereinsslug) kein Liveticker — tools/suche.mjs findet ihn.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2), abruf = args.includes("--abruf");
  const [cfgDatei, logoDatei] = args.filter(a => !a.startsWith("--"));
  let neu = [];
  if (args.includes("--alle")) {
    for (const v of vereinsOrdner()) bauen(pruefen(JSON.parse(readFileSync(join(WURZEL, v, "verein.json"), "utf8"))), null);
    neu = vereinsOrdner();
  } else if (cfgDatei && logoDatei) {
    const cfg = pruefen(JSON.parse(readFileSync(cfgDatei, "utf8")));
    bauen(cfg, logoPng(logoDatei));
    hinweise(cfg);
    neu = [cfg.slug];
  } else {
    console.log("node tools/neu.mjs <verein.json> <logo> [--abruf]   oder   node tools/neu.mjs --alle");
    process.exit(2);
  }
  console.log("gebaut:", neu.join(", "), "· im Repo:", Object.keys(listeSchreiben()).join(", "));
  execFileSync(process.execPath, [join(WURZEL, "test", "fussball.mjs")], { stdio: "inherit" });
  if (abruf) execFileSync(process.execPath, [join(WURZEL, "tools", "fussball.mjs"), ...neu], { stdio: "inherit", env: process.env });
}
