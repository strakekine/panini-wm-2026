// Live-Stand der Seniors 1 von FuPa → data/live.json für fussball.html.
// Die FLF trägt während des Spiels nichts ein (am 18.10.2026 geprüft), FuPa hat den Stand,
// sobald jemand am Platz tickert. FuPa hat keine offizielle Schnittstelle: nur während eines
// Spiels abfragen.
//
//   node tools/fussball-live.mjs           einmal abfragen (falls gerade ein Spiel läuft)
//   node tools/fussball-live.mjs --wache   so läuft es in der Action (fussball-live.yml, 3× am
//       Tag): liegt in den nächsten Stunden ein Anstoß, bis 15 min davor warten, dann alle 2 min
//       abfragen und jede Änderung sofort committen, bis 150 min nach Anstoß. Sonst sofort fertig.
//       Ein GitHub-Lauf darf höchstens 6 h dauern — darum nur Anstöße bis WACHE_MAX voraus.
// Lokal in der Cloud-Umgebung: NODE_USE_ENV_PROXY=1 davor.

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { eigeneSpiele } from "./fussball.mjs";

const DATEN = new URL("../data/fussball.json", import.meta.url);
const OUT = new URL("../data/live.json", import.meta.url);
const CLUB_SEITE = "https://www.fupa.net/club/fc-koeppchen";
const API = "https://api.fupa.net/v1/matches/";
export const REITER = "Seniors 1";           // nur dort tickert jemand (FuPa führt keine Jugend)
export const VOR_MIN = 15, NACH_MIN = 150;   // Zeitfenster um den Anstoß
export const TAKT_S = 120;                   // Abfrage-Abstand während des Spiels
export const WACHE_MAX_MIN = 200;            // so weit voraus darf ein Anstoß liegen (200 + 150 < 6 h)

// Das Spiel der Mannschaft, das gerade im Zeitfenster liegt, oder null.
export function spielJetzt(D, now) {
  const t = D.teams.find(t => t.reiter === REITER);
  if (!t) return null;
  return eigeneSpiele(D, t).find(sp => {
    const a = Date.parse(sp.d);
    return now >= a - VOR_MIN * 60e3 && now <= a + NACH_MIN * 60e3;
  }) || null;
}

// Für --wache: das nächste Spiel, dessen Fenster noch nicht vorbei ist und dessen Anstoß
// höchstens WACHE_MAX_MIN voraus liegt (spätere übernimmt der nächste Lauf).
export function naechstesSpiel(D, now) {
  const t = D.teams.find(t => t.reiter === REITER);
  if (!t) return null;
  return eigeneSpiele(D, t).find(sp => {
    const a = Date.parse(sp.d);
    return now <= a + NACH_MIN * 60e3 && a - now <= WACHE_MAX_MIN * 60e3;
  }) || null;
}

// FuPa-Spiel (API-Antwort) → schlankes Format der App. `minute` gilt zum Zeitpunkt `minuteAt`;
// die App zählt selbst weiter, sonst änderte sich die Datei bei jedem Lauf (ein Commit je 5 min).
export function liveAus(f, flf) {
  const l = f.live || {};
  const heimSlug = f.homeTeam?.slug;
  return {
    flfId: flf.id,
    slug: f.slug,
    url: "https://www.fupa.net/match/" + f.slug,
    anstoss: flf.d,
    h: flf.h.n, a: flf.a.n,
    hs: f.homeGoal ?? null, as: f.awayGoal ?? null,
    section: f.section || "",             // PRE, LIVE, POST
    period: l.period || "",               // started (1. Hz), halftime, secondHalf, …
    running: !!l.running,
    minute: l.minute ?? null,
    minuteAt: l.lastTimestamp || null,
    tore: (f.highlights || []).filter(x => x.type === "goal").map(x => ({
      min: x.minute, plus: x.additionalMinute || 0,
      heim: x.team?.teamSlug === heimSlug,
      name: [x.primaryRole?.firstName, x.primaryRole?.lastName].filter(Boolean).join(" ") || null,
      art: x.subtype || "",
    })).sort((a, b) => a.min - b.min || a.plus - b.plus),
    ticker: f.tickerAuthor?.name || null,
  };
}

// Inhaltlich gleich? `minute`/`minuteAt` zählen nur, wenn sich sonst etwas geändert hat — solange
// die Uhr läuft, bleibt das alte Paar richtig, und die App rechnet von dort weiter.
export function gleich(alt, neu) {
  const ohne = x => x && JSON.stringify({ ...x, minute: 0, minuteAt: 0 });
  return !!alt && ohne(alt) === ohne(neu);
}

// Saison „20262027“ → FuPa-Teamslug „fc-koeppchen-m1-2026-27“, aus der Vereinsseite.
async function teamSlug(saisonId) {
  const html = await (await fetch(CLUB_SEITE)).text();
  const s = saisonId.slice(0, 4) + "-" + saisonId.slice(6, 8);
  const m = html.match(new RegExp(`/team/(fc-koeppchen-m1-${s})\\b`));
  if (!m) throw new Error("FuPa-Team für " + s + " nicht gefunden");
  return m[1];
}

// Alle Spiele mit Anstoß aus dem eingebetteten Zustand der Spielplan-Seite.
async function fupaSpiele(slug) {
  const html = await (await fetch(`https://www.fupa.net/team/${slug}/matches`)).text();
  const m = html.match(/window\.REDUX_DATA\s*=\s*(\{.*?\})\s*(?:;|<\/script>)/s);
  if (!m) throw new Error("REDUX_DATA nicht gefunden");
  const aus = [];
  (function lauf(o) {
    if (Array.isArray(o)) o.forEach(lauf);
    else if (o && typeof o === "object") {
      if (o.kickoff && o.slug && o.homeTeam) aus.push(o);
      Object.values(o).forEach(lauf);
    }
  })(JSON.parse(m[1]));
  return aus;
}

// Eine Abfrage; true, wenn live.json neu geschrieben wurde.
async function einmal(D, sp) {
  const alt = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;

  let slug = alt?.flfId === sp.id ? alt.slug : null;
  if (!slug) {
    const spiele = await fupaSpiele(await teamSlug(D.saison.id));
    slug = spiele.find(x => Date.parse(x.kickoff) === Date.parse(sp.d))?.slug;
    if (!slug) { console.log("Spiel bei FuPa nicht gefunden:", sp.d); return false; }
  }
  const r = await fetch(API + slug);
  if (!r.ok) throw new Error("FuPa HTTP " + r.status);
  const neu = liveAus(await r.json(), sp);
  if (gleich(alt, neu)) { console.log("unverändert", neu.hs, ":", neu.as, neu.period); return false; }
  writeFileSync(OUT, JSON.stringify(neu, null, 1) + "\n");
  console.log("geschrieben:", neu.hs, ":", neu.as, neu.section, neu.period, neu.minute + "'");
  return true;
}

// Commit + Push aus der Action heraus; die Daten-Action kann dazwischen committet haben.
function commit() {
  const sh = c => execSync(c, { stdio: "inherit" });
  sh("git add data/live.json");
  try { execSync("git diff --cached --quiet"); return; } catch (e) {}
  sh('git -c user.name=fussball-live -c user.email=41898282+github-actions[bot]@users.noreply.github.com commit -q -m "Fußball: Live-Stand"');
  for (let i = 1; ; i++) {
    try { sh("git pull -q --rebase origin main && git push -q origin HEAD:main"); return; }
    catch (e) { if (i >= 3) throw e; }
  }
}

const schlafen = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));

async function wache() {
  const D = JSON.parse(readFileSync(DATEN, "utf8"));
  const sp = naechstesSpiel(D, Date.now());
  if (!sp) { console.log("kein Spiel in den nächsten", WACHE_MAX_MIN, "min"); return; }
  const a = Date.parse(sp.d), ende = a + NACH_MIN * 60e3;
  console.log("Spiel", sp.h.n, "–", sp.a.n, sp.d, "· warte bis", new Date(a - VOR_MIN * 60e3).toISOString());
  await schlafen(a - VOR_MIN * 60e3 - Date.now());
  let nachAbpfiff = 0;
  while (Date.now() <= ende) {
    try { if (await einmal(D, sp)) commit(); }
    catch (e) { console.error("Abfrage fehlgeschlagen:", e.message); }   // nächster Takt versucht es wieder
    // Nach Abpfiff noch zwei Abfragen (Korrekturen des Tickerers), dann Schluss.
    try {
      const L = JSON.parse(readFileSync(OUT, "utf8"));
      if (L.flfId === sp.id && L.section === "POST" && ++nachAbpfiff > 2) break;
    } catch (e) {}
    await schlafen(TAKT_S * 1e3);
  }
  console.log("fertig");
}

async function main() {
  const D = JSON.parse(readFileSync(DATEN, "utf8"));
  const sp = spielJetzt(D, Date.now());
  if (!sp) { console.log("kein Spiel im Zeitfenster"); return; }
  await einmal(D, sp);
}

if (import.meta.url === `file://${process.argv[1]}`)
  (process.argv.includes("--wache") ? wache() : main()).catch(e => { console.error(e); process.exit(1); });
