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

Rückwärtsplanung kann in der Vergangenheit landen (48-h-Plan für morgen Abend).
`messages()` warnt dann rot und nennt den frühesten möglichen Backzeitpunkt;
die Vorteigzeit zählt mit. Läuft der Teig schon (`S.run`), ist ein Start in der
Vergangenheit der Normalfall und die Warnung entfällt.

**Zustand:** ein Objekt `S`, ein `render()`, `persist()` nur nach localStorage.
`sanitize(S)` läuft bei jedem Eingangsweg (Link, localStorage, Sicherung, Rezept,
Vorlage). Der Plan-Hash `#p=` steht NUR im Teilen-Link und wird beim Start
entfernt: iOS-Lesezeichen speichern die URL samt Hash. `S.run` = eingefrorener
Plan mit echter Startzeit ("Jetzt geknetet" am Knetschritt im Ablauf); Umplanen
rechnet dagegen und simuliert den Rest ab der aktuellen Kerntemperatur per
Bisektion über `simulate`.

Weicht der echte Knetzeitpunkt ab, hängt die **Anzeige am echten Start**: Ablauf,
Zeitstrahl, Küchenmodus und Kalender verschieben sich als Ganzes, das Rezept bleibt
unverändert (24 h geplant sind 24 h im Ablauf). Das ist Absicht — nur so taugt der
Eintrag im Backprotokoll noch als Rezept. Über dem Ablauf steht dann eine gelbe
Warnung mit dem neuen Fertig-Zeitpunkt und dem Verweis auf Umplanen, und die
Umplanen-Karte klappt einmal von selbst auf (`replanAufgeklappt` verhindert, dass
sie das bei jedem 30-s-Render wieder tut). `S.bake` bleibt der Zieltermin;
`bakeShown` ist der verschobene. Die Entscheidung — Rezept genau einhalten und
später essen, oder pünktlich backen und die Differenz in der Kühlphase auffangen —
gehört dem Nutzer und wird ihm nicht abgenommen.

Umplanen prüft die **Abweichung der Restzeit**, nicht ob die Backzeit verschoben
wurde — sonst fällt ein verspäteter Knetstart bei unveränderter Backzeit durchs
Raster (war so, ist behoben). Bis 4 h Abweichung greift `kuehlAusgleich()`: alle
Phasendauern bleiben, nur die längste Kühlphase wird kürzer oder länger, weil
eine Stunde Kühlschrank rund ein Achtel einer Stunde Raumtemperatur kostet.
Praktisch: in den Kühlschrank verschiebt sich mit dem echten Kneten, herausnehmen
bleibt bei der geplanten Uhrzeit (Backzeit minus Warmphase). Darüber hinaus
greift die alte Bisektion über den ganzen Rest.

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


## Offene Arbeit (Stand 18.09.2026)

**Kleiner, unstrittiger Bug:** `saveBtn` legt `JSON.parse(JSON.stringify(S))` als
Rezept ab — samt `S.run`. Ein Rezept, das während einer laufenden Gare gespeichert
wurde, bringt beim Laden die alte Startzeit mit, und die App hält einen Teig für
laufend, der längst gegessen ist (`Object.assign(defaults(), s)` zieht `s.run` mit,
und `if(run) S.run = run` überschreibt das nur, wenn gerade selbst einer läuft).
Fix: `run` beim Speichern entfernen.

**Zwei Tabs statt eines Zustands — vom Nutzer entworfen, angenommen.**
Heute bedient ein `S` zwei Aufgaben gleichzeitig. Läuft ein Teig und ändert man
oben den Plan, beschreibt der Ablauf einen anderen Teig als den im Kühlschrank:
Ablauf, Zeitstrahl, Küchenmodus und Kalender hängen an `S`, nur Umplanen rechnet
gegen `run.plan`. Die vorher diskutierte Warnbanner-Lösung behandelt das Symptom;
die Tabs treffen die Ursache und sind deshalb der beschlossene Weg.

Das Datenmodell trägt es schon: `S` ist der Planen-Zustand, `S.run = {start,
newBake, plan}` der Backen-Zustand. Kein Migrieren nötig, `_last` bleibt wie es ist.

- **Planen:** Teig, Vorteig, Gärplan, Ballen-Zeitpunkt, Kneten, Backzeit,
  theoretischer Ablauf, Vorlagen, gespeicherte Rezepte, Teilen-Link. Immer
  editierbar, auch wenn ein Teig läuft. Knopf „Diesen Teig jetzt kneten".
- **Backen:** rechnet aus `run.plan` + `run.start`. Ablauf, Zeitstrahl, „läuft seit
  X, Y % der Gärleistung", Umplanen, Küchenmodus, Kalender, Backprotokoll. Der Plan
  ist hier nicht editierbar, nur über Umplanen (Backzeit und echte Knetzeit).
- Beim Start: läuft ein Teig → Backen, sonst → Planen.
- „Jetzt kneten", während schon einer läuft → Nachfrage, nie stillschweigend
  überschreiben.
- Neuer Knopf „Gebacken": schreibt ins Backprotokoll und räumt den Backen-Tab frei.
  Heute gibt es nur „Startzeit vergessen".

Offen und vom Nutzer zu entscheiden: **ein Teig gleichzeitig oder mehrere.**
Empfehlung ist einer — mehrere bringen Liste, Auswahl und doppelten Zustand.

**Vorgeschlagen, noch nicht beantwortet:**
- Feld im Backprotokoll für die *gemessene* Teigtemperatur nach dem Kneten, das
  `knetWaerme()` rückwärts eicht (heute `1 + Arbeit/250`, für sein Programm 6,1 °C).
  Erst damit stimmt das angezeigte Schüttwasser für die Halo Core.
- Hinweis am Knetschritt: reißt der Teig im Fenstertest, erst 15 min ruhen lassen
  statt weiterkneten; bei Stockgare über 2 h zwei Dehnen-und-Falten-Schritte in der
  ersten Stunde. Steht bisher nirgends in der App.

## pizzalovers.se — geklärt, nicht neu aufrollen

Ihr Rechner ist unser Rechner ohne Abkühlkurve. Nachgebaut — gleiches Hefegesetz,
aber sofortiger Temperatursprung statt `simulate` — trifft er ihre Werte auf rund
7 %: für 6×280 g, 62 %, 5 h/25 + 16 h/6 + 6 h/25 sagt der Nachbau 1,01 g,
pizzalovers zeigt 0,94 g, wir rechnen 1,00 g.

Daraus das Muster — bei Raumtemperatur deckungsgleich, im Kühlschrank auseinander,
und zwar in beide Richtungen je nach Ballen-Zeitpunkt:

| Plan (6×280 g, 62 %) | unser | pizzalovers |
|---|---|---|
| 8 h / 20 °C | 4,21 g | 4,21 g |
| 5/25 + 16/6 + 6/25, Ballen nach P2 | 1,00 g | 1,01 g |
| 24 h/4 + 3 h/21, Ballen sofort (kalt) | 6,04 g | 5,36 g |
| 24 h/4 + 3 h/21, Ballen nach der Kälte | 3,85 g | 5,36 g |
| 48 h/4 + 4 h/21, Ballen nach der Kälte | 2,00 g | 2,39 g |
| 72 h/4 + 4 h/21, Ballen nach der Kälte | 1,39 g | 1,57 g |

Kleine Ballen kühlen schnell aus und brauchen mehr Hefe als ihr Rechner sagt, ein
großer Klumpen kühlt langsam und braucht weniger. Genau das kann pizzalovers nicht
ausdrücken, weil er den Ballen-Zeitpunkt nicht kennt — das ist der Daseinsgrund
dieser App. Die ganze Spanne hängt an τ = 1,1 h, der einzigen geratenen Konstante.

Nebenbefund: Für 24 h kalt + 3 h Raum mit Ballen von Anfang an rechnen wir 6,04 g,
praktisch die 6 g der Ooni-App. Sieht danach aus, als ginge Ooni von Ballen im
Kühlschrank aus. Das löst den alten 1,58×-Streit auf — nicht verschiedene Modelle,
sondern verschiedene Annahmen darüber, was im Kühlschrank liegt.

Die Domain ist vom Netz-Proxy dieser Umgebung blockiert (403 beim CONNECT), Zahlen
kommen nur per Screenshot vom Nutzer.

**Erster echter Teig läuft:** geknetet 18.09.2026 gegen 16:00, 6×280 g, 62 %, 3 %
Salz, 5 h/25 °C + 16 h/6 °C + 6 h/25 °C, Ballen nach Phase 2, 1,00 g Frischhefe,
Backzeit 19.09. um 19:00. Das Ergebnis gehört ins Backprotokoll und ist der erste
Datenpunkt zum offenen Hefeniveau.
