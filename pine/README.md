# Crypto Intraday Trend Indicator (Pine Script v6) — Simple

Einfache Trendfolge-Scripts für Krypto-Intraday-Trading (15M–4H): Long/Short-Signal, wenn
**vier klare Bedingungen gleichzeitig zutreffen** — keine Score-Gewichtung, kein HTF/Funding/OI,
keine Marktstruktur-Pivots, kein Pullback/Candle-Pattern-Kram. Absichtlich schlank.

- `strategy_crypto_intraday.pine` — backtestbare Version (`strategy()`).
- `indicator_crypto_intraday.pine` — Live-Version (`indicator()`) mit Signal-Plots,
  automatisch gezeichnetem Entry/Stop und Alerts (JSON-Message für Webhook/Bot).

- `indicator_overlay_simple.pine` — **signalfreie Variante** (`indicator()`): nur Darstellung,
  keine Entry/Exit-Logik, keine Labels, keine Alerts. Siehe unten.

Beide Signal-Scripts enthalten dieselbe Logik redundant (kein Pine-Library-Import, um den
Publish-Test-Republish-Zyklus zu vermeiden — siehe unten).

## Overlay Toolkit [Simple] — ohne Buy/Sell-Signale

`indicator_overlay_simple.pine` ist die abgespeckte Anzeige-Version: dieselbe Pine-v6-Basis,
aber ohne jede Signalgebung. Kein `plotshape` für Entries, kein Trailing-Stop, kein
`alertcondition` — das Script zeichnet ausschließlich Indikatoren, die Interpretation bleibt
beim Betrachter. Stufe 1 enthält vier Bausteine, jeder einzeln abschaltbar:

| Baustein | Einstellungen |
|---|---|
| **6× MA** | pro Linie: An/Aus, SMA/EMA-Umschalter, Länge, Farbe. Defaults 9/20/50 EMA, 100/200 SMA, MA 6 (400) aus. Gemeinsame Source. |
| **Supertrend** | Faktor (3.0), ATR Length (10), Farben Up/Down, optionale Fläche zum Kurs. `plot.style_linebr`, damit beim Flip keine senkrechte Linie entsteht. |
| **Ichimoku** | Tenkan 9 / Kijun 26 / Senkou B 52, Displacement 26, Chikou Span. Linien und Kumo Cloud getrennt schaltbar, Cloud färbt nach Span A vs. B. |
| **Bollinger** | Length 20, Basis SMA/EMA wählbar, zwei Abweichungen gleichzeitig: 2.0 innen + 2.5 außen, mit abgestuften Zonen-Fills. |

Weitere Bausteine kommen schrittweise dazu. Platzbudget: TradingView erlaubt 64 Plots pro
Script, aktuell sind ~20 belegt.

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
