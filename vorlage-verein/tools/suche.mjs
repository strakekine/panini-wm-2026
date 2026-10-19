// Sucht einen Verein bei der FLF und schreibt den Anfang einer verein.json.
//
//   node tools/suche.mjs <Name oder Ort>      → passende Vereine mit Nummer
//   node tools/suche.mjs <Nummer>             → Mannschaften dieser Saison + Vorschlag
//
// In der Cloud-Umgebung: NODE_USE_ENV_PROXY=1 davor.
// Wichtig: Die FLF schreibt den Verein und seine Mannschaften verschieden („Wormeldange FC
// Koeppchen“ ↔ „FC Koeppchen Wormeldange I“). flfName muss der Mannschaftsname ohne I/II sein.

const API = "https://extranet.flf.lu/api/graphql";
async function gq(query, variables = {}) {
  const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
  const j = await r.json();
  if (j.errors?.length) throw new Error(j.errors.map(e => e.message).join("; "));
  return j.data;
}
const flach = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const arg = process.argv.slice(2).join(" ").trim();
if (!arg) { console.log("node tools/suche.mjs <Name | Nummer>"); process.exit(2); }

const { clubs } = await gq(`{ clubs { id name } }`);
if (!/^\d+$/.test(arg)) {
  const treffer = clubs.filter(c => flach(c.name).includes(flach(arg)));
  if (!treffer.length) console.log("Kein Verein gefunden.");
  for (const c of treffer) console.log(String(c.id).padStart(8), " ", c.name);
  if (treffer.length === 1) console.log(`\nWeiter: node tools/suche.mjs ${treffer[0].id}`);
  process.exit(0);
}

const id = +arg, club = clubs.find(c => c.id === id);
const d = await gq(`{ defaultValues{ currentSeasonId } seasons{ id name startDate endDate } }`);
const s = d.seasons.find(x => x.id === d.defaultValues.currentSeasonId);
const { matches } = await gq(`query($c: MatchCriteria){ matches(criteria:$c){ homeTeam{ id name clubId1 clubId2 clubId3 clubId4 }
  awayTeam{ id name clubId1 clubId2 clubId3 clubId4 } division{ id name } matchType{ id } } }`,
  { c: { seasonId: s.id, startDate: s.startDate.slice(0, 10), endDate: s.endDate.slice(0, 10), clubId: id, matchTypeId: "ALL" } });
const eigen = t => [t.clubId1, t.clubId2, t.clubId3, t.clubId4].includes(id);
const namen = new Map();
for (const m of matches) for (const t of [m.homeTeam, m.awayTeam]) if (eigen(t)) {
  const e = namen.get(t.name) || { n: 0, klassen: new Set() };
  e.n++; e.klassen.add(m.division.name.replace(/\s+(Cl|Phase|S\d).*$/i, "").trim());
  namen.set(t.name, e);
}
console.log(`${club?.name || "?"} (${id}) · ${s.name} · ${matches.length} Spiele\n`);
for (const [n, e] of [...namen].sort((a, b) => b[1].n - a[1].n))
  console.log(String(e.n).padStart(4), " ", n.padEnd(42), [...e.klassen].join(", "));
// Häufigster Name ohne angehängte I/II/III — bei Spielgemeinschaften (ENT …) ist das selten der Verein.
const basis = new Map();
for (const [n, e] of namen) if (!/^ENT\b/.test(n)) { const b = n.replace(/\s+(I|II|III|IV|V)$/, ""); basis.set(b, (basis.get(b) || 0) + e.n); }
const flfName = [...basis].sort((a, b) => b[1] - a[1])[0]?.[0];
if (!flfName) { console.log("\nKeine eigenen Mannschaften gefunden (Saison noch leer?)."); process.exit(1); }
// FuPa (für den Liveticker der Seniors 1). FuPa hat keine Suche und schreibt Orte deutsch
// („Sporting Bartringen“ = Sporting Bertrange), der Name hilft also nicht immer. Darum wie bei der
// BGL-Tabelle: Spiele/S/U/N/Tore der ersten Mannschaft aus den FLF-Ergebnissen ihrer Liga, verglichen
// mit allen Herren-Tabellen bei FuPa (Luxemburg). Gleiche Zahlen = derselbe Verein. Am Saisonanfang
// sind die Zahlen oft nicht eindeutig — dann zusätzlich über ein gemeinsames Namenswort.
const kurzwort = n => n.replace(/^(FC|US|AS|CS|SC|FF|Racing|Union|Jeunesse|Sporting|Etoile|Avenir|Red Boys|Résidence)\s+/i, "").split(/[\s-]+/)[0];
async function fupaGet(p) {
  const r = await fetch("https://api.fupa.net/v1/" + p, { headers: { accept: "application/json" } });
  return r.ok ? r.json() : null;
}
const sig = r => [r.sp, r.s, r.u, r.nl, r.t, r.g].join("/");
let fupa = "";
try {
  const liga = matches.find(m => m.matchType?.id === "CC" && [m.homeTeam, m.awayTeam].some(t => eigen(t) && t.name === flfName));
  let wir = null;
  if (liga) {
    await new Promise(r => setTimeout(r, 1000));
    const { matches: alle } = await gq(`query($c: MatchCriteria){ matches(criteria:$c){ match{ isPlayed homeScore awayScore finalHomeScore finalAwayScore }
      homeTeam{ name } awayTeam{ name } } }`, { c: { seasonId: s.id, startDate: s.startDate.slice(0, 10), endDate: s.endDate.slice(0, 10), divisionId: liga.division.id, matchTypeId: "CC" } });
    wir = { sp: 0, s: 0, u: 0, nl: 0, t: 0, g: 0 };
    for (const m of alle) {
      const x = m.match, hs = x.finalHomeScore ?? x.homeScore, as = x.finalAwayScore ?? x.awayScore;
      if (!x.isPlayed || hs == null) continue;
      const seite = m.homeTeam.name === flfName ? [hs, as] : m.awayTeam.name === flfName ? [as, hs] : null;
      if (!seite) continue;
      wir.sp++; wir.t += seite[0]; wir.g += seite[1];
      if (seite[0] > seite[1]) wir.s++; else if (seite[0] === seite[1]) wir.u++; else wir.nl++;
    }
    console.log(`\nErste Mannschaft: ${liga.division.name}, ${wir.sp} Spiele, ${wir.s}-${wir.u}-${wir.nl}, ${wir.t}:${wir.g}`);
  }
  const comps = ((await fupaGet("competitions?district=luxemburg")) || []).filter(c => c.ageGroup?.slug === "m" && c.active);
  const zeilen = [];
  for (const c of comps) for (const r of (await fupaGet("standings?competition=" + c.slug))?.standings || [])
    zeilen.push({ slug: r.team.slug.replace(/-m1-\d{4}-\d\d$/, ""), n: r.team.name.full, comp: c.slug,
                  z: { sp: r.matches, s: r.wins, u: r.draws, nl: r.defeats, t: r.ownGoals, g: r.againstGoals } });
  const woerter = new Set(flach(flfName + " " + (club?.name || "")).split(/[^a-z0-9]+/).filter(w => w.length > 3));
  const gleichesWort = z => flach(z.n + " " + z.slug).split(/[^a-z0-9]+/).some(w => woerter.has(w));
  const zahlen = wir && wir.sp ? zeilen.filter(z => sig(z.z) === sig(wir)) : [];
  const treffer = zahlen.length === 1 ? zahlen : zahlen.filter(gleichesWort).length === 1 ? zahlen.filter(gleichesWort)
    : zeilen.filter(gleichesWort).length === 1 ? zeilen.filter(gleichesWort) : [];
  if (treffer.length === 1) {
    fupa = treffer[0].slug;
    console.log(`FuPa: ${fupa} → „${treffer[0].n}“ (${treffer[0].comp}${zahlen.includes(treffer[0]) ? ", gleiche Zahlen" : ", nur über den Namen"})`);
  } else if (zahlen.length > 1) console.log("FuPa: mehrere mit gleichen Zahlen:", zahlen.map(z => z.slug + " „" + z.n + "“").join(", "));
} catch (e) { console.log("FuPa:", e.message); }
if (!fupa) console.log("FuPa: nicht eindeutig gefunden — ohne `fupa` kein Liveticker. Slug von fupa.net/club/<slug> von Hand eintragen.");

const slug = flach(kurzwort(flfName)).replace(/[^a-z0-9]+/g, "-");
console.log(`\nVorschlag für verein.json (name, kurz, farben noch anpassen):\n`);
console.log(JSON.stringify({
  name: flfName, kurz: kurzwort(flfName), flfName, clubId: id, slug, fupa,
  farben: { kopf: "#111111", akzent: "#1fa88c" }, start: "U13 1", von: "", bgl: true, nati: true,
}, null, 2));
