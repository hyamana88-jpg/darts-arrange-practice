const PREFIX = 'darts-trainer-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = PREFIX + 'v12';
const ASSETS = ['./','./index.html','./styles.css','./practice-core.js','./app.js','./dartboard.js',
  './manifest.webmanifest','./darts_checkout_2_180_do_mo.json',
  './icons/apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png'];
const url = path => new URL(path, self.registration.scope).href;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(url))));
  // An update waits until existing windows close, keeping their JS and shell consistent.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if(event.request.method !== 'GET' || !event.request.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request, {ignoreSearch: true});
    if(cached) return cached;
    try { return await fetch(event.request); }
    catch(error) {
      if(event.request.mode === 'navigate') return await cache.match(url('./index.html')) || Response.error();
      // Never return HTML as a missing JSON, script, or image response.
      return Response.error();
    }
  })());
});
