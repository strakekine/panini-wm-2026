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
  "access-control-allow-methods": "GET, OPTIONS",
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
// Handy selbst) und reiter=<gewählter Reiter>. Gespeichert werden nur Zahlen je Tag, keine Kennung,
// keine Adresse. Speicher: Cloudflare D1, im Worker als Binding „DB“ (Settings → Bindings → D1).
// Ohne Binding tut der Zähler nichts. Ansehen: ?zahlen (die letzten 30 Tage).
const REITER_OK = /^[A-Za-zÀ-ÿ0-9 ]{1,20}$/;
export async function zaehlen(db, tag, neu, reiter) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS tage (tag TEXT PRIMARY KEY, handys INTEGER NOT NULL DEFAULT 0, oeffnungen INTEGER NOT NULL DEFAULT 0)"),
    db.prepare("CREATE TABLE IF NOT EXISTS reiter (tag TEXT NOT NULL, reiter TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (tag, reiter))"),
  ]);
  const s = [db.prepare("INSERT INTO tage (tag, handys, oeffnungen) VALUES (?1, ?2, 1) ON CONFLICT(tag) DO UPDATE SET handys = handys + ?2, oeffnungen = oeffnungen + 1").bind(tag, neu ? 1 : 0)];
  if (reiter && REITER_OK.test(reiter))
    s.push(db.prepare("INSERT INTO reiter (tag, reiter, n) VALUES (?1, ?2, 1) ON CONFLICT(tag, reiter) DO UPDATE SET n = n + 1").bind(tag, reiter));
  await db.batch(s);
}
export async function zahlenSeite(db) {
  const tage = (await db.prepare("SELECT tag, handys, oeffnungen FROM tage ORDER BY tag DESC LIMIT 30").all()).results || [];
  const r = (await db.prepare("SELECT reiter, SUM(n) AS n FROM reiter WHERE tag >= ?1 GROUP BY reiter ORDER BY n DESC").bind(tage.at(-1)?.tag || "").all()).results || [];
  const zeile = t => `<tr><td>${t.tag}</td><td>${t.handys}</td><td>${t.oeffnungen}</td></tr>`;
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FC Koeppchen · Zahlen</title><style>body{font-family:system-ui,sans-serif;margin:16px;color:#111}table{border-collapse:collapse;width:100%;max-width:420px}
td,th{padding:6px 8px;border-bottom:1px solid #ddd;text-align:right}td:first-child,th:first-child{text-align:left}h2{margin-top:24px}</style>
<h1>FC Koeppchen · Zahlen</h1><p>Handys = verschiedene Handys am Tag, Öffnungen = Starts (oder zurück nach ≥ 30 min).</p>
<table><tr><th>Tag</th><th>Handys</th><th>Öffnungen</th></tr>${tage.map(zeile).join("") || "<tr><td colspan=3>noch nichts gezählt</td></tr>"}</table>
<h2>Reiter beim Öffnen (dieselben Tage)</h2><table>${r.map(x => `<tr><td>${x.reiter}</td><td>${x.n}</td></tr>`).join("") || "<tr><td>—</td></tr>"}</table>`;
}

export default {
  async scheduled(event, env, ctx) {
    // Auf die volle Viertelstunde runden: Cloudflare startet den Takt manchmal ein paar Sekunden später.
    const t = Math.round(event.scheduledTime / 60e3) * 60e3;
    if (!env.GITHUB_TOKEN || !abrufFaellig(t)) return;
    ctx.waitUntil(anstossen(env));
  },

  async fetch(req, env = {}) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const q = new URL(req.url).searchParams;
    if (q.has("zaehle")) {
      if (env.DB) try { await zaehlen(env.DB, tagLux(Date.now()), q.get("neu") === "1", q.get("reiter") || ""); } catch (e) { console.log("Zähler:", e.message); }
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
