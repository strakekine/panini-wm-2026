// Cloudflare Worker für ALLE Vereine dieses Repos. Zwei Aufgaben:
//  1. Zeitplan: stößt den FLF-Abruf (fussball.yml) pünktlich an — GitHub startet geplante Läufe
//     oft verspätet oder lässt sie aus. Er holt nichts von der FLF, er drückt nur bei GitHub auf
//     „Abruf starten“. GitHubs eigener Zeitplan bleibt als Reserve.
//  2. Liveticker: Stand eines FuPa-Spiels für die Apps (FuPa schickt keine CORS-Freigabe), Seniors 1
//     und Nationalteam. Je Spiel höchstens eine FuPa-Abfrage alle 20 s, egal wie viele zuschauen.
//
// Die Vereine kennt er aus vereine.json im Repo (von tools/neu.mjs geschrieben, 10 min gemerkt):
// ein neuer Verein braucht hier keine Änderung. Kein offener Vermittler: nur Spiele der Seniors 1
// eines eingetragenen Vereins und Länderspiele Luxemburgs.
//
// Einrichten (einmal, im Cloudflare-Dashboard): Workers & Pages → Create → Worker → Name z. B.
// „fussball-vereine“ → Deploy → Edit code → diesen Inhalt ganz einfügen → Deploy. Die Adresse
// (https://fussball-vereine.<name>.workers.dev/) kommt in repo.json als "worker", dann
// `node tools/neu.mjs --alle`. Settings → Variables and Secrets → Secret GITHUB_TOKEN
// (Fine-grained Token, nur dieses Repo, Actions: Read and write — läuft nach höchstens einem Jahr
// ab, dann 401 im Log); Settings → Triggers → Cron Triggers → „*/15 * * * *“.
//
// Aufruf: GET /?verein=<ordner>&anstoss=<ISO-Zeit aus dem FLF-Spielplan> (der Worker sucht das Spiel
// bei FuPa) oder GET /?slug=<FuPa-Spiel-Slug>&verein=<ordner>.

const REPO = "strakekine/fussball-vereine", WORKFLOW = "fussball.yml";
const API = "https://api.fupa.net/v1/";
const MERKEN_MS = 20e3;
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };
const gemerkt = new Map();  // slug → { t, body } (je Worker-Instanz)
const gefunden = new Map(); // team|anstoss → { t, slug } — die Suche kostet ein, zwei Abrufe, 6 h merken
let VEREINE = { t: 0, liste: null };

// ---- Zeitplan ----
// Wochenende 8–22 Uhr Luxemburger Zeit jede Viertelstunde, Mo–Fr 20:15 UTC, jeden Tag 23:30.
export function abrufFaellig(ms) {
  const teile = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Luxembourg", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(ms)).map(p => [p.type, p.value]));
  const h = +teile.hour, m = +teile.minute;
  if (m % 15) return false;
  if (h === 23 && m === 30) return true;
  if (teile.weekday === "Sat" || teile.weekday === "Sun") return h >= 8 && (h < 22 || (h === 22 && m === 0));
  const u = new Date(ms);
  return u.getUTCHours() === 20 && u.getUTCMinutes() === 15;
}

async function anstossen(env) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    headers: {
      authorization: "Bearer " + env.GITHUB_TOKEN, accept: "application/vnd.github+json",
      "user-agent": "fussball-vereine", "content-type": "application/json",
    },
    body: JSON.stringify({ ref: "main" }),
  });
  if (r.status !== 204) console.log("GitHub", r.status, await r.text());
}

// ---- Liveticker (Kopie aus der Koeppchen-App, tools/cloudflare-worker.js dort) ----
const tagLux = ms => new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Luxembourg" });
// FuPa-Spiel zum FLF-Anstoß: gleiche Zeit, sonst am selben Tag ±3 h.
export function passendesSpiel(fupaSpiele, anstoss) {
  const a = Date.parse(anstoss);
  const genau = fupaSpiele.find(x => Date.parse(x.kickoff) === a);
  if (genau) return genau;
  return fupaSpiele
    .filter(x => tagLux(Date.parse(x.kickoff)) === tagLux(a) && Math.abs(Date.parse(x.kickoff) - a) <= 3 * 3600e3)
    .sort((x, y) => Math.abs(Date.parse(x.kickoff) - a) - Math.abs(Date.parse(y.kickoff) - a))[0] || null;
}

// Saison aus dem Anstoß (ab Juli neue Saison) → „2026-27“ für den Teamslug „us-mondorf-m1-2026-27“.
export function saisonVon(anstoss) {
  const [j, m] = tagLux(Date.parse(anstoss)).split("-").map(Number);
  const y = m >= 7 ? j : j - 1;
  return y + "-" + String((y + 1) % 100).padStart(2, "0");
}

async function slugZu(fupaVerein, anstoss) {
  const key = fupaVerein + "|" + anstoss, g = gefunden.get(key);
  if (g && Date.now() - g.t < 6 * 3600e3) return g.slug;
  const team = fupaVerein + "-m1-" + saisonVon(anstoss);
  let slug = null;
  for (const flavor of ["current", "past"]) {
    const r = await fetch(`${API}teams/${team}/matches?flavor=${flavor}`, { headers: { accept: "application/json" } });
    if (!r.ok) continue;
    const spiele = await r.json();
    slug = Array.isArray(spiele) ? passendesSpiel(spiele, anstoss)?.slug || null : null;
    if (slug) break;
  }
  if (slug) gefunden.set(key, { t: Date.now(), slug });
  return slug;
}

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
    slug: f.slug, hs: f.homeGoal ?? null, as: f.awayGoal ?? null, section: f.section || "",
    period: f.live?.period || "", running: !!f.live?.running, minute: f.live?.minute ?? null,
    minuteAt: f.live?.lastTimestamp || null, tore: ereignisse(f, "goal"), karten: ereignisse(f, "card"),
    ticker: f.tickerAuthor?.name || null,
  };
}

// Darf dieser Slug abgefragt werden? Länderspiel Luxemburgs, oder ein Spiel der Seniors 1 des Vereins
// (FuPa-Spielslugs enthalten beide Teamslugs: „us-mondorf-m1-fc-wiltz-71-m1-261018“).
export function erlaubt(slug, fupaVerein) {
  if (!/^[a-z0-9-_]{5,160}$/.test(slug)) return false;
  return slug.includes("luxemburg-m1") || (!!fupaVerein && slug.includes(fupaVerein + "-m1"));
}

async function vereine() {
  if (VEREINE.liste && Date.now() - VEREINE.t < 10 * 60e3) return VEREINE.liste;
  try {
    const r = await fetch(`https://raw.githubusercontent.com/${REPO}/main/vereine.json`);
    if (r.ok) VEREINE = { t: Date.now(), liste: await r.json() };
  } catch (e) {}
  return VEREINE.liste || {};
}

function antwort(body, status = 200) {
  return new Response(body, { status, headers: { ...CORS, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

export default {
  async scheduled(event, env, ctx) {
    // Auf die volle Viertelstunde runden: Cloudflare startet den Takt manchmal ein paar Sekunden später.
    const t = Math.round(event.scheduledTime / 60e3) * 60e3;
    if (!env.GITHUB_TOKEN || !abrufFaellig(t)) return;
    ctx.waitUntil(anstossen(env));
  },

  async fetch(req) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const q = new URL(req.url).searchParams;
    const fupaVerein = (await vereine())[q.get("verein") || ""]?.fupa || "";
    let slug = q.get("slug") || "";
    const anstoss = q.get("anstoss") || "";
    if (!slug && anstoss) {
      if (!fupaVerein) return antwort('{"fehler":"verein"}', 400);
      // Nur Spiele um jetzt herum (±36 h) — sonst könnte jeder beliebig FuPa abrufen lassen.
      const a = Date.parse(anstoss);
      if (!a || Math.abs(a - Date.now()) > 36 * 3600e3) return antwort('{"fehler":"anstoss"}', 400);
      slug = (await slugZu(fupaVerein, anstoss)) || "";
      if (!slug) return antwort('{"fehler":"spiel nicht gefunden"}', 404);
    }
    if (!erlaubt(slug, fupaVerein)) return antwort('{"fehler":"slug"}', 400);

    const g = gemerkt.get(slug);
    if (g && Date.now() - g.t < MERKEN_MS) return antwort(g.body);
    const r = await fetch(API + "matches/" + slug, { headers: { accept: "application/json" } });
    if (!r.ok) return g ? antwort(g.body) : antwort(`{"fehler":"fupa ${r.status}"}`, 502);
    const body = JSON.stringify({ ...kuerzen(await r.json()), abgerufen: new Date().toISOString() });
    gemerkt.set(slug, { t: Date.now(), body });
    return antwort(body);
  },
};
