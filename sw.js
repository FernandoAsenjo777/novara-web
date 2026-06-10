/* NOVARA Service Worker — caché de teselas para mapas offline DE VERDAD.
   Estrategia cache-first para los hosts de teselas: si la tesela está en caché se sirve sin red;
   si no, se baja y se guarda; sin cobertura, se sirve lo guardado. Esto hace reales la
   "Descarga de zona" y el uso sin conexión (lo que has visto o descargado funciona offline). */
const TILE_CACHE = "novara-tiles-v1";
const TILE_HOSTS = [
  "tiles.openfreemap.org",                 // base vector + fuentes + sprites
  "s3.amazonaws.com",                      // DEM terrarium (relieve, curvas, 3D)
  "tiles.maps.eox.at",                     // satélite Sentinel-2
  "www.ign.es",                            // ortofoto PNOA España
  "tile.waymarkedtrails.org"               // sendas
];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", e => {
  let url;
  try { url = new URL(e.request.url); } catch (_) { return; }
  const managed = TILE_HOSTS.some(h => url.hostname === h || url.hostname.endsWith("." + h));
  if (!managed) return;
  e.respondWith((async () => {
    const cache = await caches.open(TILE_CACHE);
    const hit = await cache.match(e.request);
    if (hit) return hit;                                  // offline-first: caché antes que red
    try {
      const resp = await fetch(e.request);
      if (resp && (resp.ok || resp.type === "opaque")) {
        cache.put(e.request, resp.clone()).catch(() => {});  // guarda para uso offline
      }
      return resp;
    } catch (err) {
      const any = await cache.match(e.request, { ignoreSearch: true });
      if (any) return any;
      throw err;
    }
  })());
});
