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
- Wer Konstanten ändert, prüft gegen die Tabelle unten. Alle Werte sind **über
  `calc()` gemessen**, also mit Abkühlung ab Zielteigtemperatur, nicht analytisch.
  Gelesen wird `yPctTotal` (Frischhefe in % des Gesamtmehls; bei Frischhefe ohne
  Vorteig identisch mit `yPctShown`). Basis, wo nichts anderes steht: 6 × 250 g,
  62 % Hydration, **2,8 % Salz** (geht über `saltF` ein), kein Öl/Zucker, ddt 23,
  Behälter "1", Frischhefe, kein Vorteig, `getCal()` = 1. Kurzschreibweise
  „2/21" = 2 h bei 21 °C.

  | Fall | Eingaben | Soll |
  |---|---|---|
  | rGas(4)/rGas(20) | — | 0,150 |
  | 8 h/20 °C | 2/20 + 6/20, Ballen nach P1 | 0,389 % |
  | 24 h, Ballen nach der Kälte | 2/21 + 19/6 + 3/21, Ballen nach P2 | 0,247 % |
  | 24 h, Ballen davor | dito, Ballen nach P1 | 0,327 % |
  | 48 h kalt | Preset `nap48`: 2/21 + 42/5 + 4/21, Ballen nach P1, 6 × 260 g, 63 %, ddt 22 | 0,184 % |
  | 72 h kalt | 2/21 + 68/5 + 4/21, Ballen nach P1 | 0,115 % |
  | Biga Vorteighefe | Preset `biga`, `pf.yPct` (18 h/17 °C, in % des Vorteigmehls) | 0,880 % |
  | Biga Reifegrad | Preset `biga`, `Rip` | 1,05 |
  | 100 % Biga + 4 h | 2/21 + 2/21, Ballen nach P1, Biga share 100, hyd 48, 18 h/17 °C, `yPctMain` | 0 |
  | Erster echter Teig | 6 × 280 g, 62 %, 3 % Salz, 5/25 + 16/6 + 6/25, Ballen nach P2, `yG` | 1,00 g |

  Die Kurzformen sind absichtlich nicht das, was sie zu sein scheinen: „48 h kalt"
  ist der Preset, nicht 48/4 + 3/21 (das gäbe 0,224 %), und „72 h" hat 2 h
  Stockgare vorweg (72/4 + 4/21 gäbe 0,136 %). Beides ist kein Modellfehler,
  sondern ein anderer Plan.
  Achtung zum 8-h-Fall: Der Anker `0,6/1,45` im Code ist analytisch gerechnet
  (E = 8·rGas(20)) und entspricht 0,410 %. Die 0,389 % kommen nur zustande, weil
  der Teig die ersten 2 h als 1,5-kg-Klumpen (τ ≈ 3,5 h) über 20 °C bleibt und so
  mehr E sammelt. Mit Ballen von Anfang an (250 g, τ ≈ 1,1 h) ist er nach einer
  Stunde auf 20 °C, und `calc()` liefert exakt die analytischen 0,410 %. Wer den
  Fall also mit `ballAfter 0` oder als eine Phase 8/20 nachrechnet, bekommt 0,410
  und hat nichts kaputtgemacht.

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
Skalierung m^(2/3) ist begründet. Damit wäre das Herzstück der App auf die echte
Küche geeicht statt auf eine Schätzung — das bringt mehr als jede weitere
Quellenrunde. Messprotokoll, so knapp wie es geht:

- **Kein echter Teig nötig, aber Teig-Ersatz.** Mehl und Wasser bei 62 % grob
  verrühren, ohne Hefe, Salz und Kneten. Dichte, Wärmekapazität und Leitfähigkeit
  stimmen damit; Gluten und Gärung spielen fürs Abkühlen keine Rolle. **Wasser als
  Ersatz taugt nicht**: c ≈ 4,2 gegen 2,8 kJ/kg·K, dazu wälzt es innen um. Zwei
  Fehler in Gegenrichtung, Summe unbekannt — schlechter als nicht messen.
- **Eine einzige Ablesung genügt.** τ ist die Zeit, bis der Abstand zur
  Kühlschranktemperatur auf 37 % gefallen ist. Von 23 °C aus heißt die Marke
  11,0 °C bei 4 °C Kühlschrank, 11,6 bei 5, 12,3 bei 6, 12,9 bei 7. Uhrzeit
  notieren, fertig.
- **Vorhersage des Modells** (Kunststoffbox geschlossen, Faktor 1,0): 250 g nach
  64 min, 280 g nach 69 min, 1680 g nach 229 min. Der Ballen allein bringt 80 % —
  eine Stunde, ein Thermometer. Der große Klumpen prüft zusätzlich den Exponenten
  m^(2/3) und dauert vier Stunden.
- Fühler in die Mitte, und dieselbe Box mit demselben Deckel wie beim Backen — der
  Behälter steckt als eigener Faktor in `tauH`.

Rückwärtsplanung kann in der Vergangenheit landen (48-h-Plan für morgen Abend).
`messages()` warnt dann rot und nennt den frühesten möglichen Backzeitpunkt;
die Vorteigzeit zählt mit. Läuft der Teig schon (`S.run`), ist ein Start in der
Vergangenheit der Normalfall und die Warnung entfällt.

**Zustand:** ein Objekt `S`, ein `render()`, `persist()` nur nach localStorage.
`sanitize(S)` läuft bei jedem Eingangsweg (Link, localStorage, Sicherung, Rezept,
Vorlage) und prüft `S.run.plan` gleich mit. Der Plan-Hash `#p=` steht NUR im
Teilen-Link und wird beim Start entfernt: iOS-Lesezeichen speichern die URL samt
Hash. `S.run = {start, newBake, plan, id, bake0, orig?}` = eingefrorener Plan mit
echter Startzeit ("Jetzt geknetet" am Knetschritt im Ablauf). Rezept, Teilen-Link
und Vorlage tragen `run` nie mit; beim Laden eines Rezepts wird ein darin liegendes
`run` (Altbestand) verworfen.

**Zwei Tabs, eine DOM.** `VIEW = "plan" | "run"` (nicht gespeichert; beim Start
Backen, falls ein Teig läuft). Karten tragen eine Klasse: `v-plan` (Vorlage, Teig,
Vorteig, Kneten, Gärplan, Belag, Rezepte), `v-run` (Statuskarte „Läuft", Umplanen,
Fertig oder nicht, Gebacken), `v-shared` (Verlauf, Zutaten, Ablauf, Einschätzung),
`v-log` (Backprotokoll, nur im Backen-Tab), `v-norun` (Hinweis, wenn kein Teig
läuft). Sichtbarkeit rein per CSS über `body[data-view]` und `body[data-run]`.
`render()` baut die Planen-Karten immer aus `S` (`renderPlanCards`), die geteilten
Karten aus der jeweiligen Sicht: `planView(c)` hängt an `S.bake`, `runView(run)`
an `run.start`. `RUN` wird bei jedem Render gerechnet, egal welcher Tab offen ist —
Küchenmodus und Kalender im Backen-Tab hängen daran. Helfer, die früher direkt in
`S` griffen (`buildSteps`, `messages`, `mixSummary`, `waterTemp`, `knetWaerme`),
nehmen den Zustand als Parameter; sonst zeigt der Backen-Tab das Knetprogramm des
nächsten Teigs. Kalender-UIDs nutzen `run.id` (= Backzeit beim Start), damit ein
Export vor dem Kneten durch den späteren ersetzt und über Umplanen nicht
verdoppelt wird.

Übergänge: „Jetzt geknetet" friert `S` als `run.plan` ein und wechselt nach Backen;
läuft schon einer, gibt es eine Nachfrage, nie stilles Überschreiben. „Gebacken?"
(drei Bewertungen) schreibt den ganzen Plan samt echter Knetzeit, Backzeit,
verwendeter Hefe und ggf. dem ursprünglichen Plan (`orig`) ins Backprotokoll, zieht
`cal` nach, löscht `run` und wechselt nach Planen. Protokolleinträge mit Plan haben
„↺" und landen damit als Plan im Planen-Tab. „Teig verwerfen" löscht ohne Eintrag.
Ohne laufenden Teig lässt sich im Backen-Tab nachträglich bewerten (`noStart`,
nimmt den Plan aus Planen). Ein Teig gleichzeitig — mehrere wurden mit dem Nutzer
besprochen und verworfen; `run` → `runs[]` wäre in `sanitize` billig nachzurüsten.

Weicht der echte Knetzeitpunkt ab, hängt die **Anzeige am echten Start**: Ablauf,
Zeitstrahl, Küchenmodus und Kalender verschieben sich als Ganzes, das Rezept bleibt
unverändert (24 h geplant sind 24 h im Ablauf). Das ist Absicht — nur so taugt der
Eintrag im Backprotokoll noch als Rezept. Über dem Ablauf steht dann eine gelbe
Warnung mit dem neuen Fertig-Zeitpunkt und dem Verweis auf Umplanen, und die
Umplanen-Karte klappt einmal von selbst auf (`replanAufgeklappt` verhindert, dass
sie das bei jedem 30-s-Render wieder tut). `run.plan.bake` bleibt der Zieltermin;
`bakeShown` ist der verschobene. Im Planen-Tab schweigt die rote
Vergangenheits-Warnung, solange dort noch der Plan mit der Backzeit steht, die
gerade läuft (`run.bake0`). Die Entscheidung — Rezept genau einhalten und
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

**Umplanen übernehmen:** Jeder Vorschlag, der ein konkreter Plan ist, liegt als
`REPLAN = {phases, ballAfter, bake}` bereit, und ein Knopf schreibt ihn in
`run.plan` (Original beim ersten Mal nach `run.orig`). Kühlausgleich: dieselben
Phasen, nur die Kühlphase anders lang. Bisektion: die gelaufenen Phasen (`cut`,
bis jetzt) plus der Rest ab jetzt; noch nicht geballt → Ballen-Zeitpunkt bleibt,
falls er in den Rest fällt, sonst am Beginn der Warmphase (`splitAt`). Benachbarte
Phasen gleicher Temperatur werden zusammengelegt, außer an der Ballengrenze
(`mergePhases`). Die Restphasen für die Rechnung und die für den Plan sind
dieselben (`restOf`), damit Vorschlag und Plan nicht auseinanderlaufen. Invariante
nach Übernehmen: Summe der Phasen = neue Backzeit − Knetzeit, also `versatz` = 0
und die gelbe Warnung verschwindet. Nicht übernehmbar: „Gärziel schon erreicht",
„nicht aufholbar", „einfrieren".

**iPhone-Regeln:** Ein fokussiertes Feld bekommt nie `.value` zugewiesen, und
Container mit fokussiertem Input werden nicht per innerHTML neu gebaut (sonst
klappt die Tastatur bei jedem Zeichen ein). Der 30-s-Timer rendert nicht während
des Tippens. Zahlenfelder haben `inputmode="decimal"`. Sitzt in einem Kasten, der
per innerHTML neu gebaut wird, auch ein **Knopf**, reicht `focusIn(box)` nicht —
der geklickte Knopf gilt sonst als Bearbeitung und der Neuaufbau unterbleibt, die
Änderung erscheint nicht. Immer `focusIn(box) && typing()`. Das ist zweimal
passiert: beim Zurück-Knopf im Hefe-Kasten und bei "+ Phase" im Vorteig. Kalender und Sicherung
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

**Vorteig-Phasen.** `pf.phases = [{h,t}, ...]` (höchstens 4), wie der Hauptteig.
Grund: Der verbreitete Ooni-Ablauf "Biga erst bei Raumtemperatur, dann in den
Kühlschrank" war vorher nicht eintragbar — man hätte eine Mischtemperatur schätzen
müssen. Jede Phase ab der zweiten wird ein eigener Schritt im Ablauf ("Biga in den
Kühlschrank"), sonst stünde der Wechsel nirgends und die Phasen brächten nichts.
`pf.h` ist die Summe, `pf.t` die wärmste Phase (nur für die Biga-Warnung).
Alte Pläne, Rezepte und Teilen-Links mit `pf.h`/`pf.t` laufen weiter: `pfPhases()`
macht daraus eine einzelne Phase, `sanitize` schreibt sie zurück und löscht `h`/`t`.

Der Vorteig wird **weiterhin analytisch gerechnet**, ohne Abkühlkurve
(`Σ h·rGas(t)`), anders als der Hauptteig. Das ist Absicht: Poolish ist flüssig und
wälzt um, Biga steht flach und dünn, und so bleiben alle Sollwerte exakt erhalten —
einphasig rechnet das neue Format Ziffer für Ziffer wie das alte. Am ungenauesten
ist es dort, wo eine große, feste Biga kalt gestellt wird; wer das ändert, ändert
den Biga-Anker mit und muss neu kalibrieren.

**Kalibrierung.** `cal` wird **aus dem Protokoll abgeleitet**, nicht angehäuft:
`1,15^(Mittel der letzten 5 Bewertungen)`, mit young = +1, good = 0, over = −1,
begrenzt auf 0,5–2. Angehäuft war sie zu nervös — fünfmal „genau richtig" zählten
nicht gegen einen einzelnen „zu jung", der die Hefe sofort um 15 % hob, also um
etwa eine Backfensterbreite; und ein gelöschter Fehlklick liess seine Korrektur
trotzdem stehen. Abgeleitet wiegt ein Ausreisser unter fünf noch 3 %, „genau
richtig" zieht aktiv Richtung 1,0, und Löschen korrigiert mit. `CAL` ist gecacht
(`refreshCal()` in `setLog()` und im Boot), weil `calc()` `getCal()` oft ruft.
`d.cal` aus alten Sicherungen wird beim Import **ignoriert** — der Wert ergibt sich
aus dem mitimportierten Protokoll und wäre sonst doppelt gezählt.

Die Deckelung bei ±15 % (alle fünf Bewertungen einig) ist Absicht und wird als
Warnung angezeigt: `cal` soll kleine Küchenabweichungen ausgleichen, nicht ein
falsches Modell zukleistern. Wer dauerhaft am Anschlag steht, hat kein
Küchenproblem, sondern ein Exponentenproblem — und das gehört nachgerechnet, nicht
weiter verschoben. Genau dafür steht oben „erst ändern, wenn kurze Pläne überreif
und lange zu jung ausfallen".

**Nach dem Backfenster** (`now > start + c.late`) steht oben im Backen-Tab eine
Warnung „Dieser Teig ist durch" mit den drei Bewertungsknöpfen darin (`#runDone`).
Vorher zählte die App stumm weiter — 28 h, 50 h, 200 h —, der Protokolleintrag blieb
aus, und ohne Einträge kalibriert sich nichts. Die ganze Automatik hängt an diesem
einen Knopf, also wird an der Stelle gefragt, an der man hinsieht. Achtung beim
Testen: Das Fenster endet nicht bei der Backzeit, sondern bei `c.late` (113 % der
Zielgärleistung, höchstens fertig + 14 h) — ein Teig, der 28 h läuft, kann bei einem
27-h-Plan noch drin sein.

Das Datum eines Protokolleintrags kommt aus `run.start`, dem echten Knetstart, nicht
aus dem Klickzeitpunkt. Daran hängt die ganze App, und dort hat die Arbeit begonnen;
das Bewerten kann Tage später passieren.

Protokolleinträge haben ein Feld `note` (Freitext, max. 300 Zeichen): beim Bewerten
über `#bakedNote`, nachträglich über „✎" am Eintrag per `prompt()`. `prompt()` statt
eines Inline-Feldes, weil `renderLog()` die Liste per innerHTML neu baut und ein
fokussiertes Feld darin gegen die iPhone-Regeln verstiesse.

**Planvorschlag („Ich habe … Stunden").** Im Planen-Tab oben in der Gärplan-Karte,
kein eigener Tab: Es ist ein Generator, der `S.phases` und `S.ballAfter` füllt, kein
Modus — ein dritter Tab hätte Teig, Hefe und Ablauf gedoppelt.

**Kein Optimum, und das ist der Punkt.** Der Reifegrad wächst monoton mit dem
Kaltanteil, weil die Reifungsspur (Q10 = 1,7) in der Kälte langsamer abfällt als die
Gasspur (Q10 = 2,3). Eine Suche nach dem Maximum liefert deshalb immer „so kalt wie
möglich, so kurz warm wie erlaubt" — also nur die untere Schranke, die wir selbst
gesetzt haben. Schlimmer: Sortiert man die Vorschläge nach Reifegrad, gewinnt
„Ballen schon im Kühlschrank" (kleine Ballen kühlen schneller aus → 1,41 statt 1,31
bei 24 h), und das ist ausgerechnet die Variante mit 44 % mehr Hefe. **Die Liste ist
darum bewusst NICHT sortiert**, die Reihenfolge ist eine Empfehlung und die Zahlen
daneben sind die Begründung. Wer hier eine Rangfolge einbaut, baut den Fehler wieder
ein.

Stattdessen kommt die Warmphase aus der Physik: `warmBrauchtH()` = Zeit, bis die
Masse nach Newton auf 2 K unter Küchentemperatur ist, plus eine Stunde, damit sie
dort auch noch gärt. Gerechnet mit dem **Ballengewicht**, weil in allen Vorschlägen
die letzte Phase eine Ballenphase ist. Der Rest der verfügbaren Zeit wird kalt.
Warnungen: unter 8 h wird die Hefemenge unhandlich und das Fenster eng, über 72 h
kaum noch Aromagewinn bei schwächerem Gluten, und wenn die Aufwärmzeit allein schon
länger ist als die verfügbare Zeit, gibt es gar keinen Vorschlag.
`#genH`/`#genT` liegen ausserhalb von `#genOut`, damit das Tippen den Neuaufbau der
Liste nicht blockiert. Übernehmen löscht `S.yOv` (galt für den alten Plan).

**Testen:** Keine Tests im Repo. Playwright ist global installiert
(`/opt/node22/lib/node_modules/playwright/index.mjs`, Chromium unter
`/opt/pw-browsers`). Modell in Node prüfen: Skript-Teile zwischen den Markern
`Gärmodell`…`Vorlagen` und `Rechnen`…`Hinweise` ausschneiden, `S`, `getCal` und
`defaults` stubben, `calc()` gegen die Sollwerte oben laufen lassen. Browser:
Seite per `file://` laden, 390 px breit; Presets nacheinander klicken (Locator
per `nth-child`, die Chips werden bei jedem Render neu gebaut), Tippen mit
`type()` zeichenweise prüfen (`fill()` sieht Fokusverlust nicht), Konsolenfehler
zu `fonts.googleapis.com` ignorieren (Proxy), Dialoge mit `page.on('dialog')`.
Zugeklappte `details` (Umplanen, Backprotokoll) liefern in `innerText()` leeren
Text und lassen sich nicht anklicken — vorher `open = true` setzen oder
`textContent()` lesen. Für Umplanen-Tests `realStart`/`newBake` per
`el.value = …; el.dispatchEvent(new Event("input",{bubbles:true}))` setzen.


## Offene Arbeit (Stand 18.09.2026)

Erledigt in dieser Runde: Speicher-Bug (`run` in Rezept, Rezept-Laden und
Teilen-Link), Zwei-Tab-Umbau Planen/Backen mit Statuskarte, „Gebacken?",
Backprotokoll mit ganzem Plan und „↺", Umplanen übernehmen, Hinweise am
Knetschritt (Fenstertest → 15 min ruhen; Stockgare über 2 h → zweimal dehnen und
falten in der ersten Stunde).

**Vorgeschlagen, noch nicht beantwortet:**
- Feld in der Statuskarte für die *gemessene* Teigtemperatur nach dem Kneten, das
  `knetWaerme()` rückwärts eicht (heute `1 + Arbeit/250`, für sein Programm 6,1 °C).
  Ein Grad Teigtemperatur daneben heißt drei Grad Knetwärme daneben, weil die
  Teigtemperatur das Mittel aus Mehl, Wasser und Küche plus Knetwärme ist. Als
  Faktor wie `cal` ablegen, gleitend gemittelt. Erst damit stimmt das angezeigte
  Schüttwasser für die Halo Core.
- „Vorteig jetzt angesetzt" als zweiter Anker (`run.stage`): heute ist der
  Poolish-Reifeschritt im Küchenmodus nie erreichbar, weil der Start beim Kneten
  liegt. Nur, wenn er regelmäßig Vorteige macht.
- Erinnerungen ohne Kalender gehen nicht: Web Push braucht auf dem iOS-Home-
  Bildschirm einen Push-Server. Der Kalender bleibt der Weg.

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
