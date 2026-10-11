/* Prüft die Logik in brot.html: Vorlagen, Mengen, Auffrischen, Zeitachse, Wochenplan.
   Aufruf:  node test/brot.mjs
   Grün oder rot, kein Browser, keine Abhängigkeiten. Rückgabewert 1 bei Abweichung.

   Die Vorlagen-Regeln kommen vom Nutzer (CLAUDE.md, Abschnitt Brotplaner):
   Anstellgut = 10 % des Sauerteigmehls, Sauerteig mit 100 % Hydration,
   auffrischen, wenn die Fütterung beim Ansetzen mehr als 7 Tage zurückliegt. */
process.env.TZ = "Europe/Luxembourg";   /* Wochenplan ist Wanduhr — Tests in seiner Zeitzone */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const hier = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(hier, "..", "brot.html"), "utf8");
const i = src.indexOf("===== Logik"), j = src.indexOf("===== Oberfläche");
if(i < 0 || j < 0) throw new Error("Abschnittsmarken Logik/Oberfläche nicht gefunden");
const quelle = src.slice(src.lastIndexOf("/*", i), src.lastIndexOf("/*", j));
const M = new Function(quelle + `
  return { TPL, REFRESH, H, DAY, BASE, makeSteps, timeline, planFor, blockAt, firstFree,
           totals, starterDays, parseClock, tplById, mid, importRecipe, toImportText, extractJSON };`)();

let fehler = 0, n = 0;
function ok(bed, text){ n++; if(!bed){ fehler++; console.log("✗ " + text); } }
function nah(a, b, text, tol = 1e-9){ ok(Math.abs(a - b) <= tol, text + " — ist " + a + ", soll " + b); }
const { H, DAY } = M;
const at = (y, mo, d, h, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

/* --- Vorlagen sind in sich stimmig --- */
for(const t of M.TPL){
  ok(t.steps.every(s => s.h[0] <= s.h[1] && s.h[0] >= 0), t.id + ": Spannen min ≤ max");
  const last = t.steps[t.steps.length - 1];
  ok(last.h[0] === 0 && last.h[1] === 0, t.id + ": letzter Schritt ist 'Aus dem Ofen' ohne Dauer");
  ok(t.eat[0] < t.eat[1], t.id + ": Essfenster");
  const tot = M.totals(t.steps);
  nah(tot.mehl, M.BASE, t.id + ": Gesamtmehl = 500 g");
  const sour = t.steps.find(s => s.sour);
  if(sour){
    const mehl = sour.ing.filter(x => x.k === "mehl").reduce((a, x) => a + x.g, 0);
    const wasser = sour.ing.filter(x => x.k === "wasser").reduce((a, x) => a + x.g, 0);
    const asg = sour.ing.filter(x => x.k === "asg").reduce((a, x) => a + x.g, 0);
    nah(wasser / mehl, 1, t.id + ": Sauerteig 100 % Hydration");
    nah(asg / mehl, 0.10, t.id + ": Anstellgut = 10 % des Sauerteigmehls");
    const sd = t.steps.flatMap(s => s.ing || []).find(x => x.k === "sd");
    nah(sd.g, mehl + wasser + asg, t.id + ": Hauptteig nimmt den ganzen Sauerteig");
  }
}
nah(M.totals(M.tplById("weizen").steps).hyd, 0.70, "weizen: Hydration 70 %");
nah(M.totals(M.tplById("roggen").steps).hyd, 0.74, "roggen: Hydration 74 %");
nah(M.totals(M.tplById("hefe").steps).hyd, 0.68, "hefe: Hydration 68 %");
{ const s = M.tplById("weizen").steps.find(s => s.sour); nah(s.ing[0].g / M.BASE, 0.20, "weizen: 20 % des Mehls versäuert"); }

/* --- Skalieren --- */
{
  const s = M.makeSteps(M.tplById("weizen"), 1000, false);
  nah(M.totals(s).mehl, 1000, "1000 g Mehl skaliert");
  nah(s[0].ing.find(x => x.k === "asg").g, 20, "Anstellgut skaliert mit");
  ok(M.tplById("weizen").steps[0].ing[0].g === 100, "Vorlage selbst bleibt unverändert");
  const r = M.makeSteps(M.tplById("weizen"), 1000, true);
  ok(r[0].refresh && r[0].ing.every(x => x.g === 50), "Auffrischen: feste 50/50/50, nicht skaliert");
  nah(M.totals(r).mehl, 1000, "Auffrischen zählt nicht zum Teigmehl");
}

/* --- Auffrischen: gemessen am Ansatz, nicht an heute --- */
{
  const start = at(2026, 10, 18, 7);                       /* So 7:00 */
  const w = M.tplById("weizen");
  ok(!M.planFor(w, 500, start, null).refresh, "ohne Fütterungsdatum kein Auffrischen");
  ok(!M.planFor(w, 500, start, start - 6*DAY).refresh, "6 Tage: direkt aus dem Kühlschrank");
  ok(!M.planFor(w, 500, start, start - 7*DAY).refresh, "genau 7 Tage: noch ohne Auffrischen");
  const p = M.planFor(w, 500, start, start - 8*DAY);
  ok(p.refresh && p.steps[0].refresh && p.steps[1].sour, "8 Tage: Auffrischen vor dem Sauerteig");
  nah(p.tl[1].t - p.tl[0].t, 6*H, "Auffrischen 4–8 h, Mitte 6 h");
  ok(!M.planFor(M.tplById("hefe"), 500, start, start - 30*DAY).refresh, "Hefebrot frischt nie auf");
}

/* --- Zeitachse --- */
{
  const w = M.tplById("weizen"), steps = M.makeSteps(w, 500, false);
  const start = at(2026, 10, 18, 7);                       /* So 7:00 */
  const tl = M.timeline(steps, [], start);
  const summe = steps.slice(0, -1).reduce((a, s) => a + M.mid(s.h), 0);
  nah((tl[tl.length - 1].t - start) / H, summe, "Ende = Summe der Mitten");
  ok(tl.every((r, i) => r.lo <= r.t && r.t <= r.hi), "lo ≤ t ≤ hi");
  /* Sonntagsplan aus dem Gespräch: So 7:00 ansetzen → kneten ≈ So 19:00 → aus dem Ofen Mo nachmittags */
  nah(tl[1].t, at(2026, 10, 18, 19), "Sonntagsplan: kneten So 19:00");
  ok(new Date(tl[tl.length - 1].t).getDay() === 1, "Sonntagsplan: aus dem Ofen am Montag");

  /* Laufender Teig: erledigte Schritte sind fest, der nächste wird nie in die Vergangenheit gelegt */
  const done = [start, start + 13*H];                      /* Sauerteig hat 13 h gebraucht */
  const now = start + 20*H;                                /* und dann vergessen */
  const r = M.timeline(steps, done, start, now);
  ok(r[0].done && r[1].done && r[1].t === done[1], "erledigte Schritte behalten ihre echte Zeit");
  nah(r[2].t, now, "überfälliger Schritt rückt auf jetzt");
  nah(r[3].t - r[2].t, 0.75*H, "danach geht es mit den Rezeptdauern weiter");
  const r2 = M.timeline(steps, done, start, start + 13.1*H);
  nah(r2[2].t, done[1] + 0.75*H, "nicht überfällig: Plan bleibt");
}

/* --- Wochenplan --- */
ok(M.blockAt(at(2026, 10, 12, 10)) === "Arbeitszeit", "Mo 10:00 Arbeit");
ok(M.blockAt(at(2026, 10, 12, 15, 45)) === "Arbeitszeit", "Mo 15:45 noch unterwegs");
ok(M.blockAt(at(2026, 10, 12, 16)) === null, "Mo 16:00 zu Hause");
ok(M.blockAt(at(2026, 10, 14, 13, 30)) === null, "Mi 13:30 zu Hause");
ok(M.blockAt(at(2026, 10, 16, 12)) === "Arbeitszeit", "Fr 12:00 Arbeit");
ok(M.blockAt(at(2026, 10, 17, 10)) === null, "Sa 10:00 frei");
ok(M.blockAt(at(2026, 10, 17, 22)) === "Schlafenszeit", "Sa 22:00 Schlaf");
ok(M.blockAt(at(2026, 10, 12, 5, 30)) === "Schlafenszeit", "Mo 5:30 Schlaf");
ok(M.blockAt(at(2026, 10, 12, 6, 30)) === null, "Mo 6:30 vor der Arbeit frei");
nah(M.firstFree(at(2026, 10, 12, 14), at(2026, 10, 12, 18)), at(2026, 10, 12, 16), "erste freie Zeit Mo 16:00");
ok(M.firstFree(at(2026, 10, 12, 9), at(2026, 10, 12, 12)) === null, "ganzer Rahmen in der Arbeit");
/* Zeitumstellung 25.10.: Wanduhr bleibt Wanduhr */
ok(M.blockAt(at(2026, 10, 26, 10)) === "Arbeitszeit", "Mo nach Zeitumstellung 10:00 Arbeit");

/* --- Import aus dem Claude-Chat --- */
{
  const beispiel = {
    name:"Testbrot", quelle:"Buch S. 12", beschreibung:"x", mehl:750, temperatur:20, essen:[3, 40],
    schritte:[
      { titel:"Sauerteig ansetzen", sauerteig:true, dauer:[12,16], arbeit:5, was:"rühren", weiter_wenn:"verdoppelt",
        zutaten:[{name:"Roggenvollkornmehl",g:150,art:"mehl"},{name:"Wasser",g:150,art:"wasser"},{name:"Anstellgut",g:15,art:"anstellgut"}] },
      { titel:"Kneten", dauer:[3,4], arbeit:20, was:"kneten",
        zutaten:[{name:"Sauerteig",g:315,art:"sauerteig"},{name:"Weizenmehl",g:600,art:"mehl"},{name:"Wasser",g:375,art:"wasser"},
                 {name:"Salz",g:15,art:"salz"},{name:"Sonnenblumenkerne",g:80,art:"sonstiges"}] },
      { titel:"Backen", dauer:[0.75,0.75], arbeit:10, was:"backen" },
      { titel:"Aus dem Ofen", dauer:[0,0], arbeit:2, was:"abkühlen" } ] };
  const r = M.importRecipe(beispiel);
  ok(r.recipe && !r.err.length && !r.warn.length, "sauberes Rezept: übernehmbar, ohne Hinweise — " + JSON.stringify(r.err.concat(r.warn)));
  nah(r.recipe.base, 750, "Basis = Mehl aus den Zutaten");
  ok(r.recipe.temp === 20 && r.recipe.eat[1] === 40, "Temperatur und Essfenster übernommen");
  ok(r.recipe.steps[0].sour && r.recipe.steps[1].ing.find(x => x.n === "Sonnenblumenkerne").k === "x", "Sauerteig erkannt, Sonstiges bleibt Sonstiges");
  const s = M.makeSteps(r.recipe, 500, false);
  nah(M.totals(s).mehl, 500, "importiertes Rezept skaliert auf 500 g");
  nah(M.totals(s).hyd, 0.70, "Hydration bleibt beim Skalieren");
  ok(M.planFor(r.recipe, 500, at(2026,10,18,7), at(2026,10,1,12)).refresh, "Auffrischen greift auch bei importierten Rezepten");

  const ohneEnde = JSON.parse(JSON.stringify(beispiel)); ohneEnde.schritte.pop();
  const r2 = M.importRecipe(ohneEnde);
  ok(r2.recipe && r2.recipe.steps[r2.recipe.steps.length-1].title === "Aus dem Ofen" && r2.warn.length === 1, "fehlendes 'Aus dem Ofen' wird ergänzt und gemeldet");

  const asg = JSON.parse(JSON.stringify(beispiel)); asg.schritte[0].zutaten[2].g = 30;
  ok(M.importRecipe(asg).warn.some(w => /20 %/.test(w)), "Anstellgut 20 % statt 10 % wird gemeldet");
  const falschesMehl = JSON.parse(JSON.stringify(beispiel)); falschesMehl.mehl = 1000;
  ok(M.importRecipe(falschesMehl).warn.some(w => /1000 g/.test(w)), "Mehlangabe passt nicht zu den Zutaten → Hinweis");

  const kaputt = JSON.parse(JSON.stringify(beispiel)); kaputt.schritte[1].dauer = "3 Stunden";
  ok(!M.importRecipe(kaputt).recipe, "Dauer als Text → nicht übernehmbar");
  const ohneMehl = JSON.parse(JSON.stringify(beispiel)); ohneMehl.schritte.forEach(x => (x.zutaten||[]).forEach(z => { if(z.art === "mehl") z.art = "sonstiges"; }));
  ok(!M.importRecipe(ohneMehl).recipe, "ohne Mehl → nicht übernehmbar");
  ok(!M.importRecipe(null).recipe && !M.importRecipe([1]).recipe && !M.importRecipe({}).recipe, "Unsinn → nicht übernehmbar");
  const einzel = JSON.parse(JSON.stringify(beispiel)); einzel.schritte[2].dauer = 0.75;
  ok(M.importRecipe(einzel).recipe.steps[2].h[1] === 0.75, "einzelne Zahl als Dauer wird [x, x]");

  /* Chat-Antwort mit Text und Codezaun drumherum */
  ok(M.extractJSON("Hier:\n```json\n" + JSON.stringify(beispiel) + "\n```\nViel Spaß").name === "Testbrot", "JSON aus Chat-Antwort gefischt");
  ok(M.extractJSON("kein json") === null && M.extractJSON("{ kaputt") === null, "ohne JSON → null");

  /* Jede Vorlage übersteht Export → Import unverändert (so funktioniert "als Text abwandeln") */
  for(const t of M.TPL){
    const back = M.importRecipe(JSON.parse(M.toImportText(t)));
    ok(back.recipe && !back.err.length && !back.warn.length, t.id + ": Rundreise ohne Fehler und Hinweise — " + JSON.stringify(back.err.concat(back.warn)));
    if(back.recipe){
      ok(JSON.stringify(back.recipe.steps.map(x => [x.title, x.h, !!x.sour])) === JSON.stringify(t.steps.map(x => [x.title, x.h, !!x.sour])), t.id + ": Schritte gleich");
      nah(M.totals(back.recipe.steps).hyd, M.totals(t.steps).hyd, t.id + ": Hydration gleich");
    }
  }
}

/* --- Kleinkram --- */
ok(M.starterDays(at(2026, 10, 4, 18), at(2026, 10, 11, 9)) === 7, "Starter: So → So = Tag 7");
ok(M.starterDays(at(2026, 10, 10, 23), at(2026, 10, 11, 7)) === 1, "Starter: gestern Abend = Tag 1");
ok(M.starterDays(null, Date.now()) === null, "Starter: unbekannt");
{
  const now = at(2026, 10, 12, 10);
  nah(M.parseClock("8:15", now), at(2026, 10, 12, 8, 15), "Uhrzeit heute");
  nah(M.parseClock("22.30", now), at(2026, 10, 11, 22, 30), "Uhrzeit in der Zukunft → gestern");
  ok(M.parseClock("8:15", now, at(2026, 10, 12, 9)) === null, "vor dem vorigen Schritt → abgelehnt");
  ok(M.parseClock("25:00", now) === null && M.parseClock("abc", now) === null, "Unsinn → null");
}

console.log((fehler ? "ROT" : "GRÜN") + ": " + (n - fehler) + " von " + n + " Prüfungen bestanden");
process.exit(fehler ? 1 : 0);
