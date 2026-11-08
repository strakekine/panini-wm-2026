/* Recipes — Cloudflare Worker (Stufe 1: Import, Speichern, Bring!-Brücke, Testseite).
   Siehe CLAUDE.md, Abschnitt „Recipes“. Bei Cloudflare als Modul-Worker einfügen.

   Bindings / Secrets (Settings → Variables and Secrets / Bindings):
     GEMINI_KEY     Secret, Schlüssel von aistudio.google.com
     FAMILIEN_CODE  Secret, selbst ausgedachtes Passwort für die App
     DB             D1-Datenbank (Tabellen legt der Worker selbst an)
     MODELL         optional, Text; Standard "gemini-flash-latest"

   Ablauf Import: Browser lädt jede Datei einzeln hoch (POST /api/datei → Gemini Files API),
   dann POST /api/rezept mit den Dateien und/oder Text. Videos braucht Gemini erst zum
   Verarbeiten: solange eine Datei noch PROCESSING ist, antwortet /api/rezept mit 202 und
   der Browser fragt nach 3 s wieder (so bleibt jeder Aufruf unter Cloudflares
   Abruf-Grenze, statt im Worker zu warten). */

const GEMINI = "https://generativelanguage.googleapis.com";
const APP_HERKUNFT = "https://strakekine.github.io";
const MAX_BYTES = 95 * 1024 * 1024;   // Cloudflare gratis: 100 MB je Anfrage
const IMPORTE_JE_TAG = 30;
const BRING_STUNDEN = 24;

export const GAENGE = ["Obst & Gemüse", "Brot & Backwaren", "Kühlregal", "Fleisch & Fisch",
  "Tiefkühl", "Nudeln, Reis & Trockenes", "Konserven & Gläser", "Gewürze, Öl & Saucen",
  "Backzutaten", "Getränke", "Sonstiges"];
export const EINHEITEN = ["g", "kg", "ml", "l", "EL", "TL", "Prise", "Msp", "Stück", "Dose",
  "Bund", "Zehe", "Becher", "Pck", "Scheibe", "Handvoll", ""];

export const AUFTRAG = `Du bekommst Material zu einem Kochrezept: ein Video (Ton UND Bild), Fotos, Screenshots, ein PDF oder Text. Mach daraus EIN Rezept auf Deutsch.

Regeln:
- Mengen NUR, wenn sie gesagt, eingeblendet oder geschrieben werden. Sonst menge = null und im hinweis, was gesagt wurde ("ein Schuss", "nach Gefühl") oder "Menge nicht genannt". Niemals Mengen erfinden oder schätzen.
- Keine Zutat erfinden. Was im Video benutzt, aber nicht genannt wird, darf rein, mit menge null und hinweis "im Video zu sehen".
- Gesprochenes zählt genauso wie Geschriebenes. Widersprechen sich Video und Beschreibung, nimm das Video und schreib den Widerspruch in die notiz.
- Amerikanische Maße (cup, oz, lb, tbsp, tsp, °F) in g, ml, EL, TL, °C umrechnen; das Original kommt in den hinweis.
- menge ist eine Zahl (0.5 statt "1/2"). Bei Spannen ("2 bis 3") menge = 2, menge_bis = 3.
- einheit ist genau eine von: ${EINHEITEN.filter(Boolean).join(", ")} — oder leer, wenn es Stück ohne Wort ist ("2 Eier": menge 2, einheit leer).
- name ist die Zutat ohne Menge, im Singular wo üblich ("Ei" bei einem, "Eier" bei mehreren ist auch in Ordnung).
- gang ist genau eine von: ${GAENGE.join(", ")}.
- gruppe nur, wenn das Rezept Zutaten aufteilt ("Für die Sauce"), sonst leer.
- portionen: wie genannt. Wenn nicht genannt, schätzen und in die notiz schreiben "Portionen geschätzt".
- zeit_min: Gesamtzeit in Minuten, wenn erkennbar, sonst null.
- schritte: kurz und klar, ein Arbeitsgang je Schritt, Zeiten und Temperaturen wörtlich übernehmen ("10 Minuten köcheln").
- Ist gar kein Rezept zu erkennen, titel leer lassen und in der notiz sagen, warum.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    titel: { type: "STRING" },
    portionen: { type: "NUMBER", nullable: true },
    zeit_min: { type: "NUMBER", nullable: true },
    zutaten: { type: "ARRAY", items: { type: "OBJECT", properties: {
      gruppe: { type: "STRING" }, menge: { type: "NUMBER", nullable: true },
      menge_bis: { type: "NUMBER", nullable: true }, einheit: { type: "STRING" },
      name: { type: "STRING" }, gang: { type: "STRING" }, hinweis: { type: "STRING" } },
      required: ["name"] } },
    schritte: { type: "ARRAY", items: { type: "STRING" } },
    notiz: { type: "STRING" },
  },
  required: ["titel", "zutaten", "schritte"],
};

/* ---------- Hilfen ---------- */
const json = (o, status = 200, h = {}) => new Response(JSON.stringify(o), { status,
  headers: { "content-type": "application/json; charset=utf-8", ...h } });
const fehler = (text, status) => json({ fehler: text }, status);
const neueId = () => [...crypto.getRandomValues(new Uint8Array(12))].map(b => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
const tagLux = (t = Date.now()) => new Date(t).toLocaleDateString("sv-SE", { timeZone: "Europe/Luxembourg" });
const str = (v, max) => typeof v === "string" ? v.trim().slice(0, max) : "";
const zahl = (v, lo, hi) => (typeof v === "number" && isFinite(v) && v >= lo && v <= hi) ? v : null;

function gleich(a, b){
  if(typeof a !== "string" || typeof b !== "string") return false;
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for(let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}

/* Was die KI liefert, wird nie ungeprüft gespeichert. */
export function saeubern(o){
  if(!o || typeof o !== "object") return null;
  const zutaten = (Array.isArray(o.zutaten) ? o.zutaten : []).slice(0, 80).map(z => {
    if(!z || typeof z !== "object") return null;
    const name = str(z.name, 80); if(!name) return null;
    let menge = zahl(z.menge, 0, 100000), bis = zahl(z.menge_bis, 0, 100000);
    if(menge === 0) menge = null;
    if(menge == null || bis == null || bis <= menge) bis = null;
    const einheit = EINHEITEN.includes(z.einheit) ? z.einheit
      : (EINHEITEN.find(e => e && e.toLowerCase() === String(z.einheit || "").toLowerCase()) || "");
    const r = { menge, einheit, name, gang: GAENGE.includes(z.gang) ? z.gang : "Sonstiges" };
    if(bis != null) r.menge_bis = bis;
    const g = str(z.gruppe, 60); if(g) r.gruppe = g;
    const h = str(z.hinweis, 120); if(h) r.hinweis = h;
    /* Eine Einheit, die ohne Menge dasteht ("EL Öl"), ist eine erfundene Genauigkeit. */
    if(menge == null && einheit && !r.hinweis) r.hinweis = "Menge nicht genannt";
    return r;
  }).filter(Boolean);
  return {
    titel: str(o.titel, 120),
    portionen: zahl(o.portionen, 1, 100),
    zeit_min: zahl(o.zeit_min, 1, 7 * 24 * 60),
    zutaten,
    schritte: (Array.isArray(o.schritte) ? o.schritte : []).map(s => str(s, 1000)).filter(Boolean).slice(0, 60),
    notiz: str(o.notiz, 1000),
    quelle: str(o.quelle, 500),
  };
}

const YOUTUBE = /https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)[\w-]{6,}[^\s]*/i;

/* ---------- Datenbank ---------- */
async function tabellen(db){
  await db.prepare("CREATE TABLE IF NOT EXISTS rezepte (id TEXT PRIMARY KEY, daten TEXT NOT NULL, geaendert INTEGER NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS bring (id TEXT PRIMARY KEY, daten TEXT NOT NULL, bis INTEGER NOT NULL)").run();
  await db.prepare("CREATE TABLE IF NOT EXISTS importe (tag TEXT PRIMARY KEY, n INTEGER NOT NULL)").run();
}

/* ---------- Gemini ---------- */
async function hochladen(env, request, name){
  const len = Number(request.headers.get("content-length"));
  const mime = (request.headers.get("content-type") || "").split(";")[0].trim();
  if(!(len > 0)) return fehler("Leere Datei.", 400);
  if(len > MAX_BYTES) return fehler("Datei zu groß (über 95 MB). Bildschirmaufnahme kürzer machen.", 413);
  if(!/^(image\/|video\/|application\/pdf$|audio\/)/.test(mime)) return fehler("Diese Dateiart geht nicht: " + (mime || "unbekannt"), 415);
  const start = await fetch(GEMINI + "/upload/v1beta/files", { method: "POST", headers: {
    "x-goog-api-key": env.GEMINI_KEY, "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start",
    "X-Goog-Upload-Header-Content-Length": String(len), "X-Goog-Upload-Header-Content-Type": mime,
    "content-type": "application/json" }, body: JSON.stringify({ file: { display_name: str(name, 100) || "rezept" } }) });
  const url = start.headers.get("x-goog-upload-url");
  if(!start.ok || !url) return fehler("Gemini nimmt keine Datei an (" + start.status + "): " + (await start.text()).slice(0, 300), 502);
  let body = request.body;
  /* Durchreichen ohne Zwischenspeicher; die Länge muss Gemini vorher kennen. */
  if(typeof FixedLengthStream === "function"){
    const f = new FixedLengthStream(len); request.body.pipeTo(f.writable); body = f.readable;
  }
  const up = await fetch(url, { method: "POST", headers: { "content-length": String(len),
    "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" }, body });
  const r = await up.json().catch(() => null);
  if(!up.ok || !r?.file?.uri) return fehler("Hochladen zu Gemini fehlgeschlagen (" + up.status + ").", 502);
  return json({ datei: { name: r.file.name, uri: r.file.uri, mime: r.file.mimeType || mime } });
}

async function rezeptMachen(env, request){
  const e = await request.json().catch(() => null);
  if(!e) return fehler("Kein gültiger Auftrag.", 400);
  const dateien = (Array.isArray(e.dateien) ? e.dateien : []).slice(0, 10)
    .filter(d => d && /^files\/[\w-]+$/.test(d.name) && typeof d.uri === "string" && d.uri.startsWith(GEMINI + "/"));
  const text = str(e.text, 20000);
  if(!dateien.length && !text) return fehler("Nichts zum Auswerten: Datei wählen oder Text einfügen.", 400);

  /* Videos: erst wenn Gemini sie fertig verarbeitet hat. */
  for(const d of dateien){
    const s = await fetch(GEMINI + "/v1beta/" + d.name, { headers: { "x-goog-api-key": env.GEMINI_KEY } });
    const f = await s.json().catch(() => null);
    if(!s.ok) return fehler("Datei bei Gemini nicht gefunden (" + s.status + "). Bitte neu hochladen.", 502);
    if(f.state === "FAILED") return fehler("Gemini konnte die Datei nicht lesen.", 422);
    if(f.state !== "ACTIVE") return json({ warten: true }, 202);
  }

  const db = env.DB;
  if(db){
    await tabellen(db);
    const tag = tagLux();
    const z = await db.prepare("SELECT n FROM importe WHERE tag = ?").bind(tag).first();
    if(z && z.n >= IMPORTE_JE_TAG) return fehler("Für heute sind " + IMPORTE_JE_TAG + " Importe erreicht. Morgen geht es weiter.", 429);
    await db.prepare("INSERT INTO importe (tag, n) VALUES (?, 1) ON CONFLICT(tag) DO UPDATE SET n = n + 1").bind(tag).run();
  }

  const parts = dateien.map(d => ({ file_data: { mime_type: d.mime, file_uri: d.uri } }));
  const yt = text.match(YOUTUBE);
  if(yt) parts.push({ file_data: { file_uri: yt[0] } });     // YouTube kann Gemini selbst ansehen
  parts.push({ text: AUFTRAG + (text ? "\n\nText vom Nutzer (Beschreibung, Link oder Rezept):\n" + text : "") });

  const modell = str(env.MODELL, 80) || "gemini-flash-latest";
  const g = await fetch(GEMINI + "/v1beta/models/" + encodeURIComponent(modell) + ":generateContent", {
    method: "POST", headers: { "x-goog-api-key": env.GEMINI_KEY, "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: SCHEMA } }) });
  const a = await g.json().catch(() => null);
  if(!g.ok) return fehler("Gemini-Fehler (" + g.status + "): " + str(a?.error?.message, 300), 502);
  const roh = a?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
  let o; try { o = JSON.parse(roh); } catch { return fehler("Gemini hat kein lesbares Rezept geliefert.", 502); }
  const rezept = saeubern(o);
  if(!rezept) return fehler("Gemini hat kein lesbares Rezept geliefert.", 502);
  const quelle = text.match(/https?:\/\/\S+/);
  if(quelle && !rezept.quelle) rezept.quelle = quelle[0].slice(0, 500);
  return json({ rezept, modell });
}

/* ---------- Bring! ----------
   Bring!s Import liest eine Webseite mit schema.org/Recipe. Unsere Liste wird darum kurz
   als solche Seite bereitgestellt (öffentlich, zufällige id, 24 h), und die App öffnet
   Bring!s Deeplink-Dienst mit dieser Adresse. */
async function bringAnlegen(env, request, basis){
  const e = await request.json().catch(() => null);
  const zeilen = (Array.isArray(e?.zeilen) ? e.zeilen : []).map(z => str(z, 120)).filter(Boolean).slice(0, 150);
  if(!zeilen.length) return fehler("Die Liste ist leer.", 400);
  const id = neueId();
  await env.DB.prepare("INSERT INTO bring (id, daten, bis) VALUES (?, ?, ?)")
    .bind(id, JSON.stringify({ titel: str(e.titel, 80) || "Einkauf", zeilen }), Date.now() + BRING_STUNDEN * 3600e3).run();
  await env.DB.prepare("DELETE FROM bring WHERE bis < ?").bind(Date.now()).run();
  const seite = basis + "/bring/" + id;
  return json({ seite, link: "https://api.getbring.com/rest/bringrecipes/deeplink?url=" + encodeURIComponent(seite) + "&source=web" });
}

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function bringSeite(env, id){
  if(!env.DB) return new Response("Keine Datenbank.", { status: 503 });
  await tabellen(env.DB);
  const r = await env.DB.prepare("SELECT daten, bis FROM bring WHERE id = ?").bind(id).first();
  if(!r || r.bis < Date.now()) return new Response("Diese Liste ist abgelaufen.", { status: 404 });
  const d = JSON.parse(r.daten);
  const ld = { "@context": "https://schema.org", "@type": "Recipe", name: d.titel, recipeYield: "1", recipeIngredient: d.zeilen };
  return new Response(`<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${esc(d.titel)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script></head>
<body><h1>${esc(d.titel)}</h1><ul>${d.zeilen.map(z => "<li>" + esc(z) + "</li>").join("")}</ul></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

/* ---------- Rezepte speichern ---------- */
async function rezepte(env, request, id){
  const db = env.DB;
  if(request.method === "GET"){
    const r = await db.prepare("SELECT daten FROM rezepte ORDER BY geaendert DESC").all();
    return json({ rezepte: (r.results || []).map(x => JSON.parse(x.daten)) });
  }
  if(!/^[\w-]{6,40}$/.test(id || "")) return fehler("Ungültige Rezept-id.", 400);
  if(request.method === "DELETE"){
    await db.prepare("DELETE FROM rezepte WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }
  if(request.method === "PUT"){
    const e = await request.json().catch(() => null);
    const r = saeubern(e);
    if(!r || !r.titel) return fehler("Rezept ohne Titel wird nicht gespeichert.", 400);
    const jetzt = Date.now();
    const alt = await db.prepare("SELECT daten FROM rezepte WHERE id = ?").bind(id).first();
    const erstellt = alt ? JSON.parse(alt.daten).erstellt : jetzt;
    const daten = { ...r, id, erstellt, geaendert: jetzt };
    await db.prepare("INSERT INTO rezepte (id, daten, geaendert) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET daten = excluded.daten, geaendert = excluded.geaendert")
      .bind(id, JSON.stringify(daten), jetzt).run();
    return json({ rezept: daten });
  }
  return fehler("Methode nicht erlaubt.", 405);
}

/* ---------- Eingang ---------- */
export default {
  async fetch(request, env){
    const url = new URL(request.url);
    const basis = url.origin;
    const herkunft = request.headers.get("origin");
    const cors = herkunft === APP_HERKUNFT ? { "access-control-allow-origin": APP_HERKUNFT,
      "access-control-allow-headers": "content-type, x-code", "access-control-allow-methods": "GET, POST, PUT, DELETE",
      "vary": "origin" } : {};
    const mit = r => { for(const [k, v] of Object.entries(cors)) r.headers.set(k, v); return r; };

    if(request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if(url.pathname === "/" && request.method === "GET")
      return new Response(TESTSEITE, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    const b = url.pathname.match(/^\/bring\/([\w]{16})$/);
    if(b && request.method === "GET") return bringSeite(env, b[1]);
    if(!url.pathname.startsWith("/api/")) return new Response("Nicht gefunden.", { status: 404 });

    if(!env.FAMILIEN_CODE) return mit(fehler("Secret FAMILIEN_CODE fehlt im Worker.", 503));
    if(!gleich(request.headers.get("x-code") || "", env.FAMILIEN_CODE)) return mit(fehler("Falscher Familien-Code.", 401));

    try {
      if(url.pathname === "/api/pruefen"){
        const r = { db: !!env.DB, gemini: false, modell: str(env.MODELL, 80) || "gemini-flash-latest" };
        if(env.GEMINI_KEY){
          const g = await fetch(GEMINI + "/v1beta/models/" + encodeURIComponent(r.modell), { headers: { "x-goog-api-key": env.GEMINI_KEY } });
          r.gemini = g.ok; if(!g.ok) r.geminiFehler = g.status;
        }
        if(env.DB) await tabellen(env.DB);
        return mit(json(r));
      }
      if(!env.GEMINI_KEY && /^\/api\/(datei|rezept)$/.test(url.pathname)) return mit(fehler("Secret GEMINI_KEY fehlt im Worker.", 503));
      if(url.pathname === "/api/datei" && request.method === "POST") return mit(await hochladen(env, request, url.searchParams.get("name")));
      if(url.pathname === "/api/rezept" && request.method === "POST") return mit(await rezeptMachen(env, request));
      if(!env.DB) return mit(fehler("D1-Datenbank (Binding DB) fehlt im Worker.", 503));
      await tabellen(env.DB);
      if(url.pathname === "/api/bring" && request.method === "POST") return mit(await bringAnlegen(env, request, basis));
      const m = url.pathname.match(/^\/api\/rezepte(?:\/([^/]+))?$/);
      if(m) return mit(await rezepte(env, request, m[1]));
      return mit(fehler("Nicht gefunden.", 404));
    } catch(err){
      return mit(fehler("Fehler im Worker: " + String(err?.message || err).slice(0, 300), 500));
    }
  },
};

/* ---------- Testseite (bis die richtige App steht) ---------- */
const TESTSEITE = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Recipes · Test</title><meta name="theme-color" content="#14110f">
<style>
:root{--bg:#14110f;--p:#1f1a17;--l:#3a312b;--t:#f3ece6;--m:#a8998c;--a:#f08a4b;--g:#f2c94c;--bad:#ff6b6b}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--t);font:16px/1.45 system-ui,-apple-system,sans-serif}
main{max-width:640px;margin:0 auto;padding:16px 16px 80px}h1{margin:4px 0 2px;font-size:26px}h1 span{color:var(--a)}
.s{color:var(--m);font-size:14px}.k{background:var(--p);border:1px solid var(--l);border-radius:14px;padding:14px;margin:14px 0}
input,textarea,button{font:inherit;color:inherit}input[type=password],input[type=text],textarea{width:100%;background:var(--bg);border:1px solid var(--l);border-radius:10px;padding:10px}
textarea{min-height:70px}button{background:var(--a);color:#1b0f06;border:0;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer}
button.g{background:transparent;color:var(--t);border:1px solid var(--l)}button:disabled{opacity:.5}
.r{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}ul{padding-left:20px}li{margin:3px 0}
.offen{color:var(--g)}.f{color:var(--bad)}.pz{display:flex;align-items:center;gap:10px}.pz b{font-size:20px;min-width:2ch;text-align:center}
.grp{color:var(--a);font-weight:700;margin-top:8px}.h{color:var(--m);font-size:13px}.li{padding:10px 0;border-top:1px solid var(--l);cursor:pointer}
label.file{display:block;border:2px dashed var(--l);border-radius:12px;padding:16px;text-align:center;cursor:pointer}
</style></head><body><main>
<h1><span>Recipes</span> · Test</h1><div class="s">Testseite: Datei rein → Rezept. Die richtige App kommt danach.</div>
<div class="k" id="codeK"><b>Familien-Code</b><div class="r"><input type="password" id="code" placeholder="Code"><button id="codeOk">Prüfen</button></div><div id="codeS" class="s"></div></div>
<div class="k"><b>+ Rezept</b>
<label class="file">📄 🖼️ 🎬 PDF, Screenshots, Fotos oder Bildschirmaufnahme wählen<input type="file" id="datei" multiple accept="image/*,application/pdf,video/*" hidden></label>
<div id="gewaehlt" class="s"></div>
<div style="margin-top:10px"><textarea id="text" placeholder="oder: Beschreibungstext, YouTube-Link oder Rezepttext einfügen (Link zum Reel gern dazu)"></textarea></div>
<div class="r"><button id="los">Rezept machen</button><span id="stand" class="s"></span></div></div>
<div class="k" id="ergebnis" hidden></div>
<div class="k"><b>Gespeichert</b><div id="liste" class="s">–</div></div>
<div class="s" style="text-align:center">Fassung 08.11.2026 a</div>
</main><script>
const $=id=>document.getElementById(id);
let CODE="";try{CODE=localStorage.getItem("recipes_code")||""}catch{}
$("code").value=CODE;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(pfad,opt={}){const r=await fetch(pfad,{...opt,headers:{"x-code":CODE,...(opt.headers||{})}});
 const d=await r.json().catch(()=>({fehler:"Antwort nicht lesbar ("+r.status+")"}));if(!r.ok&&r.status!==202)throw new Error(d.fehler||("Fehler "+r.status));return{status:r.status,d}}
$("codeOk").onclick=async()=>{CODE=$("code").value.trim();try{localStorage.setItem("recipes_code",CODE)}catch{}
 try{const{d}=await api("/api/pruefen");$("codeS").innerHTML="✓ Code stimmt · Gemini: "+(d.gemini?"✓":"✗ ("+(d.geminiFehler||"Schlüssel fehlt")+")")+" · Datenbank: "+(d.db?"✓":"✗")+" · Modell: "+esc(d.modell);laden()}
 catch(e){$("codeS").innerHTML='<span class="f">'+esc(e.message)+"</span>"}};
$("datei").onchange=()=>{const f=[...$("datei").files];$("gewaehlt").textContent=f.map(x=>x.name+" ("+(x.size/1048576).toFixed(1)+" MB)").join(", ")};
const warte=ms=>new Promise(r=>setTimeout(r,ms));
let R=null,P=0;
$("los").onclick=async()=>{const files=[...$("datei").files],text=$("text").value.trim();
 if(!files.length&&!text){$("stand").textContent="Erst eine Datei wählen oder Text einfügen.";return}
 $("los").disabled=true;const dateien=[];
 try{for(const[i,f]of files.entries()){$("stand").textContent="Lade hoch "+(i+1)+"/"+files.length+" …";
   const{d}=await api("/api/datei?name="+encodeURIComponent(f.name),{method:"POST",headers:{"content-type":f.type||"application/octet-stream"},body:f});dateien.push(d.datei)}
  const t0=Date.now();
  for(;;){$("stand").textContent="KI schaut sich das an … "+Math.round((Date.now()-t0)/1000)+" s";
   const{status,d}=await api("/api/rezept",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({dateien,text})});
   if(status===202){if(Date.now()-t0>180000)throw new Error("Gemini braucht zu lange für das Video.");await warte(3000);continue}
   R={...d.rezept,id:null};P=R.portionen||2;$("stand").textContent="Fertig ("+Math.round((Date.now()-t0)/1000)+" s, "+esc(d.modell)+")";zeigen();break}}
 catch(e){$("stand").innerHTML='<span class="f">'+esc(e.message)+"</span>"}
 $("los").disabled=false};
function fmt(x,e){if(x==null)return"";if(["g","ml"].includes(e)&&x>=100)x=Math.round(x/5)*5;
 else if(["Stück","EL","TL","Zehe","Dose","Bund","Becher","Pck","Scheibe",""].includes(e))x=Math.round(x*2)/2;else x=Math.round(x*10)/10;
 const s=String(x).replace(".",",");return s.replace(/^0,5$/,"½").replace(/,5$/," ½")}
function menge(z,f){if(z.menge==null)return"";let a=z.menge*f,b=z.menge_bis!=null?z.menge_bis*f:null,e=z.einheit;
 if(e==="g"&&a>=1000){a/=1000;b=b&&b/1000;e="kg"}if(e==="ml"&&a>=1000){a/=1000;b=b&&b/1000;e="l"}
 if(e==="Prise"||e==="Msp"){a=z.menge;b=z.menge_bis}
 return fmt(a,e)+(b!=null?"–"+fmt(b,e):"")+(e?" "+e:"")}
function zeilen(){const f=P/(R.portionen||P||1);return R.zutaten.map(z=>(menge(z,f)+" "+z.name).trim())}
function zeigen(){const f=P/(R.portionen||P||1);let g=null,h="";
 for(const z of R.zutaten){if((z.gruppe||"")!==g){g=z.gruppe||"";if(g)h+='</ul><div class="grp">'+esc(g)+"</div><ul>"}
  const m=menge(z,f);h+="<li"+(m?"":' class="offen"')+"><b>"+esc(m)+"</b> "+esc(z.name)+(z.hinweis?' <span class="h">('+esc(z.hinweis)+")</span>":"")+(m?"":' <span class="h">⚠︎</span>')+"</li>"}
 $("ergebnis").hidden=false;$("ergebnis").innerHTML="<h2 style='margin:0'>"+esc(R.titel||"(kein Rezept erkannt)")+"</h2>"
 +'<div class="s">'+(R.zeit_min?"⏱ "+R.zeit_min+" min · ":"")+(R.quelle?'<a style="color:var(--a)" href="'+esc(R.quelle)+'" target="_blank">▶ Original</a>':"")+"</div>"
 +'<div class="r pz">Personen <button class="g" id="m">−</button><b>'+P+'</b><button class="g" id="p">+</button></div>'
 +"<ul>"+h+"</ul><b>Schritte</b><ol>"+R.schritte.map(s=>"<li>"+esc(s)+"</li>").join("")+"</ol>"
 +(R.notiz?'<div class="s">📝 '+esc(R.notiz)+"</div>":"")
 +'<div class="r"><button id="sp">'+(R.id?"Gespeichert ✓":"Speichern")+'</button><button class="g" id="br">In Bring! übernehmen</button><button class="g" id="del" '+(R.id?"":"hidden")+'>Löschen</button></div><div id="brS" class="s"></div>';
 $("m").onclick=()=>{if(P>1){P--;zeigen()}};$("p").onclick=()=>{P++;zeigen()};
 $("sp").onclick=async()=>{try{const id=R.id||(Date.now().toString(36)+Math.random().toString(36).slice(2,8));
  const{d}=await api("/api/rezepte/"+id,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(R)});R=d.rezept;zeigen();laden()}catch(e){alert(e.message)}};
 $("del").onclick=async()=>{if(!confirm("Rezept löschen?"))return;await api("/api/rezepte/"+R.id,{method:"DELETE"});$("ergebnis").hidden=true;R=null;laden()};
 $("br").onclick=async()=>{try{const{d}=await api("/api/bring",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({titel:R.titel,zeilen:zeilen()})});
  $("brS").innerHTML='Testseite für Bring!: <a style="color:var(--a)" href="'+esc(d.seite)+'" target="_blank">ansehen</a>';location.href=d.link}catch(e){$("brS").innerHTML='<span class="f">'+esc(e.message)+"</span>"}}}
let ALLE=[];
async function laden(){try{const{d}=await api("/api/rezepte");ALLE=d.rezepte;
 $("liste").innerHTML=ALLE.length?ALLE.map((r,i)=>'<div class="li" data-i="'+i+'"><b>'+esc(r.titel)+"</b> · "+r.zutaten.length+" Zutaten</div>").join(""):"Noch nichts gespeichert.";
 document.querySelectorAll(".li").forEach(el=>el.onclick=()=>{R=ALLE[+el.dataset.i];P=R.portionen||2;zeigen();$("ergebnis").scrollIntoView({behavior:"smooth"})})}catch{}}
if(CODE)$("codeOk").click();
</script></body></html>`;
