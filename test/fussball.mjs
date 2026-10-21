/* Prüft den Abruf (tools/fussball.mjs, Aufbereitung) und die Logik in fussball.html.
   Aufruf:  node test/fussball.mjs
   Kein Netz, kein Browser. Rückgabewert 1 bei Abweichung.

   Die Daten sind nachgebaut nach dem Stand 18.10.2026 (Phase 1 beendet, Koeppchen I
   Zweiter in Klasse IV, Koeppchen II Fünfter in Klasse VI, Pokal ohne I/II). */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { aufbereiten, spiel, reiter, ics, eigeneSpiele, CLUB, natiSpiel, natiGruppe, natiTabelle, fupaTabelleMitFlfNamen, reserveSlugs } from "../tools/fussball.mjs";
import { liveAus, gleich as liveGleich, spielJetzt, naechstesSpiel, passendesSpiel } from "../tools/fussball-live.mjs";
import worker, { kuerzen, passendesSpiel as wPassend, saisonVon, abrufFaellig, zaehlen, zahlenSeite, stundeLux, ansehen, verschluesseln, vapidKopf, mitteilungenSenden, passtZu, liveEreignisse } from "../tools/cloudflare-worker.js";
import { ereignisse as mEreignisse, umLux } from "../tools/mitteilungen.mjs";

const hier = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(hier, "..", "fussball.html"), "utf8");
const i = src.indexOf("==== Logik"), j = src.indexOf("==== Oberfläche");
if (i < 0 || j < 0) throw new Error("Abschnittsmarken Logik/Oberfläche nicht gefunden");
const M = new Function(src.slice(src.lastIndexOf("//", i), src.lastIndexOf("//", j)) + `
  return { natiLiveSpiel, extraReiter, bglSicht, bglTabelle, natiSicht, spieltagHeute, minutenBisAnpfiff, liveSpiel, liveBasis, kartenArt, ereignisListe, torArt, mitWorker, liveAnzeige, liveZeit, imLiveFenster, REGELN, klasseVon, zonen, ausgang, aufteilen, anzeige, sicht, nachSpieltag, roem, wocheTage, wocheSpiele, wocheBilanz };`)();

let fehler = 0, n = 0;
function ok(bed, text) { n++; if (!bed) { fehler++; console.log("✗ " + text); } }
function gleich(a, b, text) { ok(JSON.stringify(a) === JSON.stringify(b), text + " — ist " + JSON.stringify(a) + ", soll " + JSON.stringify(b)); }

/* --- Rohdaten wie aus der Schnittstelle --- */
const team = (id, name, club) => ({ id, name, clubId1: club, clubId2: null, clubId3: null, clubId4: null });
const K1 = team(45396, "FC Koeppchen Wormeldange I", CLUB), K2 = team(45397, "FC Koeppchen Wormeldange II", CLUB);
const KP = team(45398, "FC Koeppchen Wormeldange", CLUB);
const G = id => team(id, "Gegner " + id, 500000 + id);
const DIV4 = { id: 19189, name: "U13 Minimes Cl4 S2 Phase 1", showResult: true, showRanking: true };
const DIV6 = { id: 19233, name: "U13 Minimes Cl6 S5 Phase 1", showResult: true, showRanking: true };
const CUP = { id: 19615, name: "Coupe U13 Minimes - 1/32 de Finale", showResult: true, showRanking: false };
let mid = 1;
function roh(div, typ, d, h, a, hs, as, extra = {}) {
  return { ak: extra.ak ?? 1, match: { id: mid++, gameday: extra.tag ?? 1, matchDate: d, isPlayed: hs != null, isForfait: false,
                    homeScore: hs, awayScore: as, finalHomeScore: extra.fh ?? (hs ?? null), finalAwayScore: extra.fa ?? (as ?? null),
                    finalScoreComment: null },
           division: div, matchType: { id: typ }, homeTeam: h, awayTeam: a, sportField: { name: "Am Ga" } };
}
const s1 = roh(DIV4, "CC", "2026-09-19T14:30:00+02:00", G(1), K1, 2, 2, { tag: 1 });
const s2 = roh(DIV4, "CC", "2026-10-17T14:30:00+02:00", K1, G(2), 9, 0, { tag: 5 });
const s3 = roh(DIV4, "CC", "2026-09-19T15:00:00+02:00", G(3), G(4), 5, 2, { tag: 1 });
const s4 = roh(DIV6, "CC", "2026-09-26T14:00:00+02:00", G(5), K2, 9, 5, { tag: 2 });
const s5 = roh(CUP, "CUP", "2026-10-24T14:00:00+02:00", KP, G(6), null, null);
// Korrigiertes Endergebnis (z. B. Forfait am grünen Tisch) gilt vor dem gespielten.
// U15-Pokal: eigene Altersklasse (ak 2), darf bei der U13 nicht auftauchen.
const P15 = team(45400, "FC Koeppchen Wormeldange", CLUB);
const CUP15 = { id: 19599, name: "Coupe U15 Scolaires - 1/32 de Finale", showResult: true, showRanking: false };
const s8 = roh(CUP15, "CUP", "2026-10-25T10:00:00+02:00", P15, G(9), null, null, { ak: 2 });
const s6 = roh(DIV6, "CC", "2026-10-03T16:00:00+02:00", K2, G(7), 3, 5, { tag: 3, fh: 0, fa: 3 });

const rank = (pl, t, p) => ({ ranking: { rank: pl, teamId: t.id, totalPlays: 5, totalWins: 0, totalDraws: 0, totalLosses: 0,
                                         totalOwnGoals: 10, totalAgainstGoals: 5, totalPoints: p }, team: { id: t.id, name: t.name } });
const D = aufbereiten({
  saison: { id: "20262027", name: "Saison 2026-2027" },
  vereinsSpiele: [s1, s2, s4, s5, s6, s8],
  klassen: {
    19189: { spiele: [s2, s1, s3], tabelle: [rank(2, K1, 11), rank(1, G(1), 11), rank(3, G(2), 8)] },
    19233: { spiele: [s4, s6], tabelle: [rank(5, K2, 0), rank(1, G(5), 12)] },
    19615: { spiele: [s5], tabelle: null },
    19599: { spiele: [s8], tabelle: null },
  },
});

/* --- Aufbereitung --- */
gleich(D.teams.map(t => t.id), [45398, 45396, 45397, 45400], "Vereinsmannschaften erkannt, nach Altersklasse sortiert");
gleich(D.teams.map(t => t.alter), ["U13 Minimes", "U13 Minimes", "U13 Minimes", "U15 Scolaires"], "Altersklasse je Mannschaft");
gleich(D.teams.find(t => t.id === 45396).klassen, [19189], "Koeppchen I: Klasse IV");
gleich(D.klassen[19189].spiele.map(s => s.d.slice(0, 16)), ["2026-09-19T14:30", "2026-09-19T15:00", "2026-10-17T14:30"],
  "Spiele der Klasse nach Datum, auch die ohne Koeppchen");
gleich(D.klassen[19189].tabelle.map(r => r.pl), [1, 2, 3], "Tabelle nach Platz sortiert");
ok(D.klassen[19615].tabelle === null, "Pokal ohne Tabelle");
const sp6 = D.klassen[19233].spiele.find(s => s.tag === 3);
gleich([sp6.hs, sp6.as], [0, 3], "Endergebnis vor gespieltem Ergebnis");
const sp5 = spiel(s5);
ok(!sp5.gespielt && sp5.hs == null, "offenes Spiel ohne Ergebnis");

/* --- Auf-/Abstiegsregeln (Rundschreiben Phase 1 2026-2027) --- */
gleich(M.klasseVon("U13 Minimes Cl4 S2 Phase 1"), { nr: 4, phase: 1, kat: "U13" }, "Klasse, Phase und Altersklasse aus dem Namen");
gleich(M.zonen("20262027", "U13 Minimes Cl4 S2 Phase 1"), { auf: [1, 2], ab: [5, 6] }, "Klasse IV: 1./2. hoch, 5./6. runter");
gleich(M.zonen("20262027", "U13 Minimes Cl1 S1 Phase 1").auf, [], "Klasse I: niemand steigt auf");
ok(M.zonen("20262027", "U13 Minimes Cl6 S5 Phase 1") === null, "letzte Klasse: keine Regel");
ok(M.zonen("20262027", "U13 Minimes Cl4 S2 Phase 2") === null, "Phase 2: (noch) keine Regel");
ok(M.zonen("20272028", "U13 Minimes Cl4 S2 Phase 1") === null, "andere Saison: keine Regel");
ok(M.zonen("20262027", "Coupe U13 Minimes - 1/32 de Finale") === null, "Pokal: keine Regel");
gleich(M.zonen("20262027", "U15 Scolaires Cl4 S2 Phase 1"), { auf: [1, 2], ab: [5, 6] }, "U15: dieselben Regeln wie U13");
ok(M.zonen("20262027", "U11 Poussins S5 Tour 1") === null, "U11: keine Regel");
gleich([M.roem(3), M.roem(5)], ["III", "V"], "römische Klassen");

/* --- Sicht eines Reiters --- */
const { tabs, verein } = M.aufteilen(D);
gleich(tabs.map(t => t.id), [45396, 45397], "Reiter nur für Mannschaften mit Liga");
gleich(verein.map(t => t.id), [45398, 45400], "Pokalmannschaften ohne I/II zählen zum Verein");
ok(M.anzeige("FC Koeppchen Wormeldange II") === "Koeppchen II", "eigener Name gekürzt");
ok(M.anzeige("US Sandweiler") === "US Sandweiler", "Gegner unverändert");
gleich(D.teams.map(t => reiter(t)), ["U13", "U13 1", "U13 2", "U15"], "Reiter-Beschriftung U13 1 / U13 2 / U15");
gleich(D.teams.map(t => t.reiter || null), [null, "U13 1", "U13 2", null], "Reiter nur für Mannschaften mit Liga");
gleich(D.teams.find(t => t.id === 45396).mit, [45398], "U13-Pokal hängt an U13 1, nicht der U15-Pokal");
gleich([{ n: "FC Koeppchen Wormeldange", kat: "Seniors", ohne: 1 }, { n: "FC Koeppchen Wormeldange I", kat: "Seniors", plus: 1 },
        { n: "FC Koeppchen Wormeldange II", kat: "Seniors", plus: 1 }].map(t => reiter(t)),
  ["Seniors 1", "Seniors 2", "Seniors 3"], "Seniors 1, Réserves als Seniors 2 und 3");

const jetzt = Date.parse("2026-10-18T10:00:00+02:00");
const v1 = M.sicht(D, 45396, jetzt);
gleich(v1.kommend.map(s => s.klasse), ["Coupe U13 Minimes - 1/32 de Finale"], "Koeppchen I sieht den U13-Pokal, nicht den der U15");
gleich(v1.gespielt.map(s => s.tag), [5, 1], "eigene Ergebnisse, neueste zuerst, ohne fremde Spiele");
ok(v1.status && v1.status.was.art === "up" && /Klasse III/.test(v1.status.was.txt), "Platz 2 in Klasse IV → Aufstieg in Klasse III");
ok(v1.status.neuFehlt, "neue Klasse noch nicht eingetragen");
const v2 = M.sicht(D, 45397, jetzt);
ok(v2.kommend.length === 1 && v2.kommend[0].typ === "CUP", "Pokalspiel auch bei Koeppchen II");
ok(v2.status && v2.status.was.art === "" && /Anmeldungen/.test(v2.status.was.txt), "Klasse VI: keine Behauptung über Auf-/Abstieg");
gleich([M.ausgang(v2.gespielt[0], 45397), M.ausgang(v2.gespielt[1], 45397)], ["n", "n"], "Niederlagen aus Sicht von Koeppchen II");
gleich(M.ausgang(spiel(s1), 45396), "u", "Unentschieden");
gleich(M.ausgang(spiel(s2), 45396), "s", "Sieg");

// Ein Spiel ohne Ergebnis rutscht 3 h nach Anpfiff aus „Nächste Spiele“.
const nachPokal = Date.parse("2026-10-24T17:30:00+02:00");
const v3 = M.sicht(D, 45396, nachPokal);
ok(v3.kommend.length === 0 && v3.gespielt[0].typ === "CUP", "Pokalspiel ohne Ergebnis nach 3 h bei den Ergebnissen");
ok(M.sicht(D, 45396, Date.parse("2026-10-24T16:30:00+02:00")).kommend.length === 1, "… aber nicht schon nach 2,5 h");

// Steigt eine neue Klasse dazu, ist sie die aktuelle, die alte wandert zu „früher“.
const DIV3 = { id: 20001, name: "U13 Minimes Cl3 S1 Phase 2", showResult: true, showRanking: true };
const s7 = roh(DIV3, "CC", "2026-11-07T14:00:00+01:00", K1, G(8), null, null, { tag: 1 });
const D2 = aufbereiten({ saison: { id: "20262027", name: "Saison 2026-2027" }, vereinsSpiele: [s1, s2, s7, s4],
  klassen: { 19189: { spiele: [s1, s2], tabelle: [rank(2, K1, 11)] }, 20001: { spiele: [s7], tabelle: [] }, 19233: { spiele: [s4], tabelle: null } } });
const v4 = M.sicht(D2, 45396, jetzt);
ok(v4.aktuell.id === 20001, "neue Klasse ist die aktuelle");
gleich(v4.frueher.map(k => k.id), [19189], "alte Klasse unter „früher“");
ok(v4.status === null, "laufende Phase: kein Abschlusshinweis");

// Réserves-Pokal: Pokalmannschaften mit I/II gehören nur zur gleichnamigen Ligamannschaft.
{
  const R1 = team(45403, "FC Koeppchen Wormeldange I", CLUB), R2 = team(45404, "FC Koeppchen Wormeldange II", CLUB);
  const RP1 = team(45405, "FC Koeppchen Wormeldange I", CLUB);
  const L1 = { id: 18918, name: "Réserves Classe 1", showResult: true, showRanking: true };
  const L3 = { id: 18936, name: "Réserves Classe 3 Série 2", showResult: true, showRanking: true };
  const RC = { id: 19511, name: "Coupe des Seniors Réserves - 1/32 de Finale", showResult: true, showRanking: false };
  const r1 = roh(L1, "CC", "2026-11-01T15:00:00+01:00", R1, G(10), null, null, { ak: 5 });
  const r2 = roh(L3, "CC", "2026-11-01T15:00:00+01:00", R2, G(11), null, null, { ak: 5 });
  const r3 = roh(RC, "CUP", "2026-11-09T20:00:00+01:00", G(12), RP1, null, null, { ak: 5 });
  const DR = aufbereiten({ saison: { id: "20262027", name: "Saison 2026-2027" }, vereinsSpiele: [r1, r2, r3],
    klassen: { 18918: { spiele: [r1], tabelle: [] }, 18936: { spiele: [r2], tabelle: [] }, 19511: { spiele: [r3], tabelle: null } } });
  ok(M.sicht(DR, 45403, jetzt).kommend.some(sp => sp.typ === "CUP"), "Réserves I sieht ihren Pokal");
  ok(!M.sicht(DR, 45404, jetzt).kommend.some(sp => sp.typ === "CUP"), "Réserves II sieht den Pokal der Réserves I nicht");
}

// Phase 3 nach der Winterpause: neue FLF-Nummer, gleicher Name (2025-26 echt so passiert).
{
  const K1neu = team(49999, "FC Koeppchen Wormeldange I", CLUB);
  const DIV3b = { id: 20500, name: "U13 Minimes Cl3 S1 Phase 3", showResult: true, showRanking: true };
  const p3 = roh(DIV3b, "CC", "2027-02-27T14:00:00+01:00", K1neu, G(14), 3, 1, { tag: 1 });
  const p3b = roh(DIV3b, "CC", "2027-03-06T14:00:00+01:00", G(15), K1neu, null, null, { tag: 2 });
  const DP = aufbereiten({ saison: { id: "20262027", name: "Saison 2026-2027" }, vereinsSpiele: [p3, s1, s2, p3b],
    klassen: { 19189: { spiele: [s1, s2], tabelle: [rank(2, K1, 11)] },
               20500: { spiele: [p3, p3b], tabelle: [rank(1, K1neu, 3), rank(2, G(14), 0)] } } });
  const t1 = DP.teams.filter(t => t.reiter === "U13 1");
  ok(t1.length === 1, "neue FLF-Nummer in Phase 3: weiterhin ein Reiter U13 1");
  gleich(t1[0].ids, [45396, 49999], "beide Nummern an derselben Mannschaft, erste bleibt id");
  const vp = M.sicht(DP, 45396, Date.parse("2027-03-01T12:00:00+01:00"));
  ok(vp.aktuell.id === 20500 && vp.frueher[0].id === 19189, "Phase 3 aktuell, Phase 1 früher");
  ok(vp.eigen.has(49999) && vp.kommend.length === 1 && vp.gespielt[0].hs === 3, "Spiele unter der neuen Nummer zählen als eigene");
  ok(eigeneSpiele(DP, t1[0]).length === 4, "Kalender enthält beide Phasen");
}

gleich(M.nachSpieltag(D.klassen[19189].spiele).map(([t, s]) => [t, s.length]), [[1, 2], [5, 1]], "Spieltage gruppiert");

/* --- Kalender --- */
{
  const t1 = D.teams.find(t => t.id === 45396);
  ok(t1.datei === "u13-1.ics", "Dateiname aus dem Reiter");
  const k = ics(D, t1);
  ok(k.startsWith("BEGIN:VCALENDAR\r\n") && k.endsWith("END:VCALENDAR\r\n"), "Kalender mit CRLF");
  gleich((k.match(/BEGIN:VEVENT/g) || []).length, eigeneSpiele(D, t1).length, "ein Termin je eigenem Spiel samt Pokal");
  ok(k.includes("UID:flf-" + s5.match.id + "@fc-koeppchen"), "UID = FLF-Spiel-ID");
  ok(k.includes("DTSTART:20261024T120000Z") && k.includes("DTEND:20261024T134500Z"), "Pokal 14:00 Ortszeit = 12:00 UTC, 1:45 h");
  ok(k.includes("SUMMARY:⚽ Koeppchen U13 1 – Gegner 2 9:0"), "Ergebnis im Titel, Mannschaft wie der Reiter");
  ok(k.includes("SUMMARY:⚽ Koeppchen U13 – Gegner 6 (Pokal)"), "Pokal ohne I/II: Koeppchen U13");
  ok(k.includes("(Pokal)"), "Pokal gekennzeichnet");
  ok(k.split("\r\n").every(z => Buffer.byteLength(z, "utf8") <= 75), "Zeilen höchstens 75 Byte");
  ok(ics(D, t1) === k, "gleicher Stand → gleiche Datei (kein Commit bei jedem Lauf)");
  // Uhrzeit offen (00:00 Ortszeit) → ganztägig.
  const s9 = roh(DIV4, "CC", "2026-11-07T00:00:00+01:00", K1, G(13), null, null, { tag: 6 });
  const D9 = aufbereiten({ saison: { id: "20262027", name: "Saison 2026-2027" }, vereinsSpiele: [s1, s9],
    klassen: { 19189: { spiele: [s1, s9], tabelle: [] } } });
  ok(ics(D9, D9.teams.find(t => t.id === 45396)).includes("DTSTART;VALUE=DATE:20261107\r\nDTEND;VALUE=DATE:20261108"), "Uhrzeit offen → ganztägig");
}

/* --- Live (FuPa) — Felder wie am 18.10.2026 gegen Beggen live abgefragt --- */
{
  const SEN = team(44831, "FC Koeppchen Wormeldange", CLUB), BEG = team(46000, "Avenir Beggen", 500100);
  const PH = { id: 18888, name: "Promotion d'Honneur", showResult: true, showRanking: true };
  const sp = roh(PH, "CC", "2026-10-18T16:00:00+02:00", SEN, BEG, null, null, { ak: 0, tag: 8 });
  const DS = aufbereiten({ saison: { id: "20262027", name: "Saison 2026-2027" }, vereinsSpiele: [sp],
    klassen: { 18888: { spiele: [sp], tabelle: [] } } });
  ok(DS.teams[0].reiter === "Seniors 1", "Seniors-Reiter für den Live-Test");
  const fupa = {
    slug: "fc-koeppchen-m1-fc-avenir-beggen-m1-261018", homeGoal: 1, awayGoal: 0, section: "LIVE",
    homeTeam: { slug: "fc-koeppchen-m1-2026-27" }, tickerAuthor: { name: "Paul Krier" },
    live: { minute: 71, period: "secondHalf", running: true, lastTimestamp: "2026-10-18T17:30:03+02:00" },
    highlights: [{ minute: 12, additionalMinute: 0, type: "goal", subtype: "goal_headed",
      team: { teamSlug: "fc-koeppchen-m1-2026-27" }, primaryRole: { firstName: "Pedro", lastName: "Neves Costa" } },
      { minute: 30, type: "card", team: { teamSlug: "x" } }],
  };
  const flf = DS.klassen[18888].spiele[0];
  const Lv = liveAus(fupa, flf);
  gleich([Lv.hs, Lv.as, Lv.minute, Lv.ticker], [1, 0, 71, "Paul Krier"], "FuPa → Stand, Minute, Tickerer");
  gleich(Lv.tore, [{ min: 12, plus: 0, heim: true, name: "Pedro Neves Costa", art: "goal_headed" }], "nur Tore, Heim erkannt");
  ok(liveGleich(Lv, { ...Lv, minute: 75, minuteAt: "2026-10-18T17:35:00+02:00" }), "nur Minute anders → kein Commit");
  ok(!liveGleich(Lv, { ...Lv, hs: 2 }), "Tor → Commit");

  const t0 = Date.parse("2026-10-18T17:30:03+02:00");
  ok(spielJetzt(DS, Date.parse("2026-10-18T15:50:00+02:00")) && !spielJetzt(DS, Date.parse("2026-10-18T15:40:00+02:00")), "Zeitfenster ab 15 min vor Anstoß");
  ok(!spielJetzt(DS, Date.parse("2026-10-18T19:05:00+02:00")), "… bis 180 min danach");
  // --wache: Starts um 11:23/14:23/17:23 — 16:00-Anstoß gehört dem Lauf um 14:23, nicht 11:23.
  ok(!naechstesSpiel(DS, Date.parse("2026-10-18T11:23:00+02:00")), "11:23-Lauf wartet nicht auf 16:00");
  ok(naechstesSpiel(DS, Date.parse("2026-10-18T14:23:00+02:00")), "14:23-Lauf übernimmt 16:00");
  ok(naechstesSpiel(DS, Date.parse("2026-10-18T16:40:00+02:00")), "verspäteter Start mitten im Spiel steigt noch ein");
  ok(naechstesSpiel(DS, Date.parse("2026-10-18T18:45:00+02:00")), "180 min: Verlängerung + Elfmeter noch drin");
  ok(!naechstesSpiel(DS, Date.parse("2026-10-18T19:01:00+02:00")), "nach dem Fenster nichts mehr");
  const fs = [{ slug: "a", kickoff: "2026-10-18T16:00:00+02:00" }, { slug: "b", kickoff: "2026-10-25T16:00:00+02:00" }];
  ok(passendesSpiel(fs, "2026-10-18T16:00:00+02:00").slug === "a", "FuPa-Spiel bei gleicher Anstoßzeit");
  ok(passendesSpiel(fs, "2026-10-18T16:30:00+02:00").slug === "a", "Verlegung um 30 min wird noch gefunden");
  ok(passendesSpiel(fs, "2026-10-19T16:00:00+02:00") === null, "anderer Tag: nicht dasselbe Spiel");
  for (const z of ["2026-10-18T16:00:00+02:00", "2026-10-18T16:30:00+02:00", "2026-10-19T16:00:00+02:00"])
    ok(wPassend(fs, z)?.slug === passendesSpiel(fs, z)?.slug, "Worker sucht wie der GitHub-Lauf: " + z);
  gleich([saisonVon("2026-10-18T16:00:00+02:00"), saisonVon("2027-03-07T16:00:00+01:00"), saisonVon("2027-07-01T12:00:00+02:00")],
    ["2026-27", "2026-27", "2027-28"], "Saison aus dem Anstoß (neue ab Juli)");
  const vS = M.sicht(DS, 44831, t0);
  const a = M.liveAnzeige(Lv, vS, t0 + 7 * 60e3);
  ok(a && a.laeuft && a.zeit === "78'", "LIVE-Kasten, Minute zählt weiter (71 + 7)");
  ok(M.liveZeit(Lv, t0 + 40 * 60e3) === "90+", "nach 90 nur noch 90+");
  ok(M.liveZeit({ ...Lv, minute: 44, period: "started" }, t0 + 5 * 60e3) === "45+", "1. Halbzeit endet bei 45+");
  ok(M.liveZeit({ ...Lv, period: "halftime", running: false }, t0) === "Halbzeit", "Halbzeit");
  ok(M.liveZeit({ ...Lv, minute: 98, period: "firstHalfOvertime" }, t0) === "Verlängerung 98'", "Verlängerung");
  ok(M.liveZeit({ ...Lv, minute: 118, period: "secondHalfOvertime" }, t0 + 9 * 60e3) === "Verlängerung 120+", "Verlängerung gedeckelt bei 120");
  ok(M.liveZeit({ ...Lv, period: "penalty", running: false }, t0) === "Elfmeterschießen", "Elfmeterschießen");
  ok(M.liveAnzeige({ ...Lv, section: "POST" }, vS, t0).zeit === "Abpfiff", "nach Abpfiff: Endstand laut FuPa");
  ok(M.liveAnzeige({ ...Lv, section: "PRE" }, vS, t0) === null, "vor Anpfiff kein Kasten");
  ok(M.liveAnzeige(Lv, M.sicht(D, 45396, t0), t0) === null, "kein Kasten bei U13 1");
  ok(M.liveAnzeige({ ...Lv, hs: null, as: null, ticker: null, tore: [], karten: [] }, vS, t0) === null, "FuPa „LIVE“ ohne Tickerer: kein Kasten");
  ok(M.liveAnzeige(Lv, vS, Date.parse("2026-10-18T20:30:00+02:00")) === null, "spätestens 4 h nach Anstoß weg");
  const spFlf = roh(PH, "CC", "2026-10-18T16:00:00+02:00", SEN, BEG, 2, 1, { ak: 0, tag: 8 });
  const DF = aufbereiten({ saison: { id: "20262027", name: "Saison 2026-2027" }, vereinsSpiele: [spFlf],
    klassen: { 18888: { spiele: [spFlf], tabelle: [] } } });
  ok(M.liveAnzeige({ ...Lv, flfId: spFlf.match.id }, M.sicht(DF, 44831, t0), t0) === null, "FLF hat Ergebnis → Kasten weg");
  // Worker und GitHub-Lauf müssen dasselbe aus FuPa machen (zwei Kopien derselben Umrechnung).
  const Wk = kuerzen({ ...fupa, homeGoal: 2 });
  for (const k of ["hs", "as", "section", "period", "running", "minute", "minuteAt", "tore", "karten", "ticker"])
    ok(JSON.stringify(Wk[k]) === JSON.stringify(liveAus({ ...fupa, homeGoal: 2 }, flf)[k]), "Worker = GitHub-Lauf: " + k);
  ok(M.mitWorker(Lv, Wk).hs === 2 && M.mitWorker(Lv, Wk).h === Lv.h, "Worker-Stand gilt, Namen bleiben aus live.json");
  ok(M.mitWorker(Lv, { ...Wk, slug: "anderes-spiel" }).hs === 1, "Worker zu anderem Spiel wird ignoriert");
  ok(M.mitWorker(Lv, null) === Lv, "ohne Worker gilt GitHub");
  // Ohne GitHub-Lauf: Gerüst aus dem FLF-Spielplan, Worker per Anstoßzeit gefragt.
  const spS = M.liveSpiel(vS, t0);
  ok(spS && spS.id === flf.id, "laufendes Spiel der Seniors 1 aus dem Spielplan");
  ok(M.liveSpiel(M.sicht(D, 45396, t0), t0) === null, "kein Live für U13");
  // Seniors 2/3: nur mit FuPa-Slug aus dem Abruf (der Worker sucht per Anstoß nur Seniors 1).
  const vR = { ...vS, team: { ...vS.team, reiter: "Seniors 2" } };
  ok(M.liveSpiel(vR, t0) === null, "Seniors 2 ohne Slug: kein Live");
  const spR = M.liveSpiel(vR, t0, { [flf.id]: "fc-koeppchen-mr1-x-261018" });
  ok(spR && spR.slug === "fc-koeppchen-mr1-x-261018" && M.liveBasis(null, spR).slug === spR.slug, "Seniors 2 mit Slug: Worker direkt");
  const spT = M.liveSpiel(vR, t0, { [flf.id]: vR.ids.has(flf.h.id) ? "beggen-mr1-fc-koeppchen-mr1-261018" : "fc-koeppchen-mr1-x-261018" });
  ok(spT.h.id === flf.a.id && spT.a.id === flf.h.id, "Heim/Gast bei FuPa andersherum: Seiten getauscht");
  ok(M.liveSpiel({ ...vS, team: { ...vS.team, reiter: "Seniors 4" } }, t0, { [flf.id]: "x" }) === null, "andere Reiter nicht");
  {
    const sp = (id, d) => ({ id, d, h: { id: 7, n: "FC Koeppchen Wormeldange I" }, a: { id: 8, n: "B" } });
    const DR = { teams: [{ id: 7, reiter: "Seniors 2", klassen: [5] }, { id: 9, reiter: "U13 1", klassen: [5] }],
      klassen: { 5: { n: "R1", typ: "CC", spiele: [sp(1, "2026-10-19T20:00:00+02:00"), sp(2, "2026-12-19T20:00:00+01:00"),
        sp(3, "2026-10-01T20:00:00+02:00"), sp(4, "2026-10-26T19:30:00+01:00")] } } };
    const fsR = [{ kickoff: "2026-10-19T20:00:00+02:00", slug: "fc-koeppchen-mr1-titus-261019" },
                 { kickoff: "2026-10-26T19:30:00+01:00", slug: "fremd-mr1-261026" }];
    const r = reserveSlugs(DR, { "Seniors 2": fsR }, passendesSpiel, Date.parse("2026-10-19T12:00:00+02:00"));
    gleich(r, { 1: "fc-koeppchen-mr1-titus-261019" }, "Reserve-Slugs: nur nahe Spiele, nur Koeppchen-Slugs");
  }
  const b0 = M.liveBasis(null, spS);
  ok(b0.slug === null && b0.flfId === flf.id && b0.h === flf.h.n, "Gerüst ohne live.json");
  ok(M.liveBasis({ ...Lv, flfId: 1 }, spS).slug === null, "live.json vom letzten Spiel gilt nicht");
  const mw = M.mitWorker(b0, { ...Wk, fuer: flf.id });
  ok(mw.hs === 2 && mw.slug === Wk.slug && /fupa\.net\/match\//.test(mw.url), "Worker füllt das Gerüst samt Slug");
  ok(M.mitWorker(b0, { ...Wk, fuer: 999 }).hs === undefined, "Worker-Antwort für ein anderes Spiel zählt nicht");
  ok(M.liveAnzeige(mw, vS, t0) && M.liveAnzeige(b0, vS, t0) === null, "Kasten erst mit Worker-Daten");
  // Unsere Woche
  {
    const di = Date.parse("2026-10-20T12:00:00+02:00");
    gleich(M.wocheTage(di), ["2026-10-19","2026-10-20","2026-10-21","2026-10-22","2026-10-23","2026-10-24","2026-10-25"], "Woche Mo–So um einen Dienstag");
    gleich(M.wocheTage(Date.parse("2026-10-25T21:59:00+02:00"))[0], "2026-10-19", "Sonntag vor 22 Uhr: noch diese Woche");
    gleich(M.wocheTage(Date.parse("2026-10-25T22:00:00+01:00"))[0], "2026-10-26", "Sonntag ab 22 Uhr: nächste Woche (auch über die Zeitumstellung)");
    const w = M.wocheSpiele(D, M.wocheTage(di), di);
    ok(w.filter(sp => sp.d.startsWith("2026-10-24")).length === 1, "Pokalspiel nur einmal, obwohl bei U13 1 und U13 2");
    ok(w.find(sp => sp.d.startsWith("2026-10-24"))?.reiter === "U13", "Pokal ohne I/II heißt „U13“");
    ok(!w.some(sp => sp.d.startsWith("2026-10-17")), "Spiel der Vorwoche nicht dabei");
    const bil = M.wocheBilanz([{ gespielt: true, heim: true, hs: 2, as: 1 }, { gespielt: true, heim: false, hs: 2, as: 1 },
      { gespielt: true, heim: true, hs: 1, as: 1 }, { gespielt: true, heim: true, hs: 3, as: 0, erg: false }]);
    gleich(bil, { s: 1, u: 1, n: 1 }, "Bilanz: Heim/Gast richtig, ohne veröffentlichte Ergebnisse (U9/U11) nicht gezählt");
  }
  // Countdown 15 min vor Anpfiff
  {
    const sp = { d: "2026-10-19T20:00:00+02:00" }, um = hm => Date.parse("2026-10-19T" + hm + ":00+02:00");
    gleich([um("19:44"), um("19:45"), um("19:48:30".slice(0, 5)) + 30e3, um("19:59") + 30e3, um("20:00")].map(t => M.minutenBisAnpfiff(sp, t)),
      [null, 15, 12, 1, null], "Countdown: ab 15 min, aufgerundet, beim Anpfiff weg");
    ok(M.minutenBisAnpfiff({ d: "2026-12-05T00:00:01+01:00" }, Date.parse("2026-12-04T23:50:00+01:00")) === null, "Uhrzeit offen: kein Countdown");
  }
  // „Heute Spieltag“
  const morgens = Date.parse("2026-10-18T09:00:00+02:00");
  const hm = M.spieltagHeute(M.sicht(DS, 44831, morgens), morgens);
  ok(hm && hm.sp.id === flf.id && !hm.begonnen, "morgens: Heute Spieltag, noch nicht begonnen");
  const hl = M.spieltagHeute(M.sicht(DS, 44831, t0), t0);
  ok(hl && hl.begonnen, "nach Anstoß: Spiel läuft");
  ok(M.spieltagHeute(M.sicht(DS, 44831, Date.parse("2026-10-17T20:00:00+02:00")), Date.parse("2026-10-17T20:00:00+02:00")) === null, "am Vortag kein Spieltag-Kasten");
  ok(M.spieltagHeute(M.sicht(DS, 44831, Date.parse("2026-10-18T19:30:00+02:00")), Date.parse("2026-10-18T19:30:00+02:00")) === null, "3 h nach Anstoß weg");
  ok(M.spieltagHeute(M.sicht(DF, 44831, t0), t0) === null, "mit FLF-Ergebnis weg");
  gleich(["penalty_foul", "goal_headed", "goal_shoot", "goal_own_goal", "goal_free_kick", "penalty_shootout",
          "goal_scrounger", "goal_distance_shoot", ""].map(M.torArt),
    ["Elfmeter", "Kopfball", "", "Eigentor", "Freistoß", "Elfmeterschießen", "Abstauber", "Fernschuss", ""],
    "Torart mit den echten FuPa-Namen aus 11 Spielen");
  gleich(["card_red", "card_yellow_red", "card_yellow"].map(a => M.kartenArt(a).text), ["Rot", "Gelb-Rot", "Gelb"], "Kartenarten");
  gleich(Lv.karten.map(k => [k.min, k.heim]), [[30, false]], "Karte aus FuPa übernommen, Gast erkannt");
  gleich(M.ereignisListe(Lv).map(e => e.typ + e.min), ["tor12", "karte30"], "Tore und Karten nach Minute");
  ok(M.ereignisListe({ tore: Lv.tore }).length === 1, "alte live.json ohne Karten geht");
  ok(M.imLiveFenster(vS, t0) && !M.imLiveFenster(vS, Date.parse("2026-10-19T12:00:00+02:00")), "Abfrage jede Minute nur im Fenster");
}

// BGL Ligue und Nationalteam (Reiter ohne Kalender/Ticker).
{
  const sp = (tag, d, gespielt) => ({ id: tag * 10 + d.length, tag, d, h: { id: 1, n: "A" }, a: { id: 2, n: "B" }, hs: gespielt ? 1 : null, as: gespielt ? 0 : null, gespielt });
  const bgl = { n: "BGL Ligue", tabelle: [], spiele: [
    sp(8, "2026-10-04T16:00:00+02:00", true), sp(9, "2026-10-17T18:00:00+02:00", true), sp(9, "2026-10-18T16:00:00+02:00", false),
    sp(10, "2026-10-25T16:00:00+01:00", false), sp(11, "2026-11-01T16:00:00+01:00", false), sp(12, "2026-11-08T16:00:00+01:00", false),
    sp(5, "2026-12-02T19:00:00+01:00", false) /* verlegt */] };
  const v = M.bglSicht(bgl, Date.parse("2026-10-19T10:00:00+02:00"));
  ok(v.letzter[0] === 9 && v.letzter[1].length === 2, "BGL: letzter Spieltag 9, auch mit offenem Spiel");
  gleich(v.naechste.map(t => t[0]), [10, 11], "BGL: zwei nächste Spieltage");
  const v0 = M.bglSicht({ spiele: bgl.spiele.map(x => ({ ...x, gespielt: false })) }, Date.parse("2026-07-01T10:00:00+02:00"));
  ok(v0.letzter === null && v0.naechste[0][0] === 5, "BGL vor Saisonbeginn: kein letzter Spieltag, ab dem ersten");
  ok(M.bglSicht({ spiele: bgl.spiele.slice(0, 2) }, Date.parse("2026-10-19T10:00:00+02:00")).naechste.length === 0, "BGL Saisonende: keine nächsten");
  const g = (h, a, hs, as) => ({ d: "2026-08-01", h: { id: h, n: h }, a: { id: a, n: a }, hs, as, gespielt: true });
  const erg = [g("A", "B", 2, 0), g("C", "A", 1, 1), g("B", "C", 3, 1)];
  const t1 = M.bglTabelle({ spiele: erg, tabelle: [{ pl: 1, id: "A", n: "A", sp: 1, pkt: 3 }] });
  ok(t1.selbst && t1.flfSp === 1, "BGL: FLF-Tabelle zurück → selbst gerechnet");
  gleich(t1.tabelle.map(r => [r.pl, r.id, r.sp, r.pkt, r.t, r.g]), [[1, "A", 2, 4, 3, 1], [2, "B", 2, 3, 3, 3], [3, "C", 2, 1, 2, 4]], "BGL: eigene Tabelle Punkte/Tore");
  const t2 = M.bglTabelle({ spiele: [{ ...erg[0], d: "2026-08-01" }, { ...erg[1], d: "2026-08-08" }, { ...erg[2], d: "2026-08-15" }],
    tabelle: [{ id: "A", n: "A", sp: 1, pkt: 3 }, { id: "B", n: "B", sp: 1, pkt: -12 }, { id: "C", n: "C", sp: 0, pkt: 0 }] });
  gleich(t2.tabelle.map(r => [r.id, r.pkt, r.abzug]), [["A", 4, 0], ["C", 1, 0], ["B", -9, -12]], "BGL: Punktabzug aus der FLF-Tabelle bleibt");
  const flf = [{ pl: 1, id: "X", n: "X", sp: 2, pkt: 6 }];
  ok(M.bglTabelle({ spiele: erg, tabelle: flf }).tabelle === flf, "BGL: aktuelle FLF-Tabelle gilt");
  const st = (rank, slug, full, m, w, d, l, o, a, p) => ({ rank, matches: m, wins: w, draws: d, defeats: l, ownGoals: o, againstGoals: a, points: p, team: { slug, name: { full } } });
  const ft = fupaTabelleMitFlfNamen([st(1, "a", "FC A-Dorf", 2, 1, 1, 0, 3, 1, 4), st(2, "b", "B-Dorf", 2, 1, 0, 1, 3, 3, -9), st(3, "x", "Unbekannt", 5, 0, 0, 5, 0, 9, 0)], erg, {}, 1);
  gleich(ft.tabelle.map(r => [r.pl, r.id, r.n, r.pkt]), [[1, "A", "A", 4], [2, "B", "B", -9], [3, "x", "Unbekannt", 0]], "BGL: FuPa-Tabelle mit FLF-Namen, Abzug bleibt, Unpassendes behält FuPa-Namen");
  gleich(ft.namen, { a: "A", b: "B" }, "BGL: Zuordnung wird gemerkt");
  ok(fupaTabelleMitFlfNamen([st(1, "a", "FC A-Dorf", 2, 1, 1, 0, 3, 1, 4)], erg).tabelle[0].n === "FC A-Dorf", "BGL: vor dem 3. Spiel keine neue Zuordnung");
  // Saisonanfang: zwei Vereine mit denselben Zahlen → nur das Gedächtnis hilft.
  const gleichAuf = [{ d: "2027-08-01", h: { id: 7, n: "A" }, a: { id: 8, n: "C" }, hs: 1, as: 0, gespielt: true },
                     { d: "2027-08-01", h: { id: 9, n: "B" }, a: { id: 10, n: "D" }, hs: 1, as: 0, gespielt: true }];
  const neuSaison = fupaTabelleMitFlfNamen([st(1, "a", "FC A-Dorf", 1, 1, 0, 0, 1, 0, 3), st(2, "b", "B-Dorf", 1, 1, 0, 0, 1, 0, 3), st(3, "n", "Neuling", 1, 1, 0, 0, 1, 0, 3)], gleichAuf, ft.namen, 1);
  gleich(neuSaison.tabelle.map(r => [r.id, r.n]), [[7, "A"], [9, "B"], ["n", "Neuling"]], "BGL: gemerkte Namen gelten auch bei gleichen Zahlen, Neuling bleibt FuPa");
  // Gemerkt geht vor: passt eine Zeile zufällig auf einen anderen Verein, bleibt der gemerkte Name.
  const verwechselt = fupaTabelleMitFlfNamen([st(1, "a", "FC A-Dorf", 2, 1, 0, 1, 3, 3, 3)], erg, { a: "A" }, 1);
  ok(verwechselt.tabelle[0].n === "A" && verwechselt.namen.a === "A", "BGL: gemerkte Zuordnung wird nicht überschrieben");
  // Kein Name zweimal: der Neue passt auf B, aber B ist schon vergeben → FuPa-Name.
  const doppelt = fupaTabelleMitFlfNamen([st(1, "q", "Quer", 2, 1, 0, 1, 3, 3, 3)], erg, { b: "B" }, 1);
  ok(doppelt.tabelle[0].n === "Quer" && !doppelt.namen.q, "BGL: ein schon vergebener FLF-Name wird nicht doppelt vergeben");
  // FuPa-Seite nicht eindeutig (zwei Zeilen mit gleichen Zahlen) → keine Zuordnung.
  const zwei = fupaTabelleMitFlfNamen([st(1, "a", "X1", 2, 1, 1, 0, 3, 1, 4), st(2, "z", "X2", 2, 1, 1, 0, 3, 1, 4)], erg, {}, 1);
  ok(zwei.tabelle.every(r => r.n.startsWith("X")), "BGL: gleiche Zahlen auf FuPa-Seite → keine Zuordnung");
  gleich(M.extraReiter({ bgl, nati: null }).map(t => t.id), ["bgl"], "Reiter nur, wenn Daten da sind");

  const r = (typ, slug, title, cat) => ({ type: typ, slug, title, competitionSeason: { slug: "uefa-nations-league", name: "UEFA Nations League", category: { id: cat } } });
  const f = (id, kickoff, section, round) => ({ id, kickoff, section, homeTeam: { name: { full: "Luxemburg" } }, awayTeam: { name: { full: "Estland" } },
    homeGoal: section === "POST" ? 0 : null, awayGoal: section === "POST" ? 1 : null, round });
  const test = { type: "league", slug: "99", competitionSeason: { slug: "testspiele", name: "Testspiele", category: { id: 6 } } };
  const roh = [f(1, "2026-03-26T18:00:00+01:00", "POST", r("cupko", "quali-playoffs", "PlayOff", 4)),
               f(2, "2026-06-03T20:45:00+02:00", "POST", test),
               f(3, "2026-10-06T20:45:00+02:00", "POST", r("cupgroup", "c4", "C4", 4)),
               f(4, "2026-11-13T20:45:00+01:00", "PRE", r("cupgroup", "c4", "C4", 4)),
               f(5, "2027-03-25T20:45:00+01:00", "PRE", { type: "cupgroup", slug: "f", title: "F", competitionSeason: { slug: "wm-quali", name: "WM-Qualifikation", category: { id: 4 } } })];
  gleich(natiGruppe(roh, Date.parse("2026-10-19T12:00:00+02:00")), { comp: "uefa-nations-league", group: "c4", n: "UEFA Nations League · Gruppe C4" }, "Nati: Gruppe des nächsten Pflichtspiels");
  ok(natiGruppe(roh, Date.parse("2026-12-01T12:00:00+01:00")).comp === "wm-quali", "Nati: wechselt von selbst zur Qualifikation");
  ok(natiGruppe(roh.slice(0, 4), Date.parse("2026-12-01T12:00:00+01:00")).group === "c4", "Nati: ohne neues Pflichtspiel bleibt die letzte Gruppe");
  ok(natiGruppe(roh.slice(0, 2), Date.parse("2026-12-01T12:00:00+01:00")) === null, "Nati: Testspiele und K.-o. haben keine Tabelle");
  const ns = natiSpiel(roh[2]);
  ok(ns.h.n === "Luxemburg" && ns.hs === 0 && ns.gespielt && ns.wett === "UEFA Nations League" && ns.runde === "C4", "Nati: Spiel umgerechnet");
  const tab = natiTabelle([{ rank: 4, matches: 4, wins: 1, draws: 0, defeats: 3, ownGoals: 2, againstGoals: 7, points: 3, team: { name: { full: "Luxemburg" } } }]);
  gleich(tab, [{ pl: 4, id: "Luxemburg", n: "Luxemburg", sp: 4, s: 1, u: 0, nl: 3, t: 2, g: 7, pkt: 3 }], "Nati: Tabelle umgerechnet");
  const nv = M.natiSicht({ spiele: roh.map(natiSpiel), gruppe: null }, Date.parse("2026-10-19T12:00:00+02:00"));
  gleich([nv.kommend.map(s => s.id), nv.gespielt.map(s => s.id)], [[4, 5], [3, 2, 1]], "Nati: kommend und Ergebnisse");
  const nvs = M.natiSicht({ spiele: roh.map(m => ({ ...natiSpiel(m), slug: "lux-" + m.id })), gruppe: null }, 0);
  const t4 = Date.parse("2026-11-13T20:45:00+01:00");
  ok(M.natiLiveSpiel(nvs, t4 - 10 * 60e3)?.id === 4 && M.natiLiveSpiel(nvs, t4 + 170 * 60e3)?.id === 4, "Nati live: 15 min vor bis 180 min nach Anstoß");
  ok(M.natiLiveSpiel(nvs, t4 - 20 * 60e3) === null && M.natiLiveSpiel(nvs, t4 + 190 * 60e3) === null, "Nati live: außerhalb des Fensters nichts");
  const nh = M.spieltagHeute(M.natiSicht({ spiele: roh.map(natiSpiel), gruppe: null }, t4 - 8 * 3600e3), t4 - 8 * 3600e3);
  ok(nh && nh.sp.id === 4 && !nh.begonnen, "Nati: Heute-Spieltag-Kasten am Länderspieltag");
}

// Plan B: Worker stößt den FLF-Abruf an (Zeiten in Luxemburger Zeit, Sommer und Winter).
{
  const f = iso => abrufFaellig(Date.parse(iso));
  ok(f("2026-10-24T08:00:00+02:00") && f("2026-10-24T14:45:00+02:00") && f("2026-10-24T22:00:00+02:00"), "Samstag 8–22 Uhr jede Viertelstunde (Sommerzeit)");
  ok(!f("2026-10-24T07:45:00+02:00") && !f("2026-10-24T22:15:00+02:00") && !f("2026-10-24T14:50:00+02:00"), "nicht vor 8, nicht nach 22, nur Viertelstunden");
  ok(f("2026-10-25T08:00:00+01:00") && f("2026-10-25T21:45:00+01:00") && !f("2026-10-25T07:45:00+01:00"), "Sonntag nach der Zeitumstellung: Fenster bleibt 8–22 Uhr");
  ok(f("2026-10-26T22:15:00+01:00") && !f("2026-10-26T21:15:00+01:00") && !f("2026-10-26T22:00:00+01:00"), "Mo–Fr 22:15 Ortszeit, auch im Winter");
  ok(f("2026-10-23T22:15:00+02:00") && !f("2026-10-23T21:15:00+02:00"), "Freitag wie Wochentag, Sommerzeit");
  let tage = 0; for (let t = Date.parse("2026-10-24T00:00:00+02:00"); t < Date.parse("2026-10-31T00:00:00+01:00"); t += 15 * 60e3) tage += abrufFaellig(t);
  ok(f("2026-10-21T23:30:00+02:00") && f("2026-10-31T23:30:00+01:00") && !f("2026-10-21T23:15:00+02:00"), "jeden Abend 23:30 (Sommer und Winter)");
  let minuten = 0; for (let t = Date.parse("2026-10-24T00:00:00+02:00"); t < Date.parse("2026-10-31T00:00:00+01:00"); t += 60e3) minuten += abrufFaellig(t);
  ok(minuten === tage, "Takt jede Minute: FLF-Abruf trotzdem nur zu denselben Zeiten");
  ok(tage === 2 * 57 + 5 + 7 + 7, "eine Woche: 57 Anstöße je Wochenendtag + 5 Abende + 7× 23:30 + 7× 7:00, waren " + tage);
  ok(f("2026-10-20T07:00:00+02:00") && !f("2026-10-20T07:15:00+02:00") && f("2026-10-27T07:00:00+01:00"), "7:00 Luxemburger Zeit, auch nach der Zeitumstellung");
  // scheduled(): ohne Token nichts, mit Token genau ein POST an GitHub.
  const aufrufe = [], echt = globalThis.fetch;
  globalThis.fetch = async (url, o) => { aufrufe.push([url, o]); return new Response(null, { status: 204 }); };
  const warte = []; const ctx = { waitUntil: p => warte.push(p) };
  await worker.scheduled({ scheduledTime: Date.parse("2026-10-24T10:00:03+02:00") }, {}, ctx);
  ok(aufrufe.length === 0, "ohne GITHUB_TOKEN kein Anstoß");
  await worker.scheduled({ scheduledTime: Date.parse("2026-10-24T10:00:03+02:00") }, { GITHUB_TOKEN: "x" }, ctx);
  await worker.scheduled({ scheduledTime: Date.parse("2026-10-24T03:00:00+02:00") }, { GITHUB_TOKEN: "x" }, ctx);
  await Promise.all(warte);
  // Worker liefert Koeppchen- und Länderspiele, sonst nichts.
  const vorher = aufrufe.length;
  const fremd = await worker.fetch(new Request("https://w/?slug=fc-irgendwer-m1-fc-anderer-m1-261018"));
  ok(fremd.status === 400 && aufrufe.length === vorher, "Worker: fremdes Spiel abgelehnt, FuPa nicht gefragt");
  globalThis.fetch = async () => new Response(JSON.stringify({ slug: "luxemburg-m1-estland-m1-261113", homeGoal: 1, awayGoal: 0, section: "LIVE" }), { status: 200 });
  const lux = await worker.fetch(new Request("https://w/?slug=luxemburg-m1-estland-m1-261113"));
  ok(lux.status === 200 && (await lux.json()).hs === 1, "Worker: Länderspiel Luxemburg erlaubt");
  globalThis.fetch = echt;
  ok(aufrufe.length === 1 && aufrufe[0][0].endsWith("/actions/workflows/fussball.yml/dispatches")
     && aufrufe[0][1].method === "POST" && JSON.parse(aufrufe[0][1].body).ref === "main"
     && aufrufe[0][1].headers.authorization === "Bearer x", "mit Token ein POST an GitHub, nachts keiner");
}


// Anonymer Zähler im Worker, mit nachgebautem D1 (nur die drei Anweisungen, die er braucht).
{
  const tage = new Map(), rei = new Map(), arten = new Map(), std = new Map(), ges = new Map(), erste = new Map(), ich = new Map();
  const st = sql => ({ sql, a: [], bind(...a) { this.a = a; return this; },
    async run() {
      if (sql.startsWith("INSERT INTO tage")) { const [t, h] = this.a, x = tage.get(t) || { tag: t, handys: 0, oeffnungen: 0 }; x.handys += h; x.oeffnungen++; tage.set(t, x); }
      if (sql.startsWith("INSERT INTO reiter")) { const k = this.a.join("|"); rei.set(k, (rei.get(k) || 0) + 1); }
      if (sql.startsWith("INSERT INTO arten")) { const [t, a, h] = this.a, k = t + "|" + a, x = arten.get(k) || { tag: t, art: a, handys: 0, oeffnungen: 0 }; x.handys += h; x.oeffnungen++; arten.set(k, x); }
      if (sql.startsWith("INSERT INTO angesehen")) { const k = this.a.join("|"); ges.set(k, (ges.get(k) || 0) + 1); }
      if (sql.startsWith("INSERT INTO erste")) { const k = this.a.join("|"); erste.set(k, (erste.get(k) || 0) + 1); }
      if (sql.startsWith("INSERT INTO ich")) { const k = this.a.join("|"); ich.set(k, (ich.get(k) || 0) + 1); }
      if (sql.startsWith("INSERT INTO stunden")) { const k = this.a.join("|"); std.set(k, (std.get(k) || 0) + 1); }
    },
    async all() {
      if (sql.startsWith("SELECT tag, handys")) return { results: [...tage.values()].sort((a, b) => b.tag.localeCompare(a.tag)) };
      if (sql.startsWith("SELECT tag, art, n FROM erste")) return { results: [...erste].map(([k, n]) => { const [tag, art] = k.split("|"); return { tag, art, n }; }) };
      if (sql.startsWith("SELECT tag, was")) return { results: [...ich].map(([k, n]) => { const [tag, was] = k.split("|"); return { tag, was, n }; }) };
      if (sql.startsWith("SELECT tag, art")) return { results: [...arten.values()] };
      const quelle = sql.includes("FROM angesehen") ? ges : sql.includes("FROM stunden") ? std : rei;
      return { results: [...quelle].map(([k, n]) => { const [tag, x] = k.split("|"); return { tag, k: sql.includes("FROM stunden") ? +x : x, n }; }) };
    } });
  const db = { prepare: st, batch: async l => { for (const x of l) await x.run(); } };
  await zaehlen(db, "2026-10-24", true, "U13 1", "app", 16);
  await zaehlen(db, "2026-10-24", false, "U13 1", "app", 16);
  await zaehlen(db, "2026-10-24", true, "Seniors 1", "web", 9);
  await zaehlen(db, "2026-10-24", false, "<script>", "boese", 24);
  gleich(tage.get("2026-10-24"), { tag: "2026-10-24", handys: 2, oeffnungen: 4 }, "Zähler: 2 Handys, 4 Öffnungen");
  ok(rei.get("2026-10-24|U13 1") === 2 && rei.size === 2, "Zähler: Reiter gezählt, Unsinn verworfen");
  ok(arten.get("2026-10-24|app").handys === 1 && arten.get("2026-10-24|app").oeffnungen === 2 && arten.get("2026-10-24|web").handys === 1 && arten.size === 2, "Zähler: App/Browser getrennt, Unsinn verworfen");
  ok(std.get("2026-10-24|16") === 2 && std.get("2026-10-24|9") === 1 && std.size === 2, "Zähler: Stunden gezählt, 24 verworfen");
  ok(stundeLux(Date.parse("2026-10-24T14:30:00Z")) === 16 && stundeLux(Date.parse("2026-10-26T14:30:00Z")) === 15 && stundeLux(Date.parse("2026-10-24T22:10:00Z")) === 0, "Stunde in Luxemburger Zeit (Sommer/Winter, Mitternacht 0)");
  await ansehen(db, "2026-10-24", "U9 1"); await ansehen(db, "2026-10-24", "U9 1"); await ansehen(db, "2026-10-24", "<b>");
  ok(ges.get("2026-10-24|U13 1") === 2 && ges.get("2026-10-24|Seniors 1") === 1 && ges.get("2026-10-24|U9 1") === 2 && ges.size === 3, "Angesehen: Öffnen und Umschalten gezählt, Unsinn verworfen");
  ok(rei.size === 2 && tage.get("2026-10-24").oeffnungen === 4, "Umschalten zählt nicht als Öffnung");
  const seite = await zahlenSeite(db);
  ok(/Reiter angesehen[^]*<td>U9 1<\/td><td>2<\/td>/.test(seite), "Zahlen-Seite zeigt angesehene Reiter");
  ok(seite.includes("<td>Sa 24.10.</td><td>2</td><td>4</td><td>1 / 2</td><td>1 / 1</td>") && seite.includes("U13 1") && seite.includes("<td>16 Uhr</td><td>2</td>") && seite.includes("<td>09 Uhr</td><td>1</td>"), "Zahlen-Seite zeigt Tag, App/Browser, Stunden und Reiter");
  // Je Tag getrennt, darunter alle Tage zusammen.
  await zaehlen(db, "2026-10-25", true, "BGL", "web", 20, true);
  await zaehlen(db, "2026-10-25", true, "Woche", "app", 21, true);
  await zaehlen(db, "2026-10-25", false, "Woche", "app", 21);
  const zwei = await zahlenSeite(db);
  const tag25 = zwei.slice(zwei.indexOf("<summary>So 25.10."), zwei.indexOf("<summary>Sa 24.10."));
  const tag24 = zwei.slice(zwei.indexOf("<summary>Sa 24.10."), zwei.indexOf("Alle 30 Tage"));
  const gesamt = zwei.slice(zwei.indexOf("Alle 30 Tage"));
  ok(tag25.includes("<td>20 Uhr</td><td>1</td>") && tag25.includes("<td>BGL</td><td>1</td>") && !tag25.includes("U13 1"), "Zahlen je Tag: 25.10. nur seine Öffnung");
  ok(tag24.includes("<td>16 Uhr</td><td>2</td>") && !tag24.includes("BGL") && tag24.includes("<td>U9 1</td><td>2</td>"), "Zahlen je Tag: 24.10. ohne den 25.");
  ok(gesamt.includes("<td>BGL</td><td>1</td>") && gesamt.includes("<td>U13 1</td><td>2</td>") && gesamt.includes("<td>20 Uhr</td>"), "Zahlen zusammen: beide Tage");
  ok(erste.get("2026-10-25|web") === 1 && erste.get("2026-10-25|app") === 1 && erste.size === 2, "Neue Nutzer: nur mit erst, je App/Browser");
  ok(zwei.includes("<td>So 25.10.</td><td>2</td><td>3</td><td>1 / 2</td><td>1 / 1</td><td>2</td>") && zwei.includes("<td>Sa 24.10.</td><td>2</td><td>4</td><td>1 / 2</td><td>1 / 1</td><td>0</td>") && zwei.includes("<td>1 / 1</td><td>0</td>") && zwei.includes("Öffnungen, 2 neu (App 1, Browser 1)</summary>"), "Zahlen-Seite: Spalte Neu");
  ok(zwei.indexOf("<details open><summary>So 25.10.") > 0 && !zwei.includes("<details open><summary>Sa 24.10."), "neuester Tag aufgeklappt, ältere zu");
  // Eigenes Gerät: nur in der Tabelle ich, nirgends sonst.
  const vorherT = JSON.stringify([...tage, ...rei, ...arten, ...std, ...ges, ...erste]);
  await worker.fetch(new Request("https://w/?zaehle=1&neu=1&erst=1&art=app&reiter=U13%201&ich=1"), { DB: db });
  await worker.fetch(new Request("https://w/?zaehle=1&neu=0&art=app&reiter=U13%201&ich=1"), { DB: db });
  await worker.fetch(new Request("https://w/?angesehen=1&reiter=BGL&ich=1"), { DB: db });
  ok(JSON.stringify([...tage, ...rei, ...arten, ...std, ...ges, ...erste]) === vorherT && ich.size === 2, "Eigenes Gerät: zählt nirgends mit, nur getrennt");
  const mitIch = await zahlenSeite(db);
  ok([...ich.keys()].every(k => k.endsWith("|oeffnung") ? ich.get(k) === 2 : ich.get(k) === 1) && /Eigene Geräte[^]*<td>2<\/td><td>1<\/td>/.test(mitIch), "Zahlen-Seite: eigene Geräte getrennt (2 Öffnungen, 1 Umschalten)");
  const ohne = await worker.fetch(new Request("https://w/?zaehle=1&neu=1"), {});
  ok(ohne.status === 204, "Zähler ohne D1: still 204");
  ok((await worker.fetch(new Request("https://w/?zahlen"), {})).status === 503, "Zahlen ohne D1: 503 mit Hinweis");
}

// Mitteilungen (Stufe 1): Verschlüsselung, VAPID, Anmelden/Test/Abmelden über den Worker.
{
  const b64 = x => Buffer.from(x).toString("base64url");
  const ua = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const uaPub = new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey)), auth = crypto.getRandomValues(new Uint8Array(16));
  const abo = { endpoint: "https://web.push.apple.com/QWER", keys: { p256dh: b64(uaPub), auth: b64(auth) } };
  // Entschlüsseln wie das Handy (RFC 8291) — gegen http_ece einmal von Hand gegengeprüft (21.10.2026).
  const hm = async (k, d) => new Uint8Array(await crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", k, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), d));
  const cat = (...t) => Uint8Array.from(t.flatMap(x => [...x]));
  const te = new TextEncoder();
  const ent = async ct => {
    const salz = ct.slice(0, 16), asPub = ct.slice(21, 86), inh = ct.slice(86);
    const g = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: await crypto.subtle.importKey("raw", asPub, { name: "ECDH", namedCurve: "P-256" }, false, []) }, ua.privateKey, 256));
    const ikm = await hm(await hm(auth, g), cat(te.encode("WebPush: info\0"), uaPub, asPub, [1]));
    const prk = await hm(salz, ikm);
    const k = await crypto.subtle.importKey("raw", (await hm(prk, cat(te.encode("Content-Encoding: aes128gcm\0"), [1]))).slice(0, 16), "AES-GCM", false, ["decrypt"]);
    const klar = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: (await hm(prk, cat(te.encode("Content-Encoding: nonce\0"), [1]))).slice(0, 12) }, k, inh));
    return { text: new TextDecoder().decode(klar.slice(0, -1)), ende: klar.at(-1), rs: new DataView(ct.buffer, ct.byteOffset).getUint32(16), idlen: ct[20] };
  };
  const e1 = await ent(await verschluesseln(abo, '{"titel":"Tor ⚽ für Koeppchen"}'));
  ok(e1.text === '{"titel":"Tor ⚽ für Koeppchen"}' && e1.ende === 2 && e1.rs === 4096 && e1.idlen === 65, "Push: verschlüsselt, Handy kann es lesen (aes128gcm)");
  // Nachgebautes D1 für Schlüssel und Abos.
  const reihen = { k: null, abos: new Map() };
  const db = { prepare: sql => ({ a: [], bind(...a) { this.a = a; return this; },
    async run() {
      if (sql.startsWith("INSERT OR IGNORE INTO push_schluessel") && !reihen.k) reihen.k = { privat: this.a[0], oeffentlich: this.a[1] };
      if (sql.startsWith("INSERT OR REPLACE INTO abos")) reihen.abos.set(this.a[0], { abo: this.a[1] });
      if (sql.startsWith("DELETE FROM abos")) reihen.abos.delete(this.a[0]);
    },
    async first() { return sql.includes("push_schluessel") ? reihen.k : reihen.abos.get(this.a[0]) || null; } }) };
  const anfrage = (was, body) => worker.fetch(new Request("https://w/?push=" + was, body === undefined ? {} : { method: "POST", body: JSON.stringify(body) }), { DB: db });
  const s1 = await (await anfrage("schluessel")).json(), s2 = await (await anfrage("schluessel")).json();
  ok(s1.schluessel?.length === 87 && s1.schluessel === s2.schluessel, "Push: Worker erzeugt Schlüssel einmal und behält ihn");
  ok((await anfrage("anmelden", { ...abo, endpoint: "https://boese.example/x" })).status === 400 && (await anfrage("anmelden", { endpoint: abo.endpoint })).status === 400 && reihen.abos.size === 0, "Push: fremder Dienst oder Abo ohne Schlüssel abgelehnt");
  ok((await anfrage("anmelden", abo)).status === 200 && reihen.abos.has(abo.endpoint), "Push: Abo angemeldet");
  ok((await anfrage("test", { endpoint: "https://web.push.apple.com/unbekannt" })).status === 404, "Push: Test an unbekanntes Gerät → 404");
  const echt = globalThis.fetch, gesendet = [];
  let antwortStatus = 201;
  globalThis.fetch = async (url, o) => { gesendet.push([url, o]); return new Response("", { status: antwortStatus }); };
  const t1 = await anfrage("test", { endpoint: abo.endpoint });
  const [url, o] = gesendet[0] || [];
  const [, jwt, k] = (o?.headers.authorization || "").match(/^vapid t=([^,]+), k=(.+)$/) || [];
  const [h, c, sig] = (jwt || "..").split(".");
  const pub = await crypto.subtle.importKey("raw", Buffer.from(k || "", "base64url"), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]).catch(() => null);
  const echtSig = pub && await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, Buffer.from(sig, "base64url"), te.encode(h + "." + c));
  const nutz = JSON.parse((await ent(new Uint8Array(o.body))).text);
  ok(t1.status === 200 && url === abo.endpoint && o.headers["content-encoding"] === "aes128gcm" && o.headers.ttl && k === s1.schluessel && echtSig
     && JSON.parse(Buffer.from(c, "base64url")).aud === "https://web.push.apple.com" && /Test-Mitteilung/.test(nutz.titel) && /So sehen/.test(nutz.text), "Push: Test-Mitteilung mit gültiger Unterschrift an Apple");
  ok((await anfrage("test", { endpoint: abo.endpoint })).status === 429 && gesendet.length === 1, "Push: zweiter Test innerhalb 20 s gebremst");
  // Abo beim Dienst weg (410) → Worker vergisst es.
  const abo2 = { ...abo, endpoint: "https://web.push.apple.com/WEG" };
  await anfrage("anmelden", abo2); antwortStatus = 410;
  const t3 = await anfrage("test", { endpoint: abo2.endpoint });
  ok(t3.status === 502 && !reihen.abos.has(abo2.endpoint) && reihen.abos.has(abo.endpoint), "Push: 410 vom Dienst → Abo gelöscht");
  globalThis.fetch = echt;
  ok((await anfrage("abmelden", { endpoint: abo.endpoint })).status === 200 && reihen.abos.size === 0, "Push: abgemeldet");
  ok((await worker.fetch(new Request("https://w/?push=schluessel"), {})).status === 503, "Push ohne D1: 503");
  ok((await worker.fetch(new Request("https://w/?push=test"), { DB: db })).status === 405, "Push: Test nur per POST");
  // Service Worker: jede Nachricht wird sichtbar (iOS-Pflicht), Tippen öffnet die App.
  const lauscher = {}, gezeigt = [], geoeffnet = [];
  const selbst = { addEventListener: (n, f) => lauscher[n] = f, skipWaiting() {}, clients: { claim: async () => {}, matchAll: async () => [], openWindow: async u => geoeffnet.push(u) },
    registration: { scope: "https://strakekine.github.io/panini-wm-2026/fussball.html", showNotification: async (t, o) => gezeigt.push([t, o]) } };
  new Function("self", fs.readFileSync(path.join(hier, "..", "fussball-sw.js"), "utf8"))(selbst);
  const warten = []; const ev = x => ({ ...x, waitUntil: p => warten.push(p) });
  lauscher.push(ev({ data: { json: () => ({ titel: "FC Koeppchen", text: "Heute Spiel um 10:00" }) } }));
  lauscher.push(ev({ data: null }));
  lauscher.notificationclick(ev({ notification: { close() {}, data: { url: "fussball.html" } } }));
  await Promise.all(warten);
  ok(gezeigt.length === 2 && gezeigt[0][1].body === "Heute Spiel um 10:00" && gezeigt[1][0] === "FC Koeppchen" && geoeffnet[0] === "https://strakekine.github.io/panini-wm-2026/fussball.html", "Service Worker: zeigt jede Mitteilung, Tippen öffnet die App");
  ok(!lauscher.fetch, "Service Worker hat keinen fetch-Teil (lädt und speichert nichts)");
}

// Mitteilungen Stufe 2: Ereignisse aus dem Vergleich alt/neu (kleine, selbst gebaute Daten).
{
  const K = "FC Koeppchen Wormeldange";
  const sp = (id, d, tag, h, a, hs = null, as = null, x = {}) => ({ id, d, tag, h: { id: h[0], n: h[1] }, a: { id: a[0], n: a[1] }, hs, as, gespielt: hs != null, forfait: false, ...x });
  const neuD = () => ({
    saison: { id: 9 }, fupa: { 503: "fc-avenir-beggen-mr1-fc-koeppchen-mr1-261024" },
    teams: [
      { id: 1, ids: [1], n: K + " I", kat: "U13", reiter: "U13 1", klassen: ["k1"], mit: [] },
      { id: 2, ids: [2], n: K + " I", kat: "Seniors", reiter: "Seniors 2", klassen: ["k2"], mit: [] },
      { id: 3, ids: [3], n: K + " I", kat: "U9", reiter: "U9 1", klassen: ["k3"], mit: [] },
    ],
    klassen: {
      k1: { id: "k1", n: "U13 III", typ: "CC", ergebnisse: true, spiele: [
        sp(101, "2026-10-18T10:00:00+02:00", 5, [1, K + " I"], [11, "FC Mondorf"], 3, 1),
        sp(102, "2026-10-18T10:00:00+02:00", 5, [12, "US Hostert"], [13, "FC Remich"], 2, 2),
        sp(103, "2026-10-24T14:00:00+02:00", 6, [14, "AS Hosingen"], [1, K + " I"], null, null, { ort: "Op der Bleech" }) ],
        tabelle: [{ pl: 1, id: 12, n: "US Hostert", sp: 5, pkt: 11 }, { pl: 2, id: 1, n: K + " I", sp: 5, pkt: 10 }] },
      k2: { id: "k2", n: "Promotion", typ: "CC", ergebnisse: true, spiele: [
        sp(201, "2026-10-19T16:00:00+02:00", 7, [2, K + " I"], [21, "FC Titus"], 2, 1),
        sp(503, "2026-10-24T20:00:00+02:00", 8, [22, "Avenir Beggen"], [2, K + " I"]) ],
        tabelle: [{ pl: 3, id: 2, n: K + " I", sp: 7, pkt: 13 }] },
      k3: { id: "k3", n: "U9", typ: "CC", ergebnisse: false, spiele: [
        sp(301, "2026-10-31T10:00:00+01:00", 3, [3, K + " I"], [31, "US Berdorf"]),
        sp(302, "2026-10-25T09:30:00+01:00", 2, [3, K + " I"], [32, "FC Rodange"]) ], tabelle: null },
    },
    bgl: { spiele: [sp(901, "2026-10-19T16:00:00+02:00", 11, [91, "F91 Dudelange"], [92, "Swift Hesperange"], 1, 0)] },
    nati: { spiele: [{ id: 801, d: "2026-11-13T20:45:00+01:00", slug: "luxemburg-m1-estland-m1-261113", h: { id: "Luxemburg", n: "Luxemburg" }, a: { id: "Estland", n: "Estland" }, hs: 2, as: 1, gespielt: true, wett: "UEFA Nations League" }] },
  });
  const neu = neuD(), alt = neuD();
  alt.klassen.k1.spiele[1].hs = alt.klassen.k1.spiele[1].as = null;              // Spieltag 5 war noch offen
  alt.klassen.k1.tabelle = [{ pl: 1, id: 1, n: K + " I", sp: 4, pkt: 9 }, { pl: 2, id: 12, n: "US Hostert", sp: 4, pkt: 8 }];
  alt.klassen.k2.spiele[0].hs = alt.klassen.k2.spiele[0].as = null;              // Seniors-Ergebnis neu
  alt.klassen.k2.tabelle = [{ pl: 3, id: 2, n: K + " I", sp: 6, pkt: 10 }];
  alt.klassen.k3.spiele[0].d = "2026-10-31T00:00:00+01:00";                       // Uhrzeit war offen
  alt.bgl.spiele[0].hs = alt.bgl.spiele[0].as = null;
  alt.nati.spiele[0].hs = alt.nati.spiele[0].as = null;
  const jetzt = Date.parse("2026-10-20T20:00:00+02:00");
  const m = mEreignisse(alt, neu, null, jetzt), id = x => m.ereignisse.find(e => e.id.startsWith(x));
  ok(id("spieltag:k1:5")?.text === "Koeppchen I 3:1 FC Mondorf · alle Ergebnisse in der App" && id("spieltag:k1:5").titel === "U13 1 · Spieltag 5 komplett", "Mitteilung: Spieltag komplett mit unserem Ergebnis");
  ok(id("tabelle:k1")?.text === "Koeppchen I jetzt 2. Platz (vorher 1.) · 10 Punkte" && id("tabelle:k2")?.text === "Koeppchen I jetzt 3. Platz (wie vorher) · 13 Punkte", "Mitteilung: Tabelle mit Platz und vorher");
  ok(id("ende:201")?.text === "Koeppchen I 2:1 FC Titus" && id("ende:201").reiter[0] === "Seniors 2", "Mitteilung: Endstand Seniors von der FLF");
  ok(id("zeit:301")?.text === "Sa., 31.10. um 10:00 gegen US Berdorf", "Mitteilung: Uhrzeit steht fest");
  ok(id("bgl:9:11") && id("nende:801")?.text === "Luxemburg 2:1 Estland", "Mitteilung: BGL-Spieltag und Länderspiel-Endstand");
  ok(!m.ereignisse.some(e => e.reiter.includes("U9 1") && e.art !== "uhrzeit" && e.art !== "heute"), "Mitteilung: U9 nie Ergebnis, Spieltag oder Tabelle");
  ok(!id("heute:") && m.live.length === 0, "Mitteilung: kein Spiel heute → kein Heute Spiel, keine Live-Kandidaten");
  // Ohne Änderung entsteht nichts Neues; ein zweiter Lauf behält die offenen, ohne sie zu doppeln.
  ok(mEreignisse(neu, neu, null, jetzt).ereignisse.length === 0, "Mitteilung: gleicher Stand → nichts");
  const m2 = mEreignisse(alt, neu, m, jetzt + 60e3);
  ok(m2.ereignisse.length === m.ereignisse.length && m2.ereignisse.every((e, i) => e.ab === m.ereignisse[i].ab), "Mitteilung: zweiter Lauf doppelt nichts");
  ok(mEreignisse(neu, neu, m, jetzt + 25 * 3600e3).ereignisse.every(e => e.bis > jetzt + 25 * 3600e3), "Mitteilung: abgelaufene fallen raus");
  // Heute Spiel und Live am Spieltag; Spiel vor 10 Uhr schon am Vorabend um 19 Uhr.
  const sa = mEreignisse(neu, neu, null, Date.parse("2026-10-24T06:00:00+02:00"));
  const fr = mEreignisse(neu, neu, null, Date.parse("2026-10-23T07:10:00+02:00"));
  const h = fr.ereignisse.find(e => e.id === "heute:103"), u9 = sa.ereignisse.find(e => e.id === "heute:302"), s2 = sa.ereignisse.find(e => e.id === "heute:503");
  ok(h?.titel === "U13 1 · Morgen Spiel" && h.text === "14:00 gegen AS Hosingen · 📍 Op der Bleech" && h.ab === Date.parse("2026-10-23T19:00:00+02:00") && h.bis === Date.parse("2026-10-24T14:00:00+02:00"), "Mitteilung: Kinder am Vorabend um 19 Uhr, bis Anpfiff");
  ok(u9?.titel === "U9 1 · Morgen Spiel" && u9.ab === Date.parse("2026-10-24T19:00:00+02:00") && !fr.ereignisse.some(e => e.id === "heute:503"), "Mitteilung: Seniors nicht am Vorabend");
  ok(s2?.titel === "Seniors 2 · Heute Spiel" && s2.ab === Date.parse("2026-10-24T10:00:00+02:00"), "Mitteilung: Seniors am Spieltag um 10 Uhr");
  const spaet = sa.ereignisse.find(e => e.id === "heute:103");
  ok(spaet?.titel === "U13 1 · Heute Spiel" && spaet.ab === Date.parse("2026-10-24T06:00:00+02:00"), "Mitteilung: Kinderspiel erst am Spieltag bekannt → Heute Spiel sofort");
  ok(s2 && sa.live.length === 1 && sa.live[0].slug === "fc-avenir-beggen-mr1-fc-koeppchen-mr1-261024" && sa.live[0].ende === "ende:503" && !sa.live[0].wirHeim, "Mitteilung: Seniors-Spiel heute als Live-Kandidat");
  const mo = mEreignisse(neu, neu, null, Date.parse("2026-10-25T22:30:00+01:00")).ereignisse.find(e => e.id === "woche:2026-10-26");
  ok(mo?.text === "Diese Woche 1 Spiel, davon 1 zu Hause" && mo.ab === umLux("2026-10-26", 10), "Mitteilung: Unsere Woche, ab So 22 Uhr für Montag 10:00 vorbereitet");
  // Live im Worker: Ticker erst mit echtem Inhalt; Endstand nach FLF-Reihenfolge (FuPa hier vertauscht).
  const c = sa.live[0], t0 = Date.parse(c.d) + 30 * 60e3;
  ok(liveEreignisse(c, { section: "LIVE", hs: null, as: null, ticker: null, tore: [] }, t0).length === 0, "Live: FuPas automatisches LIVE ohne Tickerer → nichts");
  const tk = liveEreignisse(c, { section: "LIVE", hs: 0, as: 0, ticker: "Paul", tore: [] }, t0)[0];
  ok(tk?.id === "ticker:503" && tk.text === "Heute tickert FuPa das Spiel gegen Avenir Beggen – live in der App.", "Live: Liveticker läuft");
  const hz = liveEreignisse(c, { section: "LIVE", period: "halftime", slug: c.slug, hs: 1, as: 0, ticker: "Paul", tore: [] }, t0).find(e => e.art === "halbzeit");
  ok(hz?.id === "halbzeit:503" && hz.titel === "Seniors 2 · Halbzeit" && hz.text === "Avenir Beggen 1:0 Koeppchen I"
     && !liveEreignisse(c, { section: "LIVE", period: "secondHalf", slug: c.slug, hs: 1, as: 0, ticker: "Paul", tore: [] }, t0).some(e => e.art === "halbzeit")
     && !liveEreignisse(c, { section: "LIVE", period: "halftime", hs: null, as: null, tore: [] }, t0).length, "Live: Halbzeit nur in der Pause und nur mit Stand");
  const en = liveEreignisse({ ...c, wirHeim: true, h: "Koeppchen I", a: "Avenir Beggen" }, { section: "POST", slug: c.slug, hs: 3, as: 1, tore: [] }, t0)[0];
  ok(en?.text === "Koeppchen I 1:3 Avenir Beggen", "Live: Endstand dreht FuPas Zahlen, wenn FuPa Heim/Gast vertauscht");
  ok(liveEreignisse(c, { section: "POST", slug: c.slug, hs: 3, as: 1, tore: [] }, t0)[0].text === "Avenir Beggen 3:1 Koeppchen I", "Live: Endstand ohne Vertauschen");
  ok(passtZu({ teams: ["U13 1"], arten: ["heute"] }, h) && !passtZu({ teams: ["U13 2"], arten: ["heute"] }, h) && !passtZu({ teams: ["U13 1"], arten: ["tabelle"] }, h)
     && passtZu({ teams: ["Woche"], arten: [] }, mo) && !passtZu(null, h), "Mitteilung: alte Auswahl (für alle gleich) gilt weiter");
  const tab2 = { ...id("tabelle:k1"), reiter: ["U13 2"] };
  ok(passtZu({ je: { "U13 1": ["heute"], "U13 2": ["tabelle"] } }, h) && passtZu({ je: { "U13 2": ["tabelle"] } }, tab2)
     && !passtZu({ je: { "U13 1": ["tabelle"], "U13 2": ["heute"] } }, h) && !passtZu({ je: { "U13 2": ["heute"] } }, tab2)
     && passtZu({ je: { Woche: ["woche"] } }, mo) && !passtZu({ je: {} }, mo), "Mitteilung: je Mannschaft eigene Arten");

  // Versand im Worker mit nachgebautem D1: gewählt, einmal, nachts nicht, Live aus FuPa.
  const T = { abos: new Map(), gemeldet: new Map(), offen: new Map(), k: null };
  const db = { prepare: sql => ({ a: [], bind(...a) { this.a = a; return this; },
    async run() {
      const [x, y] = this.a;
      if (sql.startsWith("INSERT OR IGNORE INTO push_schluessel") && !T.k) T.k = { privat: x, oeffentlich: y };
      if (sql.startsWith("INSERT OR IGNORE INTO gemeldet")) T.gemeldet.has(x) || T.gemeldet.set(x, y);
      if (sql.startsWith("INSERT OR IGNORE INTO offen")) T.offen.has(x) || T.offen.set(x, y);
      if (sql.startsWith("DELETE FROM offen")) T.offen.delete(x);
      if (sql.startsWith("DELETE FROM abos")) T.abos.delete(x);
      if (sql.startsWith("DELETE FROM gemeldet")) for (const [k, z] of T.gemeldet) if (z < x) T.gemeldet.delete(k);
    },
    async first() { if (sql.includes("push_schluessel")) return T.k; if (sql.includes("FROM gemeldet")) return T.gemeldet.has(this.a[0]) ? { id: this.a[0] } : null; return null; },
    async all() { if (sql.includes("FROM abos")) return { results: [...T.abos.values()].filter(z => z.wahl) }; if (sql.includes("FROM offen")) return { results: [...T.offen.values()].map(ereignis => ({ ereignis })) }; return { results: [] }; } }),
    batch: async l => { for (const x of l) await x.run(); } };
  const b64 = x => Buffer.from(x).toString("base64url");
  const ua = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const schl = { p256dh: b64(await crypto.subtle.exportKey("raw", ua.publicKey)), auth: b64(crypto.getRandomValues(new Uint8Array(16))) };
  const abo = (e, wahl) => T.abos.set(e, { endpoint: e, abo: JSON.stringify({ endpoint: e, keys: schl }), wahl: wahl && JSON.stringify(wahl) });
  abo("https://web.push.apple.com/U13", { je: { "U13 1": ["heute", "spieltag"], "Seniors 2": ["tabelle"] } });
  abo("https://web.push.apple.com/SEN", { je: { "Seniors 2": ["ticker", "ende"] } });
  abo("https://web.push.apple.com/OHNE", null);
  const echt = globalThis.fetch, an = [];
  let fupa = { slug: c.slug, section: "LIVE", homeGoal: 0, awayGoal: 0, tickerAuthor: { name: "Paul" }, highlights: [] };
  globalThis.fetch = async (url, o) => {
    if (String(url).includes("mitteilungen.json")) return new Response(JSON.stringify(sa));
    if (String(url).includes("api.fupa.net")) return new Response(JSON.stringify(fupa));
    an.push(url.split("/").pop()); return new Response("", { status: 201 });
  };
  const nacht = Date.parse("2026-10-24T06:45:00+02:00"), morgen = Date.parse("2026-10-24T07:30:00+02:00"), spiel = Date.parse("2026-10-24T20:30:00+02:00");
  await mitteilungenSenden(db, nacht);
  ok(an.length === 0, "Versand: nachts nichts (vor 7 Uhr)");
  await mitteilungenSenden(db, morgen);
  ok(an.join() === "U13" && T.gemeldet.has("heute:103") && !T.gemeldet.has("heute:503"), "Versand: Spiel nur an U13, ohne Auswahl nichts, Seniors erst um 10");
  await mitteilungenSenden(db, morgen + 15 * 60e3);
  ok(an.length === 1, "Versand: dasselbe nie zweimal");
  await mitteilungenSenden(db, spiel);
  ok(an.join() === "U13,SEN" && T.gemeldet.has("ticker:503"), "Versand: Liveticker läuft an Seniors 2");
  fupa = { ...fupa, section: "POST", homeGoal: 1, awayGoal: 4 };
  await mitteilungenSenden(db, Date.parse("2026-10-24T22:05:00+02:00"));
  ok(an.length === 2 && T.offen.has("ende:503"), "Versand: Endstand nach 22 Uhr wartet");
  await mitteilungenSenden(db, Date.parse("2026-10-25T07:00:00+01:00"));
  ok(an.join() === "U13,SEN,SEN" && !T.offen.has("ende:503") && T.gemeldet.has("ende:503"), "Versand: Endstand morgens um 7");
  globalThis.fetch = echt;
}
console.log(fehler ? `${fehler} von ${n} Prüfungen fehlgeschlagen` : `alle ${n} Prüfungen grün`);
process.exit(fehler ? 1 : 0);
