# Ideen für die App „FC Koeppchen“ (`fussball.html`)

Gesammelt, noch nicht gebaut. Wer etwas davon angeht, streicht es hier und trägt den Stand in
`CLAUDE.md` ein.

## Vorgemerkt (vom Nutzer, 20.10.2026)

### Mitteilungen (Plan vom Nutzer, 21.10.2026 — Stufe 1 gebaut 21.10., Fassung c, Rest offen)

Ursprünglich vorgemerkt am 20.10. als „Spieltag komplett“ / „Tabelle aktualisiert“; am 21.10. mit dem
Nutzer ausgearbeitet. Entscheiden, wann gebaut wird, wenn der Zähler zeigt, dass die App genutzt wird
(20.10.: 24 Handys, 10 davon vom Home-Bildschirm).

**Bedienung:** Zahnrad oben in der App → Benachrichtigungszentrale: Hauptschalter (beim ersten Einschalten
fragt iOS), „Meine Mannschaften“ zum Abhaken, darunter die Arten (jede für alle abgehakten Mannschaften;
was es bei einer Mannschaft nicht gibt, fällt dort weg), unten „Test-Mitteilung senden“. Wenige, aber
wichtige Meldungen für Eltern und Spieler; nachts nichts (nach 22 Uhr → 7 Uhr).

**Was es pro Reiter gibt:**

| | Heute Spiel | Spieltag komplett | Tabelle | Uhrzeit fest | Ticker läuft | Endstand |
|---|---|---|---|---|---|---|
| U13, U15 | ✓ | ✓ (mit unserem Ergebnis) | ✓ | (selten) | – | – |
| U9, U11 | ✓ | – | – | ✓ | – | – |
| Seniors 1–3 | ✓ | – | ✓ | ✓ (Réserves) | ✓ | ✓ |
| BGL | – | ✓ | – | – | – | – |
| Roude Léiw | ✓ | – | – | – | ✓ | ✓ |
| Woche | einmal „neue Woche online“ (Spielzahl) |

- **Heute Spiel:** „Heute Spiel um 10:00 in Remich“ je Mannschaft (nicht in der Woche — wen eine andere
  Mannschaft nicht interessiert, soll nichts davon bekommen, vom Nutzer). Morgens ~7:30, für Spiele vor
  10 Uhr am Vorabend ~19 Uhr.
- **Spieltag komplett und Tabelle sind zwei Meldungen** (vom Nutzer): die FLF zieht die Tabelle oft
  erst später nach. Tabelle als „Koeppchen I jetzt 2. Platz“.
- **Uhrzeit fest:** FLF trägt erst 00:00 ein (App zeigt dann nur das Datum), die Zeit später. Am 21.10.
  ohne Uhrzeit: U9 30 von 40 kommenden Spielen, U11 27 von 36, Réserves 20 von 205.
- **Seniors: keine Tor-Meldungen** (vom Nutzer: zu viel). Stattdessen einmal „Heute tickert FuPa das
  Spiel von Seniors 2 – live in der App“, sobald wirklich getickert wird (erster Eintrag des Tickerers,
  nicht FuPas automatisches LIVE), und der Endstand (Ticker, sonst FLF). Grund auch technisch: Cloudflare
  gratis ≈ 50 Sendungen je Aufruf, jede Mitteilung geht einzeln an jedes Handy.
- **Roude Léiw wie die Seniors** (vom Nutzer, 21.10.): „Heute tickert FuPa das Länderspiel – live in der
  App“ und der Endstand. Den Ticker in der App gibt es seit 19.10. (FuPa-Slug `luxemburg-m1-…`).
- **Ticker läuft / Endstand erkennt nur der Server:** der Worker müsste an Spieltagen in den Spielfenstern
  selbst bei FuPa nachsehen (~alle 5 min).
- **Verlegungen/Absagen:** sagt der Trainer (vom Nutzer, 20.10.); höchstens wählbar und standardmäßig
  aus — die FLF war beim Pokal Rodange (8.11. → 7.11.) früher dran.

**Technik:** Web Push nur vom Home-Bildschirm, iOS ab 16.4. Abos (anonymer Apple-Endpunkt + gewählte
Mannschaften/Arten) in D1; VAPID-Schlüssel als Secret im Worker; kleine Service-Worker-Datei im Repo.
Der FLF-Abruf (`tools/fussball.mjs`) erkennt die Ereignisse beim Vergleich alt/neu. Abgemeldete Geräte
(404/410) löscht der Worker selbst. U9/U11-Ergebnisse nie.

**Testen nur für den Nutzer zuerst** (vom Nutzer): Zahnrad erscheint nur nach **5× Tippen auf das
Vereinslogo oben** (vom Nutzer, 21.10.: statt Geheimlink — die Home-Bildschirm-App hat keine
Adresszeile, Mitteilungen gehen aber nur dort; merkt sich das Handy). Service Worker wird nur dort
eingerichtet, alle anderen merken nichts. Stufe 1: Erlauben + Test-Mitteilung. Stufe 2: echte Meldungen nur für ihn, ein, zwei
Wochenenden. Stufe 3: für alle — **dabei das 5×-Tippen aufs Logo wieder ausbauen**. Aufwand Stufe 1+2 etwa ein Tag, beim Nutzer ~10 min Cloudflare.

## Vorschläge von Claude (20.10.2026, noch nicht besprochen)

- **„Dieses Wochenende“**: alle Spiele aller Koeppchen-Mannschaften von Freitag bis Sonntag auf
  einen Blick (Uhrzeit, Gegner, heim/auswärts, Platz). Für Eltern mit mehreren Kindern, für
  Zuschauer und für die Buvette. Aus den vorhandenen Daten, kein neuer Abruf.
- **Kalender-Abo „Alle Heimspiele“**: ein zusätzliches `.ics` mit jedem Spiel in Wormeldange, über
  alle Mannschaften — für Helfer, Buvette, Platzwart.
- **Formkurve in der Tabelle**: die letzten fünf Ergebnisse je Mannschaft (S/U/N), aus den
  FLF-Ergebnissen der Klasse.
- **Letztes Duell beim nächsten Spiel**: unter dem Gegner das letzte Ergebnis gegen ihn (diese oder
  letzte Saison), soweit in den Daten.
- **Torschützen der Seniors**: Saisonliste aus den FuPa-Tickern (nur, wo getickert wurde — also
  unvollständig, das müsste dabeistehen).
- **QR-Code / Aushang**: eine Seite mit QR-Code zur App für den Aushang im Clubhaus oder zum
  Weiterleiten — damit die App überhaupt bei den Eltern ankommt.
- **Anonymer Zähler**: der Worker zählt, wie oft die App am Tag geöffnet wird (nur eine Zahl, keine
  Geräte). Damit ließe sich die Frage „wird sie genutzt?“ vor den Mitteilungen beantworten.

## Wochenvorschau: Teile für den Verein (vom Nutzer zurückgestellt, 20.10.2026)

Die Wochenvorschau selbst ist gebaut („Unsere Woche“, 20.10.2026); diese Zusätze erst mal nicht:

- **Platzbelegung Am Ga**: je Tag mit Heimspielen eine Zeile „Am Ga: 10:00–18:00 belegt, 4 Spiele“
  (für Buvette, Platzwart, Schiedsrichterbetreuung).
- **„Woche teilen“**: fertiger Text für WhatsApp-Gruppen („⚽ FC Koeppchen diese Woche: Sa 10:00
  U13 1 – Hosingen (🏠 Am Ga) …“), über `navigator.share` wie „App teilen“ (nur `text`).
- **Kalender-Abo „Alle Heimspiele“** (steht auch oben bei den Vorschlägen).
- **Anonymer Zähler** (oben): Handys pro Tag und Öffnungen pro Tag (Öffnen = Start oder zurück nach
  ≥ 30 min im Hintergrund), auf Wunsch je Reiter; Speicher D1 statt KV (mehr Schreibvorgänge
  frei); Anzeige über `WORKER_URL?zahlen`, letzte 30 Tage. **Gebaut 20.10.2026** (siehe CLAUDE.md).
