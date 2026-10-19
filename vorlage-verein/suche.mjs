// Sucht einen Verein bei der FLF und schreibt den Anfang einer verein.json.
//
//   node vorlage-verein/suche.mjs <Name oder Ort>      → passende Vereine mit Nummer
//   node vorlage-verein/suche.mjs <Nummer>             → Mannschaften dieser Saison + Vorschlag
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
if (!arg) { console.log("node vorlage-verein/suche.mjs <Name | Nummer>"); process.exit(2); }

const { clubs } = await gq(`{ clubs { id name } }`);
if (!/^\d+$/.test(arg)) {
  const treffer = clubs.filter(c => flach(c.name).includes(flach(arg)));
  if (!treffer.length) console.log("Kein Verein gefunden.");
  for (const c of treffer) console.log(String(c.id).padStart(8), " ", c.name);
  if (treffer.length === 1) console.log(`\nWeiter: node vorlage-verein/suche.mjs ${treffer[0].id}`);
  process.exit(0);
}

const id = +arg, club = clubs.find(c => c.id === id);
const d = await gq(`{ defaultValues{ currentSeasonId } seasons{ id name startDate endDate } }`);
const s = d.seasons.find(x => x.id === d.defaultValues.currentSeasonId);
const { matches } = await gq(`query($c: MatchCriteria){ matches(criteria:$c){ homeTeam{ id name clubId1 clubId2 clubId3 clubId4 }
  awayTeam{ id name clubId1 clubId2 clubId3 clubId4 } division{ name } matchType{ id } } }`,
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
console.log(`\nVorschlag für verein.json (name, kurz, repo und farben noch anpassen):\n`);
console.log(JSON.stringify({
  name: flfName, kurz: flfName.replace(/^(FC|US|AS|CS|SC|FF|Racing|Union|Jeunesse|Sporting|Etoile|Avenir)\s+/i, "").split(/\s+/)[0],
  flfName, clubId: id, repo: "KONTO/" + flach(flfName).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
  farben: { kopf: "#111111", akzent: "#1fa88c" }, start: "U13 1", von: "", bgl: true, nati: true,
}, null, 2));
