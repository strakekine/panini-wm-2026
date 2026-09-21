/* Prüft das Gärmodell in pizza.html gegen die Sollwerte aus CLAUDE.md.
   Aufruf:  node test/modell.mjs
   Grün oder rot, kein Browser, keine Abhängigkeiten.

   Die Werte sind keine Willkür: Jeder bewacht eine Entscheidung, über die im
   Projekt gestritten wurde. Schlägt einer fehl, ist entweder eine Konstante
   verschoben worden oder der Sollwert gehört mit Begründung angepasst — beides
   gehört nach CLAUDE.md, nicht stillschweigend in den Code. */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const hier = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(hier, "..", "pizza.html"), "utf8");

/* Modellteile ausschneiden: zwischen den Abschnittsmarken im <script>.
   PRESETS kommt extra dazu, weil zwei Sollwerte sich auf Vorlagen beziehen —
   ändert jemand eine Vorlage, soll der Test das sehen. */
function block(von, bis){
  let i = src.indexOf("===== " + von);
  let j = src.indexOf("===== " + bis);
  if(i < 0 || j < 0) throw new Error("Abschnitt nicht gefunden: " + von + " … " + bis);
  return src.slice(src.lastIndexOf("/*", i), src.lastIndexOf("/*", j));
}
function presets(){
  const i = src.indexOf("const PRESETS = [");
  const j = src.indexOf("\n];", i);
  if(i < 0 || j < 0) throw new Error("PRESETS nicht gefunden");
  return src.slice(i, j + 3);
}

const stub = `let S = null;
function getCal(){ return 1; }
function defaults(){ return { mix:{ steps:[
  {k:"mix",min:10,st:3,rpm:123},{k:"rest",min:10},{k:"mix",min:0.5,st:1.5,rpm:85}] } }; }
`;
const quelle = stub + block("Gärmodell","Vorlagen") + "\n" + presets() + "\n" + block("Rechnen","Hinweise");
const M = new Function(quelle + `
  return { calc, rGas, PRESETS, setS: v => { S = v; } };`)();

const BASIS = { n:6, bw:250, h:62, salt:2.8, oil:0, sugar:0, flourW:"325", yeast:"fresh",
                ddt:23, container:"1", pf:{ type:"none" }, mix:{ steps:[
                  {k:"mix",min:10,st:3,rpm:123},{k:"rest",min:10},{k:"mix",min:0.5,st:1.5,rpm:85}] } };
const vorlage = k => {
  const p = M.PRESETS.find(x => x.key === k);
  if(!p) throw new Error("Vorlage fehlt: " + k);
  return JSON.parse(JSON.stringify(p.s));
};
const rechne = o => { const s = Object.assign({}, BASIS, o); M.setS(s); return M.calc(s); };

/* [Name, gemessener Wert, Soll, Toleranz] — Reihenfolge wie die Tabelle in CLAUDE.md */
const faelle = [
  ["rGas(4)/rGas(20)", () => M.rGas(4)/M.rGas(20), 0.150, 0.001,
   "Kältekurve (Tmin = −6): die Bäckerregel 24 h kalt ≈ 3–4 h Raum"],

  ["8 h/20 °C", () => rechne({ phases:[{h:2,t:20},{h:6,t:20}], ballAfter:1 }).yPctTotal, 0.389, 0.002,
   "Hefeanker, einmal um 1,45 gesenkt"],

  ["24 h, Ballen nach der Kälte", () => rechne({ phases:[{h:2,t:21},{h:19,t:6},{h:3,t:21}], ballAfter:2 }).yPctTotal, 0.247, 0.002,
   "Wärmeträgheit: Klumpen kalt"],

  ["24 h, Ballen davor", () => rechne({ phases:[{h:2,t:21},{h:19,t:6},{h:3,t:21}], ballAfter:1 }).yPctTotal, 0.327, 0.002,
   "Wärmeträgheit: Ballen kalt — der Abstand zur Zeile darüber IST das Alleinstellungsmerkmal"],

  ["48 h kalt (Vorlage nap48)", () => rechne(vorlage("nap48")).yPctTotal, 0.184, 0.002,
   "Exponent 1,55 am langen Ende"],

  ["72 h kalt", () => rechne({ phases:[{h:2,t:21},{h:68,t:5},{h:4,t:21}], ballAfter:1 }).yPctTotal, 0.115, 0.002,
   "Exponent 1,55, noch länger"],

  ["Biga Vorteighefe", () => rechne({ phases:[{h:4,t:21}], ballAfter:0,
      pf:{ type:"biga", share:50, hyd:48, phases:[{h:18,t:17}] } }).pf.yPct, 0.880, 0.003,
   "eigener Biga-Anker, Faktor 5,075 (Giorilli)"],

  ["Biga Reifegrad", () => rechne({ phases:[{h:4,t:21}], ballAfter:0,
      pf:{ type:"biga", share:50, hyd:48, phases:[{h:18,t:17}] } }).Rip, 1.05, 0.03,
   "Vorteig gehört in Zähler UND Nenner — war mal ein Fehler"],

  ["100 % Biga, keine Zusatzhefe", () => rechne({ phases:[{h:2,t:21},{h:2,t:21}], ballAfter:1,
      pf:{ type:"biga", share:100, hyd:48, phases:[{h:18,t:17}] } }).yPctMain, 0, 0.005,
   "deckt der Vorteig alles Mehl, stellt er auch die ganze Hefe"],

  ["Erster echter Teig", () => rechne({ n:6, bw:280, h:62, salt:3,
      phases:[{h:5,t:25},{h:16,t:6},{h:6,t:25}], ballAfter:2 }).yG, 1.00, 0.01,
   "der einzige Wert, der an einer echten Pizza hängt (18.09.2026, genau richtig)"],
];

let fehler = 0;
console.log("Gärmodell gegen die Sollwerte aus CLAUDE.md\n");
for(const [name, fn, soll, tol, warum] of faelle){
  let ist, ok;
  try { ist = fn(); ok = Math.abs(ist - soll) <= tol; }
  catch(e){ console.log("FEHLER  " + name + " — " + e.message); fehler++; continue; }
  console.log((ok ? "  ok  " : "  ✗   ") + name.padEnd(30) +
    ist.toFixed(3).padStart(7) + "   soll " + soll.toFixed(3) + " ±" + tol);
  if(!ok){ console.log("        " + warum); fehler++; }
}
console.log();
if(fehler){
  console.log(fehler + " von " + faelle.length + " Sollwerten verfehlt.");
  console.log("Entweder ist eine Konstante verschoben worden, oder der Sollwert gehört");
  console.log("mit Begründung in CLAUDE.md angepasst. Nicht stillschweigend ändern.");
  process.exit(1);
}
console.log("Alle " + faelle.length + " Sollwerte gehalten.");
