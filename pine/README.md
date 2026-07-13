# Crypto Intraday Long/Short Score Engine (Pine Script v6)

Zwei TradingView-Scripts für Krypto-Intraday-Trading (15M–4H), basierend auf einer
Score-Engine (0–100) statt einem einzelnen Trigger: Ein Long-/Short-Signal entsteht erst,
wenn mehrere unabhängige Faktoren gleichzeitig dafür sprechen (Trend, Momentum, Volumen,
Volatilität, Marktstruktur, Pullback, Candle-Pattern, ADX, Higher-Timeframe-Bestätigung,
Funding Rate/Open Interest).

- `strategy_crypto_intraday.pine` — backtestbare Version (`strategy()`), damit die
  Score-Gewichte und Schwellenwerte auf historischen Daten validiert werden können.
- `indicator_crypto_intraday.pine` — Live-Version (`indicator()`) mit Signal-Plots,
  automatisch gezeichnetem Entry/SL/TP1/TP2 und Alerts (auch für Webhook/Bot geeignet).

Beide Scripts enthalten **dieselbe Score-Engine-Logik**, bewusst redundant statt über eine
Pine-Library importiert (siehe Abschnitt "Warum keine Library" unten). Wer die Logik ändert
(z.B. neue Gewichte, neuer Score-Baustein), sollte die Änderung in beiden Dateien im
Abschnitt `// ===== SCORE ENGINE =====` spiegeln.

## Setup

1. Beide `.pine`-Dateien öffnen, Inhalt kopieren.
2. In TradingView: Pine Editor → "New" → Inhalt einfügen → "Add to Chart".
3. Empfohlener Start-Chart: BTCUSDT Perp (z.B. `BINANCE:BTCUSDT.P`), Timeframe 1H.

## Empfohlener Ablauf: erst Strategy, dann Indicator

1. **Strategy-Script laden**, im "Strategy Tester"-Tab Win-Rate/Profit-Factor/Max-Drawdown/
   Trade-Anzahl über mehrere Marktphasen prüfen (Bull, Bear, Chop — nicht nur einen Bullrun).
2. `commission_value` (Default 0.05 %) und `slippage` realistisch für die eigene Exchange
   einstellen, sonst rechnet sich der Backtest schön.
3. Score-Gewichte und Schwellenwerte (`Signal Thresholds`-Gruppe) so lange tunen, bis das
   Ergebnis über mehrere Symbole/Zeiträume stabil ist — nicht nur auf ein Symbol optimieren
   (Overfitting-Gefahr).
4. Stichprobenartig einzelne Trades im Chart nachvollziehen (macht der Stop/TP/Exit-Trigger
   Sinn an dieser Stelle?).
5. Erst danach das **Indicator-Script** live schalten und die Signale gegen die
   Strategy-Trades gegenprüfen (sollten auf denselben Bars auftreten).

Ich kann diese Validierung in dieser Umgebung nicht selbst ausführen (kein
TradingView-/Pine-Compiler-Zugriff) — die Freigabe nach Backtest liegt beim Nutzer.

## Score-Bausteine (Standard-Gewichte, alle per Input änderbar)

| Baustein | Gewicht | Kurzlogik |
|---|---|---|
| Trend (EMA20/EMA50) | 20 | Hard-Gate: Long nur wenn EMA20>EMA50 & Preis>EMA20 |
| Momentum (MACD-Histogramm) | 15 | Histogramm positiv/negativ und steigend/fallend |
| Volumen | 10 | Relative Volume > 1.3 (konfigurierbar) |
| Volatilität | 10 | Bollinger-Band-Width > eigener Durchschnitt |
| Marktstruktur | 15 | Bestätigte HH/HL bzw. LH/LL via `ta.pivothigh/low` |
| Pullback | 10 | Abstand zur EMA20 in ATR-Einheiten, verhindert Chasing |
| Candle-Pattern | 5 | Engulfing / Hammer / Shooting Star / Outside Bar |
| ADX | Hard-Gate + 10 Bonus | kein Signal unter Mindest-ADX, Bonus ab starkem ADX |
| HTF-Bestätigung | 15 | höhere Timeframe (Default 4H) muss Richtung bestätigen |
| Funding/OI (optional) | 10 | siehe unten |

Score wird auf die Summe der **tatsächlich anwendbaren** Gewichte normalisiert (0–100), damit
z.B. ein fehlendes Funding-Symbol den Score nicht künstlich drückt. Signal ab Score ≥ 50
("normal"), ab ≥ 80 als "stark" markiert.

### Tuning-Historie: "deutlich schneller" (v1.1)

Ursprünglich lief der Trend-Gate auf EMA50/EMA200 (1H) mit demselben Paar auch auf der 4H-HTF
— das führte auf 1H zu spürbarem Lag (EMA200 = über 8 Tage Rückblick, HTF-EMA200 auf 4H sogar
über 33 Tage), Signale kamen erst lange nach Trendstart. Angepasst auf:

- Trend-EMA-Paar: **20/50** statt 50/200 (eigene Inputs, Gruppe "Trend Filter")
- HTF bekommt **eigene, unabhängige EMA-Längen** (20/50 statt 50/200, Gruppe "Higher
  Timeframe") statt die trägen Haupt-EMA-Längen wiederzuverwenden
- Pivot-Bestätigung: **3/3** statt 5/5 Bars (Gruppe "Market Structure")
- Score-Schwelle: **50** statt 60 (Gruppe "Signal Thresholds")

Trade-off: deutlich frühere Einstiege, aber mehr Fehlsignale in Seitwärts-/Chop-Phasen (der
ADX-Gate und die Volatilitäts-/Volumen-Filter fangen einen Teil davon ab, aber nicht alles).
Wer es konservativer will: EMA-Paar zurück auf z.B. 50/200, Schwelle zurück auf 60-70.

## Funding Rate & Open Interest — wichtiger Hinweis

TradingView listet Funding-Rate- und Open-Interest-Daten für Perpetual Futures als **eigene,
separat suchbare Symbole** (je nach Exchange unterschiedlich benannt, z.B. beim Filtern der
Symbolsuche nach Instrumententyp "Funding Rate" / "Open Interest"). Da sich diese Symbolnamen
je nach Exchange/Pair unterscheiden und ich das nicht ohne TradingView-Zugriff verifizieren
kann, sind beide als **freie Symbol-Inputs** ausgelegt:

- `Funding Rate Symbol` und `Open Interest Symbol` (Gruppe "Funding / Open Interest") —
  leer lassen = Baustein wird deaktiviert und automatisch aus der Score-Normalisierung
  herausgerechnet (kein Nachteil für den Score).
- Zum Befüllen: In der TradingView-Symbolsuche nach z.B. "BTCUSDT Funding" oder "BTCUSDT Open
  Interest" suchen, passendes Symbol der genutzten Exchange auswählen und in den Input
  eintragen.

## Repainting — was bewusst in Kauf genommen wird

- **Marktstruktur**: `ta.pivothigh`/`ta.pivotlow` bestätigen einen Swing erst nach
  `pivotRight` weiteren Bars (Default 5). Das ist eine echte, unvermeidbare Verzögerung —
  kein Trick dagegen, ohne dass es repaintet.
- **HTF-Bestätigung & Funding/OI**: Alle `request.security()`-Aufrufe verwenden ein
  `[1]`-Shift auf den angeforderten Wert plus `lookahead=barmerge.lookahead_off`, damit der
  Wert der laufenden (unfertigen) HTF-Kerze nie ins aktuelle Chart durchsickert. Dadurch
  stimmen Backtest- und Live-Werte überein.

## Exit-Logik

Bei jedem Signal werden sofort Entry/SL/TP1 (2R, 50 % Teilgewinn)/TP2 (3R) gezeichnet bzw. im
Strategy-Script als Orders gesetzt. Zusätzlich läuft unabhängig davon eine der vier wählbaren
Exit-Methoden (Dropdown `Exit Method`):

1. **ATR Trailing** (Chandelier Exit)
2. **EMA20 Close** (Schlusskurs kreuzt EMA20 gegen die Position)
3. **Momentum Flip** (MACD-Histogramm kreuzt zurück durch die Nulllinie)
4. **Supertrend**-Flip

Im Indicator-Script gibt es dafür keine echten Orders (ein reiner Indikator kann das nicht),
sondern `alertcondition()`-Events für Long/Short-Entry und Exit-Long/Exit-Short — inkl.
JSON-Alert-Messages (`{{ticker}}`, `{{close}}`), direkt für Webhook/Bot-Anbindung nutzbar.

## Alerts einrichten (Indicator-Script)

1. Indicator zum Chart hinzufügen.
2. "Alert erstellen" (Uhr-Symbol) → Bedingung: das Indicator wählen → eine der vier
   `alertcondition`-Optionen (Long Signal / Short Signal / Exit Long / Exit Short).
3. Optional: unter "Webhook URL" die eigene Bot-/Automatisierungs-Endpoint eintragen — die
   Message ist bereits als JSON vorformatiert.

## Warum keine Pine-Library in V1

Eine Pine-Library muss erst auf TradingView veröffentlicht werden, bevor sie per
`import username/lib/version` in einem anderen Script nutzbar ist. Das erzeugt einen
Publish → Test → Republish-Zyklus, der ohne direkten TradingView-Zugriff in dieser Umgebung
nur Reibung erzeugt. Deshalb sind beide Scripts aktuell eigenständig (mit bewusst
redundanter Score-Engine). Wer die Logik dauerhaft an einer Stelle halten will, kann sie
später in eine echte Pine-Library auslagern — beide Scripts wurden so strukturiert
(klar abgegrenzter `SCORE ENGINE`-Abschnitt), dass sich das leicht nachträglich extrahieren
lässt.
