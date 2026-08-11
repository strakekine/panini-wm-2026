# Crypto Intraday Trend Indicator (Pine Script v6) — Simple

Einfache Trendfolge-Scripts für Krypto-Intraday-Trading (15M–4H): Long/Short-Signal, wenn
**vier klare Bedingungen gleichzeitig zutreffen** — keine Score-Gewichtung, kein HTF/Funding/OI,
keine Marktstruktur-Pivots, kein Pullback/Candle-Pattern-Kram. Absichtlich schlank.

- `strategy_crypto_intraday.pine` — backtestbare Version (`strategy()`).
- `indicator_crypto_intraday.pine` — Live-Version (`indicator()`) mit Signal-Plots,
  automatisch gezeichnetem Entry/Stop und Alerts (JSON-Message für Webhook/Bot).

- `indicator_overlay_simple.pine` — **signalfreie Variante** des "Confluence Buy/Sell Signal":
  nur Darstellung, keine Score-Logik, keine Labels, keine Alerts. Siehe unten.
- `indicator_lower_momentum.pine` — signalfreies **unteres Pane**: RSI + ADX/DI.
- `indicator_lower_macd.pine` — signalfreies **unteres Pane**: MACD.

Beide Signal-Scripts enthalten dieselbe Logik redundant (kein Pine-Library-Import, um den
Publish-Test-Republish-Zyklus zu vermeiden — siehe unten).

## Confluence Simple — ohne Buy/Sell-Signale

`indicator_overlay_simple.pine` ist die abgespeckte Anzeige-Version des
"Confluence Buy/Sell Signal": Inputs, Defaults und Farben sind aus dem Original übernommen,
aber die gesamte Signalgebung fehlt. Entfernt sind Konfluenz-Score, BUY/SELL/EXIT-Labels,
ADX-Filter, RSI, MACD, Volumen-Bestätigung, Engulfing, Inside Bar, Golden/Death Cross,
TK-Cross, 200MA-Cross, Score-Hintergrund und alle `alertcondition`. Das Script zeichnet
ausschließlich Indikatoren, die Interpretation bleibt beim Betrachter.

Stufe 1 enthält vier Bausteine, jeder einzeln abschaltbar:

| Baustein | Einstellungen |
|---|---|
| **6× MA** | pro Linie: An/Aus, SMA/EMA-Umschalter, Länge, Farbe. MA 1–5 wie im Original (SMA 10/20/50/100/200, MA 4+5 aus), MA 6 neu (EMA 9, aus). Gemeinsame Source. |
| **Supertrend** | Faktor 3.0, ATR Länge 10, Farben bullish/bärisch. Ein Plot mit `plot.style_linebr` wie im Original. |
| **Ichimoku** | Tenkan 9 / Kijun 26 / Senkou B 52, Verschiebung 27 mit Plot-Offset `displacement - 1` (= 26 Bars, klassisch korrekt; das TV-Built-in verschiebt nur 25). Cloud, Tenkan/Kijun und Lagging Span (Chikou) getrennt schaltbar. |
| **Bollinger** | Gemeinsame Länge 20, Basis SMA, zwei Bänder gleichzeitig: 2.0 + 2.5, je mit eigenen Farben und Füllung. Basis-Linie separat schaltbar. |

Weitere Bausteine kommen schrittweise dazu. Platzbudget: TradingView erlaubt 64 Plots pro
Script, aktuell sind 17 belegt.

## Unteres Pane — RSI/ADX und MACD

Ergänzung zum Overlay: zwei Scripts mit `overlay=false`, die unter dem Kurschart laufen.
Gleiche Philosophie wie `indicator_overlay_simple.pine` — reine Anzeige, jeder Baustein
einzeln abschaltbar, keine Signale, keine Labels, keine Alerts.

| Script | Inhalt | Einstellungen |
|---|---|---|
| `indicator_lower_momentum.pine` | **RSI** + **ADX/DI** | RSI: Länge 14, freie Source, optionale SMA/EMA-Glättung, Level-Linien 70/50/30 mit Zonenfüllung. ADX: DI-Länge 14, Glättung 14, DI+/DI− separat schaltbar, Orientierungs-Schwelle 20. |
| `indicator_lower_macd.pine` | **MACD** | 12/26/9, freie Source. Linie, Signal und Histogramm einzeln schaltbar, Histogramm wahlweise vier- oder zweifarbig, Nulllinie. |

### Warum zwei Scripts und nicht eines

Ein TradingView-Pane hat **eine** Y-Achse für alles, was darin liegt. RSI und ADX laufen
nativ zwischen 0 und 100 und passen deshalb zusammen in ein Script. MACD rechnet dagegen in
Preis-Einheiten — bei BTC grob ±500, bei einem Cent-Coin ±0.03. Zusammen in einem Pane würde
die Achse über beide Wertebereiche gespannt und der RSI läge als platte Linie am oberen Rand.

### Beide trotzdem in einer Kachel

Getrennte Scripts heißt nicht zwangsläufig getrennte Kacheln:

1. Beide Indikatoren aufs Chart legen — sie erscheinen zunächst in zwei eigenen Panes.
2. Rechtsklick auf den Namen des MACD-Indikators → **Move to → Existing pane above/below**,
   Ziel ist das Pane des Momentum-Indikators.
3. Im gemeinsamen Pane Rechtsklick auf die Werteachse des MACD → **Pin to left scale**.

Ergebnis: eine Kachel unter dem Chart, RSI/ADX auf der rechten Achse (0–100), MACD auf der
linken (Preis-Einheiten). Beide behalten ihre echten, ablesbaren Werte — im Gegensatz zu
einer Normalisierung, bei der die MACD-Zahlen nur noch relative Form wären.

Die Anordnung merkt sich TradingView im Chart-Layout; beim Speichern des Layouts bleibt sie
erhalten.

## Die vier Bedingungen (alle per UND verknüpft)

| Bedingung | Logik |
|---|---|
| **Trend** | EMA20 > EMA50 (bzw. umgekehrt für Short) & Preis auf der Trendseite der EMA20 |
| **Momentum** | MACD-Histogramm auf der Trendseite der Nulllinie und steigend (fallend für Short) |
| **Volumen** | aktuelles Volumen > 20er-EMA des Volumens (abschaltbar) |
| **ADX** | ADX ≥ Mindestwert (Default 20) — filtert Seitwärtsphasen |

Kein Score, keine Gewichte: entweder alle vier Bedingungen stimmen, oder es gibt kein Signal.

## Exit: nur ATR-Trailing-Stop

Bei Entry wird sofort ein initialer Stop gesetzt (`atrStopMult × ATR`, Default 2×). Ab dann
zieht ein Chandelier-Trailing-Stop (`Trailing ATR Length` / `Trailing ATR Mult`, Default 22/3)
kontinuierlich nach — der Stop kann sich nur in Richtung Gewinn bewegen, nie zurück. Kein
Take-Profit, kein Teilgewinn, keine zweite Exit-Methode zur Auswahl: der Trade läuft, bis der
Trailing-Stop greift oder die Trendbedingung selbst kippt.

## Setup

1. Beide `.pine`-Dateien in TradingView → Pine Editor → New → einfügen → "Add to Chart".
2. Strategy-Script zuerst über mehrere Marktphasen (Bull/Bear/Chop) backtesten, Gewichte/
   Schwellen (EMA-Längen, ADX-Minimum, ATR-Multiplikatoren) darüber tunen.
3. Erst danach das Indicator-Script live schalten, Signale gegen die Strategy-Trades
   gegenprüfen.

Ich kann diese Validierung in dieser Umgebung nicht selbst ausführen (kein
TradingView-/Pine-Compiler-Zugriff) — die Freigabe nach Backtest liegt beim Nutzer.

## Alerts einrichten (Indicator-Script)

1. Indicator zum Chart hinzufügen.
2. "Alert erstellen" → Bedingung: das Indicator wählen → eine der vier
   `alertcondition`-Optionen (Long Signal / Short Signal / Exit Long / Exit Short).
3. Optional: Webhook-URL eintragen — Message ist bereits als JSON vorformatiert.

## Vorgeschichte: warum so schlank

Frühere Versionen hatten eine 0–100-Score-Engine mit 9 Bausteinen (Trend, Momentum, Volumen,
Volatilität, Marktstruktur, Pullback, Candle-Pattern, ADX, HTF-Bestätigung, Funding/OI), dazu
TP1/TP2, 4 wählbare Exit-Methoden und einen Re-Entry-Cooldown. Das führte zu zwei Problemen:

1. Die vielen trägen Filter (v.a. EMA200 auf 1H und HTF auf 4H mit denselben Längen) haben
   Signale weit hinter den eigentlichen Trendstart verzögert.
2. Nach dem Verschlanken der Filter hat ein hartes TP2 (volle Positionsschließung bei 3R)
   in starken Trends zu einem Enter-Exit-Enter-Zyklus geführt, der wie ein Signal auf fast
   jeder Kerze aussah.

Statt weiter an Parametern zu drehen, wurde das System auf diese 4-Bedingungen-Logik mit
einem einzigen Exit-Verfahren reduziert. Wer die Score-Engine-Variante mit HTF/Funding-OI/
Marktstruktur wieder braucht, findet sie in der Git-Historie dieses Branches.
