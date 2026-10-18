// Abruf FLF → data/fussball.json für fussball.html.
// Läuft als GitHub Action (.github/workflows/fussball.yml), lokal: node tools/fussball.mjs
// Quelle ist die GraphQL-Schnittstelle hinter https://extranet.flf.lu/match, die ohne
// Anmeldung antwortet, aber keine CORS-Freigabe schickt — darum dieser Umweg.
// Gesucht wird nach dem Verein, nicht nach einer Klasse: Steigt eine Mannschaft auf,
// erscheint die neue Klasse mit ihrem ersten Spiel von selbst.

import { writeFileSync, readFileSync, existsSync } from "node:fs";

export const API = "https://extranet.flf.lu/api/graphql";
export const CLUB = 1003703;          // Wormeldange FC Koeppchen
// Altersklassen in der Reihenfolge der Reiter (vom Nutzer so festgelegt). id = ageCategoryId
// der FLF. Die Réserves sind bei der FLF eine eigene Kategorie („Seniors (R)“, 9999) und stehen
// am Ende als „Seniors 2“ (Réserves I) und „Seniors 3“ (Réserves II): `plus` verschiebt die
// Nummer, `ohne` ist die Nummer einer Mannschaft ohne I/II. U7 hat noch keine Spiele (18.10.2026).
export const AGES = [
  { id: 1,  kat: "Seniors", n: "Seniors", ohne: 1 },
  { id: 4,  kat: "U13", n: "U13 Minimes" },
  { id: 11, kat: "U15", n: "U15 Scolaires" },
  { id: 7,  kat: "U11", n: "U11 Poussins" },
  { id: 5,  kat: "U9",  n: "U9 Pupilles" },
  { id: 9999, kat: "Seniors", n: "Seniors Réserves", plus: 1 },
];
const OUT = new URL("../data/fussball.json", import.meta.url);

const M_FIELDS = `match{ id gameday matchDate isPlayed isForfait homeScore awayScore finalHomeScore finalAwayScore finalScoreComment }
  division{ id name showResult showRanking } matchType{ id }
  homeTeam{ id name clubId1 clubId2 clubId3 clubId4 } awayTeam{ id name clubId1 clubId2 clubId3 clubId4 }
  sportField{ name }`;

const Q_DEFAULTS = `{ defaultValues{ currentSeasonId } seasons{ id name startDate endDate } }`;
const Q_MATCHES = `query($c: MatchCriteria){ matches(criteria:$c){ ${M_FIELDS} } }`;
const Q_RANKING = `query($c: MatchCriteria){ rankings(criteria:$c){
  ranking{ rank teamId totalPlays totalWins totalDraws totalLosses totalOwnGoals totalAgainstGoals totalPoints } team{ id name } } }`;

const pause = ms => new Promise(r => setTimeout(r, ms));

async function gq(query, variables = {}) {
  // Die Seite hat beim Ausprobieren einmal die Verbindung gekappt: ein zweiter Versuch, langsam.
  for (let versuch = 1; ; versuch++) {
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, variables }),
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      if (j.errors?.length) throw new Error(j.errors.map(e => e.message).join("; "));
      return j.data;
    } catch (e) {
      if (versuch >= 3) throw e;
      await pause(5000 * versuch);
    }
  }
}

const day = iso => iso.slice(0, 10);
const istVerein = t => t && [t.clubId1, t.clubId2, t.clubId3, t.clubId4].includes(CLUB);

// Ein Spiel aus der Schnittstelle → schlankes Format der App.
export function spiel(m) {
  const x = m.match, final = x.finalHomeScore != null;
  return {
    id: x.id,
    d: x.matchDate,
    tag: x.gameday,
    h: { id: m.homeTeam.id, n: m.homeTeam.name },
    a: { id: m.awayTeam.id, n: m.awayTeam.name },
    hs: final ? x.finalHomeScore : x.homeScore,
    as: final ? x.finalAwayScore : x.awayScore,
    gespielt: !!x.isPlayed,
    forfait: !!x.isForfait,
    bem: x.finalScoreComment || undefined,
    ort: m.sportField?.name || undefined,
  };
}

export function tabelle(rankings) {
  return rankings
    .map(r => ({
      pl: r.ranking.rank, id: r.team.id, n: r.team.name,
      sp: r.ranking.totalPlays, s: r.ranking.totalWins, u: r.ranking.totalDraws, nl: r.ranking.totalLosses,
      t: r.ranking.totalOwnGoals, g: r.ranking.totalAgainstGoals, pkt: r.ranking.totalPoints,
    }))
    .sort((a, b) => a.pl - b.pl);
}

// Vereinsspiele + je Klasse alle Spiele und Tabelle → das, was die App liest.
// vereinsSpiele tragen `ak` = Index in AGES (aus welcher Abfrage sie kommen).
export function aufbereiten({ saison, vereinsSpiele, klassen }) {
  const teams = new Map();
  for (const m of vereinsSpiele)
    for (const t of [m.homeTeam, m.awayTeam])
      if (istVerein(t) && !teams.has(t.id))
        teams.set(t.id, { id: t.id, n: t.name, ak: m.ak, kat: AGES[m.ak].kat, alter: AGES[m.ak].n,
                          plus: AGES[m.ak].plus, ohne: AGES[m.ak].ohne, klassen: [] });

  const div = {};
  for (const m of vereinsSpiele) {
    const k = m.division;
    div[k.id] ??= { id: k.id, n: k.name, typ: m.matchType?.id || "", ergebnisse: k.showResult !== false,
                    tabelle: null, spiele: [], start: m.match.matchDate };
    if (m.match.matchDate < div[k.id].start) div[k.id].start = m.match.matchDate;
    for (const t of [m.homeTeam, m.awayTeam])
      if (istVerein(t) && !teams.get(t.id).klassen.includes(k.id)) teams.get(t.id).klassen.push(k.id);
  }
  for (const [id, k] of Object.entries(klassen)) {
    if (!div[id]) continue;
    div[id].spiele = k.spiele.map(spiel).sort((a, b) => a.d.localeCompare(b.d) || a.h.n.localeCompare(b.h.n));
    div[id].tabelle = k.tabelle ? tabelle(k.tabelle) : null;
  }
  for (const t of teams.values()) t.klassen.sort((a, b) => div[a].start.localeCompare(div[b].start));

  return {
    stand: new Date().toISOString(),
    saison: { id: saison.id, n: saison.name },
    verein: { id: CLUB, n: "FC Koeppchen Wormeldange" },
    teams: [...teams.values()].sort((a, b) => a.ak - b.ak || a.n.localeCompare(b.n)),
    klassen: div,
  };
}

async function main() {
  const d = await gq(Q_DEFAULTS);
  const saison = d.seasons.find(s => s.id === d.defaultValues.currentSeasonId);
  if (!saison) throw new Error("Saison nicht gefunden: " + d.defaultValues.currentSeasonId);
  // Ohne Zeitraum antwortet die Schnittstelle mit INTERNAL_SERVER_ERROR.
  const zeit = { seasonId: saison.id, startDate: day(saison.startDate), endDate: day(saison.endDate) };

  const vereinsSpiele = [];
  for (const [ak, a] of AGES.entries()) {
    const { matches } = await gq(Q_MATCHES, { c: { ...zeit, clubId: CLUB, ageCategoryId: a.id, matchTypeId: "ALL" } });
    for (const m of matches) if (!vereinsSpiele.some(x => x.match.id === m.match.id)) vereinsSpiele.push({ ...m, ak });
    await pause(1000);
  }
  const klassen = {};
  for (const id of new Set(vereinsSpiele.map(m => m.division.id))) {
    const m0 = vereinsSpiele.find(m => m.division.id === id);
    const typ = m0.matchType?.id || "ALL";
    // Freundschaftsspiele liegen landesweit in einer einzigen „Klasse“ (Amicaux 1, 2) —
    // davon nur die eigenen, nicht hunderte fremde.
    if (typ === "FM") { klassen[id] = { spiele: vereinsSpiele.filter(m => m.division.id === id), tabelle: null }; continue; }
    await pause(1000);
    const { matches } = await gq(Q_MATCHES, { c: { ...zeit, divisionId: id, matchTypeId: typ } });
    let tab = null;
    if (m0.division.showRanking && typ === "CC") {
      await pause(1000);
      tab = (await gq(Q_RANKING, { c: { seasonId: saison.id, divisionId: id, matchTypeId: typ } })).rankings;
    }
    klassen[id] = { spiele: matches, tabelle: tab };
  }

  const neu = aufbereiten({ saison, vereinsSpiele, klassen });
  // Nur schreiben, wenn sich inhaltlich etwas geändert hat — sonst committet die Action alle 2 h
  // eine Datei, in der nur der Zeitstempel neu ist.
  if (existsSync(OUT)) {
    const alt = JSON.parse(readFileSync(OUT, "utf8"));
    if (JSON.stringify({ ...alt, stand: 0 }) === JSON.stringify({ ...neu, stand: 0 })) {
      console.log("unverändert");
      return;
    }
  }
  writeFileSync(OUT, JSON.stringify(neu, null, 1) + "\n");
  console.log("geschrieben:", neu.teams.map(t => t.n).join(", "), "·", Object.keys(neu.klassen).length, "Klassen");
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error(e); process.exit(1); });
