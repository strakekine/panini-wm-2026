/* Prüft den Abruf (tools/fussball.mjs, Aufbereitung) und die Logik in fussball.html.
   Aufruf:  node test/fussball.mjs
   Kein Netz, kein Browser. Rückgabewert 1 bei Abweichung.

   Die Daten sind nachgebaut nach dem Stand 18.10.2026 (Phase 1 beendet, Koeppchen I
   Zweiter in Klasse IV, Koeppchen II Fünfter in Klasse VI, Pokal ohne I/II). */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { aufbereiten, spiel, CLUB } from "../tools/fussball.mjs";

const hier = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(hier, "..", "fussball.html"), "utf8");
const i = src.indexOf("==== Logik"), j = src.indexOf("==== Oberfläche");
if (i < 0 || j < 0) throw new Error("Abschnittsmarken Logik/Oberfläche nicht gefunden");
const M = new Function(src.slice(src.lastIndexOf("//", i), src.lastIndexOf("//", j)) + `
  return { REGELN, klasseVon, zonen, ausgang, aufteilen, reiter, anzeige, sicht, nachSpieltag, roem };`)();

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
  return { ak: extra.ak ?? 0, match: { id: mid++, gameday: extra.tag ?? 1, matchDate: d, isPlayed: hs != null, isForfait: false,
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
// U15-Pokal: eigene Altersklasse (ak 1), darf bei der U13 nicht auftauchen.
const P15 = team(45400, "FC Koeppchen Wormeldange", CLUB);
const CUP15 = { id: 19599, name: "Coupe U15 Scolaires - 1/32 de Finale", showResult: true, showRanking: false };
const s8 = roh(CUP15, "CUP", "2026-10-25T10:00:00+02:00", P15, G(9), null, null, { ak: 1 });
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
gleich(D.teams.map(t => M.reiter(t, D.verein.n)), ["U13", "U13 1", "U13 2", "U15"], "Reiter-Beschriftung U13 1 / U13 2 / U15");

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

gleich(M.nachSpieltag(D.klassen[19189].spiele).map(([t, s]) => [t, s.length]), [[1, 2], [5, 1]], "Spieltage gruppiert");

console.log(fehler ? `${fehler} von ${n} Prüfungen fehlgeschlagen` : `alle ${n} Prüfungen grün`);
process.exit(fehler ? 1 : 0);
