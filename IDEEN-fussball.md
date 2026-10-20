# Ideen für die App „FC Koeppchen“ (`fussball.html`)

Gesammelt, noch nicht gebaut. Wer etwas davon angeht, streicht es hier und trägt den Stand in
`CLAUDE.md` ein.

## Vorgemerkt (vom Nutzer, 20.10.2026)

### Mitteilungen „Spieltag komplett“ und „Tabelle aktualisiert“

Erst entscheiden, wenn die App zwei, drei Wochen im Betrieb ist und klar ist, ob sie genutzt wird
(Stand 20.10.: unter 100 Nutzer erwartet).

- **Was:** je gewählter Mannschaft eine Mitteilung, wenn alle Ergebnisse eines Spieltags der
  Klasse da sind, und wenn die FLF ihre Tabelle nachzieht (gezählte Spiele in der Tabelle ändern
  sich). Keine Tore, keine Verlegungen (die sagt der Trainer, vom Nutzer).
- **Wie:** Web Push für Home-Bildschirm-Apps (iOS ab 16.4, nur installiert, nicht in Safari).
  Der FLF-Abruf (`tools/fussball.mjs`) erkennt die Ereignisse beim Vergleich alt/neu und meldet
  sie dem Cloudflare-Worker; der Worker hält die Abonnements (anonymer Endpunkt von Apple +
  gewählte Mannschaften, in KV/D1) und verschickt. VAPID-Schlüssel nur im Worker.
  Abgemeldete Geräte (Antwort 404/410) löscht der Worker selbst.
- **Grenzen:** kommt erst mit dem nächsten Abruf (unter der Woche 22:15, 23:30, 7:00).
  U9/U11 nie (FLF veröffentlicht dort nichts). Gratis-Tarif Cloudflare reicht bei < 100 Nutzern
  weit; beim Versand auf Rechenzeit je Durchgang achten (Verschlüsselung je Mitteilung).
- **Aufwand:** etwa ein Tag, dazu einmal Einrichtung bei Cloudflare durch den Nutzer.

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
