// ========================================================
// SERVICE WORKER - ARQUITETURA DE CACHE DUPLO
// ========================================================

const CACHE_STATIC_NAME = 'anime-app-v4.2';
const CACHE_IMAGE_NAME = 'anime-images-cache';

const URLS_TO_CACHE = [
  './',
  './index.html',
  './js/dados.js',
  './js/DOM.js',
  './js/api.js',
  './js/utils.js',
  './js/storage.js',
  './js/catalogo.js',
  './js/render.js',
  './js/modal.js',
  './js/script.js',
  './js/calendario.js',
  './css/styles.css',
  './manifest.json',
  './png/icon-192.png',
  './png/icon-512.png'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Instalando arquivos...');
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Botão clicado! Trocando para nova versão...');
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_STATIC_NAME && cacheName !== CACHE_IMAGE_NAME) {
            console.log(`[SW] Removendo cache obsoleto: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  const isImage = event.request.destination === 'image' || url.includes('cdn.myanimelist.net');

  if (isImage) {
    event.respondWith(
      caches.open(CACHE_IMAGE_NAME).then(async (imageCache) => {
        const cachedResponse = await imageCache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(event.request);

          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            imageCache.put(event.request, networkResponse.clone());
          }

          return networkResponse;
        } catch (error) {
          console.warn(`[SW] Imagem indisponível offline: ${url}`);
          return new Response('', { status: 408, statusText: 'Offline' });
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).catch((err) => {
        console.warn(`[SW] Falha ao requisitar recurso: ${url}`);
      });
    })
  );
});