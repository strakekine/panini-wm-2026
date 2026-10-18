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
// Nur Koeppchen-Spiele (kein offener Vermittler). Je Spiel höchstens eine FuPa-Abfrage alle 20 s.
// Zurück kommen nur die Felder, die die App braucht — Tore und Karten als Ereignislisten.

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

// Saison aus dem Anstoß (ab Juli neue Saison) → „fc-koeppchen-m1-2026-27“, aus der Vereinsseite.
export function saisonVon(anstoss) {
  const [j, m] = tagLux(Date.parse(anstoss)).split("-").map(Number);
  const y = m >= 7 ? j : j - 1;
  return y + "-" + String((y + 1) % 100).padStart(2, "0");
}

async function slugZu(anstoss) {
  const g = gefunden.get(anstoss);
  if (g && Date.now() - g.t < 6 * 3600e3) return g.slug;
  const club = await (await fetch("https://www.fupa.net/club/fc-koeppchen")).text();
  const team = club.match(new RegExp(`/team/(fc-koeppchen-m1-${saisonVon(anstoss)})\\b`))?.[1];
  if (!team) return null;
  const html = await (await fetch(`https://www.fupa.net/team/${team}/matches`)).text();
  const m = html.match(/window\.REDUX_DATA\s*=\s*(\{.*?\})\s*(?:;|<\/script>)/s);
  if (!m) return null;
  const spiele = [];
  (function lauf(o) {
    if (Array.isArray(o)) o.forEach(lauf);
    else if (o && typeof o === "object") {
      if (o.kickoff && o.slug && o.homeTeam) spiele.push(o);
      Object.values(o).forEach(lauf);
    }
  })(JSON.parse(m[1]));
  const slug = passendesSpiel(spiele, anstoss)?.slug || null;
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

export default {
  async fetch(req) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const q = new URL(req.url).searchParams;
    let slug = q.get("slug") || "";
    const anstoss = q.get("anstoss") || "";
    if (!slug && anstoss) {
      // Nur Spiele um jetzt herum (±36 h) — sonst könnte jeder beliebig FuPa-Seiten abrufen lassen.
      const a = Date.parse(anstoss);
      if (!a || Math.abs(a - Date.now()) > 36 * 3600e3) return antwort('{"fehler":"anstoss"}', 400);
      slug = (await slugZu(anstoss)) || "";
      if (!slug) return antwort('{"fehler":"spiel nicht gefunden"}', 404);
    }
    if (!/^[a-z0-9-]{5,160}$/.test(slug) || !slug.includes("fc-koeppchen")) return antwort('{"fehler":"slug"}', 400);

    const g = gemerkt.get(slug);
    if (g && Date.now() - g.t < MERKEN_MS) return antwort(g.body);

    const r = await fetch(API + slug, { headers: { accept: "application/json" } });
    if (!r.ok) return g ? antwort(g.body) : antwort(`{"fehler":"fupa ${r.status}"}`, 502);
    const body = JSON.stringify({ ...kuerzen(await r.json()), abgerufen: new Date().toISOString() });
    gemerkt.set(slug, { t: Date.now(), body });
    return antwort(body);
  },
};
