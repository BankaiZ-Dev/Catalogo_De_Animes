// ========================================================
// SERVICE WORKER
// ========================================================

const CACHE_NAME = 'anime-catalog-v1.4';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './dados.js',
  './DOM.js',
  './script.js',
  './styles.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. INSTALAÇÃO: Cachear arquivos iniciais
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// 2. MENSAGENS: Escutar o botão "Atualizar Agora"
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting(); // Agora sim, força a atualização
  }
});

// 3. ATIVAÇÃO: Limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando e limpando antigos...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      self.clients.claim();
    })
  );
});

// 4. INTERCEPTAÇÃO (FETCH): Cache First, Network Fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request);
      })
  );
});