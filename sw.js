const CACHE_NAME = 'agenda-patrimonial-v12';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './style.css',
  './js/estado.js',
  './js/persistencia.js',
  './js/rendaFixa.js',
  './js/watchlist.js',
  './js/precos.js',
  './js/totais.js',
  './js/agenda.js',
  './js/grafico.js',
  './js/backup.js',
  './js/simulador.js',
  './js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cachear cada ficheiro individualmente: se um falhar, os outros
      // continuam a ser guardados (antes, um 404 num só ficheiro
      // abortava TODA a instalação e o SW nunca ativava).
      const resultados = await Promise.allSettled(
        ASSETS.map((asset) => cache.add(asset))
      );
      resultados.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.warn('[SW] Falhou ao cachear:', ASSETS[i], r.reason);
        } else {
          console.log('[SW] Cacheado com sucesso:', ASSETS[i]);
        }
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  // Só intercetar pedidos GET do mesmo domínio (evita interferir com
  // chamadas à API da Yahoo/proxies, que devem ir sempre à rede).
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      // Não está em cache: vai à rede e, se for um dos ASSETS,
      // guarda para a próxima vez ficar disponível offline.
      return fetch(e.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return networkResponse;
      }).catch(() => {
        // Offline e sem cache: se pediu uma página, devolve o index.html
        // como fallback para a app pelo menos abrir.
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
