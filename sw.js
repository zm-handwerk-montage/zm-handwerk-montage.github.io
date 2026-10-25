// ZM – lokaler Service Worker: Offline-Unterstützung für die installierbare
// Admin-App (PWA) und die Website. Kein Server, keine Netzwerk-Logik:
// statische Dateien werden gecacht, Daten liegen weiter im localStorage.
const CACHE = "zmhw-static-v2";
const PRECACHE = [
  "/",
  "/admin",
  "/logo.jpg",
  "/logo.png",
  "/logo-192.png",
  "/logo-maskable.png",
  "/manifest.json",
  "/admin-manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;
  const url = new URL(req.url);

  // Gehashte Build-Assets: unveränderlich → cache-first
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
            return res;
          })
      )
    );
    return;
  }

  // Navigationen & Rest: network-first, Offline-Fallback auf den Cache
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      })
      .catch(() =>
        caches
          .match(req)
          .then((hit) => hit || caches.match(url.pathname.startsWith("/admin") ? "/admin" : "/"))
      )
  );
});
