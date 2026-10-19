/* Prüft den Abruf (tools/fussball.mjs, Aufbereitung) und die Logik in index.html.
   Aufruf:  node test/fussball.mjs
   Kein Netz, kein Browser. Rückgabewert 1 bei Abweichung. Läuft vor jedem Abruf in der Action.

   Die Mannschaften heißen wie in verein.json (flfName), die Daten sind nachgebaut: zwei
   U13-Mannschaften, Pokal ohne I/II, U15-Pokal, Seniors mit Réserves. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { aufbereiten, reiter, ics, CLUB, CFG, AGES, ALLE_AGES } from "../tools/fussball.mjs";
// Feste Reihenfolge der Altersklassen, egal was verein.json unter `alter` wählt.
AGES.splice(0, AGES.length, ...ALLE_AGES);
const AK = kat => AGES.findIndex(a => a.kat === kat);

const hier = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(hier, "..", "index.html"), "utf8");
if (src.includes("{{")) throw new Error("index.html hat noch Platzhalter — mit neu.mjs erzeugen");
const i = src.indexOf("==== Logik"), j = src.indexOf("==== Oberfläche");
if (i < 0 || j < 0) throw new Error("Abschnittsmarken Logik/Oberfläche nicht gefunden");
const M = new Function(src.slice(src.lastIndexOf("//", i), src.lastIndexOf("//", j)) + `
  return { V, extraReiter, spieltagHeute, liveSpiel, zonen, ausgang, aufteilen, anzeige, sicht, nachSpieltag };`)();

let fehler = 0, n = 0;
function ok(bed, text) { n++; if (!bed) { fehler++; console.log("✗ " + text); } }
function gleich(a, b, text) { ok(JSON.stringify(a) === JSON.stringify(b), text + " — ist " + JSON.stringify(a) + ", soll " + JSON.stringify(b)); }

/* --- Verein: App und Abruf lesen dasselbe --- */
gleich([M.V.flfName, M.V.kurz], [CFG.flfName, CFG.kurz], "index.html und verein.json meinen denselben Verein");
ok(M.V.repo && /^[^/]+\/[^/]+$/.test(M.V.repo), "repo als konto/name");

/* --- Rohdaten wie aus der Schnittstelle --- */
const F = CFG.flfName;
const team = (id, name, club) => ({ id, name, clubId1: club, clubId2: null, clubId3: null, clubId4: null });
const K1 = team(101, F + " I", CLUB), K2 = team(102, F + " II", CLUB), KP = team(103, F, CLUB);
const G = id => team(id, "Gegner " + id, 500000 + id);
const DIV4 = { id: 4, name: "U13 Minimes Cl4 S2 Phase 1", showResult: true, showRanking: true };
const DIV6 = { id: 6, name: "U13 Minimes Cl6 S5 Phase 1", showResult: true, showRanking: true };
const CUP = { id: 7, name: "Coupe U13 Minimes - 1/32 de Finale", showResult: true, showRanking: false };
const CUP15 = { id: 8, name: "Coupe U15 Scolaires - 1/32 de Finale", showResult: true, showRanking: false };
let mid = 1;
function roh(div, typ, d, h, a, hs, as, extra = {}) {
  return { ak: extra.ak ?? AK("U13"), match: { id: mid++, gameday: extra.tag ?? 1, matchDate: d, isPlayed: hs != null, isForfait: false,
                    homeScore: hs, awayScore: as, finalHomeScore: extra.fh ?? (hs ?? null), finalAwayScore: extra.fa ?? (as ?? null),
                    finalScoreComment: null },
           division: div, matchType: { id: typ }, homeTeam: h, awayTeam: a, sportField: { name: "Stade" } };
}
const s1 = roh(DIV4, "CC", "2026-09-19T14:30:00+02:00", G(1), K1, 2, 2, { tag: 1 });
const s2 = roh(DIV4, "CC", "2026-10-17T14:30:00+02:00", K1, G(2), 9, 0, { tag: 5 });
const s3 = roh(DIV4, "CC", "2026-09-19T15:00:00+02:00", G(3), G(4), 5, 2, { tag: 1 });
const s4 = roh(DIV6, "CC", "2026-09-26T14:00:00+02:00", G(5), K2, 9, 5, { tag: 2 });
const s5 = roh(CUP, "CUP", "2026-10-24T14:00:00+02:00", KP, G(6), null, null);
const s6 = roh(DIV6, "CC", "2026-10-03T16:00:00+02:00", K2, G(7), 3, 5, { tag: 3, fh: 0, fa: 3 });
const P15 = team(104, F, CLUB);
const s8 = roh(CUP15, "CUP", "2026-10-25T10:00:00+02:00", P15, G(9), null, null, { ak: AK("U15") });

const rank = (pl, t, p) => ({ ranking: { rank: pl, teamId: t.id, totalPlays: 5, totalWins: 0, totalDraws: 0, totalLosses: 0,
                                         totalOwnGoals: 10, totalAgainstGoals: 5, totalPoints: p }, team: { id: t.id, name: t.name } });
const D = aufbereiten({
  saison: { id: "20262027", name: "Saison 2026-2027" },
  vereinsSpiele: [s1, s2, s4, s5, s6, s8],
  klassen: {
    4: { spiele: [s2, s1, s3], tabelle: [rank(2, K1, 11), rank(1, G(1), 11), rank(3, G(2), 8)] },
    6: { spiele: [s4, s6], tabelle: [rank(5, K2, 0), rank(1, G(5), 12)] },
    7: { spiele: [s5], tabelle: null },
    8: { spiele: [s8], tabelle: null },
  },
});

/* --- Aufbereitung und Reiter --- */
gleich(D.verein, { id: CLUB, n: F }, "Verein aus verein.json");
const { tabs } = M.aufteilen(D);
gleich(tabs.map(t => t.reiter), ["U13 1", "U13 2"], "Reiter nur für Mannschaften mit Ligaspielen");
gleich(tabs.map(t => t.datei), ["u13-1.ics", "u13-2.ics"], "Kalenderdatei je Reiter");
gleich(D.teams.find(t => t.id === 101).mit, [103], "U13-Pokal hängt an der U13, nicht der U15-Pokal");
gleich([{ n: F, kat: "Seniors", ohne: 1 }, { n: F + " I", kat: "Seniors", plus: 1 }, { n: F + " II", kat: "Seniors", plus: 1 }].map(t => reiter(t)),
  ["Seniors 1", "Seniors 2", "Seniors 3"], "Seniors und Réserves");
// Spielgemeinschaft: Nummer aus dem I/II am Ende, der Name ist ein ganz anderer.
gleich([{ n: "ENT Ort/Nachbarort I", kat: "U13" }, { n: "ENT Ort/Nachbarort III", kat: "U13" }, { n: "ENT Ort/Nachbarort", kat: "U15" }].map(t => reiter(t)),
  ["U13 1", "U13 3", "U15"], "Spielgemeinschaften (ENT)");

/* --- Anzeige: eigener Name gekürzt, fremde bleiben --- */
gleich(M.anzeige(F + " II"), CFG.kurz + " II", "eigener Name gekürzt");
gleich(M.anzeige(F), CFG.kurz, "eigener Name ohne I/II");
gleich(M.anzeige("Gegner " + F), "Gegner " + F, "nur am Anfang ersetzt");
gleich(M.anzeige(F + "er Allstars"), F + "er Allstars", "nur ganze Wörter");

/* --- Sicht eines Reiters --- */
const jetzt = Date.parse("2026-10-20T12:00:00+02:00");
const v1 = M.sicht(D, 101, jetzt);
gleich(v1.kommend.map(s => s.klasse), ["Coupe U13 Minimes - 1/32 de Finale"], "U13 1 sieht den U13-Pokal, nicht den der U15");
gleich(v1.gespielt.map(s => s.hs + ":" + s.as), ["9:0", "2:2"], "Ergebnisse, neuestes zuerst");
gleich([M.ausgang(v1.gespielt[0], 101), M.ausgang(v1.gespielt[1], 101)], ["s", "u"], "Sieg und Unentschieden");
const v2 = M.sicht(D, 102, jetzt);
gleich(v2.gespielt.find(s => s.d.startsWith("2026-10-03")).hs, 0, "Endergebnis (Forfait) vor dem gespielten");
ok(M.zonen("20262027", "U13 Minimes Cl4 S2 Phase 1")?.auf.join() === "1,2", "Auf-/Abstieg Klasse IV nach Rundschreiben");
// Spiel ohne Ergebnis: bis 3 h nach Anstoß „kommt noch“.
const amSpieltag = Date.parse("2026-10-24T15:30:00+02:00");
ok(M.sicht(D, 101, amSpieltag).kommend.length === 1, "1,5 h nach Anstoß noch bei den nächsten Spielen");
ok(M.spieltagHeute(M.sicht(D, 101, amSpieltag), amSpieltag)?.begonnen === true, "Heute-Spieltag-Kasten läuft");
ok(M.sicht(D, 101, Date.parse("2026-10-24T17:30:00+02:00")).kommend.length === 0, "3,5 h danach nicht mehr");
ok(M.liveSpiel(v1, jetzt) === null, "ohne liveReiter kein Liveticker");
gleich(M.extraReiter(D), [], "ohne BGL/Nationalteam keine Zusatzreiter");

/* --- Kalender --- */
const k = ics(D, D.teams.find(t => t.id === 101));
ok(k.includes(`UID:flf-${s5.match.id}@${CFG.slug}`), "UID = FLF-Spiel-ID @ Verein");
ok(k.includes(`SUMMARY:⚽ ${CFG.kurz} U13 1 – Gegner 2 9:0`), "Ergebnis im Titel, Mannschaft wie der Reiter");
ok(k.includes(`SUMMARY:⚽ ${CFG.kurz} U13 – Gegner 6 (Pokal)`), "Pokal ohne I/II");
ok(k.split("\r\n").every(z => Buffer.byteLength(z, "utf8") <= 75), "Zeilen gefaltet");
ok(!/koeppchen/i.test(k) || /koeppchen/i.test(CFG.name), "kein fremder Vereinsname im Kalender");

console.log(fehler ? `${fehler} von ${n} Prüfungen fehlgeschlagen` : `alle ${n} Prüfungen bestanden`);
process.exit(fehler ? 1 : 0);
