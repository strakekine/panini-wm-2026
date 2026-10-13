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
           totals, starterDays, parseClock, tplById, mid, importRecipe, toImportText, extractJSON,
           suggest, nearestEat, planFor, WEEK, learned, offRange, needBackup, absorb, timeline };`)();

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

  /* Sauerteig und Poolish gleichzeitig in einem Schritt: 10-%-Regel nur am Sauerteig-Teil */
  const parallel = { name:"Parallel", essen:[2,30], schritte:[
    { titel:"Sauerteig und Poolish ansetzen", sauerteig:true, dauer:[12,14], arbeit:10, was:"beides ansetzen",
      zutaten:[{name:"Roggenmehl",g:100,art:"mehl",teil:"Sauerteig"},{name:"Wasser",g:100,art:"wasser",teil:"Sauerteig"},
               {name:"Anstellgut",g:10,art:"anstellgut",teil:"Sauerteig"},
               {name:"Weizenmehl",g:200,art:"mehl",teil:"Poolish"},{name:"Wasser",g:200,art:"wasser",teil:"Poolish"},{name:"Hefe",g:0.5,art:"hefe",teil:"Poolish"}] },
    { titel:"Kneten", dauer:[1,1], arbeit:15, was:"k", zutaten:[{name:"Sauerteig",g:210,art:"sauerteig"},{name:"Poolish",g:400,art:"vorteig"},{name:"Weizenmehl",g:200,art:"mehl"}] },
    { titel:"Aus dem Ofen", dauer:[0,0], arbeit:2, was:"x" } ] };
  const rp = M.importRecipe(parallel);
  ok(rp.recipe && !rp.warn.length, "Sauerteig + Poolish in einem Schritt: kein falscher 10-%-Alarm — " + JSON.stringify(rp.warn));
  ok(rp.recipe.steps[0].ing[3].n === "Poolish: Weizenmehl", "Zutat zeigt ihren Teil");
  nah(M.totals(rp.recipe.steps).mehl, 500, "Mehl aller Teile zählt zum Gesamtmehl");
  const rp2 = M.importRecipe(JSON.parse(M.toImportText(rp.recipe)));
  ok(rp2.recipe && rp2.recipe.steps[0].ing[3].n === "Poolish: Weizenmehl", "Rundreise: Teil bleibt, nicht doppelt");
  const falsch = JSON.parse(JSON.stringify(parallel)); falsch.schritte[0].zutaten[2].g = 30;
  ok(M.importRecipe(falsch).warn.some(w => /30 %/.test(w)), "mit Teil: falsches Anstellgut im Sauerteig wird trotzdem gemeldet");
  const ohneTeil = JSON.parse(JSON.stringify(parallel)); ohneTeil.schritte[0].zutaten.forEach(z => delete z.teil);
  ok(!M.importRecipe(ohneTeil).warn.length, "ohne Teil, aber mit Hefe im Schritt: lieber keine Prüfung als falscher Alarm");

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

/* --- Planer: jeder Vorschlag hält alle Regeln ein --- */
{
  const now = at(2026, 10, 17, 10), fed = at(2026, 10, 17, 9);
  /* Prüft einen Vorschlag gegen die Regeln, unabhängig vom Suchverfahren */
  const pruefe = (tpl, p, eat, name, week, ab = now) => {
    const n = p.steps.length;
    ok(p.t[0] >= ab, name + ": beginnt nicht vor jetzt");
    ok(p.end >= eat - tpl.eat[1]*H - 1 && p.end <= eat - tpl.eat[0]*H + 1, name + ": Ende im Essfenster");
    for(let i = 0; i < n - 1; i++){
      ok(p.d[i] >= p.steps[i].h[0] - 1e-9 && p.d[i] <= p.steps[i].h[1] + 1e-9, name + ": Dauer " + p.steps[i].title + " in der Spanne");
      nah(p.t[i+1] - p.t[i], p.d[i]*H, name + ": Zeiten passen zu den Dauern", 1);
    }
    p.steps.forEach((s, i) => {
      for(let t = p.t[i]; t < p.t[i] + Math.max(1, s.hand)*60e3; t += 60e3)
        if(M.blockAt(t, week)){ ok(false, name + ": Handgriff " + s.title + " um " + new Date(t).toString().slice(0,21) + " blockiert"); break; }
      if(s.stay) for(let t = p.t[i]; t < p.t[i+1]; t += 60e3)
        if(M.blockAt(t, week)){ ok(false, name + ": " + s.title + " (Ofen an) um " + new Date(t).toString().slice(0,21) + " nicht zu Hause"); break; }
    });
    const si = p.steps.findIndex(s => s.sour);
    if(si >= 0) ok(p.t[si] - fed <= 7*DAY, name + ": Ansatz höchstens 7 Tage nach Fütterung (sonst aufgefrischt)");
  };
  /* Das Beispiel aus dem Gespräch: Weizenbrot für Dienstag 19:00 */
  const w = M.tplById("weizen"), eat = at(2026, 10, 20, 19);
  const s = M.suggest(w, 500, eat, fed, M.WEEK, now);
  ok(s.length >= 1, "Weizen für Di 19:00: mindestens ein Vorschlag");
  s.forEach((p, k) => pruefe(w, p, eat, "Weizen Di 19:00 #" + k));
  ok(s.every(p => new Date(p.t[0]).getDay() === 0), "Weizen Di 19:00: Start am Sonntag (Montag vor der Arbeit reicht nicht)");
  /* Roggen: echte Abwägung zwischen 'alles am Wochenende' und 'frischer' */
  const r = M.tplById("roggen"), sr = M.suggest(r, 500, eat, fed, M.WEEK, now);
  ok(sr.length === 2 && sr[0].wk === 0 && sr[1].age < sr[0].age, "Roggen Di 19:00: Wochenende gegen frischer");
  sr.forEach((p, k) => pruefe(r, p, eat, "Roggen Di 19:00 #" + k));
  /* Viele Essenszeiten, alle Vorlagen: kein Vorschlag bricht eine Regel */
  let gesamt = 0;
  for(const t of M.TPL) for(let k = 0; k < 7*24; k += 5){
    const e = now + 30*H + k*H;
    M.suggest(t, 500, e, fed, M.WEEK, now).forEach(p => { gesamt++; pruefe(t, p, e, t.id + " +" + k + "h"); });
  }
  ok(gesamt > 50, "Regelprüfung über " + gesamt + " Vorschläge");
  /* Auffrischen: Fütterung lange her → vorne Auffrischen, und es liegt selbst nicht in der Nacht */
  /* (Für Di 19:00 selbst gibt es dann keinen Weg: 4–8 h Auffrischen mehr, und entweder fällt
     das Falten in die Nacht oder der Kühlschrank müsste über 20 h.) */
  ok(M.suggest(w, 500, eat, at(2026, 10, 5, 9), M.WEEK, now).length === 0, "alte Fütterung: Di 19:00 geht nicht mehr");
  let alt = [];
  for(let k = 0; k < 5*24; k += 3) alt = alt.concat(M.suggest(w, 500, eat + k*H, at(2026, 10, 5, 9), M.WEEK, now));
  ok(alt.length > 0 && alt.every(p => p.refresh && p.steps[0].refresh), "alte Fütterung: alle Vorschläge mit Auffrischen vorne");
  /* Hefebrot für Dienstag 19:00 geht nicht (Arbeit bis 16, 3,5 h + 1,5 h Auskühlen) → Ausweichzeiten */
  const h = M.tplById("hefe");
  ok(M.suggest(h, 500, eat, fed, M.WEEK, now).length === 0, "Hefebrot Di 19:00: kein Vorschlag");
  const nb = M.nearestEat(h, 500, eat, fed, M.WEEK, now);
  ok(nb.after > eat && nb.before < eat, "Hefebrot: Ausweichzeit davor und danach");
  ok(M.suggest(h, 500, nb.after, fed, M.WEEK, now).length >= 1, "Ausweichzeit danach ist wirklich machbar");
  ok(M.suggest(h, 500, nb.before, fed, M.WEEK, now).length >= 1, "Ausweichzeit davor ist wirklich machbar");
  /* Kurzer Termin (Sa 12:00–12:30) mitten in einer möglichen Ofenstunde: Der Ofen darf
     nicht laufen, während man weg ist, auch wenn Vorheizen und Backen davor und danach
     beginnen könnten. Mit Deiner Woche fällt das nie auf — darum eine eigene. */
  const kurz = { work:{ 6:[12, 12.5] }, sleep:[21, 6] };
  let kn = 0;
  for(let k = 0; k < 48; k++){
    const e = at(2026, 10, 17, 12) + k*15*60e3;
    M.suggest(h, 500, e, fed, kurz, at(2026, 10, 17, 6)).forEach(p => { kn++; pruefe(h, p, e, "Termin Sa 12:00 +" + k, kurz, at(2026, 10, 17, 6)); });
  }
  ok(kn > 10, "Termin-Woche: " + kn + " Vorschläge geprüft");

  /* Übernommener Vorschlag: planFor rechnet mit dessen Dauern */
  const p0 = s[0], pf = M.planFor(w, 500, p0.t[0], fed, { refresh:p0.refresh, ds:p0.d });
  ok(pf.tl.every((x, i) => Math.abs(x.t - p0.t[i]) < 1000), "übernommener Plan: Ablauf = Vorschlag");
}

/* --- Abweichung vom Plan auffangen --- */
{
  /* Der Fall vom 13.10.: Sauerteig 12–16 h, geplant 20:55 → Kneten 12:40 (15,75 h); angesetzt 20:28 */
  const w = M.tplById("weizen");
  const plan = () => { const s = M.makeSteps(w, 500, false); s[0].h = [12, 16]; s[0].p = 15.75; return s; };
  const p0 = at(2026, 10, 13, 20, 55), target = M.timeline(plan(), [], p0).map(x => x.t);
  nah(target[1], at(2026, 10, 14, 12, 40), "geplant: Kneten Mi 12:40");
  const fr = plan(), dFr = [at(2026, 10, 13, 20, 28)];
  M.absorb(fr, dFr, target);
  const tFr = M.timeline(fr, dFr, dFr[0]);
  nah(tFr[1].t, at(2026, 10, 14, 12, 28), "27 min zu früh: Sauerteig bis ans Ende der Spanne (16 h) → 12:28, nicht 12:13");
  nah(tFr[3].t - target[3], -12*60e3, "Falten hat feste Abstände: bleibt 12 min früher", 1000);
  nah(tFr[4].t, target[4], "die Stockgare fängt den Rest auf — ab dem Formen stimmen die Uhrzeiten wieder");
  ok(fr.every((s, i) => i === fr.length - 1 || (s.p >= s.h[0] - 1e-9 && s.p <= s.h[1] + 1e-9)), "nie ausserhalb der Rezeptspannen");
  const sp = plan(), dSp = [at(2026, 10, 13, 21, 30)];
  M.absorb(sp, dSp, target);
  nah(M.timeline(sp, dSp, dSp[0])[1].t, target[1], "35 min zu spät: Kneten bleibt 12:40");
  nah(M.timeline(sp, dSp, dSp[0]).slice(-1)[0].t, target[target.length-1], "und das Brot ist zur geplanten Zeit aus dem Ofen");
  /* Später im Lauf: Kneten 50 min zu spät → Stockgare und Kühlschrank fangen es auf */
  const la = plan(), dLa = [target[0], target[1] + 50*60e3];
  M.absorb(la, dLa, target);
  const tLa = M.timeline(la, dLa, dLa[0]);
  nah(tLa[tLa.length-1].t, target[target.length-1], "Kneten 50 min zu spät: aus dem Ofen trotzdem wie geplant");
  ok(la.every((s, i) => i === la.length - 1 || (s.p >= s.h[0] - 1e-9 && s.p <= s.h[1] + 1e-9)), "auch dabei in den Spannen");
  const ohne = plan(); M.absorb(ohne, [p0], undefined);
  nah(ohne[0].p, 15.75, "ohne geplante Uhrzeiten ändert sich nichts");
}

/* --- Lernen aus dem Verlauf --- */
{
  const T = ["Anstellgut auffrischen", "Sauerteig ansetzen", "Hauptteig kneten", "Aus dem Ofen"];
  const e = (rid, h, extra) => ({ rid, titles:T, times:[0, h[0], h[0]+h[1], h[0]+h[1]+h[2]].map(x => at(2026,10,1,8) + x*H), ...extra });
  const log = [
    e("weizen", [6, 15, 4]), e("weizen", [5, 16, 4]), e("roggen", [7, 12, 2]),
    { rid:"weizen", titles:T, times:[at(2026,10,1,8)] },            /* abgebrochen: nichts zu lernen */
    { tpl:"weizen", titles:T.slice(1), times:[0, 14].map(x => at(2026,10,1,8) + x*H) }   /* alter Eintrag mit tpl statt rid */
  ];
  const l = M.learned(log, "weizen");
  ok(l["Sauerteig ansetzen"].n === 3, "Sauerteig: drei Weizen-Brote, Roggen zählt nicht — ist " + (l["Sauerteig ansetzen"] || {}).n);
  nah(l["Sauerteig ansetzen"].avg, 15, "Sauerteig Ø 15 h");
  ok(l["Anstellgut auffrischen"].n === 3, "Auffrischen zählt über alle Rezepte (dasselbe Glas)");
  ok(!l["Aus dem Ofen"], "letzter Schritt hat keine Dauer");
  ok(M.offRange(l["Sauerteig ansetzen"], [10, 14]) === 1, "Ø 15 h bei Rezept 10–14 h → länger");
  ok(M.offRange(l["Sauerteig ansetzen"], [12, 16]) === 0, "Ø 15 h bei Rezept 12–16 h → passt");
  ok(M.offRange({ n:1, avg:20 }, [10, 14]) === 0, "ein einzelnes Brot reicht nicht für eine Meldung");
  const viele = []; for(let k = 0; k < 8; k++) viele.push(e("weizen", [6, k < 3 ? 20 : 12, 4]));
  nah(M.learned(viele, "weizen")["Sauerteig ansetzen"].avg, 12, "nur die letzten fünf Brote zählen");
}

/* --- Erinnerung an die Sicherung --- */
{
  const now = at(2026, 10, 30, 12), d = x => now - x*DAY;
  ok(!M.needBackup(null, null, null, now), "nichts geändert, nie gesichert → keine Erinnerung (leere App)");
  ok(M.needBackup(d(1), null, null, now), "Änderung, nie gesichert → erinnern");
  ok(!M.needBackup(d(1), d(5), null, now), "Sicherung 5 Tage alt → noch nicht");
  ok(M.needBackup(d(1), d(20), null, now), "Sicherung 20 Tage alt, seitdem geändert → erinnern");
  ok(!M.needBackup(d(25), d(20), null, now), "Sicherung 20 Tage alt, aber nichts geändert → nicht erinnern");
  ok(!M.needBackup(d(1), d(20), now + DAY, now), "Später gedrückt → Ruhe");
  ok(M.needBackup(d(1), d(20), now - 1, now), "Später abgelaufen → wieder erinnern");
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
