/* Sangre Fría: permite abrir la app instalada aunque no haya internet.
   Páginas y scripts: primero la red (siempre lo último publicado) y, sin conexión, la copia guardada.
   Imágenes y demás: primero la copia guardada. Supabase y otros dominios no pasan por aquí. */
const CACHE = 'sangre-fria-v2';
const BASE = ['/app.html', '/config.js', '/manifest.webmanifest', '/icono-192.png', '/icono-512.png', '/img/juego/app-icono.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request, url = new URL(r.url);
  if (r.method !== 'GET' || url.origin !== location.origin) return;

  const esPagina = r.mode === 'navigate' || /\.(html|js|webmanifest)$/.test(url.pathname);
  if (esPagina) {
    e.respondWith(
      // no-cache: pregunta siempre al servidor, para que el celular no se quede en una versión vieja
      fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
        if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); }
        return res;
      }).catch(async () =>
        (await caches.match(r, { ignoreSearch: true })) ||
        (r.mode === 'navigate' ? caches.match('/app.html') : Response.error())
      )
    );
    return;
  }

  e.respondWith(
    caches.match(r).then(guardada => guardada || fetch(r).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); }
      return res;
    }))
  );
});
