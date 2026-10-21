// Cloudflare Worker „koeppchen-live“: Live-Stand eines FuPa-Spiels für fussball.html, fast ohne
// Verzögerung. Die App fragt hier statt über GitHub (dort bis zu 7 min: 2 min Takt + 5 min Cache).
// FuPa schickt keine CORS-Freigabe, darum der Umweg.
//
// Einrichten (einmal, im Cloudflare-Dashboard): Workers & Pages → Create → Worker → Name
// „koeppchen-live“ → Deploy → Edit code → diesen Inhalt ganz einfügen → Deploy. Die Adresse
// (https://koeppchen-live.<name>.workers.dev) kommt in fussball.html als WORKER_URL.
//
// Aufruf: GET /?slug=<FuPa-Spiel-Slug> oder GET /?anstoss=<ISO-Zeit aus dem FLF-Spielplan> —
// dann sucht der Worker das Spiel der Seniors 1 selbst bei FuPa (gleiche Zeit, sonst am selben
// Tag ±3 h). So hängt der Live-Kasten nicht daran, dass der GitHub-Lauf pünktlich startet.
// Nur Koeppchen-Spiele und Länderspiele Luxemburgs (kein offener Vermittler). Je Spiel höchstens eine FuPa-Abfrage alle 20 s.
// Zurück kommen nur die Felder, die die App braucht — Tore und Karten als Ereignislisten.
//
// Zeitplan (Plan B, 19.10.2026): GitHub startet seine geplanten Läufe unzuverlässig (am 18.10. fast
// alle ausgelassen). Darum stößt der Worker den FLF-Abruf selbst an — er holt nichts von der FLF, er
// drückt nur bei GitHub auf „Abruf starten“ (wie ein Handstart). GitHubs eigener Zeitplan bleibt als
// Reserve. Einrichten: Settings → Variables and Secrets → Secret GITHUB_TOKEN (Fine-grained Token,
// nur dieses Repo, Actions: Read and write); Settings → Triggers → Cron Triggers → „*/15 * * * *“.

const API = "https://api.fupa.net/v1/matches/";
const MERKEN_MS = 20e3;
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};
const gemerkt = new Map(); // slug → { t, body } (je Worker-Instanz)
const gefunden = new Map(); // anstoss → { t, slug } — die Suche kostet zwei Seitenabrufe, 6 h merken

// FuPa-Spiel zum FLF-Anstoß. Kopie von passendesSpiel() in tools/fussball-live.mjs (Test prüft).
const tagLux = ms => new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Luxembourg" });
export function passendesSpiel(fupaSpiele, anstoss) {
  const a = Date.parse(anstoss);
  const genau = fupaSpiele.find(x => Date.parse(x.kickoff) === a);
  if (genau) return genau;
  return fupaSpiele
    .filter(x => tagLux(Date.parse(x.kickoff)) === tagLux(a) && Math.abs(Date.parse(x.kickoff) - a) <= 3 * 3600e3)
    .sort((x, y) => Math.abs(Date.parse(x.kickoff) - a) - Math.abs(Date.parse(y.kickoff) - a))[0] || null;
}

// Saison aus dem Anstoß (ab Juli neue Saison) → „2026-27“ für den Teamslug „fc-koeppchen-m1-2026-27“.
export function saisonVon(anstoss) {
  const [j, m] = tagLux(Date.parse(anstoss)).split("-").map(Number);
  const y = m >= 7 ? j : j - 1;
  return y + "-" + String((y + 1) % 100).padStart(2, "0");
}

// Spielliste der Mannschaft über die Schnittstelle (`flavor=current`: die Spiele um jetzt herum,
// `past` als Rückfall). Erst lief das über die Webseite — die gab dem Worker bei Cloudflare aber
// nicht dasselbe wie einem normalen Abruf (18.10.2026: „spiel nicht gefunden“).
async function slugZu(anstoss) {
  const g = gefunden.get(anstoss);
  if (g && Date.now() - g.t < 6 * 3600e3) return g.slug;
  const team = "fc-koeppchen-m1-" + saisonVon(anstoss);
  let slug = null;
  for (const flavor of ["current", "past"]) {
    const r = await fetch(`https://api.fupa.net/v1/teams/${team}/matches?flavor=${flavor}`, { headers: { accept: "application/json" } });
    if (!r.ok) continue;
    const spiele = await r.json();
    slug = Array.isArray(spiele) ? passendesSpiel(spiele, anstoss)?.slug || null : null;
    if (slug) break;
  }
  if (slug) gefunden.set(anstoss, { t: Date.now(), slug });
  return slug;
}

// Tore oder Karten aus FuPas `highlights` (type goal | card, subtype z. B. goal_headed,
// penalty_foul, card_red). Gleiches Format für beide, nach Minute sortiert.
function ereignisse(f, typ) {
  const heim = f.homeTeam?.slug;
  return (f.highlights || []).filter(x => x.type === typ).map(x => ({
    min: x.minute, plus: x.additionalMinute || 0,
    heim: x.team?.teamSlug === heim,
    name: [x.primaryRole?.firstName, x.primaryRole?.lastName].filter(Boolean).join(" ") || null,
    art: x.subtype || "",
  })).sort((a, b) => a.min - b.min || a.plus - b.plus);
}

export function kuerzen(f) {
  return {
    slug: f.slug,
    hs: f.homeGoal ?? null,
    as: f.awayGoal ?? null,
    section: f.section || "",
    period: f.live?.period || "",
    running: !!f.live?.running,
    minute: f.live?.minute ?? null,
    minuteAt: f.live?.lastTimestamp || null,
    tore: ereignisse(f, "goal"),
    karten: ereignisse(f, "card"),
    ticker: f.tickerAuthor?.name || null,
  };
}

function antwort(body, status = 200) {
  return new Response(body, {
    status,
    headers: { ...CORS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

const REPO = "strakekine/panini-wm-2026", WORKFLOW = "fussball.yml";

// Soll der Takt (alle 15 min, UTC) jetzt einen Abruf anstoßen? Wochenende: 8–22 Uhr Luxemburger Zeit,
// jede Viertelstunde (eigene Uhr, damit Sommer/Winter stimmt). Mo–Fr: 22:15 Luxemburger Zeit, nach
// GitHubs eigenem Abend-Lauf (19:17 UTC) — Reserve, falls der ausfällt. Dazu jeden Tag 23:30 und 7:00.
export function abrufFaellig(ms) {
  const teile = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Luxembourg", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(ms)).map(p => [p.type, p.value]));
  const h = +teile.hour, m = +teile.minute;
  if (m % 15) return false;
  // Jeden Abend 23:30: späte Länderspiele (20:45) und Abendspiele sind dann vorbei (vom Nutzer).
  if (h === 23 && m === 30) return true;
  // Jeden Morgen 7:00: was die FLF erst nach Mitternacht einträgt (19.10.: Seniors 2 nach 23:31), ist
  // dann da, wenn man aufsteht (vom Nutzer).
  if (h === 7 && m === 0) return true;
  if (teile.weekday === "Sat" || teile.weekday === "Sun") return h >= 8 && (h < 22 || (h === 22 && m === 0));
  // Mo–Fr 22:15 Luxemburger Zeit (bis 20.10.2026: 20:15 UTC, das wäre im Winter 21:15 gewesen).
  return h === 22 && m === 15;
}

async function anstossen(env) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    headers: {
      authorization: "Bearer " + env.GITHUB_TOKEN,
      accept: "application/vnd.github+json",
      "user-agent": "koeppchen-live",
      "content-type": "application/json",
    },
    body: JSON.stringify({ ref: "main" }),
  });
  // 204 = gestartet. 401/403: Token abgelaufen oder falsch — dann läuft nur noch GitHubs Reserve.
  if (r.status !== 204) console.log("GitHub-Anstoß fehlgeschlagen:", r.status, await r.text());
  return r.status;
}

// ---- Anonymer Zähler (vom Nutzer, 20.10.2026) ----
// Die App meldet sich beim Öffnen: ?zaehle=1, dazu neu=1 beim ersten Mal am Tag (merkt sich das
// Handy selbst), reiter=<gewählter Reiter> und art=app|web (Home-Bildschirm oder Browser — die
// beiden haben getrennte Speicher, ein Handy mit beiden zählt also zweimal). Die Stunde nimmt der
// Worker selbst (Luxemburger Zeit). Gespeichert werden nur Zahlen je Tag, keine Kennung, keine
// Adresse. Speicher: Cloudflare D1, im Worker als Binding „DB“ (Settings → Bindings → D1).
// Dazu ?angesehen=1&reiter=… bei jedem Umschalten auf einen anderen Reiter; der Reiter beim
// Öffnen zählt dort mit, die Liste zeigt also alles, was angeschaut wurde.
// Ohne Binding tut der Zähler nichts. Ansehen: ?zahlen (die letzten 30 Tage).
const REITER_OK = /^[A-Za-zÀ-ÿ0-9 ]{1,20}$/;
const ARTEN = ["app", "web"];
export const stundeLux = ms => +new Date(ms).toLocaleString("en-GB", { timeZone: "Europe/Luxembourg", hour: "2-digit", hourCycle: "h23" });
export async function zaehlen(db, tag, neu, reiter, art = "", stunde = null, erst = false) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS tage (tag TEXT PRIMARY KEY, handys INTEGER NOT NULL DEFAULT 0, oeffnungen INTEGER NOT NULL DEFAULT 0)"),
    db.prepare("CREATE TABLE IF NOT EXISTS reiter (tag TEXT NOT NULL, reiter TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tag, reiter))"),
    db.prepare("CREATE TABLE IF NOT EXISTS arten (tag TEXT NOT NULL, art TEXT NOT NULL, handys INTEGER NOT NULL DEFAULT 0, oeffnungen INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tag, art))"),
    db.prepare("CREATE TABLE IF NOT EXISTS stunden (tag TEXT NOT NULL, stunde INTEGER NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tag, stunde))"),
    db.prepare(TAB_ANGESEHEN),
    db.prepare("CREATE TABLE IF NOT EXISTS erste (tag TEXT NOT NULL, art TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tag, art))"),
  ]);
  const s = [db.prepare("INSERT INTO tage (tag, handys, oeffnungen) VALUES (?1, ?2, 1) ON CONFLICT(tag) DO UPDATE SET handys = handys + ?2, oeffnungen = oeffnungen + 1").bind(tag, neu ? 1 : 0)];
  if (reiter && REITER_OK.test(reiter))
    s.push(db.prepare("INSERT INTO reiter (tag, reiter, n) VALUES (?1, ?2, 1) ON CONFLICT(tag, reiter) DO UPDATE SET n = n + 1").bind(tag, reiter),
           db.prepare(PLUS_ANGESEHEN).bind(tag, reiter));
  if (ARTEN.includes(art))
    s.push(db.prepare("INSERT INTO arten (tag, art, handys, oeffnungen) VALUES (?1, ?2, ?3, 1) ON CONFLICT(tag, art) DO UPDATE SET handys = handys + ?3, oeffnungen = oeffnungen + 1").bind(tag, art, neu ? 1 : 0));
  // Erstes Öffnen auf diesem Gerät (je Speicher: Safari und Home-Bildschirm getrennt).
  if (erst) s.push(db.prepare("INSERT INTO erste (tag, art, n) VALUES (?1, ?2, 1) ON CONFLICT(tag, art) DO UPDATE SET n = n + 1").bind(tag, ARTEN.includes(art) ? art : "?"));
  if (Number.isInteger(stunde) && stunde >= 0 && stunde < 24)
    s.push(db.prepare("INSERT INTO stunden (tag, stunde, n) VALUES (?1, ?2, 1) ON CONFLICT(tag, stunde) DO UPDATE SET n = n + 1").bind(tag, stunde));
  await db.batch(s);
}
const TAB_ANGESEHEN = "CREATE TABLE IF NOT EXISTS angesehen (tag TEXT NOT NULL, reiter TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tag, reiter))";
const PLUS_ANGESEHEN = "INSERT INTO angesehen (tag, reiter, n) VALUES (?1, ?2, 1) ON CONFLICT(tag, reiter) DO UPDATE SET n = n + 1";
export async function ansehen(db, tag, reiter) {
  if (!reiter || !REITER_OK.test(reiter)) return;
  await db.batch([db.prepare(TAB_ANGESEHEN), db.prepare(PLUS_ANGESEHEN).bind(tag, reiter)]);
}
// Eigene Geräte (vom Nutzer, 21.10.2026): ein Handy, das in der App als „meins“ markiert ist, schickt
// ich=1 mit und landet nur hier, getrennt von allen anderen Zahlen.
const TAB_ICH = "CREATE TABLE IF NOT EXISTS ich (tag TEXT NOT NULL, was TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tag, was))";
export async function ichZaehlen(db, tag, was) {
  await db.batch([db.prepare(TAB_ICH), db.prepare("INSERT INTO ich (tag, was, n) VALUES (?1, ?2, 1) ON CONFLICT(tag, was) DO UPDATE SET n = n + 1").bind(tag, was)]);
}
export async function zahlenSeite(db) {
  const tage = (await db.prepare("SELECT tag, handys, oeffnungen FROM tage ORDER BY tag DESC LIMIT 30").all()).results || [];
  const ab = tage.at(-1)?.tag || "";
  // Ältere Datenbanken haben die Tabellen arten/stunden/angesehen erst nach dem ersten neuen Zählen.
  const alle = async (sql) => { try { return (await db.prepare(sql).bind(ab).all()).results || []; } catch (e) { return []; } };
  // Je Tag gespeichert; zusammengezählt wird hier — so gibt es dieselben Listen für 30 Tage und je Tag.
  const r = await alle("SELECT tag, reiter AS k, n FROM reiter WHERE tag >= ?1");
  const a = await alle("SELECT tag, art, handys, oeffnungen FROM arten WHERE tag >= ?1");
  const g = await alle("SELECT tag, reiter AS k, n FROM angesehen WHERE tag >= ?1");
  const h = await alle("SELECT tag, stunde AS k, n FROM stunden WHERE tag >= ?1");
  const e = await alle("SELECT tag, art, n FROM erste WHERE tag >= ?1");
  const ich = await alle("SELECT tag, was, n FROM ich WHERE tag >= ?1");
  const ichTage = [...new Set(ich.map(z => z.tag))].sort().reverse();
  const ichN = (tag, was) => ich.find(z => z.tag === tag && z.was === was)?.n || 0;
  const neuAm = (tag, x) => e.filter(z => z.tag === tag && (!x || z.art === x)).reduce((s, z) => s + z.n, 0);
  // Am Handy passt die Haupttabelle sonst nicht in die Breite (vom Nutzer, 21.10.): Tag kurz, Neu nur
  // als Zahl — die Aufteilung App/Browser steht im aufklappbaren Tag.
  const neuText = tag => tag < "2026-10-21" ? "–" : String(neuAm(tag));   // gezählt ab 21.10.
  const neuTeil = tag => neuAm(tag) ? `, ${neuAm(tag)} neu (App ${neuAm(tag, "app")}, Browser ${neuAm(tag, "web")})` : "";
  const kurz = tag => { const [, m, d] = tag.split("-"); return `${new Date(tag + "T12:00:00Z").toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" })} ${+d}.${+m}.`; };
  const summe = (zeilen, tag) => { const m = new Map(); for (const z of zeilen) if (!tag || z.tag === tag) m.set(z.k, (m.get(z.k) || 0) + z.n); return [...m]; };
  const liste = l => l.sort((x, y) => y[1] - x[1]).map(([k, n]) => `<tr><td>${k}</td><td>${n}</td></tr>`).join("") || "<tr><td>—</td></tr>";
  const uhr = l => { const max = Math.max(1, ...l.map(x => x[1]));
    return l.sort((x, y) => x[0] - y[0]).map(([k, n]) => `<tr><td>${String(k).padStart(2, "0")} Uhr</td><td>${n}</td><td class="bar"><span style="width:${Math.round(100 * n / max)}%"></span></td></tr>`).join("") || "<tr><td>—</td></tr>"; };
  const teile = (tag, was) => `<h3>Uhrzeit der Öffnungen${was}</h3><table>${uhr(summe(h, tag))}</table>
<h3>Reiter angesehen (Öffnen und Umschalten${was})</h3><table>${liste(summe(g, tag))}</table>
<h3>Reiter beim Öffnen${was}</h3><table>${liste(summe(r, tag))}</table>`;
  const art = (tag, x) => { const z = a.find(y => y.tag === tag && y.art === x); return z ? `${z.handys} / ${z.oeffnungen}` : "–"; };
  const zeile = t => `<tr><td>${kurz(t.tag)}</td><td>${t.handys}</td><td>${t.oeffnungen}</td><td>${art(t.tag, "app")}</td><td>${art(t.tag, "web")}</td><td>${neuText(t.tag)}</td></tr>`;
  const jeTag = tage.map((t, i) => `<details${i ? "" : " open"}><summary>${kurz(t.tag)} · ${t.handys} Handys, ${t.oeffnungen} Öffnungen${neuTeil(t.tag)}</summary>${teile(t.tag, "")}</details>`).join("");
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FC Koeppchen · Zahlen</title><style>body{font-family:system-ui,sans-serif;margin:16px;color:#111}table{border-collapse:collapse;width:100%;max-width:520px}
td,th{padding:6px 6px;border-bottom:1px solid #ddd;text-align:right;white-space:nowrap}td:first-child,th:first-child{text-align:left}h2{margin-top:28px}h3{font-size:15px;margin:16px 0 4px}
table.haupt{font-size:14px}table.haupt td,table.haupt th{padding:6px 3px}.breit{overflow-x:auto}
td.bar{width:50%;text-align:left}td.bar span{display:inline-block;height:10px;background:#1aa39a;border-radius:2px}
details{max-width:520px;border:1px solid #ddd;border-radius:10px;padding:8px 12px;margin:8px 0}summary{cursor:pointer;font-weight:700;color:#0f7a65}</style>
<h1>FC Koeppchen · Zahlen</h1><p>Handys = verschiedene Handys am Tag, Öffn. = Öffnungen, also Starts (oder zurück nach ≥ 30 min).
App = vom Home-Bildschirm, Browser = in Safari o. Ä., je „Handys / Öffnungen“. Wer beides benutzt, zählt bei den Handys zweimal.
Neu = zum allerersten Mal geöffnet (gezählt ab 21.10.2026); wer die App aus Safari auf den Home-Bildschirm legt, ist dort noch einmal neu.</p>
<div class="breit"><table class="haupt"><tr><th>Tag</th><th>Handys</th><th>Öffn.</th><th>App</th><th>Browser</th><th>Neu</th></tr>${tage.map(zeile).join("") || "<tr><td colspan=6>noch nichts gezählt</td></tr>"}</table></div>
<h2>Je Tag</h2>${jeTag || "<p>—</p>"}
<h2>Alle 30 Tage zusammen</h2>${teile("", ", dieselben Tage")}
<h2>Eigene Geräte (nicht mitgezählt)</h2><p>Geräte, die in der App als eigenes markiert sind (5× auf „Gemacht von …“ tippen). Sie stehen nur hier.</p>
<table><tr><th>Tag</th><th>Öffnungen</th><th>Umschalten</th></tr>${ichTage.map(t => `<tr><td>${kurz(t)}</td><td>${ichN(t, "oeffnung")}</td><td>${ichN(t, "umschalten")}</td></tr>`).join("") || "<tr><td colspan=3>—</td></tr>"}</table>`;
}

// ---- Mitteilungen (Web Push), Stufe 1: nur Erlauben und Test-Mitteilung (vom Nutzer, 21.10.2026) ----
// Die App meldet ein Abo an (?push=anmelden, POST mit dem Abo als Text), der Worker merkt es sich in
// D1 (Tabelle abos) und schickt auf ?push=test genau diesem Abo eine Test-Mitteilung. Schlüssel
// (VAPID) erzeugt der Worker beim ersten Mal selbst und legt sie in D1 ab — nichts einzufügen.
// Verschlüsselung nach RFC 8291 (aes128gcm), Anmeldung beim Push-Dienst nach RFC 8292 (VAPID).
const PUSH_DIENST = /^https:\/\/([a-z0-9-]+\.)*(push\.apple\.com|fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)\//;
const PUSH_ABSENDER = "https://strakekine.github.io/panini-wm-2026/fussball.html";
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const verbinden = (...t) => { const r = new Uint8Array(t.reduce((n, x) => n + x.length, 0)); let o = 0; for (const x of t) { r.set(x, o); o += x.length; } return r; };
async function hmac(schl, daten) {
  const k = await crypto.subtle.importKey("raw", schl, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, daten));
}
const TAB_ABOS = "CREATE TABLE IF NOT EXISTS abos (endpoint TEXT PRIMARY KEY, abo TEXT NOT NULL, test INTEGER NOT NULL DEFAULT 1, seit TEXT NOT NULL)";
export async function vapid(db) {
  await db.prepare("CREATE TABLE IF NOT EXISTS push_schluessel (id INTEGER PRIMARY KEY, privat TEXT NOT NULL, oeffentlich TEXT NOT NULL)").run();
  const lesen = () => db.prepare("SELECT privat, oeffentlich FROM push_schluessel WHERE id = 1").first();
  let z = await lesen();
  if (!z) {
    const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    // OR IGNORE: kommen zwei erste Aufrufe gleichzeitig, gewinnt einer, beide lesen danach denselben.
    await db.prepare("INSERT OR IGNORE INTO push_schluessel (id, privat, oeffentlich) VALUES (1, ?1, ?2)")
      .bind(JSON.stringify(await crypto.subtle.exportKey("jwk", k.privateKey)), b64u(await crypto.subtle.exportKey("raw", k.publicKey))).run();
    z = await lesen();
  }
  return z;
}
export async function vapidKopf(z, endpoint, jetzt = Date.now()) {
  const te = new TextEncoder(), teil = o => b64u(te.encode(JSON.stringify(o)));
  const ohne = teil({ typ: "JWT", alg: "ES256" }) + "." + teil({ aud: new URL(endpoint).origin, exp: Math.floor(jetzt / 1000) + 12 * 3600, sub: PUSH_ABSENDER });
  const k = await crypto.subtle.importKey("jwk", JSON.parse(z.privat), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, k, te.encode(ohne));
  return `vapid t=${ohne}.${b64u(sig)}, k=${z.oeffentlich}`;
}
export async function verschluesseln(abo, text) {
  const te = new TextEncoder(), eins = new Uint8Array([1]);
  const uaPub = unb64u(abo.keys.p256dh), auth = unb64u(abo.keys.auth);
  const as = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const ua = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const geheim = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: ua }, as.privateKey, 256));
  const ikm = await hmac(await hmac(auth, geheim), verbinden(te.encode("WebPush: info\0"), uaPub, asPub, eins));
  const salz = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salz, ikm);
  const cek = (await hmac(prk, verbinden(te.encode("Content-Encoding: aes128gcm\0"), eins))).slice(0, 16);
  const nonce = (await hmac(prk, verbinden(te.encode("Content-Encoding: nonce\0"), eins))).slice(0, 12);
  const k = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const inhalt = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, k, verbinden(te.encode(text), new Uint8Array([2]))));
  const kopf = new Uint8Array(21);
  kopf.set(salz); new DataView(kopf.buffer).setUint32(16, 4096); kopf[20] = 65;
  return verbinden(kopf, asPub, inhalt);
}
export async function pushSenden(db, abo, nachricht, ttl = 3600) {
  const z = await vapid(db);
  return fetch(abo.endpoint, {
    method: "POST",
    headers: { authorization: await vapidKopf(z, abo.endpoint), "content-encoding": "aes128gcm", "content-type": "application/octet-stream", ttl: String(ttl), urgency: "normal" },
    body: await verschluesseln(abo, JSON.stringify(nachricht)),
  });
}
const aboOk = a => a && typeof a.endpoint === "string" && a.endpoint.length < 1000 && PUSH_DIENST.test(a.endpoint)
  && typeof a.keys?.p256dh === "string" && a.keys.p256dh.length < 200 && typeof a.keys?.auth === "string" && a.keys.auth.length < 100;
const zuletztGetestet = new Map(); // endpoint → Zeit, höchstens ein Test je 20 s
export async function pushAnfrage(req, db, was) {
  if (was === "schluessel") return antwort(JSON.stringify({ schluessel: (await vapid(db)).oeffentlich }));
  if (req.method !== "POST") return antwort('{"fehler":"post"}', 405);
  let x; try { x = JSON.parse(await req.text()); } catch (e) { return antwort('{"fehler":"json"}', 400); }
  await db.prepare(TAB_ABOS).run();
  if (was === "anmelden") {
    if (!aboOk(x)) return antwort('{"fehler":"abo"}', 400);
    const abo = { endpoint: x.endpoint, keys: { p256dh: x.keys.p256dh, auth: x.keys.auth } };
    await db.prepare("INSERT OR REPLACE INTO abos (endpoint, abo, test, seit) VALUES (?1, ?2, 1, ?3)").bind(abo.endpoint, JSON.stringify(abo), new Date().toISOString()).run();
    return antwort('{"ok":true}');
  }
  const z = typeof x.endpoint === "string" ? await db.prepare("SELECT abo FROM abos WHERE endpoint = ?1").bind(x.endpoint).first() : null;
  if (was === "abmelden") {
    if (z) await db.prepare("DELETE FROM abos WHERE endpoint = ?1").bind(x.endpoint).run();
    return antwort('{"ok":true}');
  }
  if (was === "test") {
    if (!z) return antwort('{"fehler":"nicht angemeldet"}', 404);
    if (Date.now() - (zuletztGetestet.get(x.endpoint) || 0) < 20e3) return antwort('{"fehler":"zu schnell"}', 429);
    zuletztGetestet.set(x.endpoint, Date.now());
    const r = await pushSenden(db, JSON.parse(z.abo), { titel: "Test-Mitteilung ✓", text: "So sehen Mitteilungen der App aus.", url: "fussball.html" });
    // 404/410: Abo gibt es beim Push-Dienst nicht mehr (abgemeldet, App gelöscht) → vergessen.
    if (r.status === 404 || r.status === 410) await db.prepare("DELETE FROM abos WHERE endpoint = ?1").bind(x.endpoint).run();
    if (r.status >= 300) console.log("Push:", r.status, await r.text());
    return antwort(JSON.stringify({ ok: r.status < 300, status: r.status }), r.status < 300 ? 200 : 502);
  }
  if (was === "wahl") {
    if (!z) return antwort('{"fehler":"nicht angemeldet"}', 404);
    const teams = (Array.isArray(x.teams) ? x.teams : []).filter(t => typeof t === "string" && REITER_OK.test(t)).slice(0, 30);
    const arten = (Array.isArray(x.arten) ? x.arten : []).filter(a => MITT_ARTEN.includes(a));
    await abosSpalte(db);
    await db.prepare("UPDATE abos SET wahl = ?2 WHERE endpoint = ?1").bind(x.endpoint, JSON.stringify({ teams, arten })).run();
    return antwort('{"ok":true}');
  }
  return antwort('{"fehler":"push"}', 400);
}

// ---- Mitteilungen, Stufe 2 (vom Nutzer, 21.10.2026): echte Meldungen ----
// Alle 15 min (Cron): data/mitteilungen.json lesen (schreibt der FLF-Abruf, tools/mitteilungen.mjs),
// dazu für die Spiele des Tages mit Ticker selbst bei FuPa nachsehen (Liveticker läuft, Endstand).
// Gesendet wird nur 7–22 Uhr Luxemburger Zeit; was nachts fällig wird, wartet bis 7 Uhr (solange
// `bis` nicht vorbei ist). Jede id geht nur einmal raus (Tabelle gemeldet).
const MITT_URL = "https://raw.githubusercontent.com/strakekine/panini-wm-2026/main/data/mitteilungen.json";
const MITT_ARTEN = ["heute", "spieltag", "tabelle", "uhrzeit", "ticker", "ende", "woche"];
async function abosSpalte(db) {
  await db.prepare(TAB_ABOS).run();
  try { await db.prepare("ALTER TABLE abos ADD COLUMN wahl TEXT").run(); } catch (e) { /* gibt es schon */ }
}
// Wer bekommt ein Ereignis? Mannschaft angehakt und Art angehakt; „Unsere Woche“ hängt nur am Haken „Woche“.
export function passtZu(wahl, e) {
  if (!wahl || !e.reiter.some(r => wahl.teams.includes(r))) return false;
  return e.art === "woche" || wahl.arten.includes(e.art);
}
export const tagzeit = ms => { const h = stundeLux(ms); return h >= 7 && h < 22; };
// Liveticker und Endstand für ein Spiel des Tages (Kandidat aus mitteilungen.json → live).
export function liveEreignisse(c, k, now) {
  const aus = [], d = Date.parse(c.d);
  if (k.section === "LIVE" && (k.hs != null || k.ticker || k.tore.length))
    aus.push({ id: c.ticker, reiter: c.reiter, art: "ticker", titel: `${c.titel} · Liveticker`,
               text: `Heute tickert FuPa das Spiel gegen ${c.gegner} – live in der App.`, ab: now, bis: d + 180 * 60e3 });
  if (k.section === "POST" && k.hs != null && k.as != null) {
    // FuPa führt Heim/Gast manchmal andersherum als die FLF (Beggen–Koeppchen II): Zahlen nach FLF drehen.
    const gleich = (k.slug || "").startsWith(c.fupaWir) === c.wirHeim;
    const [h, a] = gleich ? [k.hs, k.as] : [k.as, k.hs];
    aus.push({ id: c.ende, reiter: c.reiter, art: "ende", titel: `${c.titel} · Endstand`, text: `${c.h} ${h}:${a} ${c.a}`, ab: now, bis: now + 18 * 3600e3 });
  }
  return aus;
}
export async function mitteilungenSenden(db, now = Date.now()) {
  await abosSpalte(db);
  const abos = (await db.prepare("SELECT endpoint, abo, wahl FROM abos WHERE wahl IS NOT NULL").all()).results || [];
  if (!abos.length) return { gesendet: 0 };
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS gemeldet (id TEXT PRIMARY KEY, zeit INTEGER NOT NULL)"),
    db.prepare("CREATE TABLE IF NOT EXISTS offen (id TEXT PRIMARY KEY, ereignis TEXT NOT NULL)"),
  ]);
  let datei = { ereignisse: [], live: [] };
  try { const r = await fetch(MITT_URL, { headers: { "cache-control": "no-cache" } }); if (r.ok) datei = await r.json(); } catch (e) { console.log("Mitteilungen lesen:", e.message); }
  const schon = async id => !!(await db.prepare("SELECT id FROM gemeldet WHERE id = ?1").bind(id).first());
  // Live: Spiele vom Anpfiff bis 3 h danach, höchstens eine FuPa-Abfrage je Spiel und Takt.
  for (const c of datei.live || []) {
    const d = Date.parse(c.d);
    if (now < d || now > d + 180 * 60e3) continue;
    if ((await schon(c.ende))) continue;
    try {
      const slug = c.slug || (c.anstoss && await slugZu(c.anstoss));
      if (!slug) continue;
      const r = await fetch(API + slug, { headers: { accept: "application/json" } });
      if (!r.ok) continue;
      for (const e of liveEreignisse(c, kuerzen(await r.json()), now))
        await db.prepare("INSERT OR IGNORE INTO offen (id, ereignis) VALUES (?1, ?2)").bind(e.id, JSON.stringify(e)).run();
    } catch (e) { console.log("Live", c.id, e.message); }
  }
  const offen = ((await db.prepare("SELECT ereignis FROM offen").all()).results || []).map(z => JSON.parse(z.ereignis));
  let gesendet = 0;
  for (const e of [...(datei.ereignisse || []), ...offen]) {
    if (e.bis <= now) { await db.prepare("DELETE FROM offen WHERE id = ?1").bind(e.id).run(); continue; }
    if (e.ab > now || !tagzeit(now) || await schon(e.id)) continue;
    // Erst als gemeldet eintragen, dann senden: lieber eine Mitteilung verpasst als zehnmal dieselbe.
    await db.batch([db.prepare("INSERT OR IGNORE INTO gemeldet (id, zeit) VALUES (?1, ?2)").bind(e.id, now),
                    db.prepare("DELETE FROM offen WHERE id = ?1").bind(e.id)]);
    for (const a of abos) {
      let wahl = null; try { wahl = JSON.parse(a.wahl); } catch (x) {}
      if (!passtZu(wahl, e)) continue;
      const r = await pushSenden(db, JSON.parse(a.abo), { titel: e.titel, text: e.text, tag: e.id, url: "fussball.html" }, Math.max(60, Math.round((e.bis - now) / 1000)));
      if (r.status === 404 || r.status === 410) await db.prepare("DELETE FROM abos WHERE endpoint = ?1").bind(a.endpoint).run();
      else if (r.status >= 300) console.log("Push", e.id, r.status);
      else gesendet++;
    }
  }
  await db.prepare("DELETE FROM gemeldet WHERE zeit < ?1").bind(now - 30 * 24 * 3600e3).run();
  return { gesendet };
}

export default {
  async scheduled(event, env, ctx) {
    // Auf die volle Viertelstunde runden: Cloudflare startet den Takt manchmal ein paar Sekunden später.
    const t = Math.round(event.scheduledTime / 60e3) * 60e3;
    if (env.DB) ctx.waitUntil(mitteilungenSenden(env.DB, t).catch(e => console.log("Mitteilungen:", e.message)));
    if (!env.GITHUB_TOKEN || !abrufFaellig(t)) return;
    ctx.waitUntil(anstossen(env));
  },

  async fetch(req, env = {}) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const q = new URL(req.url).searchParams;
    if (q.has("push")) {
      if (!env.DB) return antwort('{"fehler":"kein D1"}', 503);
      try { return await pushAnfrage(req, env.DB, q.get("push")); } catch (e) { console.log("Push:", e.message); return antwort('{"fehler":"intern"}', 500); }
    }
    if (q.get("ich") === "1" && (q.has("zaehle") || q.has("angesehen"))) {
      if (env.DB) try { await ichZaehlen(env.DB, tagLux(Date.now()), q.has("zaehle") ? "oeffnung" : "umschalten"); } catch (e) { console.log("Zähler:", e.message); }
      return new Response(null, { status: 204, headers: CORS });
    }
    if (q.has("zaehle")) {
      if (env.DB) try { { const t = Date.now(); await zaehlen(env.DB, tagLux(t), q.get("neu") === "1", q.get("reiter") || "", q.get("art") || "", stundeLux(t), q.get("erst") === "1"); } } catch (e) { console.log("Zähler:", e.message); }
      return new Response(null, { status: 204, headers: CORS });
    }
    if (q.has("angesehen")) {
      if (env.DB) try { await ansehen(env.DB, tagLux(Date.now()), q.get("reiter") || ""); } catch (e) { console.log("Zähler:", e.message); }
      return new Response(null, { status: 204, headers: CORS });
    }
    if (q.has("zahlen")) {
      if (!env.DB) return new Response("Zähler nicht eingerichtet (D1-Binding „DB“ fehlt).", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
      return new Response(await zahlenSeite(env.DB), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
    }
    let slug = q.get("slug") || "";
    const anstoss = q.get("anstoss") || "";
    if (!slug && anstoss) {
      // Nur Spiele um jetzt herum (±36 h) — sonst könnte jeder beliebig FuPa-Seiten abrufen lassen.
      const a = Date.parse(anstoss);
      if (!a || Math.abs(a - Date.now()) > 36 * 3600e3) return antwort('{"fehler":"anstoss"}', 400);
      slug = (await slugZu(anstoss)) || "";
      if (!slug) return antwort('{"fehler":"spiel nicht gefunden"}', 404);
    }
    // Koeppchen-Spiele und Länderspiele Luxemburgs (Reiter „Roude Léiw“, seit 19.10.2026).
    if (!/^[a-z0-9-_]{5,160}$/.test(slug) || !(slug.includes("fc-koeppchen") || slug.includes("luxemburg-m1"))) return antwort('{"fehler":"slug"}', 400);

    const g = gemerkt.get(slug);
    if (g && Date.now() - g.t < MERKEN_MS) return antwort(g.body);

    const r = await fetch(API + slug, { headers: { accept: "application/json" } });
    if (!r.ok) return g ? antwort(g.body) : antwort(`{"fehler":"fupa ${r.status}"}`, 502);
    const body = JSON.stringify({ ...kuerzen(await r.json()), abgerufen: new Date().toISOString() });
    gemerkt.set(slug, { t: Date.now(), body });
    return antwort(body);
  },
};
