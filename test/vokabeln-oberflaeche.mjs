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
  pg.on("dialog", d => d.type() === "prompt" ? d.accept(d.defaultValue()) : d.accept());   /* prompt: OK mit Vorgabe */
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
  ok(geplant === Math.min(40, alle * 1), "Runde hat 40 Wörter (oder alle, wenn weniger) — ist " + geplant);
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
  const heute = await pg.textContent("#progBox");
  ok(geplant >= 40 ? heute.includes("Heute ist ein Lerntag") : heute.includes("Heute: " + geplant + " von 40"), "Startbild zeigt den heutigen Lerntag — " + heute.slice(-60));
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
  if(await pg.evaluate(() => selCards().length >= DAY_MIN)) ok(res.includes("Lerntag geschafft"), "Ergebnis meldet den Lerntag");
  ok(!pg.errs.length, "keine Fehler auf der Seite: " + pg.errs.join(" | "));
  await pg.close();
}

/* --- 3b. Sprechen blendet „Gemischt“ aus (geht am iPhone nicht), Tippen zeigt es wieder --- */
{
  const pg = await seite();
  await pg.click('[data-opt="dir"] [data-v="mix"]');
  await pg.click('[data-opt="input"] [data-v="voice"]');
  ok(!(await pg.isVisible('[data-opt="dir"] [data-v="mix"]')), "Sprechen: „Gemischt“ ausgeblendet");
  ok(await pg.evaluate(() => S.dir) === "df", "Sprechen: aus „Gemischt“ wird DE → FR — ist " + await pg.evaluate(() => S.dir));
  await pg.reload();
  ok(!(await pg.isVisible('[data-opt="dir"] [data-v="mix"]')), "bleibt nach Neuladen ausgeblendet");
  await pg.click('[data-opt="input"] [data-v="type"]');
  ok(await pg.isVisible('[data-opt="dir"] [data-v="mix"]'), "Tippen: „Gemischt“ wieder da");
  ok(!pg.errs.length, "keine Fehler auf der Seite: " + pg.errs.join(" | "));
  await pg.close();
}

/* --- 3c. Knopf „✍️ Jetzt tippen“: erscheint nur mit Kandidaten, erzwingt Tippen + DE → FR --- */
{
  const pg = await seite();
  ok(!(await pg.isVisible("#tippBtn")), "ohne ✍️-Wörter kein Knopf");
  await pg.evaluate(() => {
    const [a, c] = CARDS;
    P[key(a.id, "df")] = { b:3, hi:3, due:Date.now() + 3 * DAY, n:3, w:0, wt:1 };   /* ✍️, noch nicht wieder fällig */
    P[key(c.id, "df")] = { b:3, hi:3, due:Date.now() + 3 * DAY, n:3, w:0 };         /* wartet → nicht dabei */
    S.input = "voice"; persist();
  });
  await pg.reload();
  ok(await pg.isVisible("#tippBtn"), "Knopf erscheint");
  ok((await pg.textContent("#tippBox")).includes("1 Wort"), "Knopf zählt nur das eine Kandidaten-Wort");
  await pg.click("#tippBtn");
  ok(await pg.evaluate(() => Q.nurTippen && Q.items.every(x => x.dir === "df")), "Tipp-Runde: DE → FR, nur Tippen");
  ok(!(await pg.isVisible("#qMic")), "kein Mikrofon in der Tipp-Runde, obwohl Sprechen eingestellt ist");
  await spielen(pg);
  ok(await pg.evaluate(() => P[key(CARDS[0].id, "df")].b) === 4, "✍️-Wort richtig getippt → sicher");
  ok((await pg.textContent("#resBody")).includes("jetzt sicher"), "Ergebnis meldet „jetzt sicher“");
  await pg.click("#resHome");
  ok(!(await pg.isVisible("#tippBtn")), "danach ist der Knopf weg");
  ok(!pg.errs.length, "keine Fehler auf der Seite: " + pg.errs.join(" | "));
  await pg.close();
}

/* --- 3d. Prozent je Lektion: groß die eingestellte Richtung, klein die andere --- */
{
  const pg = await seite();
  await pg.evaluate(() => { for(const c of CARDS) P[key(c.id, "df")] = { b:4, hi:4, due:Date.now() + 3 * DAY, n:4, w:0, ty:1 }; persist(); });
  await pg.reload();
  await pg.click('[data-opt="dir"] [data-v="df"]');
  const les = '.les[data-les] .pc';
  ok((await pg.textContent(les + " b")).includes("100 %"), "DE → FR eingestellt: groß 100 % — ist " + await pg.textContent(les + " b"));
  ok((await pg.textContent(les + " small")).includes("FR → DE 0 %"), "klein die andere Richtung — ist " + await pg.textContent(les + " small"));
  await pg.click('[data-opt="dir"] [data-v="fd"]');
  ok((await pg.textContent(les + " b")).trim() === "0 %", "FR → DE eingestellt: groß 0 %");
  ok((await pg.textContent(les + " small")).includes("DE → FR 100 %"), "klein DE → FR 100 %");
  const breit = await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  ok(breit, "kein seitliches Scrollen bei 390 px");
  await pg.screenshot({ path: process.env.SHOT || "/dev/null" }).catch(() => {});
  ok(!pg.errs.length, "keine Fehler auf der Seite: " + pg.errs.join(" | "));
  await pg.close();
}

/* --- 3e. Sterne: Woche mit 5 Lerntagen = 1 Stern, Einlösen mit Nachfrage, Sicherung trägt sie --- */
{
  const pg = await seite();
  ok(await pg.textContent("#starBox").then(t => t.includes("⭐ 0")), "ohne Lerntage 0 Sterne");
  ok(!(await pg.isVisible("#starRedeem")), "ohne Sterne kein Einlösen");
  await pg.evaluate(() => {   /* letzte Woche: Mo–Fr je 10 Antworten, 8 richtig */
    const mo = wochenStart(Date.now()) - 7 * DAY;
    for(let i = 0; i < 5; i++) DAYS[dayKey(mo + i * DAY + 12 * 3600e3)] = { n:40, r:30, v:2 };
    persist();
  });
  await pg.reload();
  ok((await pg.textContent("#starBox")).includes("⭐ 1"), "ein Stern für die volle Woche");
  await pg.click("#starRedeem");      /* Dialoge: 1 Stern (Vorgabe), Wofür leer */
  ok((await pg.textContent("#starBox")).includes("⭐ 0"), "nach Einlösen 0");
  ok((await pg.textContent("#starBox")).includes("1 ⭐ eingelöst"), "Kontoauszug zeigt die Einlösung");
  const sich = await pg.evaluate(() => JSON.stringify({ app:"vokabeln", v:1, exported:new Date().toISOString(), state:S, p:P, days:{}, stars:STARS }));
  await pg.evaluate(() => { localStorage.clear(); });
  await pg.reload();
  await pg.evaluate(t => restore(t), sich);
  ok((await pg.textContent("#starBox")).includes("1 ⭐ eingelöst") && (await pg.textContent("#starBox")).includes("⭐ 0"), "Wiederherstellen bringt Sterne und Einlösungen mit");
  ok(!pg.errs.length, "keine Fehler auf der Seite: " + pg.errs.join(" | "));
  await pg.close();
}

/* --- 3f. Papa-Geheimknopf: 5× auf den Titel, Code STERN / TAG --- */
{
  const pg = await seite();
  const antworten = [];
  pg.removeAllListeners("dialog");
  pg.on("dialog", d => d.type() === "prompt" ? d.accept(antworten.length ? antworten.shift() : d.defaultValue()) : d.accept());
  const tippen = async n => { for(let i = 0; i < n; i++) await pg.click("#title"); };
  antworten.push("STERN");
  await tippen(4);
  ok((await pg.textContent("#starBox")).includes("⭐ 0"), "4 Tipper: nichts passiert");
  await tippen(1);
  ok((await pg.textContent("#starBox")).includes("⭐ 1"), "5. Tipper + STERN → Bonusstern");
  ok((await pg.textContent("#starBox")).includes("Bonus von Papa"), "Bonus steht im Kontoauszug");
  antworten.push("falsch");
  await tippen(5);
  ok((await pg.textContent("#starBox")).includes("⭐ 1"), "falscher Code ändert nichts");
  /* TAG: Mo–(heute-1) schon Lerntage bis auf einen, heute geschenkt → je nach Wochentag ggf. Stern */
  antworten.push("tag");   /* zweite Nachfrage: Vorgabe = heute */
  await tippen(5);
  ok(await pg.evaluate(() => dayDone(DAYS[dayKey(Date.now())]) && weekStatus(DAYS, Date.now()).cells.find(c => c.today).done), "TAG → heute zählt als Lerntag, auch im Wochenkalender");
  await pg.reload();
  ok(await pg.evaluate(() => dayDone(DAYS[dayKey(Date.now())])), "geschenkter Tag übersteht Neuladen");
  await pg.evaluate(() => { VIEW = "quiz"; });
  antworten.push("STERN"); await tippen(5);
  ok(await pg.evaluate(() => sterneStand(STARS)) === 1, "Geheimknopf nur im Startbild");
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
