// Test für tools/rezepte-worker.js: Gemini und D1 nachgebaut (D1 über node:sqlite).
// Aufruf: node test/rezepte-worker.mjs   (Rückgabewert 1 bei Fehler)
import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const quelle = readFileSync(new URL("../tools/rezepte-worker.js", import.meta.url), "utf8");
const tmp = join(mkdtempSync(join(tmpdir(), "rw-")), "w.mjs");
writeFileSync(tmp, quelle);
const W = await import(tmp);
const worker = W.default;

let fehlerZahl = 0;
const ok = (b, t) => { console.log((b ? "✓ " : "✗ ") + t); if(!b) fehlerZahl++; };

function d1(){
  const db = new DatabaseSync(":memory:");
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => { db.prepare(sql).run(...args); return { success: true }; },
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
  });
  return { prepare: sql => stmt(sql) };
}

// Nachgebautes Gemini
let G = { state: "PROCESSING", antwort: null, aufrufe: [] };
globalThis.fetch = async (url, opt = {}) => {
  url = String(url); G.aufrufe.push({ url, opt });
  const h = opt.headers || {};
  if(!url.includes("generativelanguage.googleapis.com")) return new Response("fremd", { status: 500 });
  if(h["x-goog-api-key"] !== undefined && h["x-goog-api-key"] !== "KEY") return new Response("{}", { status: 403 });
  if(url.endsWith("/upload/v1beta/files")) return new Response("{}", { headers: { "x-goog-upload-url": "https://generativelanguage.googleapis.com/upload/xyz" } });
  if(url.endsWith("/upload/xyz")){
    const body = await new Response(opt.body).text();
    return Response.json({ file: { name: "files/abc123", uri: "https://generativelanguage.googleapis.com/v1beta/files/abc123", mimeType: "video/mp4", state: "PROCESSING", groesse: body.length } });
  }
  if(url.endsWith("/v1beta/files/abc123")) return Response.json({ state: G.state });
  if(url.includes(":generateContent")) return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(G.antwort) }] } }] });
  if(/\/v1beta\/models\/[^:]+$/.test(url)) return Response.json({ name: "models/x" });
  return new Response("?", { status: 404 });
};

const env = { GEMINI_KEY: "KEY", FAMILIEN_CODE: "pizza42", DB: d1() };
const req = (pfad, o = {}) => new Request("https://rezepte.example.workers.dev" + pfad,
  { ...o, headers: { "x-code": "pizza42", ...(o.headers || {}) } });
const call = async (pfad, o, e = env) => { const r = await worker.fetch(req(pfad, o), e); return { r, d: await r.clone().json().catch(() => null) }; };

// Zugang
ok((await worker.fetch(new Request("https://w/api/rezepte"), env)).status === 401, "ohne Code: 401");
ok((await worker.fetch(new Request("https://w/api/rezepte", { headers: { "x-code": "pizza4" } }), env)).status === 401, "falscher Code (Präfix): 401");
ok((await call("/api/rezepte", {}, { ...env, FAMILIEN_CODE: undefined })).r.status === 503, "ohne Secret FAMILIEN_CODE: 503");
ok((await call("/api/datei", { method: "POST", body: "x", headers: { "content-type": "image/png" } }, { ...env, GEMINI_KEY: undefined })).r.status === 503, "ohne GEMINI_KEY: 503");
ok((await worker.fetch(new Request("https://w/"), env)).headers.get("content-type").startsWith("text/html"), "Testseite ohne Code erreichbar");
const pf = await worker.fetch(new Request("https://w/api/rezepte", { method: "OPTIONS", headers: { origin: "https://strakekine.github.io" } }), env);
ok(pf.status === 204 && pf.headers.get("access-control-allow-origin") === "https://strakekine.github.io", "Preflight für die App-Adresse");
const fremd = await worker.fetch(new Request("https://w/api/rezepte", { headers: { origin: "https://boese.example", "x-code": "pizza42" } }), env);
ok(!fremd.headers.get("access-control-allow-origin"), "fremde Herkunft bekommt keine CORS-Freigabe");
const p = await call("/api/pruefen");
ok(p.d?.gemini === true && p.d?.db === true && p.d?.modell === "gemini-flash-latest", "Prüfen: Gemini, DB, Standardmodell");
ok((await call("/api/pruefen", {}, { ...env, GEMINI_KEY: "FALSCH" })).d?.gemini === false, "Prüfen meldet falschen Schlüssel");

// Hochladen
ok((await call("/api/datei", { method: "POST", body: "abc", headers: { "content-type": "text/html", "content-length": "3" } })).r.status === 415, "HTML-Datei abgelehnt");
const groß = await worker.fetch(req("/api/datei", { method: "POST", body: "x", headers: { "content-type": "video/mp4", "content-length": String(200 * 1024 * 1024) } }), env).catch(() => null);
ok(!groß || groß.status === 413 || groß.status === 400, "zu große Datei abgelehnt (oder vom Request selbst verhindert)");
G.aufrufe = [];
const up = await call("/api/datei?name=reel.mp4", { method: "POST", body: "VIDEODATEN", headers: { "content-type": "video/mp4", "content-length": "10" } });
ok(up.d?.datei?.name === "files/abc123", "Hochladen liefert Gemini-Datei");
const start = G.aufrufe.find(a => a.url.endsWith("/upload/v1beta/files"));
ok(start?.opt.headers["X-Goog-Upload-Header-Content-Length"] === "10" && start.opt.headers["X-Goog-Upload-Header-Content-Type"] === "video/mp4", "Start nennt Länge und Typ");
const fertig = G.aufrufe.find(a => a.url.endsWith("/upload/xyz"));
ok(fertig?.opt.headers["X-Goog-Upload-Command"] === "upload, finalize" && !("x-goog-api-key" in fertig.opt.headers), "Upload ohne Schlüssel, finalize");

// Rezept: erst warten, dann fertig
const datei = up.d.datei;
const auftrag = { method: "POST", headers: { "content-type": "application/json" } };
G.state = "PROCESSING";
ok((await call("/api/rezept", { ...auftrag, body: JSON.stringify({ dateien: [datei] }) })).r.status === 202, "Video in Verarbeitung: 202 warten");
G.state = "ACTIVE";
G.antwort = { titel: "Cremige Gnocchi", portionen: 4, zeit_min: 25,
  zutaten: [
    { name: "Gnocchi", menge: 500, einheit: "g", gang: "Kühlregal" },
    { name: "Basilikum", menge: null, einheit: "", gang: "Obst & Gemüse", hinweis: "eine Handvoll, grob" },
    { name: "Olivenöl", menge: null, einheit: "EL", gang: "Gewürze, Öl & Saucen" },
    { name: "Knoblauch", menge: 2, menge_bis: 3, einheit: "zehe", gang: "Erfunden" },
    { name: "", menge: 1 },
    { name: "Sahne", menge: 200, einheit: "Tassen", gruppe: "Für die Sauce", gang: "Kühlregal" },
  ],
  schritte: ["Knoblauch 2 Minuten anbraten.", "", "10 Minuten köcheln."], notiz: "" };
G.aufrufe = [];
const rz = await call("/api/rezept", { ...auftrag, body: JSON.stringify({ dateien: [datei, { name: "../x", uri: "https://boese/" }], text: "Schau https://www.facebook.com/share/r/abc und https://youtu.be/dQw4w9WgXcQ" }) });
const r = rz.d?.rezept;
ok(rz.r.status === 200 && r?.titel === "Cremige Gnocchi", "Rezept kommt an");
const gen = G.aufrufe.find(a => a.url.includes(":generateContent"));
const teile = JSON.parse(gen.opt.body).contents[0].parts;
ok(teile.filter(x => x.file_data).length === 2 && teile.some(x => x.file_data?.file_uri?.includes("youtu.be")), "fremde Datei verworfen, YouTube-Link als Video mitgegeben");
ok(teile.at(-1).text.includes("Niemals Mengen erfinden"), "Auftrag geht mit");
ok(r.zutaten.length === 5, "Zutat ohne Namen verworfen");
ok(r.zutaten[2].hinweis === "Menge nicht genannt", "Einheit ohne Menge bekommt Hinweis");
ok(r.zutaten[3].einheit === "Zehe" && r.zutaten[3].menge_bis === 3 && r.zutaten[3].gang === "Sonstiges", "Einheit vereinheitlicht, Spanne, unbekannter Gang → Sonstiges");
ok(r.zutaten[4].einheit === "" && r.zutaten[4].gruppe === "Für die Sauce", "unbekannte Einheit verworfen, Gruppe bleibt");
ok(r.schritte.length === 2, "leere Schritte weg");
ok(r.quelle === "https://www.facebook.com/share/r/abc", "erster Link wird Quelle");

// Tagesgrenze
const env2 = { ...env, DB: d1() };
let letzte;
for(let i = 0; i < 31; i++) letzte = await call("/api/rezept", { ...auftrag, body: JSON.stringify({ text: "Rezepttext" }) }, env2);
ok(letzte.r.status === 429, "31. Import am Tag: 429");

// Speichern, Liste, Löschen
ok((await call("/api/rezepte/abc123xyz", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ titel: "" , zutaten: [], schritte: [] }) })).r.status === 400, "ohne Titel nicht speichern");
const sp = await call("/api/rezepte/abc123xyz", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...r, boese: "<script>" }) });
ok(sp.d?.rezept?.id === "abc123xyz" && !("boese" in sp.d.rezept), "speichern, fremde Felder weg");
const erstellt = sp.d.rezept.erstellt;
await new Promise(res => setTimeout(res, 5));
const sp2 = await call("/api/rezepte/abc123xyz", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...r, titel: "Neu" }) });
ok(sp2.d.rezept.erstellt === erstellt && sp2.d.rezept.geaendert > erstellt, "Ändern behält 'erstellt'");
const li = await call("/api/rezepte");
ok(li.d.rezepte.length === 1 && li.d.rezepte[0].titel === "Neu", "Liste");
ok((await call("/api/rezepte/../../x", { method: "DELETE" })).r.status !== 200, "ungültige id beim Löschen abgewiesen");
await call("/api/rezepte/abc123xyz", { method: "DELETE" });
ok((await call("/api/rezepte")).d.rezepte.length === 0, "gelöscht");

// Bring!
const br = await call("/api/bring", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ titel: "Gnocchi <b>", zeilen: ["500 g Gnocchi", "2 Zehen Knoblauch", "Basilikum </script>"] }) });
ok(br.d?.link?.startsWith("https://api.getbring.com/rest/bringrecipes/deeplink?url=https%3A%2F%2Frezepte.example.workers.dev%2Fbring%2F"), "Bring!-Deeplink mit unserer Seite");
const seite = await (await worker.fetch(new Request(br.d.seite), env)).text();
const ld = JSON.parse(seite.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
ok(ld["@type"] === "Recipe" && ld.recipeIngredient.length === 3 && ld.recipeIngredient[2] === "Basilikum </script>", "Seite hat schema.org/Recipe mit allen Zeilen");
ok(!seite.includes("<b>") && seite.split("</script>").length === 2, "Seite escaped Titel und Zeilen");
ok((await worker.fetch(new Request("https://w/bring/aaaaaaaaaaaaaaaa"), env)).status === 404, "unbekannte Bring!-Liste: 404");
ok((await call("/api/bring", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ zeilen: [] }) })).r.status === 400, "leere Liste abgewiesen");

// Gegenprobe: saeubern ohne Prüfung würde Mengen ohne Zahl durchlassen
ok(W.saeubern({ titel: "x", zutaten: [{ name: "a", menge: "viel" }], schritte: [] }).zutaten[0].menge === null, "Text als Menge wird null");

console.log(fehlerZahl ? `\n${fehlerZahl} Fehler` : "\nAlles grün");
process.exit(fehlerZahl ? 1 : 0);
