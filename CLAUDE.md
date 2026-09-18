# panini-wm-2026

Vier voneinander unabhängige Dinge liegen in diesem Repo, alle auf `main`:

- **`panini*.html`** — Sticker-Tracker für die Panini WM 2026 (Emil, Leo, generisch).
  Reine Einzeldatei-Webapps, kein Build, kein Framework.
- **`spikeball.html`** — Turnierplaner für Strand-Spikeball. Ebenfalls Einzeldatei.
- **`pizza.html`** — Pizzateig-Rechner und Gärplaner: beliebig viele Gärphasen mit
  eigener Temperatur, frei wählbarer Ballen-Zeitpunkt, Vorteige (Poolish, Biga,
  Sauerteig), Rückwärtsplanung auf die Backzeit, Umplanen während der laufenden
  Gare, Knetprogramm für Spiralkneter, Backprotokoll mit Kalibrierung,
  Kalender-Export und Küchenmodus. Auch Einzeldatei. Details unten.
- **`pine/`** — TradingView Pine-Script-Indikatoren. Eigener Kontext, eigene Regeln:
  siehe **`pine/CLAUDE.md`**, bevor dort etwas geändert wird.

Der Repo-Name passt damit nur noch zum ersten Punkt. Nicht wundern und nichts danach
sortieren: was hier liegt, steht in dieser Liste.

## Teigplaner (`pizza.html`) — Stand und Regeln

Nutzer: Hobbybäcker mit Ooni-Ofen und Halo-Core-Kneter, App läuft vom iPhone-
Home-Bildschirm. Deutsch, Du-Form, keine Fachsprache ohne Erklärung. Er will
Vorschläge mit Begründung und Widerspruch, keine Höflichkeitszustimmung.
Änderungen gehen nach Absprache direkt auf `main` (Fast-Forward vom
Arbeitsbranch), Pull Requests sind ihm zu umständlich.

**Gärmodell** (oben im `<script>`, gegen Rezepte kalibriert):
- Gasbildung relativ zu 21 °C: Q10 = 2,3 über 15 °C, darunter Ratkowsky-artig
  (T − Tmin)² mit Tmin = −6, stetig bei 15 °C. Ergibt rGas(4)/rGas(20) ≈ 0,15,
  das ist die Bäckerregel "24 h Kühlschrank ≈ 3–4 h Raum". Nicht anfassen.
- Zweite Spur "Reifung": Q10 = 1,7, Tmin = −12. Der Reifegrad (Em/Eg) ist eine
  ordinale Kennzahl, kein Messwert; bei Vorteig gehört dessen Gas mit in den
  Nenner (war ein Fehler, ist behoben).
- Hefe: Frischhefe% = K / E^1,55. Der Anker lag bei 0,6 % für 8 h/20 °C und ist
  durch 1,45 geteilt worden, nachdem der Quellenabgleich ihn nicht gestützt hat:
  AVPN-Disciplinare 0,17 %, Rafcalc 0,20 %, pizza.it 0,20 %, Ooni-Faustregel
  0,10 % (24 h/18 °C). Nur die Ooni-Rezeptseiten liegen mit 1,7–3,3 % weit
  darüber, nehmen aber für 24 h und 72 h dieselbe Menge — Sicherheitsmarge für
  Anfänger, kein Modell. Entscheidend war die Asymmetrie der Fehler: zu wenig
  Hefe heißt später backen, zu viel heißt überreifer Teig; wer auf eine feste
  Uhrzeit plant, muss nach unten danebenliegen. Auch danach liegt der Anker noch
  über dem Disciplinare, weil der Hobbybäcker keinen 25-°C-Raum hat.
  Exponent 1,55 bleibt: Rafcalcs 1,2 ist für einphasige Raumtemperaturgare
  gebaut, 1,55 trägt die Kaltstaffel. Ihn zu senken hebt die Hefe für lange
  Pläne — genau die falsche Richtung. Erst ändern, wenn das Backprotokoll zeigt,
  dass kurze Pläne überreif und lange zu jung ausfallen.
  Biga hat einen eigenen Anker (Giorilli: 1 % bei 18 h / 18 °C), Faktor 5,075 —
  das ist 3,5 × 1,45, mit dem Hefe-Anker mitgezogen. Sauerteig-Anker `SK` bleibt.
  Untergrenze E = 2 (entspricht 3,1 %).
- Kerntemperatur nach Newton, τ = 1,1 h · (m/260 g)^(2/3) · Behälterfaktor.
  Das ist das Alleinstellungsmerkmal (Ballen vor/nach der Kälte), nicht anfassen.
- Wer Konstanten ändert, prüft — alle Werte **über `calc()` gemessen**, also mit
  Abkühlung ab Zielteigtemperatur 23 °C, nicht analytisch: 8 h/20 °C ≈ 0,39 %,
  2/21+19/6+3/21 mit Ballen nach der Kälte ≈ 0,25 %, davor ≈ 0,33 %, 48 h kalt
  ≈ 0,18 %, 72 h ≈ 0,12 %, Biga 18 h/17 °C Vorteighefe ≈ 0,88 %, Biga-Preset
  Reifegrad ≈ 1,05, 100 % Biga + 4 h ohne Zusatzhefe, rGas(4)/rGas(20) ≈ 0,15.
  Achtung: Der Anker `0,6/1,45` im Code ist analytisch gerechnet (E = 8·rGas(20)).
  `calc()` startet bei 23 °C und kühlt ab, kommt also auf ein leicht höheres E —
  darum 0,39 % statt der analytischen 0,41 %. Das ist kein Fehler, sondern der
  Unterschied zwischen Anker und Simulation.

**Offene Frage zum Hefeniveau — nicht ohne echten Teig anfassen.**
Der Exponent 1,55 ist belegt und gilt als geklärt: Das AVPN-Disciplinare nennt
8 h und 24 h bei derselben Temperatur (23 °C) mit 5-fachem Hefeunterschied, das
ergibt einen impliziten Exponenten von 1,46. Unser Modell kommt an denselben
zwei Punkten auf 5,49, also 1,55. Der Vergleich ist unabhängig von der
Bezugsgröße, weil sich diese im Verhältnis herauskürzt. Rafcalcs 1,2 ist damit
für unseren Zweck zu flach und als Maßstab erledigt (zwei verschiedene Formeln
Japi1/Japi2, Temperaturterm mit hydrationsabhängigen Nullstellen, empirisch
ohne dokumentierten Kalibrierbereich).

Das **Niveau** ist dagegen weiter offen. Bei 8 h/23 °C rechnen wir 2,94 g
Frischhefe je kg Mehl. Wie weit das über AVPN liegt, hängt davon ab, worauf
sich deren Zahl bezieht — und das ist strittig:
- 1,5 g je kg Mehl → wir 1,96×
- 3 g je Liter Wasser bei 1,75 kg Mehl → wir 1,72×
- 1,5 g je Liter Wasser bei 1,75 kg Mehl → wir 3,43×
Die dritte Lesart ist die wahrscheinlichste: Nur mit ihr ergeben die übrigen
Werte derselben Tabelle 2,9 % Salz und 57 % Hydration, also die AVPN-Spezifikation.
Liest man die Zeile wie zitiert (1000 g Mehl), kämen 5 % Salz und 75–84 %
Hydration heraus, was unmöglich ist. Zwei Rechercheläufe haben zur selben
Quelle 1,5 g und 3 g gemeldet, Faktor 2 auseinander.

Konsequenz: **Nicht nachjustieren.** Der Anker wurde schon einmal um 1,45
gesenkt, weil alle rechnenden Quellen in dieselbe Richtung zeigten. Ein zweites
Mal wegen einer Quelle zu senken, deren Bezugsgröße unklar ist, wäre Fitting an
Rauschen. Die Quellen widersprechen sich inzwischen stärker untereinander, als
wir von ihnen abweichen. Nächster echter Datenpunkt ist das Backprotokoll.
Für den ersten Teig gilt die Empfehlung, das untere Ende des angezeigten
Bereichs zu nehmen (0,7×): zu wenig Hefe heißt später backen, zu viel ist hin.

**Zwei Einwände, die nachgerechnet falsch sind — nicht "reparieren":**
- „4 h/24 °C müsste gegenüber 8 h/20 °C über Faktor 4 liegen, liegt aber bei
  2,04." Das unterstellt eine separierbare Formel aus Zeit mal Temperatur. Das
  Modell integriert beides zu E und wendet den Exponenten darauf an;
  (E₈/E₄)^1,55 = 2,04, exakt der ausgegebene Wert.
- „Der implizite Exponent zwischen 8 h und 24 h bei 20 °C ist 1,48, nicht 1,55."
  Artefakt des Starts bei 23 °C: Die Aufwärmphase fällt beim kurzen Plan
  anteilig stärker ins Gewicht. Bei gleicher Temperatur (23 °C) kommen sauber
  1,55 heraus.

**Nächster sinnvoller Schritt am Modell:** τ = 1,1 h ist geraten, nur die
Skalierung m^(2/3) ist begründet. Einmal messen: Thermometer in einen
250-g-Ballen und in den großen Klumpen, beide von 23 °C in den Kühlschrank,
alle 10 Minuten ablesen. Damit wäre das Herzstück der App auf die echte Küche
geeicht statt auf eine Schätzung. Das bringt mehr als jede weitere Quellenrunde.

**Zustand:** ein Objekt `S`, ein `render()`, `persist()` nur nach localStorage.
`sanitize(S)` läuft bei jedem Eingangsweg (Link, localStorage, Sicherung, Rezept,
Vorlage). Der Plan-Hash `#p=` steht NUR im Teilen-Link und wird beim Start
entfernt: iOS-Lesezeichen speichern die URL samt Hash. `S.run` = eingefrorener
Plan mit echter Startzeit ("Jetzt geknetet" am Knetschritt im Ablauf); Umplanen
rechnet dagegen und simuliert den Rest ab der aktuellen Kerntemperatur per
Bisektion über `simulate`.

**iPhone-Regeln:** Ein fokussiertes Feld bekommt nie `.value` zugewiesen, und
Container mit fokussiertem Input werden nicht per innerHTML neu gebaut (sonst
klappt die Tastatur bei jedem Zeichen ein). Der 30-s-Timer rendert nicht während
des Tippens. Zahlenfelder haben `inputmode="decimal"`. Kalender und Sicherung
gehen über `navigator.share` mit Datei, Download nur als Fallback. Küchenmodus
hält Wake Lock. Home-Icon ist PNG (iOS nimmt kein SVG).

**Bedienung:** Ein Modus, kein Einfach/Experte mehr. Vorlagen setzen Teig,
Vorteig, Gärplan, Zielteigtemperatur und Knetprogramm; Küchentemperatur, Waage,
Hefesorte, Behälter und Belag bleiben (gehören zur Küche). Gespeicherte Rezepte
bringen dagegen alles mit. Selten genutzte Felder liegen in "Weitere
Einstellungen" am Kartenende.
`S.yOv` ist eine selbst eingetippte Hefemenge in Gramm. Sie ersetzt den
Vorschlag nicht stillschweigend, sondern verschiebt das Backfenster: weniger
Hefe heißt, dasselbe Ziel erst bei mehr Gärleistung zu erreichen
(E ~ yPct^(-1/EXP), EXP = 1,55 bzw. 1,2 bei Sauerteig). Reicht der Plan mit der eigenen Menge nicht bis zur Backreife, wird er für die
Einschätzung bis dahin verlängert (letzte Phase läuft weiter, sie ist immer eine
Ballenphase). Stückgare, Gärleistung, Reifegrad und die Warnungen rechnen mit dem
verlängerten Plan — sonst beschreiben sie einen Ablauf, den niemand so backt.
Umgekehrt wird NICHT gekürzt: Ist der Teig durch mehr Hefe früher fertig,
gebacken wird trotzdem zur geplanten Zeit, der Teig erlebt also den ganzen Plan.
Dort zeigt die Gärleistung stattdessen zusätzlich, wie viel nötig gewesen wäre,
und die Warnung beziffert den Überschuss (ab 1,6× wird sie rot). Der Reifegrad
hängt prinzipiell nicht an der Hefemenge: mehr Hefe beschleunigt beide Spuren
gleich, das Verhältnis bleibt. Das steht so auch im Erklärtext unter der Kachel.
Sie gilt nur für den
Plan, für den sie gedacht war, und wird von jeder Vorlage gelöscht. Das Feld
liegt in `#yOvBox` außerhalb der Zutatentabelle, weil die bei jedem Render neu
gebaut wird; gesperrt wird es nur mit `focusIn(box) && typing()`, sonst würde
der Zurück-Knopf im selben Kasten den alten Wert stehen lassen.

**Testen:** Keine Tests im Repo. Playwright ist global installiert
(`/opt/node22/lib/node_modules/playwright/index.mjs`, Chromium unter
`/opt/pw-browsers`). Modell in Node prüfen: Skript-Teile zwischen den Markern
`Gärmodell`…`Vorlagen` und `Rechnen`…`Hinweise` ausschneiden, `S`, `getCal` und
`defaults` stubben, `calc()` gegen die Sollwerte oben laufen lassen. Browser:
Seite per `file://` laden, 390 px breit; Presets nacheinander klicken (Locator
per `nth-child`, die Chips werden bei jedem Render neu gebaut), Tippen mit
`type()` zeichenweise prüfen (`fill()` sieht Fokusverlust nicht), Konsolenfehler
zu `fonts.googleapis.com` ignorieren (Proxy), Dialoge mit `page.on('dialog')`.

