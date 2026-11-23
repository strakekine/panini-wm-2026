/* Oberfläche der Einmaleins-App im Browser (iPad-Größe).
   Aufruf:  node test/einmaleins-oberflaeche.mjs   Braucht Playwright (siehe CLAUDE.md). Rückgabewert 1 bei Fehler. */
import path from "path";
import { fileURLToPath } from "url";
const { chromium } = await import(process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright/index.mjs");
const datei = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "einmaleins.html");

let fehler = 0, n = 0;
function ok(bed, text){ n++; if(!bed){ fehler++; console.log("✗ " + text); } }
const b = await chromium.launch();
const pg = await b.newPage({ viewport:{ width:820, height:1180 } });
const errs = [];
pg.on("pageerror", e => errs.push(String(e)));
pg.on("console", m => { if(m.type() === "error") errs.push(m.text()); });
pg.on("dialog", d => d.accept(d.type() === "prompt" ? d.defaultValue() : undefined));
await pg.goto("file://" + datei);
const view = () => pg.evaluate(() => VIEW);

/* Erster Start */
ok(await view() === "start", "erster Start zeigt die Begrüßung");
await pg.type("#startName", "Fleur"); await pg.type("#startKind", "Mia");
await pg.click('#startFell [data-fell="schimmel"]');
ok(await pg.inputValue("#startName") === "Fleur", "Fellwahl lässt den getippten Namen stehen");
await pg.click('#startLook [data-frisur="locken"]');
ok(await pg.evaluate(() => S.frisur) === "locken" && await pg.inputValue("#startName") === "Fleur", "Aussehen wählen lässt den Namen stehen");
await pg.click("#startLos");
ok(await view() === "home", "danach Startbild");
/* feste Tagesaufgaben, damit der Test nicht vom Datum abhängt */
await pg.evaluate(() => { TQ = { tag:dayKey(Date.now()), fort:{}, fertig:[], bonus:false, ids:["level2", "richtig", "memory"] }; persist(); renderHome(); });
ok(await pg.locator("#quests .quest").count() === 3, "drei Tagesaufgaben");
ok(await pg.locator("#homePferd .kind").count() === 1, "Kind steht neben dem Pferd");
ok((await pg.textContent("#blase")).includes("Fleur"), "Pferd spricht mit seinem Namen");

/* Heuballen: ein Level fehlerfrei durchspielen */
const kisten = async (falschBei = []) => {
  let i = 0;
  while(await view() === "spiel"){
    if(i++ > 80){ ok(false, "Level endet nicht"); break; }
    await pg.waitForFunction(() => !G || G.ende || (G.aktiv && !G.lock));
    if(await view() !== "spiel") break;
    const { a, erst } = await pg.evaluate(() => ({ a:frage(G.aktiv.c).a, erst:G.aktiv.erst }));
    const sel = erst && falschBei.includes(i) ? `.reihe.aktiv .ballen:not([data-wert="${a}"])` : `.reihe.aktiv .ballen[data-wert="${a}"]`;
    await pg.locator(sel).first().dispatchEvent("pointerdown");
    await pg.waitForFunction(() => !G || G.ende || G.lock);
  }
};
await pg.click("#losKisten");
/* Hintereinander: nach der halben Fallzeit kommt eine zweite Reihe, getippt zählt nur die unterste */
await pg.evaluate(() => { G.fallMs = 2000; });
await pg.waitForFunction(() => G.rows.length === 2, null, { timeout:4000 });
ok(await pg.locator("#reihen .reihe").count() === 2 && await pg.locator("#reihen .reihe.aktiv").count() === 1, "zwei Reihen, eine davon aktiv");
const obenRichtig = await pg.evaluate(() => frage(G.rows[1].c).a);
await pg.evaluate(() => { G.fallMs = 60000; });
const vorTipp = await pg.evaluate(() => G.geschafft + G.fehler);
await pg.locator(`#reihen .reihe:not(.aktiv) .ballen[data-wert="${obenRichtig}"]`).dispatchEvent("pointerdown");
ok(await pg.evaluate(() => G.geschafft + G.fehler) === vorTipp, "Tippen auf die obere Reihe zählt nicht");
await kisten();
ok(await view() === "ergebnis", "Level endet mit Ergebnis");
ok(/Gold|Silber/.test(await pg.textContent("#ergText")), "fehlerfrei → Gold oder Silber");
ok(await pg.evaluate(() => SHOP.k) >= 16, "Karotten gutgeschrieben (10 + Medaille)");
ok(await pg.evaluate(() => Object.keys(P).length) === 10, "10 Aufgaben im Lernstand");
ok(await pg.evaluate(() => Object.values(P).every(p => p.f === 1)), "alle in Fach 1");

/* Ballen landet ohne Antwort → Herz weg, Aufgabe kommt wieder */
await pg.click("#ergZurueck");
await pg.click('#tempoChips [data-tempo="schnell"]');
await pg.evaluate(() => { TEMPO.schnell.ms = 600; });
await pg.click("#losKisten");
await pg.waitForFunction(() => G && G.herzen < 3, null, { timeout:5000 });
ok(await pg.evaluate(() => G.queue.some(c => c.id === G.aktiv.c.id)), "gelandete Aufgabe kommt wieder in die Reihe");
await pg.waitForFunction(() => VIEW === "ergebnis", null, { timeout:15000 });
ok((await pg.textContent("#ergText")).includes("keine Herzen"), "ohne Herzen: Level verloren, keine Medaille");
await pg.evaluate(() => { TEMPO.schnell.ms = 6000; });
await pg.click("#ergZurueck");

/* Rechnen: Ziffernfeld, falsche Antwort zeigt Lösung, kommt wieder */
await pg.click("#losRechnen");
let erst = true, i = 0;
while(await view() === "spiel" && i++ < 60){
  await pg.waitForFunction(() => !G || G.ende || (G.aktiv && !G.lock));
  if(await view() !== "spiel") break;
  const a = await pg.evaluate(() => frage(G.aktiv.c).a);
  const tipp = erst ? String(a + 1) : String(a);
  for(const z of tipp) await pg.click(`#tasten [data-k="${z}"]`);
  if(erst){ ok(await pg.textContent("#anzeige") === tipp, "Ziffernfeld schreibt in die Anzeige"); }
  await pg.click('#tasten [data-k="ok"]');
  if(erst){
    await pg.waitForFunction(() => G.lock);
    ok((await pg.textContent("#aufgabe")).includes("= " + a), "falsch → Lösung wird gezeigt");
    erst = false;
  }
  await pg.waitForFunction(() => !G || G.ende || G.lock);
}
ok(await view() === "ergebnis", "Rechnen-Level endet");
ok(/Silber/.test(await pg.textContent("#ergText")), "ein Fehler → Silber");
ok(await pg.evaluate(() => Object.values(P).some(p => p.bad)), "falsche Aufgabe ist rot markiert");
await pg.click("#ergZurueck");

/* Tafel und Reihenwahl */
ok(await pg.locator("#tafel .s-rot").count() >= 1, "Tafel zeigt die rote Aufgabe");
await pg.click('#tafel [data-nurreihe="7"]');
ok(JSON.stringify(await pg.evaluate(() => S.rows)) === "[7]", "Zeilenkopf → nur 7er-Reihe");
await pg.click('#reihenChips [data-reihe="alle"]');
await pg.click('#reihenChips [data-reihe="3"]');
ok(JSON.stringify(await pg.evaluate(() => S.rows)) === "[3]", "bei allen an: eine Reihe antippen → nur diese");

/* Laden */
await pg.evaluate(() => { SHOP.k = 100; persist(); });
await pg.click("#zumLaden");
await pg.click('[data-kaufen="schleife"]');
ok(await pg.evaluate(() => SHOP.k) === 70 && await pg.evaluate(() => SHOP.wear.includes("schleife")), "Schleife gekauft und angezogen");
ok(await pg.locator('[data-kaufen="krone"]').isDisabled(), "zu teure Krone nicht kaufbar");
await pg.click("#ladenZu");

/* Füttern: Fohlen wächst, Feier beim Aufstieg */
ok(await pg.evaluate(() => stufeVon(PF.w)) === 0, "neues Pferd ist ein Fohlen");
await pg.evaluate(() => { SHOP.k = 60; PF.w = 30; PF.lieb = "zucker"; persist(); renderHome(); });
await pg.click("#zumLaden");
await pg.click('[data-futter="apfel"]');
await pg.waitForSelector("#feier.an", { timeout:3000 });
ok((await pg.textContent("#feierTitel")).includes("Jährling"), "Feier: jetzt ein Jährling");
await pg.click("#feierZu");
ok(await pg.evaluate(() => SHOP.k === 50 && PF.w === 41), "Apfel kostet 10 Karotten, gibt 11 Wachstum");
await pg.evaluate(() => { PF.w = 800; persist(); renderLaden(); });
ok(await pg.locator('[data-futter="heu"]').isDisabled(), "ausgewachsen: kein Futter mehr");
await pg.evaluate(() => { PF.w = 41; persist(); });
await pg.click("#ladenZu");

/* Abbrechen behält die verdienten Karotten */
const k0 = await pg.evaluate(() => SHOP.k);
await pg.click("#losRechnen");
for(let x = 0; x < 2; x++){
  await pg.waitForFunction(() => G && G.aktiv && !G.lock);
  const a = await pg.evaluate(() => frage(G.aktiv.c).a);
  for(const z of String(a)) await pg.click(`#tasten [data-k="${z}"]`);
  await pg.click('#tasten [data-k="ok"]');
  await pg.waitForFunction(() => G.lock);
}
await pg.click("#spielZu");
ok(await pg.evaluate(() => VIEW) === "home" && await pg.evaluate(() => SHOP.k) === k0 + 2, "abgebrochen: 2 verdiente Karotten bleiben");

/* Kleidung fürs Kind: kaufen zieht an, gleicher Platz ersetzt */
await pg.evaluate(() => { SHOP.k = 200; persist(); });
await pg.click("#zumLaden");
await pg.click('[data-kkaufen="muetze"]');
await pg.click('[data-kkaufen="reithelm"]');
ok(await pg.evaluate(() => SHOP.kwear.includes("reithelm") && !SHOP.kwear.includes("muetze") && SHOP.owned.includes("muetze") && SHOP.k === 110), "Kopf: Reithelm ersetzt Mütze, Mütze bleibt im Besitz");
await pg.click("#ladenZu");

/* Pferderennen gewinnen */
await pg.evaluate(() => { RENN_MS[S.tempo] = 60000; });
await pg.click('[data-spiel="rennen"]');
for(let x = 0; x < 30 && await view() === "spiel"; x++){
  await pg.waitForFunction(() => !G || G.ende || (G.aktiv && !G.lock));
  if(await view() !== "spiel") break;
  const a = await pg.evaluate(() => frage(G.aktiv.c).a);
  for(const z of String(a)) await pg.click(`#tasten [data-k="${z}"]`);
  await pg.click('#tasten [data-k="ok"]');
  await pg.waitForFunction(() => !G || G.ende || G.lock);
}
await pg.waitForFunction(() => VIEW === "ergebnis", null, { timeout:3000 });
ok((await pg.textContent("#ergText")).includes("Gewonnen"), "Rennen gewonnen");
ok(await pg.evaluate(() => STAT.siege === 1 && !!ABZ.sieg1), "Sieg gezählt, Abzeichen Rennsieger");
await pg.click("#ergZurueck");

/* Pferderennen verlieren: Gegner sehr schnell */
await pg.evaluate(() => { RENN_MS[S.tempo] = 30; });
await pg.click('[data-spiel="rennen"]');
await pg.waitForFunction(() => VIEW === "ergebnis", null, { timeout:4000 });
ok((await pg.textContent("#ergText")).includes("Wirbelwind war diesmal schneller"), "Rennen verloren");
await pg.evaluate(() => { RENN_MS[S.tempo] = 5000; });
await pg.click("#ergZurueck");

/* Wahr oder falsch: richtige Antworten geben Punkte, Ende nach Ablauf */
await pg.click('[data-spiel="blitz"]');
for(let x = 0; x < 5; x++){
  await pg.waitForFunction(() => G && !G.lock);
  const wahr = await pg.evaluate(() => G.aussage.wahr);
  await pg.locator(wahr ? "#blitzJa" : "#blitzNein").dispatchEvent("pointerdown");
  await pg.waitForFunction(() => G.lock);
}
ok(await pg.evaluate(() => G.richtig === 5 && G.falsch === 0), "Wahr oder falsch: 5 richtig");
await pg.evaluate(() => { G.endeT = performance.now(); });
await pg.waitForFunction(() => VIEW === "ergebnis", null, { timeout:3000 });
ok((await pg.textContent("#ergText")).includes("5 Punkte"), "Ergebnis 5 Punkte");
await pg.click("#ergZurueck");

/* Memory lösen (Paare aus der App, kein Wissen über den Inhalt) */
await pg.click('[data-spiel="memory"]');
const paare = await pg.evaluate(() => { const m = {}; G.mkarten.forEach((k, i) => (m[k.paar] = m[k.paar] || []).push(i)); return Object.values(m); });
ok(paare.length === 6 && paare.every(p => p.length === 2), "6 Paare");
for(const [i, j] of paare){
  await pg.click(`[data-mem="${i}"]`); await pg.click(`[data-mem="${j}"]`);
}
await pg.waitForFunction(() => VIEW === "ergebnis", null, { timeout:3000 });
ok(await pg.evaluate(() => STAT.memoryBest === 6 && !!ABZ.memory), "Memory in 6 Zügen, Abzeichen Gedächtnis-Ass");
ok(await pg.evaluate(() => TQ.fertig.includes("memory")), "Tagesaufgabe Memory erledigt");
await pg.click("#ergZurueck");

/* Name tippen: Tastatur darf nicht wegklappen (Feld wird nicht neu gebaut) */
await pg.evaluate(() => { document.getElementById("einst").open = true; });
await pg.fill("#setName", ""); await pg.type("#setName", "Stella");
ok(await pg.evaluate(() => document.activeElement.id) === "setName" && await pg.evaluate(() => S.pferd) === "Stella", "Name tippen behält den Fokus");

/* Neuladen behält alles */
await pg.reload();
ok(await view() === "home", "nach Neuladen Startbild");
ok(await pg.evaluate(() => PF.w === 41), "Wachstum gespeichert");
ok(await pg.evaluate(() => S.pferd === "Stella" && SHOP.wear.includes("schleife") && Object.keys(P).length >= 10 && MED.gold + MED.silber >= 2), "Lernstand, Pferd, Zubehör, Medaillen gespeichert");

/* Papa-Knopf: Code KAROTTEN */
pg.removeAllListeners("dialog");
pg.on("dialog", d => d.accept(d.type() === "prompt" ? "KAROTTEN" : undefined));
const vor = await pg.evaluate(() => SHOP.k);
for(let x = 0; x < 5; x++) await pg.click("#title");
await pg.waitForFunction(v => SHOP.k === v + 50, vor);
ok(true, "Papa-Code KAROTTEN");

ok(!errs.length, "keine JS-Fehler: " + errs.join(" | "));
await b.close();
console.log((fehler ? "✗ " + fehler + " von " : "✓ alle ") + n + " Prüfungen" + (fehler ? " fehlgeschlagen" : " bestanden"));
process.exit(fehler ? 1 : 0);
