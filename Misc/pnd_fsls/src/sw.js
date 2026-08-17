const SHELL_CACHE = "pnd-shell-v5.33.4";
const RUNTIME_CACHE = "pnd-runtime-v5.33.4";
const APP_SHELL = [
  "./",
  "./register.html",
  "./pnd_master.html",
  "./manifest.webmanifest?v=5.33.4",
  "./assets/head-init.js?v=5.33.4",
  "./assets/pwa-register.js?v=5.33.4",
  "./assets/app-loader.js?v=5.33.4",
  "./assets/app.css?v=5.33.4",
  "./assets/exam-schedule-config.js?v=5.33.4",
  "./assets/bootstrap.js?v=5.33.4",
  "./assets/tailwind.production.css?v=5.33.4",
  "./assets/pnd-icon.svg?v=5.33.4",
  "./assets/vendor/fontawesome/css/all.min.css?v=6.4.0",
  "./assets/vendor/fontawesome/webfonts/fa-solid-900.woff2",
  "./assets/vendor/fontawesome/webfonts/fa-regular-400.woff2",
  "./assets/vendor/fontawesome/webfonts/fa-brands-400.woff2",
  "./assets/vendor/sweetalert2/sweetalert2.all.min.js?v=11.26.25",
];
const TRUSTED_RUNTIME_HOSTS = new Set(["cdn.jsdelivr.net", "www.gstatic.com"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      // Kích hoạt ngay để dọn cache cũ và áp dụng chiến lược tải V5.33.4.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("pnd-") &&
                ![SHELL_CACHE, RUNTIME_CACHE].includes(key),
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  while (keys.length > maxEntries) await cache.delete(keys.shift());
}

function canCache(response) {
  return response && (response.ok || response.type === "opaque");
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request, { ignoreSearch: false });
  const network = fetch(request)
    .then(async (response) => {
      if (canCache(response)) {
        await cache.put(request, response.clone()).catch(() => {});
        trimCache(RUNTIME_CACHE, 90).catch(() => {});
      }
      return response;
    })
    .catch(() => null);
  if (cached) return cached;
  return (await network) || Response.error();
}

async function networkFirstRuntime(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (canCache(response))
      await cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (_) {
    return (
      (await cache.match(request, { ignoreSearch: false })) || Response.error()
    );
  }
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (canCache(response))
      await cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (_) {
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match("./pnd_master.html")) ||
      (await cache.match("./index.html"))
    );
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (
    url.origin === self.location.origin &&
    (request.destination === "script" || url.pathname.endsWith(".js"))
  ) {
    event.respondWith(networkFirstRuntime(request));
    return;
  }
  if (
    url.origin === self.location.origin ||
    TRUSTED_RUNTIME_HOSTS.has(url.hostname)
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
