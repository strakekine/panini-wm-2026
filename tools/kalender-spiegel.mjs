// Kalender-Spiegel nach dem Umzug der App „FC Koeppchen“ (vom Nutzer, 22.10.2026; vorbereitet 30.10.2026).
// Die App liegt jetzt unter https://fckoeppchen.github.io/. Alte Kalender-Abos zeigen aber weiter auf
// strakekine.github.io/panini-wm-2026/kalender/*.ics — damit sie bis Ende 2026 weiterlaufen, holt dieses Skript die
// Dateien gleichen Namens von der neuen Adresse und schreibt sie hierher, mit Hinweis „bitte neu abonnieren“:
// in jedem Spiel (Beschreibung) und als eigener Termin an den nächsten drei Spieltagen (vom Nutzer: beides).
// Nach dem 31.12.2026 bleibt der letzte Stand stehen (dann den Workflow abschalten).
//   node tools/kalender-spiegel.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const QUELLE = "https://fckoeppchen.github.io/kalender/";
const ZIEL = new URL("../kalender/", import.meta.url);
const ENDE = Date.parse("2027-01-01T00:00:00+01:00");
const HINWEIS = "⚠️ Dieser Kalender zieht um und wird nur noch bis Ende 2026 aktualisiert. Bitte neu abonnieren: "
  + "App öffnen (https://fckoeppchen.github.io/)\\, Mannschaft antippen\\, „📅 … im Kalender abonnieren“. Danach diesen alten Kalender löschen.";

// iCalendar: Zeilen über 75 Zeichen sind umbrochen (Folgezeile beginnt mit Leerzeichen).
const entfalten = t => t.replace(/\r?\n[ \t]/g, "").split(/\r?\n/).filter(z => z !== "");
function falten(z) {
  const teile = [];
  let rest = z;
  while (Buffer.byteLength(rest) > 75) {
    let n = 75;
    while (Buffer.byteLength(rest.slice(0, n)) > 75) n--;
    if (/[\uD800-\uDBFF]/.test(rest[n - 1])) n--;   // Emoji nicht zerschneiden
    teile.push(rest.slice(0, n)); rest = " " + rest.slice(n);
  }
  teile.push(rest);
  return teile.join("\r\n");
}

export function spiegeln(ics, now = Date.now()) {
  const zeilen = entfalten(ics), aus = [], tage = new Set();
  let imEvent = false, hatBeschreibung = false;
  for (const z of zeilen) {
    if (z === "BEGIN:VEVENT") { imEvent = true; hatBeschreibung = false; }
    if (imEvent && z.startsWith("DTSTART")) {
      const m = /:(\d{8})/.exec(z);
      if (m) tage.add(m[1]);
    }
    if (imEvent && z.startsWith("DESCRIPTION")) { aus.push(z + "\\n\\n" + HINWEIS); hatBeschreibung = true; continue; }
    if (z === "END:VEVENT") { if (!hatBeschreibung) aus.push("DESCRIPTION:" + HINWEIS); imEvent = false; }
    if (z.startsWith("X-WR-CALNAME:")) { aus.push(z + " (alt – bitte neu abonnieren)"); continue; }
    if (z === "END:VCALENDAR") {
      // Eigene Termine an den nächsten drei Spieltagen (ganztägig, damit sie oben im Tag stehen).
      const heute = new Date(now).toISOString().slice(0, 10).replace(/-/g, "");
      for (const tag of [...tage].filter(t => t >= heute).sort().slice(0, 3)) {
        const morgen = new Date(Date.UTC(+tag.slice(0, 4), +tag.slice(4, 6) - 1, +tag.slice(6) + 1)).toISOString().slice(0, 10).replace(/-/g, "");
        aus.push("BEGIN:VEVENT", `UID:umzug-${tag}@fc-koeppchen`, "DTSTAMP:20261030T000000Z", `DTSTART;VALUE=DATE:${tag}`,
          `DTEND;VALUE=DATE:${morgen}`, "SUMMARY:⚠️ FC Koeppchen: Kalender bitte neu abonnieren", "DESCRIPTION:" + HINWEIS, "END:VEVENT");
      }
    }
    aus.push(z);
  }
  return aus.map(falten).join("\r\n") + "\r\n";
}

async function main() {
  if (Date.now() >= ENDE) { console.log("Nach Ende 2026: Kalender bleiben auf dem letzten Stand."); return; }
  for (const name of readdirSync(ZIEL).filter(n => n.endsWith(".ics"))) {
    try {
      const r = await fetch(QUELLE + name, { cache: "no-store" });
      if (!r.ok) { console.error(name, "HTTP", r.status, "— bleibt wie er ist"); continue; }
      const neu = spiegeln(await r.text());
      if (readFileSync(new URL(name, ZIEL), "utf8") !== neu) { writeFileSync(new URL(name, ZIEL), neu); console.log("aktualisiert:", name); }
    } catch (e) { console.error(name, e.message, "— bleibt wie er ist"); }
  }
}
if (import.meta.url === `file://${process.argv[1]}`) main();
