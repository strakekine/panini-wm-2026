# Crypto Intraday Trend Indicator (Pine Script v6) — Simple

Einfache Trendfolge-Scripts für Krypto-Intraday-Trading (15M–4H): Long/Short-Signal, wenn
**vier klare Bedingungen gleichzeitig zutreffen** — keine Score-Gewichtung, kein HTF/Funding/OI,
keine Marktstruktur-Pivots, kein Pullback/Candle-Pattern-Kram. Absichtlich schlank.

- `strategy_crypto_intraday.pine` — backtestbare Version (`strategy()`).
- `indicator_crypto_intraday.pine` — Live-Version (`indicator()`) mit Signal-Plots,
  automatisch gezeichnetem Entry/Stop und Alerts (JSON-Message für Webhook/Bot).

- `indicator_overlay_simple.pine` — **signalfreie Variante** des "Confluence Buy/Sell Signal":
  nur Darstellung, keine Score-Logik, keine Labels, keine Alerts. Siehe unten.
- `indicator_lower_macd.pine` — signalfreies **unteres Pane**: MACD. Slot 2 des Charts.
- `indicator_lower_momentum.pine` — Alternative für Slot 2: RSI + ADX/DI im unteren Pane.

Beide Signal-Scripts enthalten dieselbe Logik redundant (kein Pine-Library-Import, um den
Publish-Test-Republish-Zyklus zu vermeiden — siehe unten).

## Confluence Simple — ohne Buy/Sell-Signale

`indicator_overlay_simple.pine` ist die abgespeckte Anzeige-Version des
"Confluence Buy/Sell Signal": Inputs, Defaults und Farben sind aus dem Original übernommen,
aber die gesamte Signalgebung fehlt. Entfernt sind Konfluenz-Score, BUY/SELL/EXIT-Labels,
ADX-Filter, MACD, Volumen-Bestätigung, Engulfing, Inside Bar, Golden/Death Cross,
TK-Cross, 200MA-Cross, Score-Hintergrund und alle `alertcondition`. Das Script zeichnet
ausschließlich Indikatoren, die Interpretation bleibt beim Betrachter.

Stufe 1 enthält vier Bausteine, jeder einzeln abschaltbar:

| Baustein | Einstellungen |
|---|---|
| **6× MA** | pro Linie: An/Aus, SMA/EMA-Umschalter, Länge, Farbe. MA 1–5 wie im Original (SMA 10/20/50/100/200, MA 4+5 aus), MA 6 neu (EMA 9, aus). Gemeinsame Source. |
| **Supertrend** | Faktor 3.0, ATR Länge 10, Farben bullish/bärisch. Ein Plot mit `plot.style_linebr` wie im Original. |
| **Ichimoku** | Tenkan 9 / Kijun 26 / Senkou B 52, Verschiebung 27 mit Plot-Offset `displacement - 1` (= 26 Bars, klassisch korrekt; das TV-Built-in verschiebt nur 25). Cloud, Tenkan/Kijun und Lagging Span (Chikou) getrennt schaltbar. |
| **Bollinger** | Gemeinsame Länge 20, Basis SMA, zwei Bänder gleichzeitig: 2.0 + 2.5, je mit eigenen Farben und Füllung. Basis-Linie separat schaltbar. |

Stufe 2 ergänzt den **RSI**, Stufe 3 die **Tabelle** und den **Anchored VWAP** — alles ohne
eigenes Pane, siehe die nächsten Abschnitte.

Platzbudget: TradingView erlaubt 64 Plots pro Script, aktuell sind 18 belegt (Tabellen zählen
nicht mit).

## RSI im Overlay — ohne eigenes Pane

Hintergrund: TradingView erlaubt in der kostenlosen Version nur zwei Indikatoren pro Chart.
Slot 1 ist dieses Overlay, Slot 2 der MACD im unteren Pane — für den RSI bleibt keiner übrig.
Also wandert er ins Overlay.

Eine gewöhnliche RSI-Linie geht dort nicht: Das Script liegt auf der Preisachse, ein RSI von
62 wäre schlicht der Kurs 62 und läge bei den meisten Instrumenten weit außerhalb des Bildes.
Deshalb Darstellungsformen, die ohne eigene Achse auskommen — einzeln schaltbar,
beide vom Hauptschalter „RSI aktiv" abhängig.

| Form | Default | Was sie zeigt | Grenzen |
|---|---|---|---|
| **Zahlenfeld** | aus | Aktueller RSI-Wert als große Zahl in der Chart-Ecke, eingefärbt nach Zone. Position (6 Ecken) und Schriftgröße wählbar. Default aus, seit die Tabelle den RSI mitführt. | Nur der Wert der letzten Kerze, kein Verlauf. |
| **Kerzenfärbung** | aus | Kerzen werden getönt, solange der RSI über der Überkauft- bzw. unter der Überverkauft-Schwelle liegt. | Nur die beiden Extremzonen, keine Zwischenwerte, keine Zahl. |

Dazu kommt die **Tabelle**, die den RSI pro Zeitrahmen führt — siehe unten.

Eine frühere dritte Form, den auf ein Preisband gemappten RSI-Verlauf, gab es kurzzeitig; sie
wurde wieder entfernt (ungenutzt, und die willkürliche Höhe im Chart war eher irreführend als
hilfreich). In der Git-Historie dieses Branches ist sie zu finden.

Zahlenfeld und Kerzenfärbung greifen auf dieselbe Farbvariable zu, sind also immer synchron:
Wird die Kerze rot getönt, steht auch die Zahl auf Rot. Alle drei Farben (überkauft,
überverkauft, neutral) sind frei wählbar.

Die Kerzenfärbung arbeitet mit `barcolor()` und liefert außerhalb der Zonen `na` zurück — dort
greift sie also gar nicht ein und die Kerzen behalten ihre normale Chart-Färbung. Ist der
Schalter aus, ist die Funktion durchgehend wirkungslos.

## Tabelle und Anchored VWAP

Stufe 3 im Overlay. Beides ohne eigenes Pane, beides ohne Signale.

### Die Tabelle

```
        RSI   ADX   Trend
  D      62    24     ▲
  W      58    31     ▲
  M      71    19     ▬
  ATR   1.8 %
  Vol   1.8×
  VWAP  58412.50   +4.2 %   2025-04-09
```

Oben das Zeitrahmen-Raster, darunter die Kennzahlen, die es nur einmal gibt. Spalten und
Zeilen einzeln abschaltbar, Position wählbar (Default unten links: dort kollidiert sie weder
mit der TradingView-Legende oben links noch mit den aktuellen Kerzen und der Preisskala
rechts).

| Feld | Inhalt | Färbung |
|---|---|---|
| **RSI** | pro Zeitrahmen | rot ab Überkauft-Schwelle, grün ab Überverkauft, sonst grau |
| **ADX** | pro Zeitrahmen | grau unter der Trendschwelle (Default 25), sonst kräftig |
| **Trend** | ▲ / ▼ / ▬ pro Zeitrahmen | grün / rot / grau |
| **ATR** | in Prozent vom Kurs, Chart-Zeitrahmen | orange, wenn über dem eigenen 100-Kerzen-Schnitt |
| **Vol** | Volumen relativ zum 20er-EMA | kräftig ab 1.5× |
| **VWAP** | Kurs des Anchored VWAP, Abstand in Prozent und das Datum des Ankers | grün über, rot unter dem VWAP |

Die drei Zeitrahmen sind frei wählbar, Default **D/W/M**.

**RSI und ADX kommen ins Raster, ATR und Volumen nicht.** RSI und ADX laufen beide 0–100 und
messen dasselbe über verschieden lange Fenster — die sind über Zeitrahmen hinweg vergleichbar.
Ein Wochen-ATR neben einem Tages-ATR lädt dagegen zum Fehlschluss ein: Für den Stop zählt der
ATR des Zeitrahmens, auf dem du handelst, also der des Charts.

**Laufende Kerzen, nicht abgeschlossene.** Default zeigen alle drei Zeitrahmen ihren aktuellen
Stand — sonst stünde ein Tages-RSI von heute neben einem Monats-RSI vom vorletzten Monat, und
der Vergleich wäre wertlos. Preis dafür: Die Werte ändern sich bis zum jeweiligen Kerzenschluss
noch, die Monatszeile also einen Monat lang. Per Schalter auf abgeschlossene Kerzen umstellbar.

Die Tabelle zeigt grundsätzlich nur den Jetzt-Zustand. Beim Zurückscrollen siehst du weiterhin
die aktuellen Werte, nicht die von damals.

### Die Trend-Spalte

Drei Stimmen, alle müssen einig sein — sonst ▬:

| Stimme | Aufwärts, wenn … |
|---|---|
| MA-Staffelung | schnell > mittel > langsam **und** Kurs über der schnellen MA |
| Supertrend | Richtung bullish |
| Ichimoku | Kurs über der Kumo |

Die Trend-MAs haben **eigene Längen** (Default 10/20/50), entkoppelt von den sechs
Anzeige-MAs: Du kannst das Chart optisch beliebig umbauen, ohne die Trend-Aussage zu ändern.
Ebenso läuft die Berechnung unabhängig von der Sichtbarkeit — Supertrend und Kumo stimmen mit
ab, auch wenn du sie ausgeblendet hast. Jede Stimme einzeln abwählbar.

Dass bei Uneinigkeit ▬ steht, ist Absicht: Widersprechen sich Supertrend und Kumo, *ist* der
Markt uneinig, und das ist die nützlichste Information der Zeile.

### Anchored VWAP

Bewusst **kein** Session-VWAP: Auf Tages-, Wochen- und Monatscharts fällt dessen Anker mit der
Kerze zusammen, er ist dort wertlos. Stattdessen ein Anker, den du wählst — und der sich, außer
beim manuellen Datum, **pro Symbol selbst findet**. Beim Wechsel von BTC auf einen anderen Coin
ist also nichts nachzupflegen, was bei einem festen Datums-Input nötig wäre (TradingView
speichert Indikator-Einstellungen pro Chart, nicht pro Symbol).

| Anker | Verhalten |
|---|---|
| **Tief des Fensters** (Default) | springt automatisch auf das jüngste Tief innerhalb des Fensters |
| **Hoch des Fensters** | dito, invers |
| **Jahresanfang** / **Quartalsanfang** | kalendarisch, für alle Symbole gleich sinnvoll |
| **Manuelles Datum** | fest, muss pro Symbol gepflegt werden |

Das Fenster wird in **Zeit** angegeben (3 Monate bis 5 Jahre oder gesamte Historie, Default
1 Jahr), nicht in Kerzen — und pro Chart in Kerzen umgerechnet. Eine feste Kerzenzahl wäre
zeitrahmenabhängig: 365 Kerzen sind auf dem Tageschart ein Jahr, auf dem Wochenchart sieben
und auf dem Monatschart über dreißig Jahre. So viele Monatskerzen hat kein Coin, `ta.lowest`
liefert dann `na`, der Anker greift nie und der VWAP läuft still ab der ersten Kerze.

Reicht die Historie eines Symbols nicht für das gewählte Fenster, ankert der VWAP an der
ersten verfügbaren Kerze — in dem Fall die einzig sinnvolle Auslegung. Damit du siehst, wo der
Anker tatsächlich sitzt, steht sein **Datum** in der VWAP-Zeile der Tabelle.

Gelesen wird er als Durchschnittspreis aller Käufer seit dem Anker: Liegt der Kurs darüber, ist
die durchschnittliche Position seit dem Ankerpunkt im Gewinn, und der Level wird bei
Rücksetzern häufig verteidigt.

Für einzelne, bewusst gesetzte Anker ist übrigens das TradingView-**Zeichenwerkzeug** „Anchored
VWAP" der bessere Weg — Zeichnungen zählen nicht gegen das Zwei-Indikator-Limit und werden pro
Symbol gespeichert.

## Unteres Pane — MACD

Slot 2 des Charts. `indicator_lower_macd.pine`, `overlay=false`, gleiche Philosophie wie das
Overlay — reine Anzeige, jeder Baustein einzeln abschaltbar, keine Signale, keine Alerts.

MACD 12/26/9 mit freier Source. Linie, Signal und Histogramm einzeln schaltbar, Nulllinie,
Histogramm wahlweise vierfarbig (kräftig = Bewegung von der Nulllinie weg, blass = zurück zur
Nulllinie) oder zweifarbig.

Der MACD bleibt bewusst ein eigenes Script und wandert nicht wie der RSI ins Overlay: Er
rechnet in Preis-Einheiten, hat also weder eine feste Ober- noch Untergrenze. Für ein
Zahlenfeld wäre er zu wenig aussagekräftig (der absolute Wert sagt ohne Verlauf nichts), und
für eine gemappte Kurve fehlt ihm der feste 0–100-Rahmen, in dem der RSI sich bewegt. Im
eigenen Pane behält er seine echte Skala und seine echten Werte.

### Alternative für Slot 2

`indicator_lower_momentum.pine` — RSI + ADX/DI im unteren Pane, beide nativ 0–100, deshalb
zusammen in einem Pane möglich. Nur relevant, wenn du statt des MACD lieber ADX/DI im zweiten
Slot hättest; der RSI im Overlay wird dadurch überflüssig und lässt sich per Hauptschalter
abschalten. Einstellungen: RSI Länge 14, freie Source, optionale SMA/EMA-Glättung,
Level-Linien 70/50/30 mit Zonenfüllung; ADX DI-Länge 14, Glättung 14, DI+/DI− separat
schaltbar, Orientierungs-Schwelle 20.

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
