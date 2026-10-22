# panini-wm-2026

Kleine Web-Apps für die Familie, jede eine einzelne HTML-Datei (kein Build, kein Framework),
ausgeliefert über GitHub Pages. Der Repo-Name passt nur noch zur ersten App — was hier liegt, steht
in dieser Liste.

| App | Datei | Adresse |
|---|---|---|
| **Panini WM 2026** — Sticker-Tracker (allgemein, Emil, Leo) | `panini.html`, `panini_emil.html`, `panini_leo.html` | [panini](https://strakekine.github.io/panini-wm-2026/panini.html) · [Emil](https://strakekine.github.io/panini-wm-2026/panini_emil.html) · [Leo](https://strakekine.github.io/panini-wm-2026/panini_leo.html) |
| **Turnierplaner** — Teams auslosen, Gruppen, K.-o.-Runde, sportartneutral | `spikeball.html` | [öffnen](https://strakekine.github.io/panini-wm-2026/spikeball.html) |
| **Teigplaner** — Pizzateig-Rechner und Gärplaner | `pizza.html` | [öffnen](https://strakekine.github.io/panini-wm-2026/pizza.html) |
| **Brotplaner** — Backvorgang, Anstellgut, Rückwärtsplanung | `brot.html` | [öffnen](https://strakekine.github.io/panini-wm-2026/brot.html) |
| **Vokabeltrainer** — Französisch für Emil und Leo | `vokabeln.html` | [öffnen](https://strakekine.github.io/panini-wm-2026/vokabeln.html) |
| **FC Koeppchen** — Spiele, Tabellen, Kalender, Liveticker, automatisch von der FLF | `fussball.html` | [öffnen](https://strakekine.github.io/panini-wm-2026/fussball.html) |
| **Pine-Script-Indikatoren** für TradingView | `pine/` | siehe [`pine/README.md`](pine/README.md) |

## Fußball-Apps für andere Vereine

Liegen **nicht hier**, sondern im eigenen Repo
**[strakekine/fussball-vereine](https://github.com/strakekine/fussball-vereine)** — eine App je
Verein, aus derselben Vorlage wie FC Koeppchen, mit eigenem Logo und eigenen Farben. Die
Koeppchen-App bleibt hier und wird von dort aus nicht angefasst.

## Was im Hintergrund läuft

- `.github/workflows/fussball.yml` holt die Daten für FC Koeppchen von der FLF
  (`tools/fussball.mjs` → `data/fussball.json`, `kalender/*.ics`), angestoßen von einem
  Cloudflare-Worker (`tools/cloudflare-worker.js`), GitHubs Zeitplan als Reserve.
- `.github/workflows/fussball-live.yml` hält bei Spielen der Seniors 1 den Liveticker nach
  (`data/live.json`).

Beide committen selbst auf `main`. Wer lokal arbeitet: vor dem Push `git pull --rebase`.

## Testen

```sh
node test/fussball.mjs
node test/modell.mjs                 # Teigplaner, Gärmodell
node test/brot.mjs
node test/vokabeln.mjs
node test/vokabeln-oberflaeche.mjs   # Browser (Playwright)
node test/vokabeln-sprechen.mjs      # Browser (Playwright)
```

Stand und Regeln jeder App, samt der Entscheidungen dahinter, stehen in [`CLAUDE.md`](CLAUDE.md).
