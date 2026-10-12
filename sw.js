/* Service worker du portfolio : fonctionne hors-ligne après la première visite.
   Pour forcer la mise à jour chez tous les visiteurs, change le numéro de VERSION. */
const VERSION = 'v2';
const CACHE = 'portfolio-' + VERSION;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './og-image.png', './cv-fr.pdf', './cv-en.pdf'];
const EXTERNAL = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('portfolio-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !EXTERNAL.includes(url.hostname)) return;   // WhatsApp, GitHub… : jamais en cache

  if (req.mode === 'navigate') {                                  // page : réseau d'abord, cache en secours
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res;
    }).catch(() => caches.match('./index.html').then(r => r || caches.match('./'))));
    return;
  }
  e.respondWith(caches.open(CACHE).then(cache => cache.match(req).then(hit => {   // reste : cache d'abord, mise à jour en arrière-plan
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  })));
});
