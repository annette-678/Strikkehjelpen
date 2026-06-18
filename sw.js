const CACHE_NAME = 'garnlager-v1';
const URLS_TO_CACHE = [
  '/Strikkehjelpen/',
  '/Strikkehjelpen/index.html',
  'https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
  'https://accounts.google.com/gsi/client',
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,400..600&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;500&display=swap',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache local files immediately, external URLs best-effort
      return cache.addAll([
        '/Strikkehjelpen/',
        '/Strikkehjelpen/index.html',
      ]).then(() => {
        // Cache CDN resources best-effort (don't fail install if unavailable)
        const externalUrls = URLS_TO_CACHE.slice(2);
        return Promise.allSettled(
          externalUrls.map(url => 
            fetch(url, { mode: 'no-cors' })
              .then(response => cache.put(url, response))
              .catch(() => {})
          )
        );
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // For Google Sign-In and Firestore — always go to network
  const url = event.request.url;
  if (url.includes('firestore.googleapis.com') ||
      url.includes('securetoken.googleapis.com') ||
      url.includes('identitytoolkit') ||
      url.includes('oauth2') ||
      url.includes('accounts.google.com/o/oauth2')) {
    return; // Let browser handle auth/data requests normally
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/Strikkehjelpen/index.html');
        }
      });
    })
  );
});
