/* Prüft den Abruf (tools/fussball.mjs, Aufbereitung) und die Logik in fussball.html.
   Aufruf:  node test/fussball.mjs
   Kein Netz, kein Browser. Rückgabewert 1 bei Abweichung.

   Die Daten sind nachgebaut nach dem Stand 18.10.2026 (Phase 1 beendet, Koeppchen I
   Zweiter in Klasse IV, Koeppchen II Fünfter in Klasse VI, Pokal ohne I/II). */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { aufbereiten, spiel, reiter, ics, eigeneSpiele, CLUB } from "../tools/fussball.mjs";
import { liveAus, gleich as liveGleich, spielJetzt, naechstesSpiel, passendesSpiel } from "../tools/fussball-live.mjs";
import { kuerzen, passendesSpiel as wPassend, saisonVon } from "../tools/cloudflare-worker.js";

const hier = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(hier, "..", "fussball.html"), "utf8");
const i = src.indexOf("==== Logik"), j = src.indexOf("==== Oberfläche");
if (i < 0 || j < 0) throw new Error("Abschnittsmarken Logik/Oberfläche nicht gefunden");
const M = new Function(src.slice(src.lastIndexOf("//", i), src.lastIndexOf("//", j)) + `
  return { spieltagHeute, liveSpiel, liveBasis, kartenArt, ereignisListe, torArt, mitWorker, liveAnzeige, liveZeit, imLiveFenster, REGELN, klasseVon, zonen, ausgang, aufteilen, anzeige, sicht, nachSpieltag, roem };`)();

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
  const b0 = M.liveBasis(null, spS);
  ok(b0.slug === null && b0.flfId === flf.id && b0.h === flf.h.n, "Gerüst ohne live.json");
  ok(M.liveBasis({ ...Lv, flfId: 1 }, spS).slug === null, "live.json vom letzten Spiel gilt nicht");
  const mw = M.mitWorker(b0, { ...Wk, fuer: flf.id });
  ok(mw.hs === 2 && mw.slug === Wk.slug && /fupa\.net\/match\//.test(mw.url), "Worker füllt das Gerüst samt Slug");
  ok(M.mitWorker(b0, { ...Wk, fuer: 999 }).hs === undefined, "Worker-Antwort für ein anderes Spiel zählt nicht");
  ok(M.liveAnzeige(mw, vS, t0) && M.liveAnzeige(b0, vS, t0) === null, "Kasten erst mit Worker-Daten");
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

console.log(fehler ? `${fehler} von ${n} Prüfungen fehlgeschlagen` : `alle ${n} Prüfungen grün`);
process.exit(fehler ? 1 : 0);
