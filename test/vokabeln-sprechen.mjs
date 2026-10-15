/* Sprechen im Vokabeltrainer mit einer Attrappe, die die am iPhone gemeldeten Eigenheiten
   der Spracherkennung nachmacht (siehe CLAUDE.md, Abschnitt Vokabeltrainer → Sprechen).
   Aufruf:  node test/vokabeln-sprechen.mjs [pfad/zu/vokabeln.html]
   Braucht Playwright (global installiert, siehe CLAUDE.md). Rückgabewert 1 bei Fehler.
   Nimmt nichts über die Lektionen an: „gesprochen“ wird die Lösung aus der App.

   Die Attrappe kann alles, was am iPhone bisher aufgefallen ist, und läuft in mehreren
   Varianten, weil wir nicht wissen, welche Mischung das echte iPhone hat:
   - endet nie von selbst, nur nach stop()/abort()
   - zweite Erkennung, solange das Mikrofon belegt ist → audio-capture
   - stellt ALLES bisher Gesprochene voran (auch bei frischer Instanz)
   - nur die allererste Sitzung meldet isFinal, danach nur Zwischenstände
   - noEnd: meldet nach stop()/abort() NIE onend (Fehler 3 vom 15.10.2026)
   - freiMs: gibt das Mikrofon erst so viele ms nach stop()/abort() frei
   Gegenproben: Jede der drei früheren Fassungen scheitert hier beim zweiten Wort. */
import path from "path";
import { fileURLToPath } from "url";
const { chromium } = await import(process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright/index.mjs");
const datei = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "vokabeln.html");

const VARIANTEN = [
  { name:"meldet onend, Mikrofon sofort frei",        noEnd:false, freiMs:0,   pause:300 },
  { name:"meldet nie onend",                           noEnd:true,  freiMs:0,   pause:300 },
  { name:"nie onend, Mikrofon erst nach 250 ms frei",  noEnd:true,  freiMs:250, pause:300 },
  { name:"wie oben, Mikrofon sofort nach „Weiter“",    noEnd:true,  freiMs:250, pause:20 },
];
const WOERTER = 6;

const b = await chromium.launch();
let fehler = 0;
for(const v of VARIANTEN){
  const pg = await b.newPage({ viewport:{ width:390, height:780 } });
  const errs = []; pg.on("pageerror", e => errs.push(String(e)));
  await pg.addInitScript(opt => {
    let belegt = null, alles = "", sitzung = 0;
    class FakeSR {
      constructor(){ this.on = false; }
      start(){
        if(this.on) throw Object.assign(new Error("x"), { name:"InvalidStateError" });
        if(belegt && belegt !== this){
          setTimeout(() => { this.onerror && this.onerror({ error:"audio-capture" }); if(!opt.noEnd) this.onend && this.onend(); }, 10);
          return;
        }
        belegt = this; this.on = true; const nr = ++sitzung;
        const wort = window.__say(), vorher = alles;
        const send = (t, fin) => { if(!this.on) return; const alt = [{ transcript:(vorher ? vorher + " " : "") + t }]; alt.isFinal = fin; this.onresult && this.onresult({ results:[alt] }); };
        setTimeout(() => send(wort.slice(0, Math.ceil(wort.length / 2)), false), 40);
        setTimeout(() => { send(wort, nr === 1); alles = (vorher ? vorher + " " : "") + wort; }, 120);
      }
      _end(){
        if(!this.on) return; this.on = false;
        const frei = () => { if(belegt === this) belegt = null; };
        if(opt.freiMs) setTimeout(frei, opt.freiMs); else frei();
        if(!opt.noEnd) setTimeout(() => this.onend && this.onend(), 50);
      }
      stop(){ this._end(); }
      abort(){ if(this.on && this.onerror) this.onerror({ error:"aborted" }); this._end(); }
    }
    window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = undefined;
    window.__say = () => { const it = Q.items[Q.i], c = BYID[it.cid]; return variants(it.dir === "df" ? c.f : c.d)[0]; };
  }, v);
  await pg.goto("file://" + datei);
  await pg.click('[data-opt="input"] [data-v="voice"]');
  await pg.click("#startBtn");
  let gut = 0; const log = [];
  for(let i = 0; i < WOERTER; i++){
    if(!(await pg.isVisible("#qMic"))){ log.push((i + 1) + ": Mikrofon-Knopf weg"); break; }
    await pg.click("#qMic"); await pg.waitForTimeout(2300);
    const fb = (await pg.textContent("#qFb")).trim(), feld = await pg.inputValue("#qIn"), note = await pg.textContent("#qNote");
    if(fb.startsWith("✓")) gut++;
    else log.push((i + 1) + ": Feld " + JSON.stringify(feld) + " → " + (fb.slice(0, 30) || "keine Auswertung") + (note ? " | " + note : ""));
    if(!(await pg.isVisible("#qGo"))) break;
    await pg.click("#qGo"); await pg.waitForTimeout(v.pause);
  }
  const okay = gut === WOERTER && !errs.length;
  if(!okay) fehler++;
  console.log((okay ? "✓ " : "✗ ") + v.name + ": " + gut + " von " + WOERTER + (log.length ? "\n    " + log.join("\n    ") : "") + (errs.length ? "\n    Seitenfehler: " + errs.join(" | ") : ""));
  await pg.close();
}
await b.close();
process.exit(fehler ? 1 : 0);
