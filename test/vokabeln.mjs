/* Prüft die Logik in vokabeln.html: Antwortprüfung, Karteikasten, Rundenbau.
   Aufruf:  node test/vokabeln.mjs
   Kein Browser, keine Abhängigkeiten. Rückgabewert 1 bei Abweichung.

   Die Prüfregeln kommen vom Nutzer: Tippfehler sind Fehler, falsche Akzente auch,
   steht ein Artikel dabei, muss er mit. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const hier = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(hier, "..", "vokabeln.html"), "utf8");
const i = src.indexOf("===== Lektionen"), j = src.indexOf("===== Oberfläche");
if(i < 0 || j < 0) throw new Error("Abschnittsmarken Lektionen/Oberfläche nicht gefunden");
const quelle = src.slice(src.lastIndexOf("/*", i), src.lastIndexOf("/*", j));
const M = new Function(quelle + `
  return { LEKTIONEN, DAY, FACH, clean, variants, check, cardsOf, grade, review, isDue, buildSession,
           lessonStats, startOfDay, key };`)();

let fehler = 0, n = 0;
function ok(bed, text){ n++; if(!bed){ fehler++; console.log("✗ " + text); } }
const richtig = (a, sol, voice = false) => ok(M.check(a, sol, voice).ok, `"${a}" für "${sol}" sollte richtig sein`);
const falsch = (a, sol, why, voice = false) => {
  const r = M.check(a, sol, voice);
  ok(!r.ok, `"${a}" für "${sol}" sollte falsch sein`);
  if(why !== undefined) ok(r.why === why, `"${a}" für "${sol}": Begründung "${r.why}", soll "${why}"`);
};

/* --- Genau, aber nicht kleinlich bei dem, was nichts mit Wissen zu tun hat --- */
richtig("le chat", "le chat");
richtig("Le chat", "le chat");                  /* Großbuchstabe am Satzanfang */
richtig("  le   chat. ", "le chat");            /* Leerzeichen, Punkt vom Diktat */
richtig("aujourd’hui", "aujourd'hui");          /* iOS-Apostroph */
richtig("l' école", "l'école");
richtig("Ça va?", "Ça va ?");
richtig("grand,grande", "grand, grande");

/* --- Fehler bleiben Fehler --- */
falsch("chat", "le chat", "Der Artikel fehlt.");
falsch("la chat", "le chat", "Falscher Artikel.");
falsch("école", "l'école", "Der Artikel fehlt.");
falsch("Katze", "die Katze", "Der Artikel fehlt.");
falsch("das Katze", "die Katze", "Falscher Artikel.");
falsch("die katze", "die Katze", "Groß- und Kleinschreibung.");
falsch("ecole", "école", "Akzent fehlt oder ist falsch.");
falsch("l'ecole", "l'école", "Akzent fehlt oder ist falsch.");
falsch("être", "etre");
falsch("le chta", "le chat", "Zwei Buchstaben sind falsch.");
falsch("le chap", "le chat", "Ein Buchstabe ist falsch.");
falsch("le chien", "le chat", "");
falsch("", "le chat", "Keine Antwort.");
falsch("grand", "grand, grande");               /* beide Formen verlangt, wenn beide dastehen */
falsch("der Freund", "ein Freund|eine Freundin", "Falscher Artikel.");
falsch("heute", "le chat");

/* --- Varianten und Klammern --- */
richtig("une amie", "un ami|une amie");
richtig("groß", "groß|hoch");
richtig("hoch", "groß|hoch");
richtig("promener", "(se) promener");
richtig("se promener", "(se) promener");
ok(M.variants("(se) promener|marcher").join(";") === "se promener;promener;marcher", "Varianten-Expansion");

/* --- Gesprochen: Groß/Klein zählt nicht, alles andere schon --- */
richtig("die katze", "die Katze", true);
richtig("Le Chat", "le chat", true);
falsch("katze", "die Katze", "Der Artikel fehlt.", true);
falsch("ecole", "école", "Akzent fehlt oder ist falsch.", true);

/* --- Kein Artikel, wo keiner hingehört --- */
falsch("le être", "être", "Hier gehört kein Artikel dazu.");

/* --- Karteikasten --- */
const { DAY } = M;
const t0 = new Date(2026, 9, 15, 17, 30).getTime(), heute = M.startOfDay(t0);
let p = M.grade(null, true, t0);
ok(p.b === 1 && p.due === heute + DAY, "neu und richtig → Fach 1, morgen dran");
p = M.grade(p, true, t0 + DAY);
ok(p.b === 2 && p.due === heute + DAY + 2 * DAY, "Fach 2 → in 2 Tagen");
for(let k = 0; k < 6; k++) p = M.grade(p, true, t0);
ok(p.b === 5 && p.due === heute + 16 * DAY, "oben bleibt Fach 5, 16 Tage");
p = M.grade(p, false, t0);
ok(p.b === 1 && p.due === heute + DAY && p.bad === 1 && p.w === 1, "falsch → Fach 1, morgen wieder, als Fehler markiert");
p = M.grade(p, true, t0);
ok(p.b === 2 && !p.bad, "danach richtig → Fehlermarke weg");
ok(M.isDue(undefined, t0) && !M.isDue({ due:t0 + 1 }, t0), "isDue");

/* "Alle": ein noch wartendes Wort steigt bei richtig nicht auf, fällt bei falsch aber zurück */
const wartet = { b:4, due:t0 + 5 * DAY, n:4, w:0, last:t0 - 3 * DAY };
ok(M.review(wartet, true, t0) === wartet, "wartendes Wort richtig → bleibt unverändert");
p = M.review(wartet, false, t0);
ok(p.b === 1 && p.bad === 1, "wartendes Wort falsch → Fach 1");
p = M.review({ b:4, due:t0 - 1, n:4, w:0 }, true, t0);
ok(p.b === 5, "fälliges Wort richtig → steigt auf");
ok(M.review(undefined, true, t0).b === 1, "neues Wort richtig → Fach 1");

/* "Fehler" am selben Tag: falsch → morgen fällig; heute nochmal richtig → Fehlermarke weg,
   Fach 1 und Termin morgen bleiben */
p = M.grade(null, false, t0);
const q = M.review(p, true, t0 + 3600e3);
ok(q.b === 1 && !q.bad && q.due === heute + DAY, "Fehler heute richtig → raus aus 'Fehler', morgen trotzdem dran");
ok(M.review(p, false, t0 + 3600e3).bad === 1, "Fehler heute wieder falsch → bleibt in 'Fehler'");

/* --- Rundenbau --- */
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const cards = M.cardsOf(M.LEKTIONEN);
ok(cards.length >= 10, "Beispiel-Lektion hat Wörter");
ok(new Set(cards.map(c => c.id)).size === cards.length, "Wort-ids eindeutig");
let s = M.buildSession(cards, {}, { dir:"fd", mode:"due", count:10 }, t0, rnd);
ok(s.length === 10 && s.every(x => x.dir === "fd"), "10 neue Wörter, Richtung FR→DE");
ok(new Set(s.map(x => x.cid)).size === 10, "kein Wort doppelt");
s = M.buildSession(cards, {}, { dir:"df", mode:"all", count:0 }, t0, rnd);
ok(s.length === cards.length, "Alle = alle Wörter");
s = M.buildSession(cards, {}, { dir:"mix", mode:"all", count:0 }, t0, rnd);
ok(s.some(x => x.dir === "fd") && s.some(x => x.dir === "df"), "gemischt hat beide Richtungen");

/* Fällige gelernte vor neuen; nicht fällige gar nicht; Richtungen getrennt */
const P = {};
P[M.key(cards[0].id, "fd")] = { b:1, due:t0 - 1, n:1, w:1, bad:1 };     /* fällig, Fehler */
P[M.key(cards[1].id, "fd")] = { b:3, due:t0 + 3 * DAY, n:3, w:0 };     /* nicht fällig */
s = M.buildSession(cards, P, { dir:"fd", mode:"due", count:0 }, t0, rnd);
ok(s[0].cid === cards[0].id, "fälliges Wort kommt vor den neuen");
ok(!s.some(x => x.cid === cards[1].id), "nicht fälliges Wort fehlt");
ok(s.length === cards.length - 1, "der Rest sind neue Wörter");
s = M.buildSession(cards, P, { dir:"df", mode:"due", count:0 }, t0, rnd);
ok(s.some(x => x.cid === cards[1].id), "andere Richtung zählt getrennt");
s = M.buildSession(cards, P, { dir:"fd", mode:"err", count:0 }, t0, rnd);
ok(s.length === 1 && s[0].cid === cards[0].id, "Fehler-Modus nimmt nur zuletzt falsche");
s = M.buildSession(cards, P, { dir:"mix", mode:"err", count:0 }, t0, rnd);
ok(s.length === 1 && s[0].dir === "fd", "gemischt + Fehler nimmt die Richtung, in der der Fehler war");

const st = M.lessonStats(cards, P, t0);
ok(st.n === cards.length * 2 && st.neu === st.n - 2 && st.lern === 2 && st.sicher === 0, "Statistik");

console.log(fehler ? `${fehler} von ${n} Prüfungen fehlgeschlagen` : `Alle ${n} Prüfungen bestanden`);
process.exit(fehler ? 1 : 0);
