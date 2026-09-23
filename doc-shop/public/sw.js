/**
 * DkDocShop 2.0 Service Worker (Offline Shell & Caching)
 */

const CACHE_NAME = "dkdocshop-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/src/main.js",
  "/src/styles/main.css",
  "/src/styles/components.css",
  "/src/styles/utilities.css",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only cache GET requests and non-Firebase RTDB requests
  if (event.request.method !== "GET" || event.request.url.includes("firebaseio.com")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Offline fallback
        return caches.match("/index.html");
      });
    })
  );
});
