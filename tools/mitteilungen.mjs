// Mitteilungen, Stufe 2 (vom Nutzer, 21.10.2026; Plan in IDEEN-fussball.md).
// Der FLF-Abruf vergleicht alten und neuen Stand und legt die Ereignisse in data/mitteilungen.json
// ab. Der Cloudflare-Worker liest die Datei alle 15 min und schickt, was fällig ist (`ab` ≤ jetzt <
// `bis`, nur 7–22 Uhr), an die Handys, die Mannschaft und Art gewählt haben. Jedes Ereignis hat eine
// feste `id` — der Worker merkt sich, was er geschickt hat, ein Ereignis kommt also nie doppelt,
// auch wenn es mehrere Läufe lang in der Datei steht. Was nur live zu sehen ist (FuPa tickert,
// Endstand vom Ticker), prüft der Worker selbst; dafür stehen die Spiele des Tages unter `live`.
import { eigeneSpiele, VEREIN } from "./fussball.mjs";

const TZ = "Europe/Luxembourg";
export const tagLux = ms => new Date(ms).toLocaleDateString("sv-SE", { timeZone: TZ });
const uhr = iso => new Date(iso).toLocaleTimeString("de-DE", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const datum = iso => new Date(iso).toLocaleDateString("de-DE", { timeZone: TZ, weekday: "short", day: "numeric", month: "numeric" });
const ohneUhrzeit = iso => uhr(iso) === "00:00";   // FLF: Uhrzeit noch nicht festgelegt
// Zeitpunkt „Tag, hh:mm Luxemburger Zeit“ in ms (Sommer- und Winterzeit).
export function umLux(tag, hh, mm = 0) {
  const g = Date.parse(`${tag}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00Z`);
  const dort = Date.parse(new Date(g).toLocaleString("sv-SE", { timeZone: TZ }).replace(" ", "T") + "Z");
  return g - (dort - g);
}
const H = 3600e3;
const kurz = n => String(n).replace(VEREIN, "Koeppchen");
const hatErgebnis = sp => sp.hs != null && sp.as != null;

// Welche Arten es für welchen Reiter gibt (Tabelle im Plan). Woche hat nur „woche“.
export const ARTEN = {
  heute: "Heute Spiel", spieltag: "Spieltag komplett", tabelle: "Tabelle aktualisiert",
  uhrzeit: "Uhrzeit steht fest", neu: "Neue Phase / neues Spiel", ticker: "Liveticker läuft", halbzeit: "Halbzeit", ende: "Endstand", woche: "Neue Woche",
};

const spieltagFertig = (spiele, tag) => { const s = spiele.filter(sp => sp.tag === tag); return s.length > 0 && s.every(hatErgebnis); };

export function ereignisse(alt, neu, vorher, now) {
  const aus = new Map((vorher?.ereignisse || []).filter(e => e.bis > now).map(e => [e.id, e]));
  const dazu = e => { if (e.bis > now && !aus.has(e.id)) aus.set(e.id, e); };
  const heute = tagLux(now), morgen = tagLux(now + 24 * H);
  const teams = neu.teams.filter(t => t.reiter);
  const unsere = new Set(neu.teams.flatMap(t => t.ids || [t.id]));

  // Jedes Spiel einmal, mit allen Reitern, zu denen es gehört (Pokal ohne I/II: U13 1 und U13 2).
  const jeSpiel = new Map();
  for (const t of teams) for (const sp of eigeneSpiele(neu, t)) {
    const x = jeSpiel.get(sp.id) || { sp, reiter: [], kat: t.kat };
    x.reiter.push(t.reiter);
    jeSpiel.set(sp.id, x);
  }
  const altSp = new Map();
  for (const k of Object.values(alt?.klassen || {})) for (const sp of k.spiele) altSp.set(sp.id, sp);
  const live = [];

  for (const { sp, reiter, kat } of jeSpiel.values()) {
    const name = reiter.length > 1 ? kat : reiter[0];
    const wirH = unsere.has(sp.h.id), gegner = kurz(wirH ? sp.a.n : sp.h.n), d = Date.parse(sp.d), tag = tagLux(d);
    const wo = sp.ort ? ` · 📍 ${sp.ort}` : "";
    const offen = ohneUhrzeit(sp.d);
    const basis = { reiter };
    // Heute Spiel (vom Nutzer, 21.10.2026): Kinder am Vorabend um 19 Uhr („Morgen Spiel“), Seniors am
    // Spieltag um 10 Uhr (Anstoß vor 11 Uhr: 7:30). Kam das Spiel erst am Spieltag in die Daten, gilt
    // für Kinder „Heute Spiel“ ab 7:30 bzw. sofort — gleiche id, also nie beides.
    if (!hatErgebnis(sp) && !sp.forfait) {
      const was = (offen ? `Uhrzeit noch offen · gegen ${gegner}` : `${uhr(sp.d)} gegen ${gegner}`) + wo;
      const ende = t => offen ? umLux(t, 22) : d;
      if (kat !== "Seniors" && tag === morgen)
        dazu({ ...basis, id: "heute:" + sp.id, art: "heute", titel: `${name} · Morgen Spiel`, text: was, ab: umLux(heute, 19), bis: ende(tag) });
      if (tag === heute)
        dazu({ ...basis, id: "heute:" + sp.id, art: "heute", titel: `${name} · Heute Spiel`, text: was,
               ab: kat === "Seniors" && (offen || +uhr(sp.d).slice(0, 2) >= 11) ? umLux(heute, 10) : Math.min(now, umLux(heute, 7, 30)), bis: ende(tag) });
    }
    const a = altSp.get(sp.id);
    // Uhrzeit steht fest — nur U9/U11 und nur, wenn vorher gar keine Zeit da war (00:00). Eine geänderte
    // Uhrzeit meldet die App nie: die gibt der Trainer durch, der kann intern umgestellt haben (vom Nutzer).
    if (["U9", "U11"].includes(kat) && a && ohneUhrzeit(a.d) && !offen && d > now)
      dazu({ ...basis, id: `zeit:${sp.id}:${sp.d}`, art: "uhrzeit", titel: `${name} · Uhrzeit steht fest`,
             text: `${datum(sp.d)} um ${uhr(sp.d)} gegen ${gegner}${wo}`, ab: now, bis: d });
    if (kat === "Seniors") {
      // Endstand von der FLF (wenn niemand getickert hat; vom Ticker kommt er über den Worker, gleiche id).
      if (a && !hatErgebnis(a) && hatErgebnis(sp) && d > now - 48 * H)
        dazu({ ...basis, id: "ende:" + sp.id, art: "ende", titel: `${name} · Endstand`,
               text: `${kurz(sp.h.n)} ${sp.hs}:${sp.as} ${kurz(sp.a.n)}`, ab: now, bis: now + 18 * H });
      if (tag === heute && !hatErgebnis(sp))
        live.push({ id: sp.id, reiter, titel: name, d: sp.d, h: kurz(sp.h.n), a: kurz(sp.a.n), wirHeim: wirH, gegner,
                    slug: neu.fupa?.[sp.id] || undefined, anstoss: reiter.includes("Seniors 1") ? sp.d : undefined,
                    fupaWir: "fc-koeppchen", ticker: "ticker:" + sp.id, halbzeit: "halbzeit:" + sp.id, ende: "ende:" + sp.id });
    }
  }

  // Spieltag komplett (U13, U15) und Tabelle (U13, U15, Seniors) je Mannschaft in ihrer aktuellen Klasse.
  // Alle Ligaklassen der Mannschaft, nicht nur die neueste: beim Phasenwechsel steht die neue Klasse
  // schon da, während in der alten noch die letzten Ergebnisse kommen.
  for (const t of teams) for (const k of t.klassen.map(id => neu.klassen[id]).filter(k => k && k.typ === "CC")) {
    const ka = alt?.klassen?.[k.id];
    if (!ka || !k.ergebnisse) continue;
    if (["U13", "U15"].includes(t.kat))
      for (const tag of new Set(k.spiele.map(sp => sp.tag))) {
        if (!spieltagFertig(k.spiele, tag) || spieltagFertig(ka.spiele, tag)) continue;
        const unser = k.spiele.find(sp => sp.tag === tag && (unsere.has(sp.h.id) || unsere.has(sp.a.id)));
        dazu({ reiter: [t.reiter], id: `spieltag:${k.id}:${tag}`, art: "spieltag", titel: `${t.reiter} · Spieltag ${tag} komplett`,
               text: (unser ? `${kurz(unser.h.n)} ${unser.hs}:${unser.as} ${kurz(unser.a.n)} · ` : "") + "alle Ergebnisse in der App",
               ab: now, bis: now + 24 * H });
      }
    if (["U13", "U15", "Seniors"].includes(t.kat) && k.tabelle && ka.tabelle) {
      const ich = new Set(t.ids || [t.id]);
      const r = k.tabelle.find(x => ich.has(x.id)), ra = ka.tabelle.find(x => ich.has(x.id));
      if (r && ra && r.sp > ra.sp)
        dazu({ reiter: [t.reiter], id: `tabelle:${k.id}:${r.id}:${r.sp}`, art: "tabelle", titel: `${t.reiter} · Tabelle`,
               text: `${kurz(r.n)} jetzt ${r.pl}. Platz` + (ra.pl !== r.pl ? ` (vorher ${ra.pl}.)` : " (wie vorher)") + ` · ${r.pkt} Punkte`,
               ab: now, bis: now + 24 * H });
    }
  }

  // U13, U15: neue Phase (neue Ligaklasse mit Spielplan → eine Mitteilung) und neues Spiel (z. B. nächste
  // Pokalrunde). Vom Nutzer, 21.10.2026. Nur mit altem Stand — beim allerersten Lauf wäre sonst alles „neu“.
  if (alt?.klassen && Object.keys(alt.klassen).length)
    for (const t of teams.filter(t => ["U13", "U15"].includes(t.kat))) {
      const altT = (alt.teams || []).find(o => o.id === t.id), altKl = new Set(altT?.klassen || []);
      if (!altT) continue;
      const neue = eigeneSpiele(neu, t).filter(sp => !altSp.has(sp.id) && Date.parse(sp.d) > now && !sp.forfait);
      const phasen = new Map(), einzeln = [];
      for (const sp of neue) {
        const k = t.klassen.map(id => neu.klassen[id]).find(k => k && k.spiele.some(x => x.id === sp.id));
        if (k && k.typ === "CC" && !altKl.has(k.id)) (phasen.get(k) || phasen.set(k, []).get(k)).push(sp);
        else einzeln.push(sp);
      }
      const wann = sp => datum(sp.d) + (ohneUhrzeit(sp.d) ? "" : ` um ${uhr(sp.d)}`);
      const gegen = sp => kurz(unsere.has(sp.h.id) ? sp.a.n : sp.h.n);
      for (const [k, l] of phasen)
        dazu({ reiter: [t.reiter], id: `phase:${k.id}:${t.id}`, art: "neu", titel: `${t.reiter} · Neue Phase`,
               text: `Spielplan ${k.n.replace(t.alter || "", "").trim() || k.n} ist da: ${l.length} ${l.length === 1 ? "Spiel" : "Spiele"}, erstes ${wann(l[0])} gegen ${gegen(l[0])}`,
               ab: now, bis: now + 48 * H });
      if (einzeln.length > 3)
        dazu({ reiter: [t.reiter], id: `neu:${t.id}:${einzeln.map(sp => sp.id).join(",")}`, art: "neu", titel: `${t.reiter} · ${einzeln.length} neue Spiele`,
               text: `Erstes ${wann(einzeln[0])} gegen ${gegen(einzeln[0])} · alle in der App`, ab: now, bis: now + 48 * H });
      else for (const sp of einzeln)
        dazu({ reiter: [t.reiter], id: `neu:${sp.id}`, art: "neu", titel: `${t.reiter} · Neues Spiel`,
               text: `${wann(sp)} gegen ${gegen(sp)}` + (sp.ort ? ` · 📍 ${sp.ort}` : ""), ab: now, bis: Math.min(now + 48 * H, Date.parse(sp.d)) });
    }

  // BGL: Spieltag komplett.
  if (neu.bgl?.spiele && alt?.bgl?.spiele)
    for (const tag of new Set(neu.bgl.spiele.map(sp => sp.tag)))
      if (spieltagFertig(neu.bgl.spiele, tag) && !spieltagFertig(alt.bgl.spiele, tag))
        dazu({ reiter: ["BGL"], id: `bgl:${neu.saison?.id}:${tag}`, art: "spieltag", titel: `BGL · Spieltag ${tag} komplett`,
               text: "Alle Ergebnisse in der App", ab: now, bis: now + 24 * H });

  // Roude Léiw: Heute Spiel, Endstand (von FuPa), Liveticker über den Worker.
  const altNati = new Map((alt?.nati?.spiele || []).map(sp => [sp.id, sp]));
  for (const sp of neu.nati?.spiele || []) {
    const d = Date.parse(sp.d), lux = sp.h.n === "Luxemburg", gegner = lux ? sp.a.n : sp.h.n, basis = { reiter: ["Roude Léiw"] };
    if (tagLux(d) === heute && !hatErgebnis(sp)) {
      dazu({ ...basis, id: "nheute:" + sp.id, art: "heute", titel: "Roude Léiw · Heute Länderspiel",
             text: `${uhr(sp.d)} gegen ${gegner}` + (sp.wett ? ` · ${sp.wett}` : ""), ab: umLux(heute, 10), bis: d });
      if (sp.slug) live.push({ id: sp.id, reiter: ["Roude Léiw"], titel: "Roude Léiw", d: sp.d, h: sp.h.n, a: sp.a.n, wirHeim: lux,
                               gegner, slug: sp.slug, fupaWir: "luxemburg-m1", ticker: "nticker:" + sp.id, halbzeit: "nhalbzeit:" + sp.id, ende: "nende:" + sp.id });
    }
    const a = altNati.get(sp.id);
    if (a && !hatErgebnis(a) && hatErgebnis(sp) && d > now - 48 * H)
      dazu({ ...basis, id: "nende:" + sp.id, art: "ende", titel: "Roude Léiw · Endstand",
             text: `${sp.h.n} ${sp.hs}:${sp.as} ${sp.a.n}`, ab: now, bis: now + 18 * H });
  }

  // Unsere Woche: montags 10:00 (vom Nutzer, 21.10.2026) „Diese Woche n Spiele, davon m zu Hause“ (ab So 22 Uhr vorbereitet).
  const mo = (() => { const t = tagLux(now + 2 * H); const w = (new Date(t + "T12:00:00Z").getUTCDay() + 6) % 7; return tagLux(Date.parse(t + "T12:00:00Z") - w * 24 * H); })();
  const so = tagLux(Date.parse(mo + "T12:00:00Z") + 6 * 24 * H);
  const woche = [...jeSpiel.values()].filter(({ sp }) => { const t = tagLux(Date.parse(sp.d)); return t >= mo && t <= so; });
  if (woche.length) {
    const heim = woche.filter(({ sp }) => unsere.has(sp.h.id)).length;
    dazu({ reiter: ["Woche"], id: "woche:" + mo, art: "woche", titel: "Unsere Woche",
           text: `Diese Woche ${woche.length} ${woche.length === 1 ? "Spiel" : "Spiele"}, davon ${heim} zu Hause`,
           ab: umLux(mo, 10), bis: umLux(mo, 22) });
  }

  return { ereignisse: [...aus.values()].sort((x, y) => x.ab - y.ab || x.id.localeCompare(y.id)), live };
}
