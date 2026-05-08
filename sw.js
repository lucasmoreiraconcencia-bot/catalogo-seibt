const CACHE_NAME = 'seibt-catalogo-v5';
const ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo.png'
];

// Instalação - cacheia apenas assets estáticos (NÃO inclui index.html)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// Ativação - limpa TODOS os caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estratégia de fetch
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // index.html / navegação / raiz: SEMPRE buscar da rede (sem cache)
  if (event.request.mode === 'navigate' ||
      url.pathname === '/' ||
      url.pathname.endsWith('/') ||
      url.pathname.endsWith('/index.html') ||
      url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Imagens externas (ImgBB, Cloudinary) - network first com fallback de cache
  if (url.hostname.includes('ibb.co') || url.hostname.includes('imgbb.com') || url.hostname.includes('cloudinary.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        fetch(event.request)
          .then(response => {
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => cache.match(event.request))
      )
    );
    return;
  }

  // Demais assets (PNG, manifest, fontes, etc) - cache first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok && event.request.method === 'GET') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
      }
      return response;
    }))
  );
});
