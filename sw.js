// Service Worker do AegroPrecisão — deixa o app funcionar offline (cache do "app shell").
// Estratégia: cache-first com atualização em segundo plano (stale-while-revalidate).
const CACHE = "aegro-cache-v1";

self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  // Recursos de fora (ex.: tiles de satélite) vão direto pela rede.
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === "basic") cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    // Offline: usa cache; se for navegação e não tiver, cai no index.
    if (cached) { network; return cached; }
    const res = await network;
    if (res) return res;
    if (req.mode === "navigate") {
      const idx = await cache.match("index.html") || await cache.match("./") || await cache.match("/");
      if (idx) return idx;
    }
    return new Response("Offline", { status: 503, statusText: "Offline" });
  })());
});
