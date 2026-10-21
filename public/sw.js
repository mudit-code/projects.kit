/**
 * projects.kit Service Worker
 *
 * App Shell precaching, Stale-While-Revalidate for static assets, Network-First for navigation.
 * STRICT SECURITY RULE: Never cache authenticated or personal data responses (shared phones / student PII).
 */

const CACHE_NAME = "kit-shell-v1";
const PRECACHE_ASSETS = [
  "/?source=pwa",
  "/favicon.svg",
  "/icon-192.svg",
  "/icon-512.svg",
  "/icon-maskable-512.svg",
];

// URLs that MUST NEVER be stored in CacheStorage
const SENSITIVE_API_PATTERNS = [
  "/api/auth",
  "/api/submissions",
  "/api/forms/",
  "/api/students",
  "/api/hod",
  "/api/coordinator",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch(() => {
        // Continue even if some optional asset fails to precache
      });
    })
  );
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
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignore non-HTTP/HTTPS requests (e.g. chrome-extension)
  if (!url.protocol.startsWith("http")) return;

  // Ignore cross-origin requests
  if (url.origin !== self.location.origin) return;

  // 1. NEVER cache authenticated or personal data API responses in CacheStorage
  const isSensitiveApi = SENSITIVE_API_PATTERNS.some((pattern) =>
    url.pathname.startsWith(pattern)
  );

  if (isSensitiveApi) {
    // Network-only with graceful offline JSON fallback for API calls
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            offline: true,
            message: "You are currently offline. Local changes are saved in drafts.",
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      })
    );
    return;
  }

  // 2. Static Assets (_next/static, public images, icons): Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(svg|png|jpg|jpeg|webp|ico|css|js|woff2)$/i);

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 3. Navigation Requests (HTML pages): Network-First, fallback to cached shell
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return (
              cached ||
              caches.match("/?source=pwa") ||
              new Response("<h1>Offline</h1><p>Please check your internet connection.</p>", {
                status: 503,
                headers: { "Content-Type": "text/html" },
              })
            );
          });
        })
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
