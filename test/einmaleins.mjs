/* Prüft die Logik in einmaleins.html: Karten, Karteikasten, Level, Heuballen, Medaillen,
   Lerntag/Sterne, Laden.  Aufruf:  node test/einmaleins.mjs   Rückgabewert 1 bei Abweichung. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const hier = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(hier, "..", "einmaleins.html"), "utf8");
const i = src.indexOf("===== Logik"), j = src.indexOf("===== Oberfläche");
if(i < 0 || j < 0) throw new Error("Abschnittsmarken Logik/Oberfläche nicht gefunden");
const quelle = src.slice(src.lastIndexOf("/*", i), src.lastIndexOf("/*", j));
const M = new Function(quelle + `
  return { DAY, FACH, KISTEN_MAX, SCHNELL_MS, startOfDay, cardsFor, cardFromId, frage, loesung, grade, levelBauen,
           faelligZahl, auswahl, medaille, stufe, dayKey, dayDone, countDay, weekStatus, pruneDays, sternWochen,
           sanitizeStars, sterneNachtragen, sterneStand, papaCode, WAREN, kaufen, anziehen, ablegen, needBackup,
           STUFEN, FUTTER, stufeVon, ausgewachsen, naechsteStufe, fuettern, wachsStart,
           KLEIDUNG, kindKaufen, kindAnziehen, kindAblegen, blitzAussage, blitzPunkte, blitzKarotten, memoryKarten, memoryKarotten,
           rennKarotten, RENN_ZIEL, QUESTS, tagesQuests, questStand, questMelden, ABZEICHEN, abzeichenNeu };`)();

let fehler = 0, n = 0;
function ok(bed, text){ n++; if(!bed){ fehler++; console.log("✗ " + text); } }
const D = M.DAY, jetzt = new Date(2026, 10, 23, 15, 0).getTime(), heute0 = M.startOfDay(jetzt);
let s = 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;

/* --- Karten und Fragen --- */
ok(M.cardsFor("mal", [1,2,3,4,5,6,7,8,9,10], 10).length === 100, "100 Mal-Aufgaben bis 10·10");
ok(M.cardsFor("mix", [7], 10).length === 20, "7er-Reihe gemischt = 20");
ok(M.cardsFor("geteilt", [3], 12).length === 12, "3er-Reihe geteilt bis 12");
ok(M.frage({ o:"m", k:7, r:8 }).text === "7 · 8" && M.frage({ o:"m", k:7, r:8 }).a === 56, "7 · 8 = 56");
ok(M.frage({ o:"d", k:7, r:8 }).text === "56 : 8" && M.frage({ o:"d", k:7, r:8 }).a === 7, "56 : 8 = 7");
ok(M.loesung(M.cardFromId("d:6:9")) === "54 : 9 = 6", "Lösungstext Geteilt");

/* --- Karteikasten --- */
let p = M.grade(undefined, true, "rechnen", 3000, jetzt);
ok(p.f === 1 && p.due === heute0 + D, "neu richtig → Fach 1, morgen");
p = M.grade({ f:3, due:jetzt - 1, hi:3, n:5 }, true, "kisten", 1000, jetzt);
ok(p.f === 3 && p.wt === 1, "Heuballen bringen höchstens Fach 3 (Marke wt)");
p = M.grade({ f:3, due:jetzt - 1, hi:3, n:5 }, true, "rechnen", 9000, jetzt);
ok(p.f === 3 && p.wt === 1, "langsam getippt bleibt Fach 3");
p = M.grade({ f:3, due:jetzt - 1, hi:3, n:5 }, true, "rechnen", 4000, jetzt);
ok(p.f === 4 && !p.wt && p.due === heute0 + 7 * D, "schnell getippt → sicher, 7 Tage");
p = M.grade({ f:3, due:jetzt + 3 * D, hi:3, n:5, wt:1 }, true, "rechnen", 4000, jetzt);
ok(p.f === 4, "wt-Karte schnell getippt → sofort sicher, auch nicht fällig");
p = M.grade({ f:2, due:jetzt + 3 * D, hi:2, n:5 }, true, "rechnen", 2000, jetzt);
ok(p.f === 2 && p.due === jetzt + 3 * D, "richtig, aber nicht fällig → nichts ändert sich");
p = M.grade({ f:4, due:jetzt + 3 * D, hi:4, n:5 }, false, "kisten", 0, jetzt);
ok(p.f === 1 && p.bad === 1 && p.due === heute0 + D, "falsch nach Fach 2+ → Fach 1, morgen, rot");
p = M.grade({ f:1, due:jetzt, hi:1, n:2 }, false, "rechnen", 0, jetzt);
ok(p.f === 0, "falsch, nie über Fach 1 → Fach 0");
ok(!M.grade({ f:1, due:jetzt, hi:1, n:2, bad:1 }, true, "kisten", 0, jetzt).bad, "richtig nimmt die rote Marke weg");

/* --- Level --- */
const karten = M.cardsFor("mal", [1,2,3,4,5,6,7,8,9,10], 10);
let L = M.levelBauen(karten, {}, jetzt, 10, rnd);
ok(L.length === 10 && new Set(L.map(c => c.id)).size === 10, "Level: 10 verschiedene Aufgaben");
const P = {};
karten.slice(0, 30).forEach((c, x) => P[c.id] = { f:x % 4, due:x < 6 ? jetzt - 1 : jetzt + 2 * D, hi:x % 4, n:1 });
L = M.levelBauen(karten, P, jetzt, 10, rnd, 4);
ok(L.filter(c => P[c.id] && P[c.id].due <= jetzt).length === 6, "alle 6 fälligen im Level");
ok(L.filter(c => !P[c.id]).length === 4, "höchstens 4 neue, wenn es Bekanntes gibt");
ok(M.levelBauen(M.cardsFor("mal", [1], 10).slice(0, 3), {}, jetzt, 10, rnd).length === 3, "weniger Karten als 10 → kürzeres Level");
ok(M.faelligZahl(karten, P, jetzt) === 76, "fällig = 6 fällige + 70 neue");

/* --- Heuballen: vier verschiedene, positive, genau eine richtig --- */
for(const c of M.cardsFor("mix", [1,2,3,4,5,6,7,8,9,10,11,12], 12)){
  const a = M.auswahl(c, rnd), r = M.frage(c).a;
  if(!(a.length === 4 && new Set(a).size === 4 && a.every(x => x > 0) && a.filter(x => x === r).length === 1)){ ok(false, "Heuballen für " + c.id + ": " + a); break; }
}
ok(true, "Heuballen geprüft");

/* --- Medaillen --- */
ok(M.medaille({ fertig:true, fehler:0, schnitt:3000, art:"kisten", fallMs:9000 }) === "gold", "Gold");
ok(M.medaille({ fertig:true, fehler:0, schnitt:6000, art:"kisten", fallMs:9000 }) === "silber", "fehlerfrei aber langsam → Silber");
ok(M.medaille({ fertig:true, fehler:2, schnitt:2000, art:"rechnen" }) === "bronze", "2 Fehler → Bronze");
ok(M.medaille({ fertig:false, fehler:3, schnitt:2000, art:"kisten", fallMs:9000 }) === null, "ohne Herzen keine Medaille");

/* --- Tafel --- */
ok(M.stufe(undefined) === "neu" && M.stufe({ f:4 }) === "gruen" && M.stufe({ f:4, bad:1 }) === "rot", "Tafelfarben");

/* --- Lerntag und Sterne --- */
let e; for(let x = 0; x < 30; x++) e = M.countDay(e, x < 19);
ok(!M.dayDone(e), "30 Antworten, 19 richtig → noch kein Lerntag");
e = M.countDay(e, true); ok(M.dayDone(e), "31 Antworten, 20 richtig → Lerntag");
const days = {}; const mo = new Date(2026, 10, 16).getTime();
for(let x = 0; x < 5; x++) days[M.dayKey(mo + x * D + 3600e3)] = { n:30, r:25 };
ok(M.sternWochen(days).length === 1, "5 Lerntage → ein Wochenstern");
let st = M.sterneNachtragen(M.sanitizeStars(null), days);
st = { ...st, b:[1], red:[{ t:1, n:1, was:"Eis" }] };
ok(M.sterneStand(st) === 1, "Sternstand: 1 Woche + 1 Bonus − 1 eingelöst");
ok(M.papaCode(" stern ") === "stern" && M.papaCode("x") === null, "Papa-Codes");
ok(M.weekStatus(days, jetzt).count === 0, "neue Woche beginnt bei 0");

/* --- Laden --- */
let sh = { k:120, owned:[], wear:[] };
sh = M.kaufen(sh, "schleife"); ok(sh.k === 90 && sh.wear.includes("schleife"), "kaufen zieht ab und zieht an");
sh = M.kaufen(sh, "krone"); ok(!sh.owned.includes("krone") && sh.k === 90, "zu teuer → nichts passiert");
sh = { k:1000, owned:[], wear:[] }; sh = M.kaufen(sh, "rosa"); sh = M.kaufen(sh, "regenbogen");
ok(sh.wear.includes("regenbogen") && !sh.wear.includes("rosa"), "nur eine Mähnenfarbe gleichzeitig");
ok(!M.ablegen(sh, "regenbogen").wear.includes("regenbogen"), "ablegen");

/* --- Wachsen --- */
ok(M.stufeVon(0) === 0 && M.stufeVon(39) === 0 && M.stufeVon(40) === 1 && M.stufeVon(800) === 4, "Stufengrenzen");
let r = M.fuettern({ k:10, owned:[], wear:[] }, { w:35, lieb:"hafer" }, "apfel");
ok(r && r.shop.k === 0 && r.pf.w === 46 && r.aufgestiegen === 1, "Apfel: −10 Karotten, +11, Aufstieg zum Jährling");
ok(M.fuettern({ k:9, owned:[], wear:[] }, { w:0, lieb:"heu" }, "apfel") === null, "zu wenig Karotten → kein Füttern");
r = M.fuettern({ k:20, owned:[], wear:[] }, { w:0, lieb:"hafer" }, "hafer");
ok(r.plus === 36 && r.lieb && r.pf.liebBekannt, "Lieblingsfutter × 1,5 und entdeckt");
ok(M.fuettern({ k:999, owned:[], wear:[] }, { w:800, lieb:"heu" }, "heu") === null, "ausgewachsen → kein Füttern mehr");
r = M.fuettern({ k:999, owned:[], wear:[] }, { w:790, lieb:"x" }, "zucker");
ok(r.pf.w === 800 && r.aufgestiegen === 4, "Wachstum gedeckelt bei Großes Pferd");
ok(M.naechsteStufe(50).bis === "junges Pony" && M.naechsteStufe(50).hat === 10 && M.naechsteStufe(800) === null, "Fortschritt zur nächsten Stufe");
ok(M.wachsStart({ owned:["schleife","halstuch"] }) === 80 && M.wachsStart({ owned:M.WAREN.map(w => w.id) }) === 160, "Einstieg: Ausgegebenes zählt, höchstens Junges Pony");
ok(M.kaufen({ k:999, owned:[], wear:[] }, "sattel", 2).owned.length === 0 && M.kaufen({ k:999, owned:[], wear:[] }, "sattel", 3).owned.includes("sattel"), "Sattel erst ab Pony");

/* --- Kleidung fürs Kind --- */
let ks = { k:100, owned:[], wear:[], kwear:[] };
ks = M.kindKaufen(ks, "muetze"); ks = M.kindKaufen(ks, "reithelm");
ok(ks.k === 10 && ks.kwear.length === 1 && ks.kwear[0] === "reithelm" && ks.owned.includes("muetze"), "gleicher Platz: Reithelm ersetzt Mütze");
ks = M.kindAnziehen(ks, "muetze"); ok(ks.kwear.join() === "muetze", "wieder Mütze anziehen");
ok(M.kindKaufen({ k:10, owned:[], wear:[], kwear:[] }, "haarreif").owned.length === 0, "zu teuer → nichts");
ok(M.kindAblegen(ks, "muetze").kwear.length === 0, "ausziehen");
ok(new Set(M.KLEIDUNG.map(k => k.id)).size === M.KLEIDUNG.length, "Kleidungs-ids eindeutig");

/* --- Spiele --- */
let wahr = 0;
for(const c of M.cardsFor("mix", [1,2,3,4,5,6,7,8,9,10], 10)){
  const a = M.blitzAussage(c, rnd), soll = M.frage(c).a, zeigt = +a.text.split("= ")[1];
  if((zeigt === soll) !== a.wahr){ ok(false, "Wahr/falsch stimmt nicht für " + c.id + ": " + a.text); break; }
  if(a.wahr) wahr++;
}
ok(wahr > 60 && wahr < 140, "Wahr/falsch etwa halb-halb (" + wahr + " von 200)");
ok(M.blitzPunkte(10, 4) === 6 && M.blitzPunkte(2, 5) === 0 && M.blitzKarotten(30) === 12, "Punkte und Karotten bei Wahr oder falsch");
for(let x = 0; x < 30; x++){
  const mk = M.memoryKarten(M.cardsFor("mix", [2,3,4], 10), rnd);
  const erg = mk.filter(k => k.art === "ergebnis").map(k => k.text);
  if(mk.length !== 12 || new Set(erg).size !== 6){ ok(false, "Memory: 12 Karten, 6 verschiedene Ergebnisse"); break; }
}
ok(M.memoryKarten(M.cardsFor("mal", [1], 3), rnd).length === 6, "Memory mit wenigen Karten: weniger Paare");
ok(M.memoryKarotten(6, 6) === 9 && M.memoryKarotten(6, 11) === 7 && M.memoryKarotten(6, 20) === 5, "Memory-Karotten");
ok(M.rennKarotten(14, true) === 17 && M.rennKarotten(5, false) === 5, "Rennen-Karotten");

/* --- Tagesaufgaben --- */
const t1 = M.tagesQuests("2026-11-23"), t2 = M.tagesQuests("2026-11-23"), t3 = M.tagesQuests("2026-11-24");
ok(t1.length === 3 && t1.map(q => q.id).join() === t2.map(q => q.id).join(), "Tagesaufgaben: drei, am selben Tag gleich");
ok(t1.map(q => q.id).join() !== t3.map(q => q.id).join() || M.tagesQuests("2026-11-25").map(q => q.id).join() !== t1.map(q => q.id).join(), "an anderen Tagen andere");
ok(Array.from({ length:30 }, (_, i) => M.tagesQuests("2026-12-" + String(i + 1).padStart(2, "0"), true)).every(l => !l.some(q => q.typ === "fuettern")), "ausgewachsen: nie Füttern");
const heute = M.QUESTS.filter(q => ["richtig", "blitz", "memory"].includes(q.id));
let q = M.questStand(null, "2026-11-23");
let r2 = M.questMelden(q, heute, "richtig", 20); ok(r2.neu.length === 0 && r2.q.fort.richtig === 20, "Aufgabe zählt hoch");
r2 = M.questMelden(r2.q, heute, "richtig", 6); ok(r2.neu.length === 1, "25 richtig erreicht");
r2 = M.questMelden(r2.q, heute, "blitz", 8); r2 = M.questMelden(r2.q, heute, "blitz", 5); ok(r2.q.fort.blitz === 8 && !r2.neu.length, "Wahr/falsch zählt den besten Wert, nicht die Summe");
r2 = M.questMelden(r2.q, heute, "blitz", 13); ok(r2.neu.length === 1 && !r2.bonus, "12 Punkte geschafft");
r2 = M.questMelden(r2.q, heute, "memory", 1); ok(r2.bonus, "alle drei → Bonus");
ok(!M.questMelden(r2.q, heute, "memory", 1).bonus, "Bonus nur einmal");
ok(M.questStand(r2.q, "2026-11-24").fertig.length === 0, "neuer Tag, neue Liste");

/* --- Abzeichen --- */
const st0 = { medaillen:0, gold:0, sicherM:0, sicherD:0, reiheSicher:0, stufe:0, siege:0, memoryBest:0, blitzBest:0, sterne:0, richtig:0, reiterOutfit:false, tageshelden:0 };
ok(M.abzeichenNeu({}, st0).length === 0, "am Anfang keine Abzeichen");
ok(M.abzeichenNeu({}, { ...st0, medaillen:1, stufe:3 }).join() === "medaille1,jaehrling,pony", "Medaille, Jährling, Pony");
ok(M.abzeichenNeu({ medaille1:1 }, { ...st0, medaillen:5 }).length === 0, "einmal verdient, nicht doppelt");
ok(new Set(M.ABZEICHEN.map(a => a.id)).size === M.ABZEICHEN.length, "Abzeichen-ids eindeutig");

/* --- Sicherung --- */
ok(M.needBackup(jetzt - 8 * D, null, jetzt) && !M.needBackup(jetzt - 2 * D, null, jetzt) && !M.needBackup(null, null, jetzt), "Sicherungs-Erinnerung");

console.log((fehler ? "✗ " + fehler + " von " : "✓ alle ") + n + " Prüfungen" + (fehler ? " fehlgeschlagen" : " bestanden"));
process.exit(fehler ? 1 : 0);
