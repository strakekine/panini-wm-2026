// Cloudflare Worker (freiwillig): stößt den FLF-Abruf pünktlich an, weil GitHub geplante Läufe
// oft verspätet startet oder auslässt. Er holt nichts von der FLF, er drückt nur bei GitHub auf
// „Abruf starten“ (wie ein Handstart). GitHubs eigener Zeitplan bleibt als Reserve.
//
// Einrichten (einmal, im Cloudflare-Dashboard): Workers & Pages → Create → Worker → Deploy →
// Edit code → diesen Inhalt ganz einfügen → Deploy. Dann Settings → Variables and Secrets →
// Secret GITHUB_TOKEN (Fine-grained Token, nur dieses Repo, Actions: Read and write — läuft nach
// höchstens einem Jahr ab); Settings → Triggers → Cron Triggers → „*/15 * * * *“.
// Danach in verein.json "anstoss": true setzen (nur für den Text unten in der App) und neu erzeugen.

const REPO = "{{REPO}}", WORKFLOW = "fussball.yml";

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
      authorization: "Bearer " + env.GITHUB_TOKEN,
      accept: "application/vnd.github+json",
      "user-agent": "fussball-anstoss",
      "content-type": "application/json",
    },
    body: JSON.stringify({ ref: "main" }),
  });
  // 401 = Token abgelaufen: neues anlegen und hier ersetzen.
  if (r.status !== 204) console.log("GitHub", r.status, await r.text());
}

export default {
  async scheduled(event, env, ctx) {
    // Auf die volle Viertelstunde runden: Cloudflare startet den Takt manchmal ein paar Sekunden später.
    const t = Math.round(event.scheduledTime / 60e3) * 60e3;
    if (!env.GITHUB_TOKEN || !abrufFaellig(t)) return;
    ctx.waitUntil(anstossen(env));
  },
  async fetch() {
    return new Response("Nur Zeitplan, sonst nichts.\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
  },
};
