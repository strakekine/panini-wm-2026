# TradingView-Setup — Kontext und Entscheidungen

Gedächtnisdatei für die beiden aktiven Indikatoren. Das `README.md` daneben beschreibt, **was**
sie tun; hier steht, **warum** sie so gebaut sind, damit Entscheidungen nicht erneut
durchgekaut werden müssen.

Aktiver Branch: `claude/zweiter-tv-indikator-utf68y`.

## Die harte Randbedingung

TradingView Free erlaubt **zwei Indikatoren pro Chart**. Alles Weitere folgt daraus:

| Slot | Datei | Rolle |
|---|---|---|
| 1 | `indicator_overlay_simple.pine` | `overlay=true`, der große Indikator auf dem Kurschart |
| 2 | `indicator_lower_macd.pine` | `overlay=false`, unteres Pane |

`indicator_lower_momentum.pine` (RSI + ADX/DI) liegt als **Alternative** für Slot 2 herum,
falls der Nutzer irgendwann ADX/DI statt MACD will. Nicht Teil des aktuellen Setups.

Der Nutzer handelt hauptsächlich **Krypto auf D/W/M**, nicht intraday. Die Signal-Scripts im
selben Ordner (`strategy_crypto_intraday.pine`, `indicator_crypto_intraday.pine`) sind auf
15M–4H getunt und werden **nicht benutzt** — bei Zeitrahmen-Fragen nicht verwechseln.

## Leitprinzipien

1. **Signalfrei.** Keine Buy/Sell-Labels, kein Score, keine `alertcondition`, keine
   Divergenz-Erkennung. Das Script zeigt Zustände, die Interpretation bleibt beim Nutzer.
2. **Jeder Baustein einzeln abschaltbar**, mit frei wählbaren Farben.
3. **Skalenregel.** Ein Pane hat eine Y-Achse. Nur Dinge derselben Größenordnung dürfen
   zusammen geplottet werden. RSI/ADX (0–100) ja, MACD (Preisdifferenz) nein.
4. **Skalenfreie Träger nutzen**, statt Linien zu stapeln: `table`, `bgcolor`, `barcolor`,
   `plotshape`, `force_overlay`. Das ist der eigentliche Hebel gegen das Zwei-Slot-Limit.
5. **Labels müssen exakt stimmen.** Zwei Bugs kamen bereits daher (siehe unten). Der Nutzer
   prüft Beschriftungen gegen den echten Chart und findet Unstimmigkeiten zuverlässig.

## Slot 1 — Overlay

Bausteine: 6× MA, Supertrend, Ichimoku, 2× Bollinger, RSI, Anchored VWAP, Tabelle.

**RSI liegt im Overlay**, weil Slot 2 für den MACD reserviert ist. Eine normale RSI-Linie geht
auf der Preisachse nicht (RSI 62 wäre der Kurs 62), deshalb nur achsenlose Formen: Zahlenfeld
(Default aus) und Kerzenfärbung (Default aus). Der RSI steht ohnehin in der Tabelle.

**Tabelle** (unten links — oben links sitzt die TV-Legende, rechts die aktuellen Kerzen):
Zeitrahmen-Raster D/W/M mit RSI/ADX/Trend, darunter ATR %, relatives Volumen, VWAP.
ATR und Volumen kommen bewusst **nicht** ins Raster: Ein Wochen-ATR neben einem Tages-ATR lädt
zum Fehlschluss ein, für den Stop zählt der ATR des gehandelten Zeitrahmens.

**HTF-Werte von laufenden Kerzen** (Default). Vom Nutzer so gewünscht, mit gutem Argument:
Sonst stünde ein Tages-RSI von heute neben einem Monats-RSI vom vorletzten Monat. Preis dafür
ist Repainting — für ein Live-Dashboard akzeptiert.

**Trend-Spalte**: drei Stimmen (MA-Staffelung, Supertrend, Kumo), nur bei Einstimmigkeit eine
Richtung, sonst ▬. Die Trend-MAs sind **fest 10/20/50 und von den Anzeige-MAs entkoppelt** —
ausdrücklicher Wunsch des Nutzers. Die Stimmen rechnen unabhängig von der Sichtbarkeit.

**Anchored VWAP statt Session-VWAP**, weil letzterer auf D/W/M wertlos ist (Anker fällt mit der
Kerze zusammen). Anker finden sich pro Symbol selbst, damit beim Coin-Wechsel nichts
nachzupflegen ist (TV speichert Inputs pro Chart, nicht pro Symbol — Einwand kam vom Nutzer).

## Slot 2 — MACD-Pane

MACD/PPO, ADX-Hintergrundtönung, MTF-Tabelle, Preislevel per `force_overlay`.

**PPO-Umschalter**, weil ein MACD von 412 (BTC) und 0.0003 (TRX) nicht vergleichbar sind.

**MTF-MACD als Text, nicht als Linie.** Ein Wochen-MACD ist ein Vielfaches des Tageswerts und
würde die Achse an sich reißen. Frühere Aussage von mir, HTF-MACD sei „einheitengleich, also
konfliktfrei", war falsch und wurde korrigiert.

**Spaltenreihenfolge Hist → Null → Rtg** ist eine Steigerungsleiter in der Reihenfolge, in der
die Bedingungen eintreten (Kreuzung, dann Nulldurchgang, dann Beschleunigung). Vom Nutzer so
vorgeschlagen. „Rtg" meint das **Histogramm**, nicht die MACD-Linie.

**Preislevel per `force_overlay`** — Vorwoche H/T, Vormonat H/T, Jahres-Open. Default
`Nur Zahl am rechten Rand`, ausdrücklich weil der Chart schon genug Linien trägt.

## Pine-Fallstricke, die hier aufgetreten sind

- **`ta.*` nie im Ternär.** `maType == "EMA" ? ta.ema(…) : ta.sma(…)` führt dazu, dass nur der
  genommene Zweig läuft; die MAs führen internen Zustand und liefern nach dem Umschalten
  falsche Werte. Immer beide rechnen, danach auswählen. Gilt auch für MACD/PPO inkl. Signal.
- **`plot(title=…)` braucht const string.** Kein Ternär mit Input.
- **`str.format_time` braucht `series int`**, Tupel-Rückgaben aus `request.security` sind float
  → `int()` casten.
- **`ta.vwap` liefert auch vor dem aktuellen Anker Werte** (die früherer Segmente). `plot()`
  reiht sie aneinander, die Linie lief über die ganze Historie. Per `plot()` nicht lösbar, weil
  auf einer alten Kerze der spätere Anker unbekannt ist → am rechten Rand als **Polyline**
  gezogen. Der Nutzer hat das bei ETH selbst entdeckt.
- **Fenster in Zeit, nicht in Kerzen.** 365 Kerzen sind auf D ein Jahr, auf M über 30 Jahre;
  `ta.lowest` liefert dann `na` und der Anker greift nie. Umrechnung über
  `timeframe.in_seconds`. Auch vom Nutzer gefunden.
- **VWAP-Genauigkeit.** Ein Preis pro Kerze — auf M viel zu grob. Oberhalb von D wird auf
  Tagesdaten ausgewichen, das Label nennt die Basis (`VWAP (D)`). Idee kam vom Nutzer.
- **Lookback-Limit 15000 Kerzen** bei `ta.lowest`/`ta.highest`. Das VWAP-Fenster wurde in
  Kerzen des Chart-Zeitrahmens gerechnet: 1 Jahr auf 15M sind 35040 → `RE10004` auf allen
  Zeitrahmen unter 1h. Deshalb kommen Hoch und Tief des Ankerfensters jetzt **immer aus
  Tagesdaten** (5 Jahre = rund 1825 Kerzen). Nebeneffekt, der das Eigentliche ist: der Anker
  ist damit zeitrahmenunabhängig — vorher konnte dasselbe „1 Jahr" auf 15M und 4H auf
  verschiedenen Kerzen sitzen. `f_winBars` behält ein `math.min(15000, …)` als Sicherung.
- **Anker außerhalb der geladenen Historie.** Folgefehler des Obigen: Der lokale VWAP kann nur
  an einer Kerze starten, die der Chart geladen hat. Unter 4h reicht die Historie oft keine 365
  Tage zurück, `cond` wurde nie wahr und die VWAP-Linie verschwand. `useDailyEff` weicht in dem
  Fall auf die Tagesberechnung aus, statt nichts anzuzeigen. Vom Nutzer gemeldet.
- **`lookahead_on` mit `[1]`** ist das korrekte, repaint-freie Muster für Vorperiodenwerte.
- **RE-Fehlercodes sind nicht dokumentiert.** Der Stacktrace (`at f_avwap():302`) benennt die
  Funktion und ist der eigentliche Schlüssel, nicht die Nummer.

## Verworfen (nicht erneut vorschlagen)

- Gemappte RSI-Kurve im Chart — gebaut, ungenutzt, wieder entfernt.
- Session-VWAP, Session-Schattierung, Vortages-Level — auf D/W/M sinnlos.
- Divergenz-Erkennung, Stochastik, weitere MAs/Trendlinien — Signalprinzip bzw. Redundanz.
- Normalisierung des MACD ins 0–100-Panel — verwirft die echten Werte.
- **Weitere Overlay-Bausteine** (Volatilitäts-Squeeze, auffällige Kerzen, 52-Wochen-Marker,
  Marktstruktur-Pivots, Kreuzungs-Marker). Wurden angeboten, der Nutzer hat bewusst abgelehnt:
  das Setup ist fertig. Plot-Budget wäre da (18/64), aber die knappe Ressource ist die
  Chartfläche, nicht der Zähler. Nicht erneut von sich aus vorschlagen.

## Zusammenarbeit

Der Nutzer fragt gezielt nach und will Begründungen statt Ergebnissen; mehrere echte Bugs kamen
aus seinen Rückfragen. Vor dem Bauen abstimmen, was gewünscht ist. Nach Änderungen erwartet er
das **komplette Script im Chat** zum Kopieren, nicht nur den Diff.

Es gibt hier **keinen Pine-Compiler**. Alles ist ungetestet; Fehlermeldungen kommen aus dem
TradingView-Editor zurück. Das bei jeder Auslieferung dazusagen.
