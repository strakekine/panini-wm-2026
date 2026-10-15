/* Sprechen im Vokabeltrainer mit einer Attrappe, die die am iPhone gemeldeten Eigenheiten
   der Spracherkennung nachmacht (siehe CLAUDE.md, Abschnitt Vokabeltrainer → Sprechen).
   Aufruf:  node test/vokabeln-sprechen.mjs [pfad/zu/vokabeln.html]
   Braucht Playwright (global installiert, siehe CLAUDE.md). Rückgabewert 1 bei Fehler.
   Gegenprobe: die Fassung vor dem 15.10.2026 scheitert hier beim zweiten Wort. */
import path from "path";
import { fileURLToPath } from "url";
const { chromium } = await import(process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright/index.mjs");
const datei = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "vokabeln.html");
const b = await chromium.launch(); const pg = await b.newPage({ viewport:{ width:390, height:780 } });
const errs = []; pg.on("pageerror", e => errs.push(String(e)));
/* Attrappe mit allen gemeldeten iOS-Eigenheiten:
   - endet nie von selbst, nur nach stop()/abort()
   - zweite Erkennung während eine läuft → audio-capture
   - stellt ALLES bisher Gesprochene voran (auch bei frischer Instanz)
   - nur die allererste Sitzung meldet isFinal, danach nur Zwischenstände */
await pg.addInitScript(() => {
  let active = null, alles = "", sitzung = 0;
  class FakeSR {
    constructor(){ this.on = false; }
    start(){
      if(this.on) throw Object.assign(new Error("x"), { name:"InvalidStateError" });
      if(active && active !== this){ setTimeout(() => { this.onerror && this.onerror({ error:"audio-capture" }); this.onend && this.onend(); }, 10); return; }
      active = this; this.on = true; const nr = ++sitzung;
      const wort = window.__say(), vorher = alles;
      const send = (t, fin) => { if(!this.on) return; const alt = [{ transcript:(vorher ? vorher + " " : "") + t }]; alt.isFinal = fin; this.onresult && this.onresult({ results:[alt] }); };
      setTimeout(() => send(wort.slice(0, Math.ceil(wort.length / 2)), false), 40);
      setTimeout(() => { send(wort, nr === 1); alles = (vorher ? vorher + " " : "") + wort; }, 120);
    }
    _end(){ if(!this.on) return; this.on = false; if(active === this) active = null; setTimeout(() => this.onend && this.onend(), 50); }
    stop(){ this._end(); }
    abort(){ if(this.on && this.onerror) this.onerror({ error:"aborted" }); this._end(); }
  }
  window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = undefined;
  window.__say = () => { const it = Q.items[Q.i], c = BYID[it.cid]; return (it.dir === "df" ? c.f : c.d).split(/[|;]/)[0].replace(/[()]/g, ""); };
});
await pg.goto("file://" + datei);
await pg.click('[data-opt="input"] [data-v="voice"]');
await pg.click("#startBtn");
let gut = 0;
for(let i = 0; i < 6; i++){
  if(!(await pg.isVisible("#qMic"))){ console.log(i + 1, "Mikrofon-Knopf weg"); break; }
  await pg.click("#qMic"); await pg.waitForTimeout(2000);
  const fb = (await pg.textContent("#qFb")).trim().replace(/\s+/g, " "), feld = await pg.inputValue("#qIn"), note = await pg.textContent("#qNote");
  console.log(i + 1, "Feld: " + JSON.stringify(feld), "→", fb.slice(0, 40) || "(keine Auswertung)", note ? "| " + note : "");
  if(fb.startsWith("✓")) gut++;
  await pg.click("#qGo"); await pg.waitForTimeout(80);
}
console.log("richtig:", gut, "von 6");
console.log(errs); await b.close(); process.exit(gut === 6 && !errs.length ? 0 : 1);
