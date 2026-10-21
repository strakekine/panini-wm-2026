# panini-wm-2026

Sieben voneinander unabhängige Dinge (Übersicht für Menschen: `README.md`) liegen in diesem Repo, alle auf `main`:

- **`panini*.html`** — Sticker-Tracker für die Panini WM 2026 (Emil, Leo, generisch).
  Reine Einzeldatei-Webapps, kein Build, kein Framework.
- **`spikeball.html`** — **Turnierplaner** (Dateiname bleibt aus Link-Gründen): Teilnehmer
  eintragen, Teams auslosen, Gruppenphase und/oder K.-o.-Runde, nur Ergebnisse eintippen.
  Sportartneutral — Sätze (1 bis 5; ungerade = Best of n, gerade kann gleich ausgehen),
  Zielpunkte pro Satz und Zwei-Punkte-Regel
  sind für Gruppen- und K.-o.-Phase getrennt einstellbar. Einzeldatei.
  Tabellenreihenfolge in Stufen, umschaltbar: Punkte, dann entweder Satzdifferenz →
  Punktdifferenz → erzielte Punkte → direkter Vergleich (Standard) oder direkter
  Vergleich gleich nach den Punkten. **Kein alphabetischer Stichentscheid**: bleibt es
  nach allen Stufen gleich, teilen sich die Teams den Platz („=" statt Platznummer) und
  die Gruppe bietet ein Entscheidungsspiel an. Das zählt nur für die Reihenfolge, nicht
  für die Tabelle, und blockiert den K.-o.-Start, solange es über den Einzug entscheidet.
  Es hat **eigene Satzregeln** (`rules.d`, voreingestellt ein Satz bis 11): ein Stichkampf
  soll kurz sein, auch wenn die Gruppe Best of 5 bis 21 spielt.
- **`pizza.html`** — Pizzateig-Rechner und Gärplaner: beliebig viele Gärphasen mit
  eigener Temperatur, frei wählbarer Ballen-Zeitpunkt, Vorteige (Poolish, Biga,
  Sauerteig), Rückwärtsplanung auf die Backzeit, Umplanen während der laufenden
  Gare, Knetprogramm für Spiralkneter, Backprotokoll mit Kalibrierung,
  Kalender-Export und Küchenmodus. Auch Einzeldatei. Details unten.
- **`brot.html`** — Brotplaner: Überblick über einen Backvorgang (Sauerteig, Roggen, Hefe),
  Anstellgut-Fütterung, laufender Teig mit echten Zeiten. Einzeldatei. Details unten.
- **`vokabeln.html`** — Französisch-Vokabeltrainer für Emil und Leo (jeder sein iPhone).
  Lektionen kommen aus eingescannten PDFs, die Claude abtippt. Einzeldatei. Details unten.
- **`pine/`** — TradingView Pine-Script-Indikatoren. Eigener Kontext, eigene Regeln:
  siehe **`pine/CLAUDE.md`**, bevor dort etwas geändert wird.
- **`fussball.html`** — „FC Koeppchen“: Tabelle, Ergebnisse und nächste Spiele der Jugend
  (U13, U15, U11, U9) und der Seniors, automatisch von der FLF (GitHub Action). Details unten.
  **Andere Vereine** liegen im eigenen Repo **`strakekine/fussball-vereine`** (19.10.2026, vom
  Nutzer: ein Repo für alle anderen Vereine; eine App je Ordner aus einer Vorlage, ein Worker für
  alle). Von dort aus wird `fussball.html` nie angefasst — und umgekehrt: Verbesserungen hier
  wandern nicht von selbst dorthin. Die Vorlage lag vorher als `vorlage-verein/` auf dem Branch
  `claude/trusting-cannon-s4bpz7`; gültig ist der Stand im neuen Repo.

Der Repo-Name passt damit nur noch zum ersten Punkt. Nicht wundern und nichts danach
sortieren: was hier liegt, steht in dieser Liste.

## Fußball (`fussball.html`) — Stand und Regeln

Nutzer: Laurent; seine Kinder spielen bei den **U13 Minimes des FC Koeppchen Wormeldange**
(Luxemburg). App-Name „FC Koeppchen“, Logo vom Nutzer (eingebettet als PNG, 180 px, 32 Farben).
**Vereinsfarben**: weiss, schwarz, ein bisschen Grün (Türkis aus dem Logo) — vom Nutzer so
gewünscht, darum hell und nicht dunkel wie die anderen Apps. Zeigt ohne Suchen: nächste Spiele,
Tabelle, eigene Ergebnisse, alle Spiele der Klasse, frühere Phasen aufklappbar (aufklappbare Karten mit Knopf „Anzeigen ▾“/„Zuklappen ▴“, vom Nutzer, Fassung m; Spieltag-Zeilen darin grün und fett mit Linie, `.tag`, Fassung n). Einzeldatei,
iPhone-Regeln der Pizza-App.

**Mannschaften** (vom Nutzer, 18.10.2026): Reiter in dieser Reihenfolge **Seniors 1, U13 1, U13 2,
U15, U11 1, U11 2, U9 1, U9 2, Seniors 2, Seniors 3** (Seniors 2/3 = Réserves I/II). Beim allerersten Öffnen steht die App auf „Unsere Woche“, danach auf dem zuletzt gewählten Reiter (vom Nutzer, 20.10.2026, Fassung l; vorher U13 1). Beschriftung arabisch
(„U13 1“, nicht „Mannschaft I“). Reihenfolge und Auswahl stehen in `AGES` in
`tools/fussball.mjs` (ageCategoryId: U13 4, U15 11, U11 7, U9 5, Seniors 1). Réserves sind bei der FLF eine
eigene Kategorie (9999, „Seniors (R)“). Bewusst nicht dabei: U7 (zwei Bambini-Teams gemeldet, aber noch kein Spiel — bei
keinem Verein; letzte Saison ab Mitte Dezember), Mädchen/Dames (spielen als ENT
Wormeldange/Munsbach/Hostert). Weitere Mannschaften: Eintrag in `AGES`, sonst nichts.
**U9 und U11: die FLF veröffentlicht weder Ergebnisse noch Tabelle** (`showResult`/`showRanking`
false). Die App zeigt dort nur Termine und blendet Ergebnisse auch dann aus, wenn die
Schnittstelle eins liefern sollte. Freundschaftsspiele (FM) liegen landesweit in einer Klasse
„Amicaux 1/2“ — davon nur die eigenen, keine fremden abrufen. „Nächste Spiele“ zeigt höchstens
fünf (Seniors hätten sonst die halbe Saison dort).
**BGL League und Roude Léiw** (vom Nutzer, 19.10.2026; „BGL League“ vom Nutzer — die FLF schreibt
„BGL Ligue“, unter diesem Namen wird die Klasse gesucht). **Reiter: „BGL“ und das FLF-Logo**
(`FLF_LOGO`, vom Nutzer als Bild, 55×72; Knöpfe in alter Größe, längere Texte passten nicht).
Bei den BGL-Spielen steht das Stadion (`ort`). Beide Reiter schwarz wie alle (grün ausprobiert, vom Nutzer verworfen: „sieht nicht gut aus“). **Roude Léiw** hat den
„Heute Spieltag“-Kasten (`heuteHtml`, gemeinsam mit den Mannschaften; Stadion per Einzelabruf
`matches/<slug>` für die nächsten drei Spiele, die Liste hat keins) und einen **Liveticker** (vom
Nutzer, 19.10.2026): FuPa tickert die Länderspiele (z. B. Yann Ferreira). `natiSpiel` bringt den
FuPa-`slug` mit, `natiLiveSpiel` (Fenster wie Seniors 1), `liveBasis` baut das Gerüst mit Slug, die
App fragt den Worker direkt — **kein GitHub-Lauf, keine live.json**; ohne Worker kein Ticker, das
Ergebnis kommt dann mit dem nächsten Abruf. Der Worker lässt dafür Slugs mit `luxemburg-m1` durch
(**neu einfügen nötig**). `liveHtml` ist gemeinsam; fett steht die eigene Seite (`wir`), vorher war
bei den Seniors immer die Heimmannschaft fett — falsch bei Auswärtsspielen. zwei Reiter hinter den Mannschaften
(`extraReiter`, `id` „bgl“/„nati“ als Text), ohne Kalender, Ticker, Spieltag-Kasten. **BGL**:
Spiele aus der FLF (`bglHolen`, Klasse per Name, Nummer wechselt je Saison), zuletzt gespielter
Spieltag (`bglSicht`, auch angefangen) und die **zwei** nächsten (vom Nutzer). **Tabelle von FuPa**
(`standings?competition=nationaldivision`, ohne Saison = aktuelle; vom Nutzer: das Original statt
selbst gerechnet), weil die FLF-Tabelle hinterherhinkt (19.10.: nach 8 Spielen, gespielt 10). FuPa
führt Punktabzüge samt Begründung (`text`, Swift Hesperange −12, wird angezeigt). FuPa schreibt
deutsch („Differdingen“) — `fupaTabelleMitFlfNamen` gibt jeder Zeile den FLF-Namen der Mannschaft
mit denselben Zahlen (Sp/S/U/N/Tore) aus den FLF-Ergebnissen, am 19.10. alle 16 eindeutig. Jede Zuordnung
wird **gemerkt** (`bgl.namen`, FuPa-`teamId` → FLF-Name, in data/fussball.json): am Saisonanfang
haben viele dieselben Zahlen, dann gilt das Gedächtnis (vom Nutzer). **Absicherungen** (vom Nutzer):
gemerkt wird nie überschrieben (Umbenennung von Hand in `bgl.namen`), neu zugeordnet nur bei
eindeutigen Zahlen auf beiden Seiten und ab 3 Spielen, kein FLF-Name zweimal — schlimmstenfalls
steht ein deutscher Name da, nie ein falscher. Gegenprobe gemacht. **Zieht die FLF mit ihrer Tabelle
irgendwann zeitnah nach, zurück auf die FLF-Tabelle umstellen** (vom Nutzer) — dann entfällt das. FuPa weg
→ FLF-Tabelle; hinkt die, rechnet `bglTabelle` in der App selbst (letzter Rückfall, mit Hinweis).
**Roude Léiw** von FuPa (`natiHolen`,
`luxemburg-m1-<Jahr>` für Vorjahr/Jahr/Folgejahr, `flavor` past+current); Tabelle über
`GET api.fupa.net/v1/standings?competition=<slug>&group=<round.slug>` (ohne Saison = aktuelle).
`natiGruppe` nimmt die Gruppe des nächsten Pflichtspiels (Gruppenrunde/Liga, kein Testspiel
= Kategorie 6, kein K.-o.), sonst des letzten — **Wechsel Nations League → Qualifikation von
selbst, aber noch nie echt gesehen**: beim ersten Qualifikationsspiel nachsehen, ob FuPa die
Gruppe genauso führt. Ergebnisse: die letzten acht. Fällt einer der Abrufe aus, bleibt der
alte Stand (der FLF-Abruf der Mannschaften läuft trotzdem durch).
**Heute-Spieltag-Kasten** (vom Nutzer, 18.10.2026): an jedem Reiter oben „Heute Spieltag! ⚽ Anstoß HH:MM“
mit Gegner und Ort (`spieltagHeute`, Tag in Luxemburger Zeit), ab Anstoß „Spiel läuft“; weg, sobald
die FLF ein Ergebnis hat oder 3 h nach Anstoß. Steht der LIVE-Kasten da, entfällt er. Der LIVE-Kasten kommt erst mit Stand, Tickerer oder Tor — FuPa setzt ab Anpfiff von selbst „LIVE“, auch ohne Tickerer (19.10., Fassung s). Ohne Tickerer heißt es ab Anpfiff „erscheint hier, falls bei FuPa jemand tickert“, ab 15 min danach „Bisher tickert niemand … Ergebnis kommt, sobald die FLF es einträgt“ (vom Nutzer, Fassung t). Stadion überall mit 📍 davor, nur bei kommenden Spielen (vom Nutzer, 20.10., Fassung a/b). BGL-Reiter bewusst anders als die Mannschaften: Tabelle, zuletzt gespielter Spieltag, nächste Spieltage (vom Nutzer, 20.10.: einheitlich ausprobiert, Tabelle zuerst ist besser). Datum im Spieltag-Kopf größer (`.tagdatum`, 15 px). **Ideen und Vorgemerktes stehen in `IDEEN-fussball.md`** (Mitteilungen „Spieltag komplett“/„Tabelle aktualisiert“ u. a.). Forfait mit Termin in der Zukunft (Larochette gegen Koeppchen II, 5.12. und 3.5., von der FLF schon gewertet) heißt „Forfait, im Voraus gewertet“ und bleibt oben in den Ergebnissen (vom Nutzer, Fassung d). **Unsere Woche** (vom Nutzer, 20.10.2026, Fassung f): breiter Knopf über allen Reitern
(`.seg button.woche`, `grid-column:1/-1`, Vereinslogo links/rechts) mit „· n Spiele“, „· heute n Spiele“
oder „· 🔴 n Spiele gerade LIVE“. Reiter `"woche"`: alle Spiele aller Koeppchen-Reiter Mo–So
(`wocheTage`, ab So 22 Uhr die nächste Woche), je Spiel einmal (`wocheSpiele`, Pokal ohne I/II heißt
„U13“), nach Tagen; Zeile = `spielZeile` mit Schild der Mannschaft (`.pill.wteam`, 14 px, vom Nutzer: größer, Fassung k), 🏠/✈️, Uhrzeit oder „läuft“/
„🔴 LIVE · Minute“ (rot), 📍 Stadion bis die FLF ein Ergebnis hat; Tippen öffnet den Reiter
(`data-gehe`). Kopf: Zeitraum, „n Spiele, davon m zu Hause“, nach dem Wochenende die Bilanz
(`wocheBilanz`). „gleichzeitig mit …“ bei < 90 min Abstand und anderem Platz. Live: `liveKandidaten`/
`holenWorkerAlle` fragen den Worker alle 20 s für jedes Spiel im Live-Fenster (Seniors 1–3), egal
welcher Reiter offen ist; `WS` = Stand je FLF-Spiel. Bei vertauschtem FuPa-Spiel dreht die Woche die
**Zahlen** (FLF-Namen bleiben), der Live-Kasten im Reiter noch die **Namen** — vom Nutzer entschieden:
auch der Kasten bekommt die FLF-Reihenfolge, **aber erst nach dem Blick am Fr 23.10.** (67 von 68
FuPa-Spielen der Saison haben dieselbe Reihenfolge wie die FLF, nur Beggen–Koeppchen II nicht).
Vereins-Zusätze (Platzbelegung, Woche teilen, Heimspiel-Kalender) zurückgestellt → `IDEEN-fussball.md`.
Reiter-Raster: Handy 4 je Reihe, ab 600 px 6 je Reihe (12 Knöpfe = 2 volle Reihen).
**Anonymer Zähler** (vom Nutzer, 20.10.2026): App meldet `WORKER_URL?zaehle=1&neu=0|1&reiter=…` nach
dem ersten Laden und nach ≥ 30 min im Hintergrund; `neu` merkt sich nur das Handy
(`fussball_v1_gezaehlt` = Tag). Worker schreibt in **D1** (Binding `DB`, Tabellen `tage`, `reiter`, legt
sie selbst an), ohne Binding still 204. Ansehen: `WORKER_URL?zahlen` (30 Tage; seit 21.10. auch je Tag aufklappbar mit Uhrzeit, angesehenen Reitern und Reitern beim Öffnen, vom Nutzer — Worker neu einfügen nötig). **Neue Nutzer** (vom Nutzer, 21.10., Fassung 21.10. a): beim allerersten Öffnen `erst=1` (`fussball_v1_erst`), Tabelle `erste` je App/Browser, Spalte „Neu“. Wer schon Daten der App hat (`fussball_v1`, `_data`, `_gezaehlt`), wird still als „vorher“ markiert und zählt nicht. Safari → Home-Bildschirm zählt dort noch einmal neu (getrennte Speicher). **Eingerichtet vom Nutzer am 20.10.2026** (D1 `koeppchen-zahlen`, Binding `DB`, Code neu
eingefügt, damit auch 22:15 Ortszeit); geprüft: zaehle 204, zahlen 200, fremder Slug 400. Ein Testaufruf von
Claude zählt am 20.10. als eine Öffnung. **Seit Fassung h** (vom Nutzer): `art=app|web` (Home-Bildschirm/Browser, je Handys / Öffnungen; Safari und Home-Bildschirm haben getrennte Speicher, wer beides nutzt, zählt doppelt) und die Stunde in Ortszeit (`stundeLux`, nimmt der Worker selbst), Tabellen `arten`, `stunden`. **Seit Fassung i** (vom Nutzer): `?angesehen=1&reiter=…` bei jedem Umschalten auf einen anderen Reiter (Knopf oder Tippen in der Woche, derselbe zweimal hintereinander zählt einmal), Tabelle `angesehen`; der Reiter beim Öffnen zählt dort mit. Zählt nicht als Öffnung; hin und zurück (Seniors 1 → U9 1 → Seniors 1) zählt zweimal, so gewollt (vom Nutzer: „passt so“). **Worker eingefügt vom Nutzer am 20.10., geprüft.** **Fassung j:** am Computer zählte jedes Öffnen doppelt (vom Nutzer gemeldet; im Testbrowser nur einmal — vermutlich Vorladen von Chrome/Edge beim Tippen der Adresse). Darum: bei `document.prerendering` erst beim Anzeigen zählen, nur sichtbar, und höchstens eine Öffnung je Minute (`fussball_v1_zuletztGezaehlt`). Vom Nutzer am Computer bestätigt: zählt jetzt einfach. Test mit nachgebautem D1, Gegenprobe gemacht.
Fußzeile nennt die Abrufzeiten genau (vom Nutzer): täglich 7:00 und 23:30, Mo–Fr 22:15, Sa/So 8–22
alle 15 min. Dafür rechnet der Worker den Wochentags-Abend seit 20.10. in Ortszeit (vorher 20:15 UTC).
**Karten-Link am 📍: geprüft und vom Nutzer verworfen** (20.10., „nur ein Gimmick“): FLF-`sportField` hat nur `id` und `name`; FuPa-`venue` hat lat/long und Adresse, aber nur Seniors/Nati und falsch, wenn FuPa das Spiel falsch führt. **Countdown** (vom Nutzer, 19.10.2026, alle
Reiter): 15 min vor Anpfiff wird daraus „Gleich geht's los! ⚽ · Anpfiff in n Minuten“
(`minutenBisAnpfiff`, aufgerundet, nicht bei Uhrzeit 00:00); ein 10-s-Takt führt die Minuten nach
und baut zum Beginn des Countdowns und beim Anpfiff neu (`UMSCHALT`). Bei Reitern mit Ticker steht
vorher „Liveticker, wenn verfügbar — sobald bei FuPa jemand tickert.“ (nicht mehr „startet mit dem
Anpfiff“: bei den Reserven tickert nicht immer jemand).

**Quelle:** Hinter https://extranet.flf.lu/match steckt `https://extranet.flf.lu/api/graphql`
(Angular-App), antwortet **ohne Anmeldung**, schickt aber **keine CORS-Freigabe** — der Browser
kann sie nicht direkt fragen. Darum: `tools/fussball.mjs` (Node, keine Abhängigkeiten) holt die
Daten. **Takt (Plan B, vom Nutzer 19.10.2026):** Der Cloudflare-Worker (`scheduled`, Cron
`*/15 * * * *`, `abrufFaellig()`) stößt `fussball.yml` per `workflow_dispatch` an — Sa/So 8–22 Uhr
Luxemburger Zeit jede Viertelstunde, Mo–Fr 22:15 Ortszeit (bis 20.10. 20:15 UTC), **jeden Tag 23:30** (vom Nutzer: Länderspiele
um 20:45 sind sonst erst am nächsten Morgen drin). **Und jeden Tag 7:00** (vom Nutzer, 20.10.: die FLF trug Seniors 2 vom 19.10. erst nach dem 23:30-Lauf ein; geholt hat es dann GitHubs Reserve um 00:56 statt 00:37). **Eingefügt vom Nutzer am 20.10., geprüft: Anstoß 7:00:23, Lauf grün.** GitHubs eigener Zeitplan bleibt als Reserve:
Sa/So stündlich (:17 UTC 6–20), Mo–Fr 19:17 UTC, täglich 22:37 UTC. Doppelte Läufe schaden nicht (`concurrency`,
Commit nur bei Änderung). Abwechseln GitHub/Cloudflare im Viertelstundentakt hat der Nutzer
vorgeschlagen, abgeraten: GitHub kommt ~20 min zu spät oder gar nicht, das gäbe Lücken.
Der Worker braucht das Secret `GITHUB_TOKEN` (Fine-grained, nur dieses Repo, Actions: Read and
write). **Eingerichtet vom Nutzer am 19.10.2026: Token ohne Ablaufdatum („No expiration“), Secret
unter „Runtime variables and secrets“, Cron Trigger „every 15 minutes“, neuer Code eingefügt**
(Länderspiel-Slug geprüft: 200). Wird das Token je gelöscht oder widerrufen, meldet der Worker
401 im Log und nur die Reserve läuft; dann neues Token anlegen und im Worker ersetzen. Ein „Neu laden“, das die Action startet, ginge nur mit einem GitHub-Schlüssel in der
öffentlichen Datei — abgelehnt; live ginge nur über einen eigenen Vermittler (Cloudflare Worker),
dem Nutzer als zu viel Aufwand vorgeschlagen. Einen „Neu laden“-Knopf gibt es darum nicht mehr
(hätte nur die Datei neu gelesen; das passiert beim Öffnen und bei `visibilitychange` ohnehin).
Die Action committet `data/fussball.json` nur bei inhaltlicher Änderung. Die App liest von
`raw.githubusercontent.com` (CORS `*`, 5 min Cache, wartet nicht auf GitHub Pages), Rückfall
`data/fussball.json` relativ, letzter Stand in localStorage (`fussball_v1_data`) für offline.
Achtung beim lokalen Arbeiten: Die Action committet auf `main` — vor dem Push `git pull --rebase`.
Unten in der App steht „Gemacht von Laurent R.“ mit dem Vereinslogo (vom Nutzer so gewünscht,
kein Fußball-Emoji). Darüber „App teilen“ (vom Nutzer): `navigator.share` mit seinem
Einladungstext (`TEILEN_TEXT`, Link darin). **Nur `text`, kein `url`** — mit `url` ließ iMessage
den Text weg (am iPhone gemeldet), WhatsApp nicht. Ohne Teilen-Leiste in die Zwischenablage.
**Fassung:** `FASSUNG` steht ganz unten — bei jeder Änderung an `fussball.html` hochzählen; am
iPhone läuft nach einem Push oft noch die alte Datei (Zwischenspeicher), erst Fassung prüfen lassen.

**Liveticker auch für Seniors 2 und 3** (vom Nutzer, 19.10.2026, Fassung q). FuPa tickert die Réserves
regelmäßig (2026-27: Seniors 2 4 von 6 Pflichtspielen, Seniors 3 alle 8; wechselnde Tickerer, oft
der Gegner). FuPa-Teams `fc-koeppchen-mr1-<Saison>` = Réserves I, `mr2` = Réserves II. **Worker
unverändert** (sucht per `?anstoss=` nur Seniors 1): Der FLF-Abruf holt die FuPa-Slugs vorab
(`reserveHolen`/`reserveSlugs`, Spiele gestern bis +3 Wochen, über `passendesSpiel`) nach
`D.fupa` (FLF-Spiel-ID → Slug); die App fragt den Worker damit direkt (`liveSpiel(v, now, fupa)`).
Ohne Slug (FuPa führt das Spiel noch nicht) kein Ticker. Kein GitHub-Lauf, keine live.json für die
Reserven. **Heim/Gast**: FuPa führte Beggen–Koeppchen II (23.10.) andersherum als die FLF (FLF
stimmt, Stadion in Beggen) — der Kasten nimmt dann FuPas Reihenfolge, sonst stünde der Stand
verkehrt (Slug beginnt mit der Heimmannschaft). Im Browser mit nachgebautem Worker geprüft.

**Live-Ticker Seniors 1 (gebaut 18.10.2026, vom Nutzer gewünscht).** Test am 18.10. gegen Beggen:
**die FLF trägt während des Spiels nichts ein** (alle Felder leer), **FuPa liefert live** Stand,
Minute, Halbzeit und Torschützen, sobald jemand am Platz tickert (bei Koeppchen: Paul Krier).
`tools/fussball-live.mjs --wache` + `.github/workflows/fussball-live.yml`: **startet nur 4× am
Tag** (11:23, 14:23, 17:23, 19:23 Winterzeit; der letzte für Abendspiele bis ~22:40). Liegt in den nächsten 170 min ein Anstoß des Reiters
„Seniors 1“ (aus `data/fussball.json`), bleibt der Lauf an, wartet bis 15 min vorher, fragt dann
alle 2 min und committet selbst, bis 180 min nach Anstoß (oder Abpfiff + 2 Abfragen). 170 + 180
min < 6 h Laufzeitgrenze. 180 statt 150, weil Pokal mit Verlängerung und Elfmeterschießen 155–165
min ab Anpfiff dauert (vom Nutzer gefragt); ein Start steigt auch in ein laufendes Spiel ein.
`liveZeit` kennt Verlängerung/Elfmeter nur über Wortteile im FuPa-`period` (gesehen bisher nur
started/halftime/secondHalf) — beim ersten echten Pokalspiel mit Verlängerung nachsehen. Statt 288 Läufen alle 5 min — vom Nutzer so gewollt; ein Zeitplan, der
sich selbst umstellt, geht nicht (GITHUB_TOKEN darf keine Workflow-Dateien ändern). Anstöße der
Seniors 2025–27: 14:00 bis 20:00, meist So 16:00; ein Anstoß vor 11:30 oder nach ~22:40 fiele
durch. Ohne `--wache` fragt das Skript einmal ab (für Hand-Tests). **Push in jedem Takt**
(`sync()`): Am 18.10. ging der Abpfiff verloren — Rebase ohne Git-Namen scheiterte (Name hing nur
per `-c` am Commit), danach hielt der Lauf die lokale Datei für gespeichert. Jetzt `git config`
einmal, und jeder Takt schiebt nach, was noch nicht oben ist. Sonst FuPa-Teamslug aus https://www.fupa.net/club/fc-koeppchen
(`fc-koeppchen-m1-<2026-27>`), Spiel per gleichem Anstoß aus `window.REDUX_DATA` von
`/team/<slug>/matches` (Slug wird in `live.json` gemerkt), dann
`GET https://api.fupa.net/v1/matches/<slug>` (ohne Anmeldung, keine CORS-Freigabe): `homeGoal`,
`awayGoal`, `section` PRE/LIVE/POST, `live.{minute, period started|halftime|secondHalf, running,
lastTimestamp}`, `highlights[type=goal]` mit `primaryRole` und `team.teamSlug`. Geschrieben wird
`data/live.json` **nur bei inhaltlicher Änderung** (`gleich()` ignoriert `minute`/`minuteAt`) —
die App zählt die Minute selbst weiter (`liveZeit`, gedeckelt „45+“/„90+“), sonst gäbe es einen
Commit je 5 min. App: LIVE-Kasten oben im Reiter (`liveAnzeige`), nur bei LIVE/POST, weg sobald
die FLF ein Ergebnis hat oder 4 h nach Anstoß; holt `live.json` jede Minute, solange ein Spiel
im Fenster ist, und baut dann nur die Minute neu (`#liveZeit`), damit Aufgeklapptes offen bleibt.
Grenzen, dem Nutzer gesagt: leer ohne Tickerer, GitHub startet geplante Läufe oft verspätet.
**raw.githubusercontent hält Dateien bis 5 min** (`max-age=300`, am 18.10. geprüft: `?t=` hilft
**nicht**, zweiter Abruf mit anderem `t` war ein Cache-HIT) — über GitHub also 2–7 min Verzögerung.
**Schneller Weg: Cloudflare Worker** (`tools/cloudflare-worker.js`, vom Nutzer gewünscht): App
fragt `WORKER_URL?slug=<FuPa-Slug aus live.json>` alle 20 s — **oder, wenn live.json fürs laufende
Spiel noch nichts hat, `?anstoss=<FLF-Anstoß>`**: Dann sucht der Worker selbst (`GET api.fupa.net/v1/teams/
fc-koeppchen-m1-<2026-27>/matches?flavor=current`, Rückfall `past` → `passendesSpiel`, dritte
Kopie, Test prüft). **Nicht über die Webseite**: die gab dem Worker bei Cloudflare am 18.10.
„nicht gefunden“, lokal ging es. Gültige `flavor`: current, past (all/next/upcoming… → 422).
Der GitHub-Lauf sucht seitdem genauso (`fupaSpiele()`), die Webseite wird nirgends mehr gelesen; Saison aus dem Datum, ab Juli neu; nur
±36 h um jetzt; Fund 6 h gemerkt). `liveSpiel()` nimmt das Spiel aus dem FLF-Spielplan, nur für
Reiter „Seniors 1“; `liveBasis()` baut daraus ein Gerüst, `mitWorker()` füllt es (`W.fuer` =
FLF-Spiel-ID). Damit hängt der Kasten nicht mehr am pünktlichen Start des GitHub-Laufs (vom
Nutzer gefragt); der Lauf bleibt Rückfall. Der Worker fragt FuPa der Worker fragt FuPa höchstens
alle 20 s je Spiel (egal wie viele zuschauen), schickt CORS `*`, nur Koeppchen-Slugs. `mitWorker()`
legt seinen Stand über `live.json`; welches Spiel es ist, kommt weiter aus `live.json` (GitHub-
Lauf). Worker weg → GitHub-Stand. Karten im Kasten (`kartenArt`, `ereignisListe`, vom Nutzer gewünscht): FuPa führt sie in
`highlights` als `type: "card"` (gesehen: `card_red` gegen Mersch 11.10.); ob Gelb dort kommt, ist
offen. Seit Fassung h reicht der Worker `karten` mit durch — **neu einfügen nötig** (der alte gibt
nur `tore`; `mitWorker` übernimmt nur Felder, die er schickt, live.json füllt dann die Karten).
Torart im Kasten (`torArt`, vom Nutzer gewünscht) aus FuPas `subtype`; echte Namen am 18.10.
aus 11 Koeppchen-Spielen gesammelt: goal_shoot 34× (kein Zusatz), goal_headed 6× Kopfball,
penalty_foul 5× Elfmeter, goal_scrounger 3× Abstauber, goal_free_kick Freistoß, goal_own_goal
Eigentor, penalty_shootout Elfmeterschießen, goal_distance_shoot Fernschuss. Karten: nur
card_red 1× — Gelb führt FuPa in `highlights` offenbar nicht. `kuerzen()` im Worker und `liveAus()` im Lauf sind zwei Kopien
derselben Umrechnung, der Test prüft, dass sie gleich rechnen. `WORKER_URL` leer = nur GitHub. Eingerichtet vom Nutzer am 18.10.2026:
`https://koeppchen-live.rjtp6r9s9h.workers.dev/` (Cloudflare-Konto des Nutzers). Die Domain ist in der Umgebung freigegeben;
am 18.10. geprüft: liefert 2:1 POST mit drei Toren, CORS `*`, fremder Slug → 400.
Last: Seiten kommen über GitHubs CDN; GitHub begrenzt unangemeldete Abrufe je IP — viele Handys
hinter einer Adresse (Sportplatz-WLAN, Mobilfunk-NAT) könnten anstoßen, nicht geprüft; Rückfall
ist die Pages-Kopie. FuPa (`www.fupa.net`, `api.fupa.net`) ist in der Umgebung
freigegeben; `*.fupa.net` griff nicht. FuPa führt nur Seniors (m1, mr1, mr2) und Damen.

Schnittstelle, ausprobiert (Introspektion ist aus, Felder über Fehlermeldungen gefunden):
- `MatchCriteria`: `clubId, seasonId, matchTypeId (ALL|CC|CUP|FM|PLO), ageCategoryId, divisionId,
  teamId, startDate, endDate`. **`matches` ohne `startDate`/`endDate` → INTERNAL_SERVER_ERROR.**
  `rankings` braucht sie nicht.
- Verein: `clubId` 1003703 („Wormeldange FC Koeppchen“), U13 Minimes = `ageCategoryId` 4.
  Saison aus `defaultValues.currentSeasonId` — wechselt im Juli von selbst.
- **Eine Mannschaft = Altersklasse + Name, nicht die FLF-Nummer** (`ids`): Zur Phase 3 nach der
  Winterpause hat die FLF 2025-26 neue Nummern vergeben (U13 41766 → 43705, U15 41773 → 43706);
  Phase 1 → 2 blieb gleich. Ohne das gäbe es ab Februar zwei Reiter „U13 1“. `id` = erste Nummer
  (die gemerkte Auswahl bleibt gültig). Pokalteams mit gleichem Namen (U15, Réserves) fallen
  dadurch direkt in ihre Ligamannschaft.
- Teams (U13): I = 45396, II = 45397, im Pokal tritt der Verein als 45398 ohne I/II an. Mannschaften
  ohne Ligaspiel bekommen keinen Reiter, ihre Spiele erscheinen bei jedem Reiter **derselben
  Altersklasse** (`aufteilen()`, `ak`) — sonst stünde der U15-Pokal bei der U13.
- `finalHomeScore` vor `homeScore` (Endergebnis, z. B. nach Forfait). Uhrzeit 00:00 = noch nicht
  festgelegt, wird nicht angezeigt.
- Die Seite hat beim Ausprobieren einmal die Verbindung gekappt: Abfragen mit 1 s Pause, Wiederholung.

**Kalender-Abo** (vom Nutzer gewünscht; Abo statt Export, weil verschobene Spiele sonst nicht
mitwandern): Der Abruf schreibt je Reiter `kalender/<reiter>.ics` (z. B. `u13-1.ics`), die App
verlinkt `webcal://strakekine.github.io/panini-wm-2026/kalender/…` — **GitHub Pages** (liefert
`text/calendar`), nicht raw.githubusercontent. Darunter „Klappt nicht?“ mit der https-Adresse zum
Kopieren (Einstellungen → Kalender → Accounts → Andere → Kalenderabo). UID = FLF-Spiel-ID,
`DTSTAMP` fest (sonst neuer Commit bei jedem Lauf), Uhrzeit 00:00 → ganztägig, eigene Mannschaft im Titel
wie der Reiter („Koeppchen U13 1“, Pokal ohne I/II „Koeppchen U13“ — vom Nutzer, sonst waren U13 1
und U11 1 beide „Koeppchen I“), Dauer Seniors 2 h,
U9/U11 1:30, sonst 1:45. **Welche Spiele zu einem Reiter gehören, steht nur in
`tools/fussball.mjs`** (`reiter`, `mit`, `eigeneSpiele`) — App und Kalender lesen dasselbe.
**Am iPhone geprüft (18.10.2026):** Das Abo zieht Commits der Action nach (2:1 gegen Beggen kam
im Kalender an), Pages baut also auch nach Action-Commits neu.
**GitHub lässt Zeitpläne aus (18.10.2026):** Statt alle 15 min lief der FLF-Abruf nur um 14:37 und
18:09 (Ortszeit), der Live-Start um 18:23 gar nicht. Die FLF trug das 2:1 zwischen 18:10 und 19:30
ein; erst ein Handstart (`gh api -X POST …/actions/workflows/fussball.yml/dispatches -f ref=main`)
brachte es in App und Kalender. Möglich, dass es an den vielen Änderungen der Workflow-Dateien an
dem Tag lag — am nächsten Wochenende nachsehen. Dem Nutzer vorgeschlagen, noch offen: die
Live-Wache fragt nach Abpfiff eine Stunde lang alle 15 min selbst die FLF ab — überholt durch
Plan B (Worker stößt an). 18.10. abends: 20:17 → 20:39, 21:17 ausgelassen, 22:17 → 22:40. **19.10. (Mo): Plan B geprüft** — der Worker stieß pünktlich um 20:15:24 UTC an (`workflow_dispatch`, ohne Handstart, Lauf grün); GitHubs eigener Zeitplan (19:17 UTC) lief den ganzen Tag **kein einziges Mal**.

**Klasse wechselt während der Saison** (Phase 1 → 2): gesucht wird nach dem Verein, die Klassen
ergeben sich aus den Spielen. Die zuletzt begonnene Ligaklasse ist die aktuelle, die anderen
„früher“. Ist die aktuelle fertig gespielt und noch kein neues Ligaspiel da, steht oben der
Abschluss (Platz, Auf-/Abstieg) und „neue Klasse noch nicht eingetragen“.

**Auf-/Abstieg** (`REGELN`, Rundschreiben der FLF „Après la Phase 1 2026-2027“, vom Nutzer als
Bild): Kl. I 5./6. runter; II und III 1. hoch, 5./6. runter; IV 1./2. hoch, 5./6. runter; V 1.
jeder Serie und bester Zweiter hoch. Letzte Klasse (U13: VI) hängt laut FLF von den Anmeldungen
ab — dort wird **nichts markiert**, statt etwas zu behaupten. Das Rundschreiben gilt für **U13 und
U15** (für die U15 derselbe Wortlaut, vom Nutzer als Text); Seniors und U9/U11 werden nicht markiert. Regeln gelten je Saison +
Altersklasse + Phase;
für Phase 2 gibt es noch keine, ohne Regel keine Markierung. Neues Rundschreiben → neuer Eintrag.
Stand 18.10.2026: Phase 1 beendet, Koeppchen I Zweiter in Kl. IV → Kl. III; Koeppchen II
Fünfter in Kl. VI. Nächstes Spiel Pokal 1/32 am 24.10. gegen AS Hosingen.

**Testen:** `node test/fussball.mjs` — Aufbereitung aus nachgebauten Rohdaten, Regeln, Reiter,
Abschlusshinweis, 3-h-Grenze für Spiele ohne Ergebnis, Klassenwechsel. Schneidet `Logik`…
`Oberfläche` aus der HTML. Läuft auch vor jedem Abruf in der Action. Gegenprobe gemacht.
Abruf live: `NODE_USE_ENV_PROXY=1 node tools/fussball.mjs` (in der Cloud-Umgebung braucht Node
den Proxy ausdrücklich).

**Wach halten:** GitHub schaltet Zeitpläne nach 60 Tagen ohne Repo-Aktivität ab; Abrufe ohne
Commit zählen nicht (Winterpause). Darum schaltet sich die Action am Ende jedes Laufs per
`gh api -X PUT …/workflows/fussball.yml/enable` selbst wieder ein (`actions: write`), ohne
Leer-Commits. Dass das die Frist zurücksetzt, ist übernommen (keepalive-workflow), nicht über
60 Tage selbst geprüft. Fällt sie trotzdem aus: Actions-Tab → „Fussball-Daten“ → Enable.
`stand` in der JSON ist der Zeitpunkt der letzten **Änderung** (geschrieben wird nur bei
Änderung), die App sagt darum „zuletzt geändert“, nicht „abgerufen“.
Am iPhone noch nicht ausprobiert.

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
  | 48 h kalt | Preset `nap48`: 2/21 + 42/5 + 4/21, Ballen nach P1, 6 × 260 g, 63 %, ddt 22, **3 % Salz** (so steht es im Preset) | 0,186 % |
  | 72 h kalt | 2/21 + 68/5 + 4/21, Ballen nach P1 | 0,115 % |
  | Biga Vorteighefe | Preset `biga`, `pf.yPct` (18 h/17 °C, in % des Vorteigmehls) | 0,880 % |
  | Biga Reifegrad | Preset `biga`, `Rip` | 1,05 |
  | 100 % Biga + 4 h | 2/21 + 2/21, Ballen nach P1, Biga share 100, hyd 48, 18 h/17 °C, `yPctMain` | 0 |
  | Erster echter Teig | 6 × 280 g, 62 %, 3 % Salz, 5/25 + 16/6 + 6/25, Ballen nach P2, `yG` | 1,00 g |

  Die vier Napoletana-Vorlagen (`nap24a`, `nap24b`, `nap48`, `nap8`) laufen mit **3 % Salz**, die
  übrigen mit 2,8 % bzw. 2,5 %. Der Unterschied zu 2,8 % ist über `saltF` rund 1,1 % mehr Hefe:
  `nap24a` 0,247 → 0,250 %, `nap24b` 0,327 → 0,331 %, `nap8` 0,300 → 0,304 %. Die Zeilen 24 h in der
  Tabelle oben sind mit expliziten Eingaben (2,8 %) gerechnet und bleiben deshalb gültig.

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

**Die Backzeit zieht nach**, statt auf einem alten Wert stehen zu bleiben:
`frueheste(st)` = jetzt + Plandauer (Vorteig zählt mit), aufgerundet auf die halbe
Stunde — die Antwort auf „wenn ich jetzt anfange, wann ist er fertig".
`backzeitNachziehen(st)` setzt sie **nur**, wenn der Plan sonst vor jetzt beginnen
müsste; eine selbst gewählte Zeit, die noch passt, bleibt stehen. Sonst überschriebe
jeder Vorlagenklick den Termin, auf den man plant. Angewendet beim Start (nach dem
Laden, nicht davor — sonst ist `S` noch leer), beim Vorlagenklick und beim Übernehmen
eines Planvorschlags. Ausgenommen der laufende Teig: Steht im Planen-Tab noch
`run.bake0`, bleibt sie unberührt. Geprüft wird „Plan müsste vor jetzt beginnen",
nicht „Backzeit vorbei" — eine Backzeit heute Abend liegt in der Zukunft, reicht für
einen 27-h-Plan aber trotzdem nicht.

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
passiert: beim Zurück-Knopf im Hefe-Kasten und bei "+ Phase" im Vorteig. Ein Element mit
`position:fixed` hängt **ausserhalb** der `body`-Polsterung, die die Sicherheitsabstände
setzt — der Küchenmodus brauchte darum eigene `env(safe-area-inset-*)`, sonst lag sein
SCHLIESSEN-Knopf unter Statusleiste und Dynamic Island und war nicht erreichbar. Sein
Kopf ist zusätzlich `sticky`, damit der Ausgang nach der Zutatenliste nicht weg ist.
**Kein `viewport-fit=cover`** im Viewport-Meta, und das ist die wichtigste Zeile in
diesem Absatz. Das Attribut legt den Inhalt unter die Statusleiste und erzwingt überall
`env(safe-area-inset-*)`-Rechnerei — die sich im Home-Bildschirm-Modus anders verhält
als im Browser und dort nicht nachprüfbar ist. Ohne das Attribut legt iOS die Seite
selbst in den sicheren Bereich, der `sticky` Kopf dockt mit `top:0` genau unter der
Statusleiste an, und weder `body` noch Küchenmodus brauchen Insets. `theme-color`
(`#0e1116`) füllt den Streifen hinter der Statusleiste.

**Dreimal am Gerät ausprobiert und verworfen**, bevor die Ursache gefunden war: den
Inset vom `body` nach `.wrap` holen (Kopf stand sehr tief und rutschte beim Scrollen
hoch); den Kopf mit `top: env(...)` andocken lassen plus fixiertem Abdeckstreifen
(Abstand doppelt, Kopf trotzdem hinter der Uhr); und davor der Verlauf im
Kopf-Hintergrund, der sich wie ein Schatten las — der ist flach geblieben, Farbe kann
keine Sprünge verursachen. Wer hier etwas ändert: Im Browser ist jeder Inset 0, dort
sieht **jede** Variante richtig aus. Nur auf dem iPhone, und dort in beiden
Umgebungen.
Die **Sicherung** geht über `navigator.share` mit Datei, Download nur als Fallback.
Der **Kalender unterscheidet die Umgebung** (`navigator.standalone` bzw.
`display-mode: standalone`), weil beide sich verschieden verhalten — beides am Gerät
geprüft, nicht aus der Doku abgeleitet:

- **In Safari** öffnet ein Download der `.ics` sie direkt im Kalender, mit Vorschau
  und „Alle hinzufügen". Dort also Download.
- **Vom Home-Bildschirm** liefert derselbe Download nur eine **weisse Seite**. Dort
  bleibt nur `navigator.share`, also die Teilen-Leiste; der Kalender steht darin unter
  „Mehr anzeigen". Unschön, aber das Einzige, was dort funktioniert.

Der alte Kommentar „Blob-Download ist im Home-Bildschirm-Modus unzuverlässig" war
also richtig — nur galt er eben nicht für Safari, und die Umstellung auf `share` für
beide Fälle hat die Vorschau im Browser mitgenommen. **Zwei weitere Wege sind am Gerät
getestet und gescheitert, nicht noch einmal probieren:** `window.open` auf eine
`blob:`-URL ohne `download`-Attribut liefert im Home-Bildschirm-Modus ebenfalls eine
weisse Seite, und `data:` scheidet aus, weil Safari und Chrome die
Top-Level-Navigation dorthin blockieren. Wer hier etwas ändert, testet **beide**
Umgebungen auf dem iPhone — im Browser sieht jede Variante aus, als klappte sie. Küchenmodus
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

**Testen — Modell:** `node test/modell.mjs`. Prüft alle Sollwerte aus der Tabelle
oben, braucht nichts ausser Node, dauert eine Sekunde, Rückgabewert 1 bei Abweichung.
Der Test schneidet die Modellteile selbst aus `pizza.html` (Marker `Gärmodell`…
`Vorlagen`, `PRESETS`, `Rechnen`…`Hinweise`) und stubbt `S`, `getCal`, `defaults` —
er muss also nicht nachgezogen werden, wenn sich etwas anderes in der Datei ändert.
**Vor jeder Änderung am Modell laufen lassen, und danach wieder.** Schlägt er fehl,
ist entweder eine Konstante verschoben oder der Sollwert gehört mit Begründung in
diese Datei angepasst — beides gehört hierher, nicht stillschweigend in den Code.
Geprüft, dass er auch anschlägt: Tmin von −6 auf −4 reisst 6 von 10 Werten.

**Testen — Oberfläche:** Playwright ist global installiert
(`/opt/node22/lib/node_modules/playwright/index.mjs`, Chromium unter
`/opt/pw-browsers`). Browser:
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
Knetschritt (Fenstertest → 15 min ruhen; erste warme Phase über 2 h → optional
zweimal dehnen und falten in der ersten Stunde). Der Hinweis hängt an der ersten
warmen Phase, nicht an der ganzen Stockgare: früher zählte bei kalter Stockgare der
Kühlschrank mit, und er kam schon bei 2 h warm. Netzrecherche (nur Suchzusammen-
fassungen, die Foren sind vom Proxy gesperrt): Falten ersetzt vor allem das Kneten,
mit Spiralkneter oft verzichtbar, bei langer Kühlschrankgare nicht nötig; wo gefaltet
wird, in der warmen Phase davor. Die 2-h-Schwelle ist unsere eigene, keine Quelle
nennt eine.

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

## Brotplaner (`brot.html`) — Stand und Regeln

Nutzer: Laurent (Luxemburg), derselbe Hobbybäcker. Deutsch, Du-Form, Widerspruch erwünscht.
**`pizza.html` wird dafür nie angefasst** — Teile werden kopiert, nicht geteilt. Eigener
localStorage-Schlüssel `brot_planer_v1` (+ `_log`); die Pizza-App nutzt `pizza_teigplaner_v1`,
beide liegen auf derselben Herkunft.

**Zweck:** Nicht rechnen wie die Pizza-App, sondern „wo bin ich, was kommt als Nächstes".
**Kein Gärmodell.** Jeder Schritt hat eine Spanne `h:[min,max]` aus dem Rezept; die Spannen sind
der Spielraum für den Planer und das, was im Backen-Tab nachrückt. Lernen soll die App später
aus den echten Zeiten im Verlauf, nicht aus Konstanten.

**Fakten vom Nutzer:** Roggen-Anstellgut, 100 % Hydration, wöchentlich gefüttert (auf 50 g
reduzieren + 50 g Roggenvollkorn + 50 g Wasser, 2–3 h warm, dann Kühlschrank). Anstellgut =
10 % des Sauerteigmehls. Sauerteigmehl ≈ 20 % des Gesamtmehls bei Weizen (Roggenbrote mehr,
das Rezept gewinnt). Liegt die Fütterung beim **Ansetzen** (nicht heute) mehr als 7 Tage
zurück, wird vorher aufgefrischt (4–8 h); das Auffrischen zählt als Fütterung. Küche ≈ 24 °C,
Backofen Ober-/Unterhitze mit Gusseisentopf, Kneter Halo Core. Arbeit inkl. Weg: Mo/Di/Do
7–16, Mi/Fr 7–13; Schlaf 21–6 (Ausgangswert `WEEK`, einstellbar unter „Meine Woche“). Brot darf bis ~24 h vor dem Essen
fertig sein; je Rezept als Essfenster `eat:[min,max]` h nach dem Backen (Roggen frühestens 24 h).

**Datenmodell:** `S = {tpl, flour, start, eat, sel, week, starter:{fed}, run, showHidden}` unter
`brot_planer_v1`; eigene Rezepte unter `_rez`, Verlauf unter `_log` (mit Bewertung `again`,
`kids`, `gare`, `note`), Datum der letzten Sicherung unter `_exp`, letzte Änderung unter `_chg`. `run = {name, rid, flour, eat,
eatAt, steps (eingefroren, skaliert, Auffrischen entschieden, ggf. `p`), done:[ms…]}`; `done[0]` = Start.
`WEEK` im Code ist nur der Ausgangswert für `S.week`.
`h` eines Schritts ist die Zeit **bis zum nächsten Schritt**, nicht die Dauer des Handgriffs — die
steht in `hand` (Kneten: h 45 min, hand 15 min, davon 10–12 min Halo Core). Angezeigt wird beides
getrennt über `stepTiming()`; vorher las sich „Hauptteig kneten · 45 min“ wie 45 min Kneten.
Beim letzten Schritt zeigt die App die Abkühlzeit aus `eat` („Anschneiden frühestens nach …“) —
gerechnet wird immer mit `eat`, nie mit dem Rezepttext; so fällt auf, wenn beide auseinanderlaufen.
`timeline(steps, done, start, now)`: erledigte Schritte mit echter Zeit, danach aufsummierte
Mitte/Min/Max; der nächste offene Schritt wird nie in die Vergangenheit gelegt. Abläufe sind
linear (parallele Vorstufen wie Brühstück gibt es noch nicht). Die iPhone-Regeln der Pizza-App
gelten unverändert.

**Planer („Wann wird gegessen?“):** rückwärts von der Essenszeit. Das Ende („Aus dem Ofen“)
liegt im Essfenster des Rezepts, gesucht wird je halbe Stunde ein Plan per Tiefensuche über
die Dauern in Viertelstunden, Rezeptmitte zuerst (`scheduleBack`). Regeln: jeder Handgriff
(Beginn + `hand` Minuten) ausserhalb von `S.week`; Schritte mit `stay` (Ofen an: Vorheizen,
Backen) **die ganze Dauer** zu Hause; nichts vor jetzt; Auffrischen nur, wenn beim Ansetzen
nötig. Bis zu drei Vorschläge, je der beste in einer Hinsicht — wenig Handgriffe an
Arbeitstagen, am frischesten, nah an der Rezeptmitte —, alle drei Zahlen daneben, feste
Reihenfolge, **keine Gesamtwertung** (dieselbe Lehre wie beim Pizza-Planvorschlag). Fast
gleiche Pläne (Start und Ende < 1,5 h auseinander) werden zusammengelegt. Geht nichts,
nennt `nearestEat` die nächste machbare Essenszeit davor und danach. Übernehmen schreibt
`S.sel = {tpl, refresh, ds}` und `S.start`; die Dauern landen als `p` in den Schritten und
damit im eingefrorenen Lauf (`timeline` nimmt `p` statt der Mitte). `run.eatAt` meldet im
Backen-Tab, ob die Essenszeit noch hält.
**Abweichung auffangen:** Beim Start mit übernommenem Plan merkt sich der Lauf dessen Uhrzeiten
(`run.target`). Nach Start, „Erledigt“, Zurücknehmen und Uhrzeit-Korrektur setzt `absorb()` die
Dauern der offenen Schritte so, dass jeder nächste Schritt wieder auf seine geplante Uhrzeit
kommt, begrenzt auf die Rezeptspanne — gierig von vorn: der erste dehnbare Schritt gibt nach,
danach stimmen die Zeiten wieder. Anlass: Sauerteig 27 min zu früh angesetzt (20:28 statt 20:55),
und „am ehesten“ rutschte vor den Feierabend. Reicht die Spanne nicht, zeigt der Backen-Tab die
geplante Uhrzeit und wie weit sie ausserhalb liegt. Läufe ohne übernommenen Plan bleiben wie
bisher (Mitte der Spanne ab dem echten Zeitpunkt).
Mit seiner Woche ist die `stay`-Regel nie bindend (kein Termin ist kürzer als eine
Ofenstunde) — darum prüft der Test sie mit einer eigenen Woche (Termin Sa 12:00–12:30).
Geprüft, dass er anschlägt: ohne `stay`-Regel 8 Verstöße.

**Lernen:** `learned(log, rid)` = echte Dauern je Schritttitel aus den letzten fünf Broten des
Rezepts (Auffrischen über alle Rezepte, dasselbe Glas). Angezeigt im Ablauf („Bei Dir bisher“);
liegt der Schnitt bei mindestens zwei Broten ausserhalb der Spanne (`offRange`), meldet der
Planen-Tab das und verweist aufs Rezept-Bearbeiten. **Bewusst kein automatisches Nachstellen**:
die Zeiten hängen daran, dass „Erledigt“ pünktlich getippt wird, und ein vergessener Tipp
sähe aus wie eine lange Gare. Darum fragt „Erledigt“ nach, wenn es mehr als 30 min vor dem
frühesten Zeitpunkt liegt (`doneNow`), und „Andere Uhrzeit“ / „✎“ korrigieren nachträglich.

**Kalender und Küche:** aus der Pizza-App kopiert, samt Safari/Home-Bildschirm-Weiche (dort
am Gerät geprüft, hier nicht erneut). UIDs `brotplaner-<id>-<Schritt>`; der Plan bekommt
beim ersten Export `S.calId`, der Lauf übernimmt sie, damit ein Export vor dem Start durch
den späteren ersetzt wird. Ofen-Schritte stehen mit ihrer ganzen Dauer im Kalender.
Küchenmodus zeigt den nächsten Schritt, Countdown bis zum frühesten Zeitpunkt, Reifezeichen,
Zutaten und „Erledigt“; hält Wake Lock.

**Sicherung und Erinnerung:** Speicher wie bei der Pizza-App — localStorage, getrennt zwischen
Safari und Home-Bildschirm, von iOS löschbar. Einziger Weg zum Behalten und Übertragen ist die
Sicherungsdatei (SICHERN/WIEDERHERSTELLEN in der Verlauf-Karte). `setLog`/`saveRez` schreiben
`_chg`; `needBackup(chg, exp, snooze, now)` blendet oben im Planen-Tab eine Erinnerung ein, wenn
seit der letzten Sicherung etwas geändert wurde und sie älter als 14 Tage ist (oder es keine gab);
„Später“ = 3 Tage Ruhe (`_snooze`). Wiederherstellen setzt `_chg` auf das Datum der Sicherung,
sonst erinnerte die App direkt nach dem Laden. Automatischer Abgleich mit iCloud geht nicht ohne
eigenen Server — mit dem Nutzer besprochen.

**Testen:** `node test/brot.mjs` schneidet den Block zwischen den Marken `Logik` und
`Oberfläche` aus und prüft Vorlagen (10-%-Regel, Hydration), Skalierung, Auffrischen,
Zeitachse und Wochenplan in Zeitzone Europe/Luxembourg. Dieser Block fasst kein DOM an.

**Reihenfolge (abgesprochen):** 1. laufender Teig + Anstellgut + drei Vorlagen (erledigt);
2. Rezeptsammlung mit Bewertung (nochmal backen ja/vielleicht/nie wieder, Kinder, Notiz,
optional Gare), Import über festes Format aus einem Claude-Chat, Sicherung (erledigt;
`ANLEITUNG` und `importRecipe()` gehören zusammen — wer das Format ändert, ändert beide;
Gleichzeitiges — Sauerteig, Poolish, Brühstück — steht in EINEM Schritt, die Zutaten tragen
`teil`, und die 10-%-Regel prüft nur den Sauerteig-Teil; ohne `teil` und mit Hefe im Schritt
wird nicht geprüft statt falsch gewarnt. Hefe wird nicht umgerechnet, er kauft, was das Rezept will. Nur ein einzelner
Laib wird auf den Gusseisentopf übersetzt — Buns, Brötchen, Baguettes, Kastenbrote backen wie im Rezept;
die erste Fassung der Anleitung hat auch Buns in den Topf geschickt);
3. Rückwärtsplanung auf die Essenszeit mit Wochenplan (erledigt); 4. Lernen aus echten Zeiten,
Kalender, Küchenmodus (erledigt). **Am iPhone noch nicht ausprobiert** — Stand 11.10.2026.

## Vokabeltrainer (`vokabeln.html`) — Stand und Regeln

Nutzer: Emil und Leo lernen Französisch, jeder auf seinem iPhone. Der Vater schickt die
Vokabeln als eingescanntes PDF; **Claude liest sie und trägt sie als Lektion in `LEKTIONEN`
ein** — keine Texterkennung in der App. Neue Lektionen = neue Fassung der Datei.
Die iPhone-Regeln der Pizza-App gelten unverändert.

**Lektionsformat:** `{id, titel, vok:[[fr, de, hinweis?], …]}`. `|` trennt gleichwertige
Antworten (eine reicht, still), `;` trennt **Formen** eines Worts („grand; grande“, „un ami;
une amie“, angezeigt mit Komma): beide zusammen richtig, eine allein auch richtig, aber mit
gut sichtbarem Kasten „Vollständig heißt es: …“ (`check().part`) — so vom Vater gewünscht.
Ein normales Komma ist **kein** Formtrenner, sonst ginge bei „Ça va, merci“ „merci“ allein
durch. Beim Abtippen also männlich/weiblich und Einzahl/Mehrzahl mit `;` schreiben, und
Buchkürzel wie „petit, e“ ausschreiben („petit; petite“). **Formen nur, wenn die andere
Sprache ein einziges Wort dafür hat** (grand; grande → groß). Hat sie zwei (un ami / une amie →
ein Freund / eine Freundin, le voisin / la voisine), werden es zwei Einträge — vom Vater
angemerkt: „ein Freund“ gefragt, ist „un ami“ eindeutig. Der Test prüft, dass kein Eintrag
auf beiden Seiten `;` hat. `(…)` ist optional, ein Artikel
im Eintrag ist Pflicht. Der Lernstand
hängt an `lektion.id + ":" + fr` — **ids nie umbenennen**, sonst ist der Lernstand weg.
**Eingetragen (15.10.2026):** Blatt „La rentrée scolaire“ als drei Lektionen nach seinen
Abschnitten (`rentree-1` Vie au lycée 32, `rentree-2` Émotions 32, `rentree-3` Activités 14
= 78). Beispiel-Lektion ist raus. Regeln beim Abtippen, so gehandhabt:
Schrägstrich-Synonyme („arriver à l'heure / être ponctuel“) → `|`; „≠“-Paare und
„intéressant / ennuyeux“ → getrennte Einträge; Genus-Angaben (n.f./n.m.) → Hinweis, wo `l'`/`les`
es verdeckt; „qch“/„qn“-Teile optional in Klammern. Buchkürzel gelten **auch ausgeschrieben** (`KUERZEL`,
`ausgeschrieben()` in `addClean`: qn → quelqu'un, qch → quelque chose, jdn/jdm → jemanden/jemandem,
etw. → etwas, dazu qqn/qqch/qc, jmdn./jmdm./jmd./jds., je mit oder ohne Punkt) — vom Vater
gefunden: „rendre visite à quelqu'un“ war falsch. **Beim Abtippen eines neuen Blatts auf neue
Kürzel achten und sie in `KUERZEL` nachtragen**, sonst gilt nur die abgekürzte Form. Der Logik-Test
**erzwingt** das: Er sucht in allen Lektionen nach Wörtern mit Punkt oder ohne Vokal und schlägt
bei jedem fehl, das `KUERZEL` nicht kennt (`unbekannteKuerzel`, mit Gegenprobe z.B./o.Ä.). Gibt das Blatt nur eine französische
Erklärung (cours obligatoire, réviser la matière, demander la parole, échouer, se sentir à
l'aise), steht die **deutsche Übersetzung von Claude** im Eintrag und die Erklärung als Hinweis
(im Code `/* Ü */`). Die Nomen zu den Adjektiven („→ la motivation“) stehen auf dem Blatt ohne
Deutsch und sind **eigene Einträge mit Claudes Übersetzung** (`/* N */`). Beides dem Vater
gesagt, er kann es streichen lassen. Beim ersten Start sind **alle** Lektionen angehakt.

**Prüfung — vom Vater so festgelegt, nicht weicher machen:** Tippfehler sind Fehler, kein
„fast richtig“. Akzent falsch = Fehler. Steht ein Artikel da, muss er mit. Die Begründung
(„Artikel fehlt“, „Akzent“, „ein Buchstabe“) ist nur Erklärung. Vereinheitlicht wird nur, was
kein Wissen ist (`clean()`): iOS-Apostroph ’, Leerzeichen, Satzzeichen am Ende, ein
Großbuchstabe am Anfang. Kleinbuchstabe statt Großbuchstabe („katze“) ist ein Fehler.
Autokorrektur ist im Feld aus — sie würde Tippfehler stillschweigend reparieren.

**Sprechen:** Web-Speech-API (`fr-FR`/`de-DE`). Gesprochen zählt Groß/Klein nicht. Die
Erkennung liefert bis zu 5 Lesarten; passt eine, gilt es als richtig (Homophone wie
verre/vert). **Falsch gesprochen → Lösung erst nach Entscheidung** (Fassung k, vom Vater
gewünscht): Die App zeigt nur „✗ Gehört: …“ und zwei Knöpfe. „VERHÖRT? NOCHMAL SPRECHEN“ (einmal pro
Wort) schaltet das Mikrofon selbst wieder ein, ohne dass die Lösung zu sehen war; der zweite
Versuch zählt normal, ist er wieder falsch, kommt die Lösung sofort und es ist ein Fehler.
„LÖSUNG ZEIGEN“ zählt als Fehler. **„ANTWORT TIPPEN“** (Fassung l, vom Vater: „jouer d'un
instrument“ versteht das iPhone nicht) schaltet für dieses eine Wort aufs Tippen um (`Q.tipp`,
`sprichtGerade()`; `next()` setzt zurück): Tastatur auf, kein Mikrofon, streng geprüft und als
getippt gewertet (setzt `ty`). Bleibt auch nach dem zweiten Sprechversuch frei (dann ohne
Nochmal-Knopf); falsch getippt → Lösung, Fehler. Auch beim **Wiederholen in der Runde** (`again`) gibt es
Nochmal/Tippen wieder (Fassung m; `next()` leert `Q.retry`) — vorher kam dort sofort die Lösung. Bewertet wird erst bei der Entscheidung (`Q.fb.pending`) —
vorher hätte „Nochmal“ mit sichtbarer Lösung einfach Nachsprechen belohnt. Die Lösung steht
überall groß (`.fb .sol`, `.full b`, 25–27 px). **Gleicher Klang** (`klang()`, `klingtWie()`, nur Sprechen
und nur bei Antwort auf Französisch): Die Erkennung schrieb am iPhone zweimal „Arrivé en retard“
für gesprochenes „arriver en retard“. Gleich klingende stumme Endungen (`-é/-ée/-és/-er/-ez/
-ai/-ais/-ait/-aient` → „é“, Plural-`s/x` weg) zählen darum als richtig, mit gelbem Kasten
„Richtig gesprochen — geschrieben wird es: …“. Vom Vater gewählt **statt** eines Knopfs
„selbst korrigieren“ (Schlupfloch: Lösung abtippen). Bewusst eng: Wörter bis 3 Buchstaben
bleiben unberührt (le/les, de/des, ce/ces klingen verschieden), Artikel und Wortstamm müssen
stimmen. Der Logik-Test prüft, dass keine zwei Vokabeln der echten Lektionen gleich „klingen“
— nach jedem Eintragen wichtig. Rückfall ist das Mikrofon der Tastatur (Text landet im
Feld, wird aber dann wie getippt geprüft). Vorlesen ist ausdrücklich nicht gewünscht.
**Am iPhone gemeldet, 15.10.2026 — vier Anläufe, alle im Chrome unsichtbar.** Der vierte
brachte eine **Mitschrift** (`#srLog` unter dem Knopf, nur im Sprechen-Modus) und damit den
Befund vom Gerät:
```
0.0s #1 start fr-FR · 1.3s onstart · 1.3s audiostart · 4.8s speechstart · result „Visiter un musée“ · 7.0s abbrechen
0.0s #2 start fr-FR · 0.0s onstart · 0.0s audiostart · — dann nichts mehr
```
Deutung: **iOS beendet die erste Sitzung trotz `abort()` nicht.** Eine neue Erkennung meldet
sofort „an“ (keine 1,3 s Anlauf), das Gehörte geht aber weiter an die **erste** — gesammelt in
einem Text, ohne `isFinal`, ohne `onend`. Das erklärt alle früheren Fehlbilder („chat se
promener“ = die erste Sitzung sammelte weiter; zweites Wort stumm = an weggeworfene Erkennung
geliefert). **Darum jetzt: EINE Erkennung läuft die ganze Abfrage durch** (`continuous`), wird
nicht abgebrochen; Antippen merkt sich den bisherigen Text (`LISTEN.base`), Antwort ist nur das
Neue (`neuSeit()`, notfalls nach Wortzahl). Auswertung nach 1,5 s Stille (`SILENCE_MS`);
„Weiter“ bleibt ein Knopf — **kein automatisches Weiter**, vom Vater ausdrücklich so (sonst kann
man die Lösung nicht lesen). Abgeschaltet wird erst bei Ende/Abbruch der Abfrage
(`endSession()`). Der orangene Mikrofon-Punkt bleibt darum während der Abfrage an.
**Sprachwechsel geht so nicht:** eine laufende Erkennung behält ihre Sprache; bei „Gemischt“
muss bei jedem Wechsel FR/DE neu gestartet werden — genau das, was iOS offenbar nicht kann.
**Am Gerät bestätigt (Fassung e):** mehrere Wörter hintereinander gehen, Auswertung nimmt nur
das Neue. Danach beendet iOS die Sitzung einige Sekunden nach dem letzten Wort von selbst mit
`error audio-capture` + `onend`; das ist harmlos (nächstes Antippen startet eine neue, die
funktioniert) und wird seit Fassung f **nicht mehr gemeldet**, wenn gerade niemand zuhört.
**„Gemischt“ ist beim Sprechen ausgeblendet** (`fixDir()`, vom Vater gewünscht); war es
eingestellt, wird DE → FR daraus. Gilt auch beim Laden und Wiederherstellen.
**Test:** `node test/vokabeln-sprechen.mjs` mit Attrappe „ios“ (Sitzung lebt, Ergebnisse an die
erste, Text gesammelt; Variante „endet“ mit audio-capture nach dem Wort — dort darf keine
Fehlermeldung stehen) und „chrome“ (jede Erkennung für sich, `isFinal`, `onend`). Die Fassungen
1–4 scheitern in „ios“ beim zweiten Wort, genau wie am Gerät. **Attrappe immer unter beiden
Namen setzen** (`SpeechRecognition` UND `webkitSpeechRecognition`), sonst nimmt die App die
echte von Chrome, die im Testbrowser stumm bleibt — sieht aus wie ein App-Fehler, ist keiner.
Die Mikrofon-Nachfrage bei jedem App-Start macht iOS selbst (Home-Bildschirm-Apps merken sich
die Erlaubnis nicht) — nicht abstellbar; in Safari unter „aA → Website-Einstellungen →
Mikrofon“ dauerhaft erlaubbar. **Mitschrift seit Fassung g ausgeblendet** (vom Vater: für die
Jungs verwirrend); `srlog()` führt sie weiter in `SRLOG`, sichtbar wird sie wieder mit einem
`<div id="srLog">` unter `#qNote`.

**Karteikasten:** 5 Fächer 0–4, Abstände `FACH = [1,1,2,4,7]` Tage ab Tagesbeginn. Fach 4 ist
das oberste und „sicher“; spätestens jede Woche kommt jedes Wort wieder (vom Vater: Fach 5 mit
16 Tagen war zu lang, `sanitizeP` setzt Altbestand aus Fach 5 auf 4 und kürzt den Termin).
Vom Vater festgelegt: neue Wörter starten in **Fach 0**, das dieselbe Regel hat wie Fach 1 —
ein neues Wort kommt nie gleich nach 2 Tagen. Falsch → Fach 0, solange das Wort nie über
Fach 1 hinaus war; war es schon einmal in Fach 2+ (`hi`), nur nach Fach 1. Immer **morgen**
fällig, Marke `bad` (für „Meine Fehler“). Beide Richtungen zählen getrennt
(`key = id>fd|df`). „Heute fällig“ = fällig + neu (die Zahl im Startbild zählt **Wörter** in der gewählten Richtung, wie eine Runde sie bringt — vorher beide Richtungen, „118 fällig“ bei 78 Wörtern; `lessonStats(…, dir)`); gesehene zuerst, **unter ihnen das niedrigste Fach zuerst**
(vom Vater: nach einer Pause stauen sich fällige Wörter, und eine 10er-Runde soll die
wackeligen bringen, nicht Fach-4-Wörter). Innerhalb eines Fachs zufällig. Pausen bestrafen
nicht: kein Wort fällt durchs Nichtlernen zurück, nur durch falsche Antworten. In der Runde kommt ein
falsches Wort 4 Fragen später wieder, bis es sitzt, zählt dann aber nicht mehr fürs Fach.
„Alle“ fragt auch wartende Wörter; dort gilt `review()`: richtig bei einem noch nicht
fälligen Wort ändert nichts (der Abstand, den das Fach misst, war nicht da — sonst schöbe
ein Durchgang vor der Klassenarbeit die halbe Lektion ein Fach hoch), falsch zählt immer.
Den Knopf „Fehler nochmal“ direkt nach der Runde gibt es bewusst **nicht** mehr: die Wörter
waren in der Runde gerade richtig, eine Minute später prüft das nur das Kurzzeitgedächtnis.
Wer heute nochmal will, nimmt „Meine Fehler“ im Startbild (filtert `bad`, nicht nach Fälligkeit).
**FR → DE hat die kurze Leiter** (Fassung p, vom Vater: „nicht so wichtig“): richtig aus Fach 0
oder 1 → gleich Fach 3 (4 Tage), dann 4; falsch → immer Fach 1, von dort wieder direkt nach 3.
`grade(…, kurz)`, durchgereicht über `review` und `reviewAnswer` (kurz = Richtung braucht kein
Tippen, also FR → DE). DE → FR läuft die ganze Leiter 0 → 1 → 2 → 3 → 4. Altbestand in Fach 1/2
springt beim nächsten Richtig nach 3, keine Umrechnung nötig.

**„Sicher“ bei DE → FR heißt schreiben können** (`reviewAnswer()`, vom Vater festgelegt): In
Richtung DE → FR kommt ein Wort nur nach Fach 4, wenn es mindestens einmal richtig **getippt**
wurde (Marke `ty`). Wurde es schon einmal richtig getippt, darf es danach auch **gesprochen**
aufsteigen — nicht noch einmal aufs Tippen warten (Einwand des Vaters gegen die erste Idee
„Fach 4 nur durch Tippen“). Fehlt die Marke, bleibt es gesprochen in Fach 3 (in 4 Tagen
wieder) mit Hinweis „✍️ … einmal richtig tippen“. Nach einem Fehler ist `ty` weg (Claudes
Festlegung, dem Vater gesagt). Richtig getippt in „Alle“ ohne Fälligkeit setzt `ty`, ohne
Fach oder Termin zu ändern. FR → DE: Sprechen reicht.
**✍️-Wörter und Knopf „Jetzt tippen“:** Wird ein Wort gedeckelt, bekommt es die Marke `wt`
(Abstand bestanden, nur Schreibweise fehlt). Richtig getippt steigt ein `wt`-Wort **sofort** auf
Fach 4 (auch wenn es noch nicht wieder fällig ist — der Aufstieg war beim Sprechen verdient).
Der Knopf sitzt **nur im Startbild** im Fortschritt-Kasten unter „sicher“ (`#tippBox`), nicht auf
der Ergebnisseite — vom Vater: direkt nach der Runde „zu frisch“. Er nimmt aus **allen**
Lektionen (`tippKandidaten()`): DE → FR, Fach 3, ohne `ty`, und entweder `wt` oder gerade
fällig — also genau die, die durch einmal richtig Tippen jetzt aufsteigen würden. Die Runde
erzwingt Tippen (`Q.nurTippen`), auch wenn „Sprechen“ eingestellt ist. Ohne Kandidaten kein
Knopf. Getippt heißt Modus „Tippen“; im
Sprechen-Modus Eingetipptes zählt als gesprochen (Groß/klein und Klang sind dort lockerer).

**Nur lernen** (Knopf oben im Startbild): Karteikarten ohne Abfrage über die gewählten
Lektionen, Richtung aus der Einstellung (gemischt = je Wort zufällig), Lektionsreihenfolge
oder gemischt. Antippen deckt auf, nochmal antippen = nächstes Wort. Zählt nicht für die
Fächer. Am Ende „Jetzt abfragen“ mit den aktuellen Einstellungen.

**Motivation** (vom Vater gewünscht, Nr. 1 und 2 aus einem Vorschlag): oben im Startbild die
Zahl **sicher** (Fach 4, beide Richtungen einzeln) und ein **Wochenziel** Mo–So mit 5
Lerntagen; ein Lerntag = 40 erste Antworten an einem Tag, davon 20 richtig (`DAY_MIN`, siehe unten), „Nur lernen“ zählt nicht.
Bewusst **keine Prozentzahl oben** — jede neue Lektion würde sie drücken; Prozent nur je
Lektion (`pct`, abgerundet, 100 % nur bei allem sicher, dann ✓). **Je Lektion groß die eingestellte Richtung, klein darunter die andere** (Fassung q, vom Vater: wer nur DE → FR übt, soll 100 % erreichen können; die kleine Zeile zeigt, was in der anderen Richtung fehlt). `lessonStats().per.fd/.df`, `ansicht()`, `pcBox(st, dir)`; bei „Gemischt“ groß beide zusammen. Der Balken folgt der großen Zahl. Bewusst **keine Serie**
(fällt nach einem Krankheitstag auf null), keine Punkte je Antwort (mit „Alle“ austricksbar),
kein Emil-gegen-Leo (unfair, bräuchte Server), keine Blitzrunde (belohnt Tempo statt
Genauigkeit). Nach der Runde: „⭐ n Wörter jetzt sicher“ und „📅 Lerntag geschafft“, wenn
der Tag in dieser Runde voll wurde.
**Lerntag seit Fassung s:** **40** erste Antworten, **davon mindestens 20 richtig** (`DAY_MIN`,
`DAY_RIGHT`, `countDay`, Tageseintrag `{n, r, v:2}`; vom Vater: „mit 10 war's zu schnell“). Runde
jetzt wählbar 20 / **40** / Alle, Vorgabe 40 (alte Einstellung 10 → 40). Geschafft bleibt
geschafft: Tage ohne `v` behalten ihre Regel (ohne `r`: 10 Antworten; mit `r`: 10, davon 5 —
Fassung r), auch ein heute schon angefangener Tag. Startbild zeigt „Heute: n von 40 …“.
Grund für „richtig“: seit es Sterne gibt, wäre 40-mal „Weiß nicht“ ein geschenkter Lerntag.
Achtung: sind weniger als 40 Wörter fällig, reicht „Heute fällig“ allein nicht — dann mit
„Alle“ weiterüben (zählt für den Lerntag, schiebt aber keine Fächer).
**Sterne** (Fassung r, vom Vater gewünscht): Woche Mo–So mit 5 Lerntagen = 1 Stern (`sternWochen`,
nachgetragen aus `DAYS` per `sterneNachtragen`, nie entfernt — `DAYS` hält nur 60 Tage). Gespeichert
unter `_stars` = `{w:[Montage], red:[{t,n,was}]}`, in der Sicherung mit drin, „Lernstand löschen“
lässt sie stehen. Eingelöst wird in der echten Welt; „EINLÖSEN“ fragt per `prompt()` Anzahl und
wofür und schreibt den Kontoauszug. **Kein Papa-Code** — der könnte nur abziehen, schützt also vor
nichts (Einwand des Vaters). Ergebnisseite: „🌟 Wochenstern verdient!“. Offen als
zweiter Schritt: Klassenarbeit-Modus (Datum je Lektion, „Bereit: x %“).

**Fassung:** `FASSUNG` (z. B. „15.10.2026 e“) steht unten im Startbild und als erste Zeile der
Mitschrift — **bei jeder Änderung hochzählen**. Anlass: Am iPhone lief nach einem Push noch die
alte Datei aus dem Zwischenspeicher (GitHub Pages hält bis zu 10 min, die Home-Bildschirm-App
teils länger), und die Mitschrift sah aus wie ein neuer Fehler. Erst Fassung prüfen lassen,
dann deuten.

**Speicher:** `vokabeln_v1` (Einstellungen, Name), `_p` (Lernstand), `_days` (Antworten je
Tag, 60 Tage, in der Sicherung mit drin), `_exp` (letzte
Sicherung), `_dirty` (erste Antwort seit der letzten Sicherung), `_snooze` („Später“ bis).
Sicherung als Datei über `navigator.share` wie in den anderen Apps. **Erinnerung**
(`needBackup`): oben im Startbild, wenn die erste ungesicherte Antwort eine Woche alt ist —
nicht nach einer Woche ohne Sicherung, wer nicht gelernt hat, hat nichts zu verlieren.
„Später“ = 3 Tage Ruhe. Sichern und Wiederherstellen löschen `_dirty` und `_snooze`.

**Testen — vor jedem Push alle drei, jeder mit eigenem Rückgabewert** (nicht über `| tail`
verketten, das hat einmal einen roten Test verschluckt):
- `node test/vokabeln.mjs` — Logik (Antwortprüfung, Karteikasten, Rundenbau, Wochenziel),
  schneidet `Lektionen`…`Oberfläche` aus; prüft auch die echten Lektionen auf eindeutige ids
  und `;` nur auf einer Seite — nach jedem Eintragen laufen lassen.
- `node test/vokabeln-oberflaeche.mjs` — Browser: Runde, Wiederholung falscher Wörter, Fokus,
  Akzentleiste, Neuladen, Nur lernen, „Alle“ ohne Aufstieg, „sicher“, Lerntag, Erinnerung.
  **Nimmt nichts über den Inhalt an** (Lösungen über `variants()` aus der App, Runden bis zum
  echten Ende) — lose Hilfsskripte mit „12 Wörtern“ oder „max. 30 Fragen“ sind mit der ersten
  echten Lektion umgefallen. Geprüft: läuft mit 3 Wörtern wie mit 78, und ein eingebauter
  Fehler in `review()` wird gefunden. Wer etwas am Ablauf ändert, ergänzt es hier statt in
  einem Wegwerf-Skript.
- `node test/vokabeln-sprechen.mjs` — Spracherkennung mit iOS-Attrappe (siehe Sprechen).
