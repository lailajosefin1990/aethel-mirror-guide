// Aethel Mirror Service Worker — Push Notifications Only
// No caching, no fetch interception

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Aethel Mirror";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: data.data || {},
    tag: data.tag || "aethel-notification",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || "/";
  const readingId = data.reading_id;

  const targetUrl = readingId
    ? `/?tab=journey&reading=${readingId}`
    : url === "/journey"
    ? "/?tab=journey"
    : "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({ type: "PUSH_CLICK", readingId, url: targetUrl });
          return;
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});
