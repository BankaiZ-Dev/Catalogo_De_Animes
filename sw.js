// ========================================================
// SERVICE WORKER (SW.JS)
// ========================================================

const CACHE_NAME = 'anime-catalog-v1'; // ⚠️ Mude este número para v2, v3... para forçar atualização
const URLS_TO_CACHE = [
  './',
  './index.html',
  './script.js',
  './styles.css',
  './manifest.json',
  './icon.png'
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
  // 🛑 REMOVI O self.skipWaiting() DAQUI para respeitar o botão do usuário
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
        // Se achou no cache, retorna ele
        if (cachedResponse) {
          return cachedResponse;
        }
        // Se não, busca na rede
        return fetch(event.request);
      })
  );
});