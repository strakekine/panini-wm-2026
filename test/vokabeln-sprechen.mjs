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
   - ios + endet: wie ios, aber einige Zeit nach dem Wort endet die Sitzung von selbst mit
     error audio-capture und onend (so in der Mitschrift vom 15.10.2026, Fassung e). Danach muss
     das nächste Antippen eine neue starten, und es darf keine Fehlermeldung stehen bleiben.
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
  { name:"iOS: Sitzung endet nach dem Wort mit audio-capture", art:"ios",   pause:300, endet:true },
  { name:"Chrome: jede Erkennung für sich",                   art:"chrome", pause:300 },
  { name:"iOS schreibt -é statt -er (DE → FR)",              art:"ios",    pause:300, klang:true },
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
        if(opt.endet) setTimeout(() => {
          if(erste !== ziel) return;
          erste = null; text = "";
          ziel.onerror && ziel.onerror({ error:"audio-capture" });
          ziel.onend && ziel.onend();
        }, 1900);
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
  if(v.klang) await pg.click('[data-opt="dir"] [data-v="df"]');
  await pg.click("#startBtn");
  /* Klang-Variante: nur Vokabeln mit -er-Endung, sonst prüft der Zufall nichts */
  if(v.klang) await pg.evaluate(n => {
    const er = CARDS.filter(c => /[a-zà-ÿ]{2,}er\b/.test(variants(c.f)[0])).slice(0, n);
    Q.items = er.map(c => ({ cid:c.id, dir:"df" })); Q.total = Q.items.length; Q.i = 0; showQ();
  }, WOERTER);
  let umgeschrieben = 0;
  let gut = 0; const log = [];
  for(let i = 0; i < WOERTER; i++){
    if(!(await pg.isVisible("#qMic"))){ log.push((i + 1) + ": Mikrofon-Knopf weg"); break; }
    await pg.click("#qMic"); await pg.waitForTimeout(150);
    umgeschrieben += await pg.evaluate(klang => {
      const it = Q.items[Q.i], c = BYID[it.cid];
      let w = variants(it.dir === "df" ? c.f : c.d)[0];
      const vorher = w;
      /* wie am iPhone: gleich klingende Endung falsch geschrieben, Großbuchstabe am Anfang */
      if(klang) w = w.replace(/([a-zà-ÿ]{2,})er\b/g, "$1é").replace(/^./, x => x.toUpperCase());
      window.__sprich(w);
      return klang && w.toLowerCase() !== vorher.toLowerCase() ? 1 : 0;
    }, !!v.klang);
    await pg.waitForTimeout(2000);
    const fb = (await pg.textContent("#qFb")).trim(), feld = await pg.inputValue("#qIn"), note = await pg.textContent("#qNote");
    if(fb.startsWith("✓") && !note) gut++;
    else log.push((i + 1) + ": Feld " + JSON.stringify(feld) + " → " + (fb.slice(0, 30) || "keine Auswertung") + (note ? " | " + note : ""));
    if(!(await pg.isVisible("#qGo"))) break;
    await pg.click("#qGo"); await pg.waitForTimeout(v.pause);
  }
  if(v.klang) console.log("    (davon " + umgeschrieben + " mit falsch geschriebener Endung gesprochen)");
  const okay = gut === WOERTER && !errs.length;
  if(!okay) fehler++;
  console.log((okay ? "✓ " : "✗ ") + v.name + ": " + gut + " von " + WOERTER + (log.length ? "\n    " + log.join("\n    ") : "") + (errs.length ? "\n    Seitenfehler: " + errs.join(" | ") : ""));
  await pg.close();
}
/* --- „Verhört? Nochmal sprechen“: Lösung bleibt verdeckt, bis entschieden ist --- */
{
  const pg = await b.newPage({ viewport:{ width:390, height:780 } });
  const errs = []; pg.on("pageerror", e => errs.push(String(e)));
  await pg.addInitScript(() => {
    let erste = null, text = "";
    class FakeSR { start(){ if(!erste) erste = this; setTimeout(() => { this.onstart && this.onstart(); }, 5); } stop(){} abort(){} }
    window.__sprich = w => { const z = erste; text = (text ? text + " " : "") + w; setTimeout(() => { const a = [{ transcript:text }]; a.isFinal = false; z.onresult && z.onresult({ results:[a] }); }, 50); };
    window.webkitSpeechRecognition = FakeSR; window.SpeechRecognition = undefined;
  });
  await pg.goto("file://" + datei);
  await pg.click('[data-opt="input"] [data-v="voice"]');
  await pg.click("#startBtn");
  const fehl = []; const ok = (bed, t) => { if(!bed) fehl.push(t); };
  const loesung = () => pg.evaluate(() => { const it = Q.items[Q.i], c = BYID[it.cid]; return variants(it.dir === "df" ? c.f : c.d)[0]; });
  const fach = () => pg.evaluate(() => { const it = Q.items[Q.i]; const p = P[key(it.cid, it.dir)]; return p ? p.b : -1; });
  const sprich = async w => { await pg.evaluate(w => window.__sprich(w), w); await pg.waitForTimeout(1900); };
  const sag = async w => { await pg.click("#qMic"); await pg.waitForTimeout(80); await sprich(w); };
  /* „Verhört? Nochmal sprechen“ schaltet das Mikrofon selbst ein — danach nur sprechen */

  /* 1. falsch → verdeckt → nochmal richtig → zählt richtig */
  let sol = await loesung();
  await sag("quelque chose de faux");
  let fb = await pg.textContent("#qFb");
  ok(fb.includes("Gehört") && !fb.includes(sol), "1: nach falsch gesprochen ist die Lösung verdeckt");
  ok(!(await pg.isVisible("#qGo")), "1: kein Weiter, solange nicht entschieden");
  ok(await fach() === -1, "1: noch nichts gewertet");
  await pg.click("#qRetry"); await pg.waitForTimeout(80);
  ok(await pg.evaluate(() => !!LISTEN), "1: nach „Nochmal“ hört die App schon zu");
  await sprich(sol);
  ok((await pg.textContent("#qFb")).startsWith("✓"), "1: zweiter Versuch richtig → ✓");
  ok(await pg.evaluate(() => Object.values(Q.first)[0] === true), "1: zählt als richtig");
  await pg.click("#qGo"); await pg.waitForTimeout(50);

  /* 2. falsch → Lösung zeigen → Fehler, Lösung groß sichtbar */
  sol = await loesung();
  await sag("encore faux");
  await pg.click("#qShow"); await pg.waitForTimeout(50);
  fb = await pg.textContent("#qFb");
  ok(fb.includes("✗") && (await pg.textContent("#qFb .sol")).length > 0, "2: Lösung zeigen → ✗ mit Lösung");
  ok(await pg.evaluate(() => Object.values(Q.first)[1] === false), "2: zählt als Fehler");
  ok(!(await pg.$("#qRetry")), "2: danach kein Nochmal-Knopf mehr");
  const gr = await pg.evaluate(() => parseFloat(getComputedStyle(document.querySelector("#qFb .sol")).fontSize));
  ok(gr >= 26, "2: Lösung groß geschrieben — ist " + gr + " px");
  await pg.click("#qGo"); await pg.waitForTimeout(50);

  /* 3. falsch → nochmal → wieder falsch → kein drittes Sprechen, nur noch Tippen oder Lösung */
  sol = await loesung();
  await sag("faux");
  await pg.click("#qRetry"); await pg.waitForTimeout(80);
  await sprich("toujours faux");
  fb = await pg.textContent("#qFb");
  ok(!fb.includes(sol) && !(await pg.$("#qRetry")) && (await pg.$("#qType")), "3: zweiter Fehlversuch → Lösung verdeckt, nur noch Tippen/Lösung");
  await pg.click("#qShow"); await pg.waitForTimeout(50);
  ok(await pg.evaluate(() => Object.values(Q.first)[2] === false), "3: Lösung zeigen zählt als Fehler");
  await pg.click("#qGo"); await pg.waitForTimeout(50);

  /* 4. falsch → Antwort tippen → richtig getippt → zählt richtig und als getippt */
  sol = await loesung();
  await sag("pas compris");
  await pg.click("#qType"); await pg.waitForTimeout(50);
  ok(await pg.evaluate(() => document.activeElement.id === "qIn" && $("qIn").value === ""), "4: Tippen → leeres Feld mit Tastatur");
  ok(!(await pg.isVisible("#qMic")), "4: Tippen → kein Mikrofon");
  await pg.type("#qIn", sol); await pg.keyboard.press("Enter"); await pg.waitForTimeout(50);
  ok((await pg.textContent("#qFb")).startsWith("✓"), "4: richtig getippt → ✓");
  ok(await pg.evaluate(() => { const it = Q.items[Q.i], k = key(it.cid, it.dir); return Q.first[k] === true && (it.dir !== "df" || P[k].ty); }), "4: zählt richtig (und getippt)");
  await pg.click("#qGo"); await pg.waitForTimeout(50);
  ok(await pg.isVisible("#qMic"), "4: nächstes Wort wieder mit Mikrofon");

  /* 5. falsch → nochmal → falsch → Antwort tippen → falsch getippt → Lösung, Fehler */
  await sag("faux");
  await pg.click("#qRetry"); await pg.waitForTimeout(80);
  await sprich("faux encore");
  await pg.click("#qType"); await pg.waitForTimeout(50);
  await pg.type("#qIn", "zzz"); await pg.keyboard.press("Enter"); await pg.waitForTimeout(50);
  fb = await pg.textContent("#qFb");
  ok(fb.includes("✗") && (await pg.$("#qFb .sol")) && !(await pg.$("#qType")), "5: falsch getippt → Lösung, kein weiterer Versuch");
  ok(await pg.evaluate(() => Object.values(Q.first)[4] === false), "5: zählt als Fehler");

  const okay = !fehl.length && !errs.length;
  if(!okay) fehler++;
  console.log((okay ? "✓ " : "✗ ") + "„Verhört? Nochmal sprechen“ / „Antwort tippen“ ohne Blick auf die Lösung" + (fehl.length ? "\n    " + fehl.join("\n    ") : "") + (errs.length ? "\n    Seitenfehler: " + errs.join(" | ") : ""));
  await pg.close();
}

await b.close();
process.exit(fehler ? 1 : 0);
