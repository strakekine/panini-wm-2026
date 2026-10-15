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
           lessonStats, startOfDay, key, needBackup, klang, klingtWie, reviewAnswer, SICHER, tippKandidaten, ausgeschrieben, weekStatus, dayKey, dayDone, pruneDays, pct, DAY_MIN, DAY_RIGHT, countDay, sternWochen, sanitizeStars, sterneNachtragen, sterneStand, wochenStart };`)();

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
falsch("grand", "grand, grande");               /* Komma ist kein Formtrenner (Ça va, merci) */

/* --- Buchkürzel gelten auch ausgeschrieben (vom Vater: „rendre visite à quelqu'un“ war falsch) --- */
richtig("rendre visite à quelqu'un", "rendre visite (à qn)");
richtig("Rendre visite à quelqu’un", "rendre visite (à qn)");
richtig("rendre visite à qn", "rendre visite (à qn)");
richtig("rendre visite", "rendre visite (à qn)");
richtig("jemanden besuchen", "(jdn) besuchen");
richtig("etwas leidenschaftlich mögen", "(etw.) leidenschaftlich mögen");
richtig("être passionné de quelque chose", "être passionné (de qch)");
falsch("rendre visite à quelqu'une", "rendre visite (à qn)");
richtig("parler à quelqu'un", "parler à qqn");
richtig("faire quelque chose", "faire qqch");
richtig("faire quelque chose", "faire qc");
richtig("jemanden anrufen", "jmdn. anrufen");
richtig("jemandem helfen", "jmdm. helfen");
richtig("jemandes Freund", "jds. Freund");
richtig("jmdn. anrufen", "jmdn. anrufen");
richtig("jemand anderes", "jmd. anderes");
falsch("etwasx", "etw.");
ok(M.check("rendre visite à quelqu'un", "rendre visite (à qn)", true).ok, "ausgeschrieben auch gesprochen");

/* --- Sperre für neue Kürzel (vom Vater: „die Logik soll auch in Zukunft greifen“) ---
   Durchsucht alle Lektionen nach Wörtern, die wie Kürzel aussehen: mit Punkt (z.B., o.Ä., etw.)
   oder ganz ohne Vokal (qn, qqch, jdn). Kennt die App eines davon nicht, schlägt der Test fehl —
   dann gehört es in KUERZEL in vokabeln.html, sonst wäre das ausgeschriebene Wort „falsch“. */
const VOKAL = /[aeiouyäöüéèêëàâîïôûùœæ]/i;
function unbekannteKuerzel(lektionen){
  const raus = [];
  for(const l of lektionen) for(const [fr, de] of l.vok) for(const feld of [fr, de])
    for(const w of String(feld).split(/[\s()|;,/]+|'(?=\S)/)){
      const kurz = /^[a-zäöüß.]+\.$/i.test(w) || (/^[a-zß]{2,}$/i.test(w) && !VOKAL.test(w));
      if(kurz && M.ausgeschrieben(" " + w + " ") === " " + w + " ") raus.push(l.id + ": „" + w + "“ in „" + feld + "“");
    }
  return raus;
}
{
  const u = unbekannteKuerzel(M.LEKTIONEN);
  ok(!u.length, "Unbekannte Kürzel — in KUERZEL eintragen: " + u.join(" · "));
  /* Gegenprobe: die Sperre schlägt an */
  const probe = unbekannteKuerzel([{ id:"probe", vok:[["faire qch z.B.", "o.Ä. tun"], ["rendre visite (à qqn)", "jdn besuchen"]] }]);
  ok(probe.length === 2 && probe.join().includes("z.B.") && probe.join().includes("o.Ä."), "Kürzel-Sperre erkennt unbekannte Kürzel — fand: " + probe.join(" · "));
}

/* --- Formen mit ";": eine reicht, aber mit Hinweis --- */
const teil = (a, sol) => { const r = M.check(a, sol); ok(r.ok && r.part, `"${a}" für "${sol}" sollte richtig mit Hinweis sein`); };
teil("grand", "grand; grande");
teil("grande", "grand; grande");
richtig("grand, grande", "grand; grande");
ok(!M.check("grand, grande", "grand; grande").part, "beide Formen → kein Hinweis");
teil("une amie", "un ami; une amie");
falsch("amie", "un ami; une amie", "Der Artikel fehlt.");
falsch("grnad", "grand; grande", "Zwei Buchstaben sind falsch.");
ok(M.check("Grande", "grand; grande", true).part, "gesprochen: eine Form reicht auch");
falsch("der Freund", "ein Freund|eine Freundin", "Falscher Artikel.");
falsch("heute", "le chat");

/* --- Varianten und Klammern --- */
richtig("une amie", "un ami|une amie");
ok(!M.check("une amie", "un ami|une amie").part, "| ist gleichwertig, kein Hinweis");
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
ok(p.b === 1 && p.due === heute + DAY, "neu und richtig → Fach 1, morgen");
ok(M.grade(null, false, t0).b === 0 && M.grade(null, false, t0).due === heute + DAY, "neu und falsch → Fach 0, morgen");
let a0 = M.grade(M.grade(null, false, t0), true, t0 + DAY);
ok(a0.b === 1 && a0.due === heute + 2 * DAY, "aus Fach 0 richtig → Fach 1, wieder morgen");
ok(M.grade(a0, false, t0 + 2 * DAY).b === 0, "nie über Fach 1 hinaus, falsch → zurück nach Fach 0");
p = M.grade(p, true, t0 + DAY);
ok(p.b === 2 && p.due === heute + DAY + 2 * DAY, "Fach 2 → in 2 Tagen");
p = M.grade(p, true, t0 + 3 * DAY);
ok(p.b === 3 && p.due === heute + 3 * DAY + 4 * DAY, "Fach 3 → in 4 Tagen");
for(let k = 0; k < 6; k++) p = M.grade(p, true, t0);
ok(p.b === 4 && p.due === heute + 7 * DAY, "oben bleibt Fach 4, 7 Tage");
ok(M.FACH.every(d => d <= 7), "kein Fach wartet länger als eine Woche");
p = M.grade(p, false, t0);
ok(p.b === 1 && p.due === heute + DAY && p.bad === 1 && p.w === 1, "war schon höher, falsch → Fach 1 (nicht 0), morgen, als Fehler markiert");
ok(M.grade(p, false, t0).b === 1, "und nochmal falsch → bleibt in Fach 1");
p = M.grade(p, true, t0);
ok(p.b === 2 && !p.bad, "danach richtig → Fehlermarke weg");
ok(M.isDue(undefined, t0) && !M.isDue({ due:t0 + 1 }, t0), "isDue");

/* "Alle": ein noch wartendes Wort steigt bei richtig nicht auf, fällt bei falsch aber zurück */
const wartet = { b:4, due:t0 + 5 * DAY, n:4, w:0, last:t0 - 3 * DAY };
ok(M.review(wartet, true, t0) === wartet, "wartendes Wort richtig → bleibt unverändert");
p = M.review(wartet, false, t0);
ok(p.b === 1 && p.bad === 1, "wartendes Wort falsch → Fach 1");
p = M.review({ b:4, due:t0 - 1, n:4, w:0 }, true, t0);
ok(p.b === 4 && p.due === heute + 7 * DAY, "fälliges Wort in Fach 4 richtig → bleibt oben, 7 Tage");
p = M.review({ b:3, due:t0 - 1, n:3, w:0 }, true, t0);
ok(p.b === 4, "fälliges Wort richtig → steigt auf");
ok(M.review(undefined, true, t0).b === 1, "neues Wort richtig → Fach 1");

/* "Fehler" am selben Tag: falsch → morgen fällig; heute nochmal richtig → Fehlermarke weg,
   Fach 0 und Termin morgen bleiben */
p = M.grade(null, false, t0);
const q = M.review(p, true, t0 + 3600e3);
ok(q.b === 0 && !q.bad && q.due === heute + DAY, "Fehler heute richtig → raus aus 'Fehler', morgen trotzdem dran");
ok(M.review(p, false, t0 + 3600e3).bad === 1, "Fehler heute wieder falsch → bleibt in 'Fehler'");

/* --- Rundenbau --- */
let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const cards = M.cardsOf(M.LEKTIONEN);
ok(cards.length >= 10, "Beispiel-Lektion hat Wörter");
/* Formen (;) nur, wenn die andere Seite keine eigenen Formen hat — sonst zwei Einträge */
for(const c of cards) ok(!(c.f.includes(";") && c.d.includes(";")), `"${c.f}" / "${c.d}": Formen auf beiden Seiten gehören in zwei Einträge`);
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

/* Nach einer Pause: fällige Wörter nach Fach sortiert, niedrige zuerst, neue zuletzt */
const P2 = {};
cards.slice(0, 6).forEach((c, i) => { P2[M.key(c.id, "fd")] = { b:[4, 1, 3, 0, 2, 4][i], due:t0 - DAY, n:3, w:0 }; });
s = M.buildSession(cards, P2, { dir:"fd", mode:"due", count:0 }, t0, rnd);
const faecher = s.map(x => P2[M.key(x.cid, "fd")] ? P2[M.key(x.cid, "fd")].b : 99);
ok(faecher.slice(0, 6).join() === "0,1,2,3,4,4" && faecher.slice(6).every(b => b === 99), "Reihenfolge nach Fach, neue zuletzt — ist " + faecher.join());
s = M.buildSession(cards, P2, { dir:"fd", mode:"due", count:3 }, t0, rnd);
ok(s.every(x => P2[M.key(x.cid, "fd")].b <= 2), "mit 3 Wörtern kommen nur die wackeligsten");

const st = M.lessonStats(cards, P, t0);
ok(st.n === cards.length * 2 && st.neu === st.n - 2 && st.lern === 2 && st.sicher === 0, "Statistik");
{
  const P3 = {}; cards.forEach(c => { P3[M.key(c.id, "df")] = { b:4, hi:4, due:t0 + DAY, n:4, w:0, ty:1 }; });
  const s3 = M.lessonStats(cards, P3, t0);
  ok(s3.per.df.sicher === cards.length && s3.per.fd.sicher === 0 && s3.per.df.n === cards.length, "Statistik je Richtung");
  ok(M.pct(s3.per.df) === 100 && M.pct(s3) === 50, "nur DE → FR gelernt: dort 100 %, beide zusammen 50 %");
}
/* „heute fällig“ zählt Wörter, nicht Richtungen — nie mehr als die Lektion hat */
for(const d of ["fd", "df", "mix"]){
  const sd = M.lessonStats(cards, {}, t0, d);
  ok(sd.due === cards.length, "neue Lektion, Richtung " + d + ": fällig = Wortzahl — ist " + sd.due);
  ok(sd.due === M.buildSession(cards, {}, { dir:d, mode:"due", count:0 }, t0, rnd).length, "fällig = Länge einer ganzen Runde (" + d + ")");
}

/* --- FR → DE: kurze Leiter 0 → 3 → 4, Fehler → 1 → 3 → 4 (vom Vater) --- */
{
  const ra = (p, r, t, getippt = false) => M.reviewAnswer(p, r, t, getippt, false);
  let p = ra(undefined, true, t0);
  ok(p.b === 3 && p.due === heute + 4 * DAY, "FR → DE: neu und richtig → gleich Fach 3, in 4 Tagen — ist " + p.b);
  p = ra(p, true, t0 + 4 * DAY);
  ok(p.b === 4, "FR → DE: dann Fach 4 = sicher");
  p = ra(p, false, t0 + 11 * DAY);
  ok(p.b === 1 && p.bad, "FR → DE: falsch → Fach 1");
  p = ra(p, true, t0 + 12 * DAY);
  ok(p.b === 3, "FR → DE: nach dem Fehler richtig → wieder Fach 3");
  ok(ra(undefined, false, t0).b === 1, "FR → DE: neu und falsch → Fach 1");
  ok(ra({ b:2, hi:2, due:t0 - 1, n:2, w:0 }, true, t0).b === 3, "FR → DE: Altbestand Fach 2 → 3");
  /* DE → FR bleibt bei der ganzen Leiter */
  const q = M.reviewAnswer(undefined, true, t0, true, true);
  ok(q.b === 1, "DE → FR: neu und richtig → Fach 1 (ganze Leiter) — ist " + q.b);
  ok(M.reviewAnswer(undefined, false, t0, true, true).b === 0, "DE → FR: neu und falsch → Fach 0");
}

/* --- Motivation: Wochenziel und Prozent --- */
{
  const mi = new Date(2026, 9, 14, 18).getTime();          /* Mittwoch, 14.10.2026 */
  const days = {};
  days[M.dayKey(mi - 2 * DAY)] = { n:12 };                 /* Montag: Lerntag */
  days[M.dayKey(mi - DAY)] = { n:9 };                      /* Dienstag: knapp zu wenig */
  days[M.dayKey(mi)] = { n:10 };                           /* Mittwoch: genau 10 */
  days[M.dayKey(mi - 3 * DAY)] = { n:30 };                 /* Sonntag davor: andere Woche */
  const w = M.weekStatus(days, mi);
  ok(w.cells.map(c => c.label).join() === "Mo,Di,Mi,Do,Fr,Sa,So", "Woche beginnt Montag");
  ok(w.cells.map(c => c.done ? 1 : 0).join("") === "1010000", "Lerntage Mo und Mi — ist " + w.cells.map(c => c.done ? 1 : 0).join(""));
  ok(w.count === 2 && w.cells[2].today && w.cells[3].future, "Zählung, heute, Zukunft");
  const so = new Date(2026, 9, 18, 21).getTime();          /* Sonntagabend derselben Woche */
  ok(M.weekStatus(days, so).count === 2 && M.weekStatus(days, so).cells[6].today, "Sonntag gehört noch zur Woche");
  ok(M.weekStatus(days, so + DAY).count === 0, "Montag danach: neue Woche, wieder 0");
  ok(!M.dayDone({ n:M.DAY_MIN - 1 }) && M.dayDone({ n:M.DAY_MIN }), "Lerntag ab " + M.DAY_MIN + " Antworten");
  const alt = M.pruneDays({ [M.dayKey(mi - 70 * DAY)]:{ n:20 }, [M.dayKey(mi)]:{ n:3 } }, mi);
  ok(Object.keys(alt).length === 1, "alte Tage werden aufgeräumt");
  /* Lerntag ehrlich: 10 Antworten, davon 5 richtig; alte Einträge ohne r nach alter Regel */
  ok(!M.dayDone({ n:10, r:4 }) && M.dayDone({ n:10, r:5 }) && M.dayDone({ n:12 }), "Lerntag: 10 Antworten, davon " + M.DAY_RIGHT + " richtig");
  let e; for(let i = 0; i < 10; i++) e = M.countDay(e, false);
  ok(e.n === 10 && e.r === 0 && !M.dayDone(e), "zehnmal falsch/„Weiß nicht“ ist kein Lerntag");
  ok(M.countDay({ n:8 }, true).r === 9, "alter Eintrag ohne r: weiterzählen ohne ihn abzuwerten");
  ok(M.pruneDays({ [M.dayKey(mi)]:{ n:10, r:7 } }, mi)[M.dayKey(mi)].r === 7, "pruneDays behält r");
  /* Sterne: Woche mit 5 Lerntagen = 1 Stern, nie verloren, Einlösen zieht ab */
  const mo = M.wochenStart(mi), d5 = {};
  for(let i = 0; i < 5; i++) d5[M.dayKey(mo + i * DAY + 3600e3 * 12)] = { n:10, r:8 };
  ok(M.dayKey(mo) === "2026-10-12", "Woche beginnt am Montag 12.10. — ist " + M.dayKey(mo));
  ok(M.sternWochen(d5).join() === "2026-10-12", "5 Lerntage → Stern für diese Woche");
  const d4 = { ...d5 }; delete d4[M.dayKey(mo + 12 * 3600e3)];
  ok(M.sternWochen(d4).length === 0, "4 Lerntage → kein Stern");
  const ueber = {}; for(let i = 3; i < 8; i++) ueber[M.dayKey(mo + i * DAY + 12 * 3600e3)] = { n:10, r:9 };
  ok(M.sternWochen(ueber).length === 0, "5 Tage über zwei Wochen verteilt → kein Stern");
  let st = M.sterneNachtragen(M.sanitizeStars(null), d5);
  ok(M.sterneStand(st) === 1, "ein Stern verdient");
  st = M.sterneNachtragen(st, {});
  ok(M.sterneStand(st) === 1, "Stern bleibt, auch wenn die Tage aus DAYS herausfallen");
  ok(M.sterneNachtragen(st, d5) === st, "derselbe Stern nicht doppelt");
  st = { ...st, red:[{ t:mi, n:1, was:"Kino" }] };
  ok(M.sterneStand(st) === 0, "Einlösen zieht ab");
  ok(M.sanitizeStars({ w:["2026-10-12", "2026-10-12", "kaputt"], red:[{ t:1, n:0 }, { t:1, n:2.7, was:"x" }] }).w.length === 1 &&
     M.sanitizeStars({ red:[{ t:1, n:0 }, { t:1, n:2.7, was:"x" }] }).red[0].n === 2, "sanitizeStars räumt auf");
  ok(M.pct({ sicher:25, n:26 }) === 96 && M.pct({ sicher:26, n:26 }) === 100 && M.pct({ sicher:0, n:0 }) === 0, "Prozent abgerundet, 100 nur wenn alles sicher");
}

/* --- Gleicher Klang beim Sprechen (Französisch) --- */
{
  const ja = (h, sol) => ok(!!M.klingtWie(h, sol), `"${h}" klingt wie "${sol}"`);
  const nein = (h, sol) => ok(!M.klingtWie(h, sol), `"${h}" klingt NICHT wie "${sol}"`);
  ja("Arrivé en retard", "arriver en retard");          /* der Fall vom iPhone */
  ja("arrivez en retard", "arriver en retard");
  ja("être motivée", "être motivé");
  ja("réviser la matières", "réviser la matière");
  ja("lever la mains", "lever le doigt|lever la main");
  ja("les jeu vidéo", "les jeux vidéo");
  ja("un cour obligatoire", "un cours obligatoire");
  ja("grande", "grand; grande");
  nein("arrivé", "arriver en retard");                   /* fehlender Teil bleibt falsch */
  nein("en retard", "arriver en retard");
  nein("directeur", "le directeur");                     /* Artikel fehlt bleibt falsch */
  nein("les directeur", "le directeur");                 /* le / les klingen verschieden */
  nein("des vacances", "les vacances");
  nein("arrive en retard", "arriver en retard");         /* arrive ≠ arriver */
  nein("le chien", "le chat");
  nein("", "le chat");
  /* In den echten Lektionen dürfen zwei verschiedene Vokabeln nicht gleich „klingen“ —
     sonst ginge beim Sprechen die eine als die andere durch. Nach jedem Eintragen wichtig. */
  const seen = new Map();
  for(const c of M.cardsOf(M.LEKTIONEN)) for(const v of [...M.variants(c.f)]){
    const k = M.klang(v), alt = seen.get(k);
    ok(!alt || alt === c.f, `Klang-Kollision: "${alt}" und "${c.f}" klingen für die App gleich („${k}“)`);
    seen.set(k, c.f);
  }
}

/* --- „Sicher“ bei DE → FR nur mit einmal richtig getippt --- */
{
  const f3 = { b:3, hi:3, due:t0 - 1, n:3, w:0 };
  let q = M.reviewAnswer(f3, true, t0, false, true);
  ok(q.b === 3 && q.gedeckelt && q.due === heute + 4 * DAY, "DE→FR gesprochen, nie getippt: bleibt Fach 3, in 4 Tagen wieder, Hinweis");
  q = M.reviewAnswer(f3, true, t0, true, true);
  ok(q.b === 4 && q.ty === 1 && !q.gedeckelt, "DE→FR getippt: Fach 4, Schreibweise bewiesen");
  q = M.reviewAnswer({ ...f3, ty:1 }, true, t0, false, true);
  ok(q.b === 4 && !q.gedeckelt, "DE→FR gesprochen, früher schon getippt: darf aufsteigen");
  q = M.reviewAnswer(f3, true, t0, false, false);
  ok(q.b === 4, "FR→DE gesprochen: Sprechen reicht");
  q = M.reviewAnswer({ b:2, hi:2, due:t0 - 1, n:2, w:0 }, true, t0, true, true);
  ok(q.b === 3 && q.ty === 1, "getippt in Fach 2: Marke wird schon gesetzt");
  q = M.reviewAnswer({ b:4, hi:4, due:t0 - 1, n:5, w:0, ty:1 }, false, t0, true, true);
  ok(q.b === 1 && !q.ty, "Fehler: Schreibweise wieder unbewiesen");
  q = M.reviewAnswer({ b:2, hi:2, due:t0 - 1, n:2, w:0 }, true, t0, false, true);
  ok(q.b === 3 && !q.gedeckelt, "unter Fach 4 ändert sich beim Sprechen nichts");
  const wartet = { b:3, hi:3, due:t0 + DAY, n:3, w:0 };
  ok(M.reviewAnswer(wartet, true, t0, false, true) === wartet, "„Alle“, noch nicht fällig, gesprochen: unverändert");
  q = M.reviewAnswer(wartet, true, t0, true, true);
  ok(q.b === 3 && q.due === wartet.due && q.ty === 1, "„Alle“, noch nicht fällig, getippt: Fach bleibt, Schreibweise bewiesen");
}

/* --- ✍️-Wörter: gesprochen verdient, Tippen fehlt; Knopf „Jetzt tippen“ --- */
{
  const f3 = { b:3, hi:3, due:t0 - 1, n:3, w:0 };
  const gesprochen = M.reviewAnswer(f3, true, t0, false, true);
  ok(gesprochen.wt === 1 && gesprochen.b === 3, "gedeckelt → Marke ✍️ (wt)");
  const spaeter = t0 + 3600e3;   /* noch nicht wieder fällig */
  let q = M.reviewAnswer(gesprochen, true, spaeter, true, true);
  ok(q.b === 4 && q.ty === 1 && !q.wt && q.due === heute + 7 * DAY, "✍️-Wort richtig getippt: sofort Fach 4, in 7 Tagen wieder");
  q = M.reviewAnswer(gesprochen, false, spaeter, true, true);
  ok(q.b === 1 && !q.wt && !q.ty, "✍️-Wort falsch getippt: Fehler, Marke weg");
  q = M.reviewAnswer(gesprochen, true, spaeter, false, true);
  ok(q === gesprochen, "✍️-Wort, noch nicht fällig, wieder gesprochen: unverändert");

  const cs = M.cardsOf(M.LEKTIONEN), P = {}, k = i => M.key(cs[i].id, "df");
  P[k(0)] = gesprochen;                                          /* ✍️ → ja */
  P[k(1)] = { b:3, hi:3, due:t0 - 1, n:3, w:0 };                /* Fach 3, fällig, nie getippt → ja */
  P[k(2)] = { b:3, hi:3, due:t0 + 2 * DAY, n:3, w:0 };          /* Fach 3, wartet noch → nein */
  P[k(3)] = { b:3, hi:3, due:t0 - 1, n:3, w:0, ty:1 };          /* schon getippt → nein */
  P[k(4)] = { b:2, hi:2, due:t0 - 1, n:2, w:0 };                /* Fach 2 → nein */
  P[M.key(cs[5].id, "fd")] = { b:3, hi:3, due:t0 - 1, n:3, w:0, wt:1 };   /* FR→DE → nein */
  const kand = M.tippKandidaten(cs, P, t0).map(x => x.cid);
  ok(kand.length === 2 && kand.includes(cs[0].id) && kand.includes(cs[1].id), "Knopf nimmt ✍️-Wörter und fällige Fach-3-Wörter ohne Tippen — ist " + kand.length);
  ok(M.tippKandidaten(cs, P, t0).every(x => x.dir === "df"), "nur Richtung DE → FR");
}

/* --- Erinnerung an die Sicherung --- */
ok(!M.needBackup(null, null, t0), "nichts Ungesichertes → keine Erinnerung");
ok(!M.needBackup(t0 - 6 * DAY, null, t0), "6 Tage ungesichert → noch nicht");
ok(M.needBackup(t0 - 7 * DAY, null, t0), "7 Tage ungesichert → Erinnerung");
ok(!M.needBackup(t0 - 9 * DAY, t0 + DAY, t0), "Später → ruhig");
ok(M.needBackup(t0 - 9 * DAY, t0 - 1, t0), "Später abgelaufen → wieder da");

console.log(fehler ? `${fehler} von ${n} Prüfungen fehlgeschlagen` : `Alle ${n} Prüfungen bestanden`);
process.exit(fehler ? 1 : 0);
