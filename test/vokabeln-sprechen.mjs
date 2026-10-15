/* Sprechen im Vokabeltrainer mit einer Attrappe der Spracherkennung.
   Aufruf:  node test/vokabeln-sprechen.mjs [pfad/zu/vokabeln.html]
   Braucht Playwright (global installiert, siehe CLAUDE.md). Rückgabewert 1 bei Fehler.
   Nimmt nichts über die Lektionen an: „gesprochen“ wird die Lösung aus der App.

   Die Attrappe bildet nach, was die Mitschrift am iPhone gezeigt hat (15.10.2026):
     0.0s #1 start · 1.3s onstart · 1.3s audiostart · 4.8s speechstart · results … · 7.0s abbrechen
     0.0s #2 start · 0.0s onstart · 0.0s audiostart · — dann nichts mehr
   Deutung: iOS beendet die erste Sitzung trotz abort() nicht. Jede neue Erkennung meldet sofort
   „an“, das Gehörte geht aber an die ERSTE, gesammelt in einem Text, ohne isFinal, ohne onend.

   Varianten:
   - ios:    wie oben. Die Sitzung lebt, bis die Seite zu ist; Ergebnisse an die erste Erkennung.
   - chrome: jede Erkennung für sich; je Äußerung ein neues Ergebnis mit isFinal; onend nach abort.
   Gesprochen wird erst, nachdem der Knopf angetippt ist (window.__sprich). Ohne laufende
   Erkennung hört niemand zu. Attrappe immer unter BEIDEN Namen setzen, sonst nimmt die App die
   echte von Chrome, die im Testbrowser stumm bleibt.
   Gegenprobe: Die vier früheren Fassungen scheitern in „ios“ beim zweiten Wort. */
import path from "path";
import { fileURLToPath } from "url";
const { chromium } = await import(process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright/index.mjs");
const datei = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "vokabeln.html");

const VARIANTEN = [
  { name:"iOS: Sitzung lebt weiter, Ergebnisse an die erste", art:"ios",    pause:300 },
  { name:"iOS, Mikrofon gleich nach „Weiter“",                art:"ios",    pause:20 },
  { name:"Chrome: jede Erkennung für sich",                   art:"chrome", pause:300 },
];
const WOERTER = 6;

const b = await chromium.launch();
let fehler = 0;
for(const v of VARIANTEN){
  const pg = await b.newPage({ viewport:{ width:390, height:780 } });
  const errs = []; pg.on("pageerror", e => errs.push(String(e)));
  await pg.addInitScript(opt => {
    let erste = null, aktiv = null, text = "";
    class FakeSR {
      constructor(){ this.on = false; this.erg = []; }
      start(){
        if(this.on) throw Object.assign(new Error("x"), { name:"InvalidStateError" });
        this.on = true;
        if(opt.art === "ios"){
          if(erste){ setTimeout(() => { this.onstart && this.onstart(); this.onaudiostart && this.onaudiostart(); }, 5); return; }
          erste = this;
          setTimeout(() => { this.onstart && this.onstart(); this.onaudiostart && this.onaudiostart(); }, 60);
          return;
        }
        aktiv = this;
        setTimeout(() => { this.onstart && this.onstart(); this.onaudiostart && this.onaudiostart(); }, 30);
      }
      stop(){ this._ende(); }
      abort(){ if(this.on && this.onerror) this.onerror({ error:"aborted" }); this._ende(); }
      _ende(){
        if(!this.on) return; this.on = false;
        if(opt.art === "ios") return;              /* iOS: Sitzung lebt weiter, kein onend */
        if(aktiv === this) aktiv = null;
        setTimeout(() => this.onend && this.onend(), 30);
      }
    }
    /* Ein Wort „sagen“: geht dorthin, wohin das Gerät es schickt */
    window.__sprich = wort => {
      if(opt.art === "ios"){
        if(!erste) return;
        const ziel = erste;
        const halb = wort.slice(0, Math.ceil(wort.length / 2));
        const send = t => { const alt = [{ transcript:t }]; alt.isFinal = false; ziel.onresult && ziel.onresult({ results:[alt] }); };
        setTimeout(() => send((text ? text + " " : "") + halb), 40);
        setTimeout(() => { text = (text ? text + " " : "") + wort; send(text); }, 120);
        return;
      }
      const ziel = aktiv; if(!ziel || !ziel.on) return;
      setTimeout(() => {
        const alt = [{ transcript:wort }]; alt.isFinal = true; ziel.erg.push(alt);
        ziel.onresult && ziel.onresult({ results:ziel.erg.slice() });
      }, 100);
    };
    window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = undefined;
  }, v);
  await pg.goto("file://" + datei);
  await pg.click('[data-opt="input"] [data-v="voice"]');
  await pg.click("#startBtn");
  let gut = 0; const log = [];
  for(let i = 0; i < WOERTER; i++){
    if(!(await pg.isVisible("#qMic"))){ log.push((i + 1) + ": Mikrofon-Knopf weg"); break; }
    await pg.click("#qMic"); await pg.waitForTimeout(150);
    await pg.evaluate(() => { const it = Q.items[Q.i], c = BYID[it.cid]; window.__sprich(variants(it.dir === "df" ? c.f : c.d)[0]); });
    await pg.waitForTimeout(2000);
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
