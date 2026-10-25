// Collect Savar service worker: shows phone notifications sent by /api/notify,
// and opens the right post when one is tapped.

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  // The payload carries both languages; use the phone's.
  const lang = (self.navigator.language || "").toLowerCase().startsWith("mn") ? "mn" : "en";
  const text = data[lang] || data.en || { title: "Collect Savar", body: "" };
  event.waitUntil(
    self.registration.showNotification(text.title, {
      body: text.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of open) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          await client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
