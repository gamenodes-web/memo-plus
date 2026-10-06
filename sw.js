// Offline cache: the page itself is fetched fresh when online (so updates show up right away),
// everything falls back to the cache when offline.
const CACHE = "memo-plus-v4";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const key = e.request.mode === "navigate" ? "./index.html" : e.request;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(key);
    const net = fetch(e.request, {cache: "no-store"}).then(res => { if (res.ok) cache.put(key, res.clone()); return res; }).catch(() => hit);
    if (e.request.mode === "navigate"){
      // prefer the network for the page, but don't hang on a bad connection
      const timeout = new Promise(r => setTimeout(() => r(hit), 2500));
      return (await Promise.race([net, hit ? timeout : net])) || net;
    }
    return hit || net;
  }));
});
