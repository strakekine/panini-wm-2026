/* Oberfläche des Vokabeltrainers im Browser, unabhängig vom Inhalt der Lektionen.
   Aufruf:  node test/vokabeln-oberflaeche.mjs [pfad/zu/vokabeln.html]
   Braucht Playwright (global installiert, siehe CLAUDE.md). Rückgabewert 1 bei Fehler.

   Grundsatz: Dieser Test nimmt NICHTS über die Lektionen an — keine Wortzahl, keine
   bestimmten Wörter, keine feste Rundenlänge. Lösungen holt er aus der App (variants),
   Runden spielt er, bis sie wirklich zu Ende sind. Frühere Hilfsskripte hatten „12 Wörter“
   oder „höchstens 30 Fragen“ fest eingebaut und fielen mit jeder neuen Lektion um. */
import path from "path";
import { fileURLToPath } from "url";
const { chromium } = await import(process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright/index.mjs");
const datei = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "vokabeln.html");

let fehler = 0, n = 0;
function ok(bed, text){ n++; if(!bed){ fehler++; console.log("✗ " + text); } }

const b = await chromium.launch();
async function seite(){
  const pg = await b.newPage({ viewport:{ width:390, height:780 } });
  pg.errs = [];
  pg.on("pageerror", e => pg.errs.push(String(e)));
  pg.on("console", m => { if(m.type() === "error" && !/fonts/.test(m.text())) pg.errs.push(m.text()); });
  pg.on("dialog", d => d.accept());
  await pg.goto("file://" + datei);
  return pg;
}
/* Richtige Antwort auf die aktuelle Frage, aus den Daten der App */
const loesung = pg => pg.evaluate(() => { const it = Q.items[Q.i], c = BYID[it.cid]; return variants(it.dir === "df" ? c.f : c.d)[0]; });
/* Runde zu Ende spielen; falsch = Liste von Fragenummern (erste Versuche), die absichtlich falsch beantwortet werden */
async function spielen(pg, falsch = []){
  let i = 0;
  const grenze = await pg.evaluate(() => Q.items.length * 4 + 10);   /* Schutz gegen Endlosschleife, aus der Runde selbst */
  while(await pg.evaluate(() => VIEW) === "quiz"){
    if(i++ > grenze){ ok(false, "Runde endet nicht"); break; }
    const erste = await pg.evaluate(() => !Q.items[Q.i].again);
    const antwort = erste && falsch.includes(i) ? "xx" : await loesung(pg);
    await pg.fill("#qIn", "");
    await pg.type("#qIn", antwort);
    await pg.keyboard.press("Enter");
    await pg.keyboard.press("Enter");
  }
}

/* --- 1. Erste Runde: Zahl stimmt, falsches Wort kommt wieder, Fokus bleibt --- */
{
  const pg = await seite();
  const alle = await pg.evaluate(() => CARDS.length);
  ok(alle > 0, "es gibt Lektionen");
  await pg.click("#startBtn");
  const geplant = await pg.evaluate(() => Q.total);
  ok(geplant === Math.min(10, alle * 1), "Runde hat 10 Wörter (oder alle, wenn weniger) — ist " + geplant);
  await pg.type("#qIn", "xx"); await pg.keyboard.press("Enter");
  ok((await pg.textContent("#qFb")).includes("✗"), "falsche Antwort wird als falsch gezeigt");
  ok(await pg.evaluate(() => document.activeElement.id === "qIn"), "Fokus bleibt im Feld (Tastatur bleibt offen)");
  ok(await pg.evaluate(() => Q.items.filter(x => x.again).length === 1), "falsches Wort kommt in der Runde wieder");
  await pg.keyboard.press("Enter");
  if(await pg.isVisible("#qAcc button")){
    await pg.fill("#qIn", "");
    await pg.click('[data-acc="é"]');
    ok(await pg.inputValue("#qIn") === "é" && await pg.evaluate(() => document.activeElement.id === "qIn"), "Akzentleiste schreibt ins Feld, Fokus bleibt");
  }
  await spielen(pg);
  const res = (await pg.textContent("#resBody")).replace(/\s+/g, " ");
  ok(res.includes((geplant - 1) + " / " + geplant), "Ergebnis " + (geplant - 1) + " / " + geplant + " — ist: " + res.slice(0, 40));
  ok(res.includes("kommen morgen wieder"), "Hinweis: Fehler kommen morgen wieder");
  ok(!(await pg.$("#resAgain")), "kein Knopf „Fehler nochmal“");
  await pg.click("#resHome");
  await pg.reload();
  ok(await pg.evaluate(() => Object.keys(P).length) === geplant, "Lernstand übersteht Neuladen");
  ok(!pg.errs.length, "keine Fehler auf der Seite: " + pg.errs.join(" | "));
  await pg.close();
}

/* --- 2. Nur lernen: bis zum Ende blättern, zählt nicht --- */
{
  const pg = await seite();
  await pg.click("#learnBtn");
  const n = await pg.evaluate(() => L.items.length);
  ok(n === await pg.evaluate(() => selCards().length), "Lernmodus nimmt alle gewählten Wörter");
  await pg.click("#lCard");
  ok(!(await pg.textContent("#lCard")).includes("antippen zum Aufdecken"), "Antippen deckt auf");
  let k = 0;
  while(await pg.isVisible("#lNext")){ await pg.click("#lNext"); if(++k > n + 5) break; }
  ok((await pg.textContent("#lCard")).includes("Wörter durch"), "Lernmodus kommt ans Ende (" + n + " Wörter)");
  ok(await pg.evaluate(() => Object.keys(P).length) === 0, "Lernmodus zählt nicht für die Fächer");
  await pg.click("#lQuiz");
  ok(await pg.evaluate(() => VIEW) === "quiz", "„Jetzt abfragen“ startet die Abfrage");
  ok(!pg.errs.length, "keine Fehler auf der Seite: " + pg.errs.join(" | "));
  await pg.close();
}

/* --- 3. „Alle“: wartendes Wort steigt nicht auf; fälliges in Fach 3 wird „sicher“; Lerntag --- */
{
  const pg = await seite();
  await pg.evaluate(() => {
    const [a, c] = selCards();
    P[key(a.id, "fd")] = { b:2, hi:2, due:Date.now() + 3 * DAY, n:2, w:0, last:Date.now() - DAY };   /* wartet */
    P[key(c.id, "fd")] = { b:3, hi:3, due:Date.now() - 1, n:3, w:0, last:Date.now() - 4 * DAY };     /* fällig, Fach 3 */
    persist();
  });
  await pg.reload();
  await pg.click('[data-opt="mode"] [data-v="all"]');
  await pg.click('[data-opt="count"] [data-v="0"]');
  await pg.click("#startBtn");
  await spielen(pg);
  const [wartet, faellig] = await pg.evaluate(() => { const [a, c] = selCards(); return [P[key(a.id, "fd")].b, P[key(c.id, "fd")].b]; });
  ok(wartet === 2, "„Alle“: wartendes Wort bleibt in Fach 2 — ist " + wartet);
  ok(faellig === 4, "fälliges Wort aus Fach 3 wird sicher — ist " + faellig);
  const res = await pg.textContent("#resBody");
  ok(res.includes("jetzt sicher"), "Ergebnis meldet neu sichere Wörter");
  if(await pg.evaluate(() => selCards().length) >= 10) ok(res.includes("Lerntag geschafft"), "Ergebnis meldet den Lerntag");
  ok(!pg.errs.length, "keine Fehler auf der Seite: " + pg.errs.join(" | "));
  await pg.close();
}

/* --- 4. Sicherungs-Erinnerung --- */
{
  const pg = await seite();
  ok(!(await pg.isVisible("#nagSave")), "keine Erinnerung ohne Gelerntes");
  await pg.evaluate(() => localStorage.setItem("vokabeln_v1_dirty", Date.now() - 8 * 864e5));
  await pg.reload();
  ok(await pg.isVisible("#nagSave"), "Erinnerung nach 8 Tagen Ungesichertem");
  await pg.click("#nagLater");
  ok(!(await pg.isVisible("#nagSave")), "„Später“ blendet sie aus");
  ok(!pg.errs.length, "keine Fehler auf der Seite: " + pg.errs.join(" | "));
  await pg.close();
}

await b.close();
console.log(fehler ? `${fehler} von ${n} Prüfungen fehlgeschlagen` : `Alle ${n} Prüfungen bestanden`);
process.exit(fehler ? 1 : 0);
