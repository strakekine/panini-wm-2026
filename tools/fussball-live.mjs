// Live-Stand der Seniors 1 von FuPa → data/live.json für fussball.html.
// Läuft als GitHub Action alle 5 min (.github/workflows/fussball-live.yml), lokal:
//   NODE_USE_ENV_PROXY=1 node tools/fussball-live.mjs
// Die FLF trägt während des Spiels nichts ein (am 18.10.2026 geprüft), FuPa hat den Stand,
// sobald jemand am Platz tickert. Ohne Spiel im Zeitfenster ist das Skript sofort fertig.
// FuPa hat keine offizielle Schnittstelle: nur während eines Spiels abfragen, nicht öfter.

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { eigeneSpiele } from "./fussball.mjs";

const DATEN = new URL("../data/fussball.json", import.meta.url);
const OUT = new URL("../data/live.json", import.meta.url);
const CLUB_SEITE = "https://www.fupa.net/club/fc-koeppchen";
const API = "https://api.fupa.net/v1/matches/";
export const REITER = "Seniors 1";           // nur dort tickert jemand (FuPa führt keine Jugend)
export const VOR_MIN = 15, NACH_MIN = 150;   // Zeitfenster um den Anstoß

// Das Spiel der Mannschaft, das gerade im Zeitfenster liegt, oder null.
export function spielJetzt(D, now) {
  const t = D.teams.find(t => t.reiter === REITER);
  if (!t) return null;
  return eigeneSpiele(D, t).find(sp => {
    const a = Date.parse(sp.d);
    return now >= a - VOR_MIN * 60e3 && now <= a + NACH_MIN * 60e3;
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

async function main() {
  const D = JSON.parse(readFileSync(DATEN, "utf8"));
  const sp = spielJetzt(D, Date.now());
  if (!sp) { console.log("kein Spiel im Zeitfenster"); return; }
  const alt = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;

  let slug = alt?.flfId === sp.id ? alt.slug : null;
  if (!slug) {
    const spiele = await fupaSpiele(await teamSlug(D.saison.id));
    slug = spiele.find(x => Date.parse(x.kickoff) === Date.parse(sp.d))?.slug;
    if (!slug) { console.log("Spiel bei FuPa nicht gefunden:", sp.d); return; }
  }
  const r = await fetch(API + slug);
  if (!r.ok) throw new Error("FuPa HTTP " + r.status);
  const neu = liveAus(await r.json(), sp);
  if (gleich(alt, neu)) { console.log("unverändert", neu.hs, ":", neu.as, neu.period); return; }
  writeFileSync(OUT, JSON.stringify(neu, null, 1) + "\n");
  console.log("geschrieben:", neu.hs, ":", neu.as, neu.section, neu.period, neu.minute + "'");
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
