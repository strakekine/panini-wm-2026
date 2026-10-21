// Service Worker für fussball.html — NUR Mitteilungen (vom Nutzer, 21.10.2026, Stufe 1).
// Bewusst kein „fetch“: er lädt, speichert und verändert keine Seiten, die App holt ihre Daten wie
// bisher selbst. Wird nur eingerichtet, wenn in der App 5× aufs Logo getippt wurde, und nur für
// fussball.html (scope), die anderen Apps im Repo bleiben unberührt.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

// iOS verlangt zu jeder Push-Nachricht eine sichtbare Mitteilung, sonst entzieht es die Erlaubnis.
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { text: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titel || "FC Koeppchen", {
    body: d.text || "", tag: d.tag || undefined, data: { url: d.url || "fussball.html" },
  }));
});

// Tippen auf die Mitteilung öffnet die App (oder holt sie nach vorn).
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const ziel = new URL(e.notification.data?.url || "fussball.html", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => {
    const offen = l.find(c => c.url.includes("fussball.html"));
    return offen ? offen.focus() : self.clients.openWindow(ziel);
  }));
});
