# Vorlage: Fußball-App für einen anderen Verein

Aus dieser Vorlage entsteht in wenigen Minuten die App eines anderen luxemburgischen Vereins: dasselbe
wie „FC Koeppchen“ (nächste Spiele, Tabelle, Ergebnisse, alle Spiele der Klasse, Heute-Spieltag,
Kalender-Abo je Mannschaft, BGL und Roude Léiw, App teilen), nur mit eigenem Namen, Logo und
Farben. **`fussball.html`, `tools/fussball.mjs` und die Workflows im Wurzelordner werden dafür nicht
gelesen und nicht angefasst** — die Vorlage ist eine eigene Kopie (Stand 19.10.2026, Fassung p).

Geht nur für Vereine der **FLF** (Luxemburg): Die Daten kommen aus deren Schnittstelle, gesucht
wird über die Vereinsnummer.

## Was ich brauche

1. **Vereinsname** (oder Ort) — den Rest findet `suche.mjs`.
2. **Logo** als Bild (PNG, JPG oder SVG; quadratisch ist am schönsten). Wird auf 180×180 auf Weiss
   gebracht (iOS füllt Durchsichtiges im Home-Icon schwarz).
3. **Zwei Vereinsfarben**: `kopf` (Kopfleiste, dunkel oder hell — die Schrift passt sich an) und
   `akzent` (Linie, Siege, Knöpfe, eigene Zeile in der Tabelle). Schriftfarben und helle Töne werden
   daraus gerechnet, auf Lesbarkeit geprüft.
4. **Ein GitHub-Repo** für den Verein (z. B. `strakekine/us-mondorf`), öffentlich, damit Pages und
   Actions nichts kosten. Ein Repo je Verein: eigene Adresse, eigene Daten, eigener Zeitplan.

## Ablauf

```sh
export NODE_USE_ENV_PROXY=1                       # nur in der Cloud-Umgebung nötig
node vorlage-verein/suche.mjs mondorf             # → 500084  US Mondorf-les-Bains
node vorlage-verein/suche.mjs 500084              # Mannschaften + Vorschlag für verein.json
# Vorschlag als verein.json speichern, name/kurz/repo/farben anpassen
node vorlage-verein/neu.mjs verein.json logo.png --abruf
```

`neu.mjs` schreibt einen fertigen Ordner (Standard `vorlage-verein/ausgabe/<slug>/`, nicht im Git),
lässt den Test laufen und holt mit `--abruf` gleich die ersten Daten. Den Ordnerinhalt als
Wurzel ins neue Repo, dann dort:

- **Settings → Pages**: Source „Deploy from a branch“, Branch `main`, Ordner `/ (root)`.
- **Settings → Actions → General → Workflow permissions**: „Read and write“.
- Einmal **Actions → Fussball-Daten → Run workflow** (danach läuft er nach Zeitplan).

App: `https://<konto>.github.io/<repo>/`. Fassung steht unten in der App (beim Neu-Erzeugen
`neu.mjs` setzt das Datum; bei Handänderungen hochzählen).

## verein.json

| Feld | Bedeutung |
|---|---|
| `name` | App-Name, Titel, Home-Bildschirm („US Mondorf“) |
| `kurz` | statt des FLF-Namens in Listen und im Kalender („Mondorf U13 1“) |
| `flfName` | **wie die FLF die Mannschaften schreibt**, ohne I/II — nicht wie den Verein (Koeppchen: Verein „Wormeldange FC Koeppchen“, Mannschaften „FC Koeppchen Wormeldange I“). `suche.mjs` schlägt ihn vor |
| `clubId` | FLF-Vereinsnummer |
| `repo` | `konto/name` auf GitHub — daraus Datenquelle, Kalender- und App-Adresse |
| `farben` | `{ "kopf": "#rrggbb", "akzent": "#rrggbb" }` |
| `start` | Reiter beim ersten Öffnen, z. B. `"U13 1"` oder `"Seniors 1"` (Standard U13 1, sonst der erste) |
| `von` | „Gemacht von …“ unten in der App (leer = weg) |
| `alter` | freiwillig: Altersklassen und Reihenfolge als FLF-ids. Standard Seniors, U19, U17, U15, U13, U11, U9, Dames, Réserves (`[1,2,3,11,4,7,5,17,9999]`); Liste in `vorlage/tools/fussball.mjs` (`ALLE_AGES`) |
| `bgl`, `nati` | Reiter BGL und Roude Léiw (Standard an) |
| `anstoss` | `true`, wenn der Cloudflare-Worker eingerichtet ist (nur der Text unten in der App) |
| `teilen` | freiwillig: eigener Text für „App teilen“ (Link selbst hineinschreiben) |
| `slug` | freiwillig, Standard = Repo-Name. Kalender-UIDs und Speicherschlüssel hängen daran: **nicht mehr ändern**, sobald die App benutzt wird |

## Gut zu wissen

- **Spielgemeinschaften** (`ENT Mondorf/Schengen I`) zählen mit — die FLF führt sie beim Verein. Die
  Reiter-Nummer kommt aus dem I/II/III am Ende, darum heißen sie trotzdem „U13 1“.
- Mannschaften bekommen nur einen Reiter, wenn sie Ligaspiele haben; Pokalmannschaften ohne I/II
  hängen sich an die Mannschaften ihrer Altersklasse (wie bei Koeppchen).
- **Speicher:** Alle Repos eines GitHub-Kontos liegen auf derselben Herkunft
  (`konto.github.io`). Der Speicherschlüssel ist darum `fussball_<slug>` — sonst sähe die neue App
  den gespeicherten Stand von Koeppchen.
- **Zeitplan:** Ohne Worker nur GitHubs eigener (am Wochenende stündlich, sonst abends; GitHub ist
  dabei oft spät oder lässt aus). Pünktlicher mit `tools/anstoss-worker.js` (Anleitung in der
  Datei, braucht ein Cloudflare-Konto und ein GitHub-Token, das nach höchstens einem Jahr abläuft).
- **Nicht in der Vorlage:** der Liveticker. Er hängt an einem FuPa-Tickerer am Platz und einem
  eigenen Worker (Koeppchen: `tools/cloudflare-worker.js`, `tools/fussball-live.mjs`). Der Code dafür
  steckt noch in `index.html`, schläft aber ohne `liveReiter`/`worker` in verein.json.
- **Auf-/Abstieg** (`REGELN` in `index.html`) ist das FLF-Rundschreiben für U13/U15, gilt für alle
  Vereine. Neues Rundschreiben → in der Vorlage nachtragen und die Vereine neu erzeugen.

## Vorlage pflegen

- `vorlage/` — `index.html` (mit Platzhaltern `{{…}}`), `tools/fussball.mjs` (liest verein.json),
  `test/fussball.mjs`, Workflow, Anstoß-Worker.
- `neu.mjs` — Platzhalter füllen, Farben rechnen, Logo umwandeln, Test laufen lassen.
- `suche.mjs` — Verein und `flfName` bei der FLF finden.
- Verbesserungen an der Koeppchen-App wandern **nicht** von selbst hierher. Wer sie übernehmen will,
  trägt sie in `vorlage/` nach und erzeugt die Vereine neu (`neu.mjs` auf den bestehenden
  Ordner: Vorlage drüber, `data/` bleibt).
