# Projektkontext

Das Repo enthält zwei unabhängige Dinge:

1. **Panini-Sammelalbum** (`panini*.html`) — Standalone-HTML-Dateien auf `main`.
2. **TradingView Pine Scripts** (`pine/`) — liegen NICHT auf `main`, sondern nur auf
   `claude/*`-Branches. Beim Klonen sind die Branches oft nicht dabei: mit
   `git ls-remote --heads origin` prüfen, nicht mit `git branch -a`.

## Pine-Scripts

Alle Pine v6. Auf Branch `claude/simplified-indicator-no-signals-k2p1i1`:

- `pine/indicator_overlay_simple.pine` — **das aktive Script.** Signalfreie Anzeige-Version
  des "Confluence Buy/Sell Signal" (dieses Original liegt nicht im Repo).
- `pine/indicator_crypto_intraday.pine`, `pine/strategy_crypto_intraday.pine` — ältere,
  separate 4-Bedingungen-Trendfolge mit Signalen. Nicht verwandt mit dem Overlay-Script.

### Arbeitsweise

Der Nutzer entwickelt in TradingView weiter und schickt die Datei bei Bedarf in den Chat
zurück. **Die Repo-Fassung kann also veraltet sein** — vor Änderungen fragen bzw. die
geschickte Version als Wahrheit nehmen und ins Repo übernehmen.

Hier ist kein Pine-Compiler verfügbar. Nichts als "getestet" ausgeben; Fehlermeldungen aus
TradingView kommen vom Nutzer. Bei Runtime-Fehlern ist der Stacktrace (`at f_xyz():302`) der
Schlüssel, nicht der Fehlercode — TradingView dokumentiert die RE-Nummern nicht.

### Festlegungen im Overlay-Script (nicht ohne Rückfrage ändern)

- **Keine Signale.** Kein `plotshape` für Entries, kein Score, kein `alertcondition`. Das ist
  der Zweck des Scripts, nicht eine noch nicht gebaute Stufe.
- **Ichimoku-Verschiebung = 27** mit Plot-Offset `i_displacement - 1`, ergibt 26 Bars. Das TV
  Built-in nutzt 26 und verschiebt damit nur 25 — die 27 ist Absicht, keine Verwechslung.
- **Anchored VWAP:** Hoch/Tief des Ankerfensters kommen immer aus Tagesdaten, damit der Anker
  zeitrahmenunabhängig ist und der Lookback unter Pines 15000-Kerzen-Limit bleibt (1 Jahr auf
  15M wären 35040 → RE10004). Reicht die geladene Chart-Historie nicht bis zum Anker, fällt
  `useDailyEff` auf die Tagesberechnung zurück, statt nichts anzuzeigen.
- **Aufbau in Stufen:** 1 = MAs/Supertrend/Ichimoku/Bollinger, 2 = RSI, 3 = VWAP + Tabelle.
  Weitere Bausteine kommen einzeln dazu. Plot-Budget: 64 pro Script.
- Kommentare erklären das *Warum* einer Entscheidung, nicht die Syntax. Deutsche Labels,
  `i_`-Präfix für Inputs, `f_`-Präfix für Funktionen.
