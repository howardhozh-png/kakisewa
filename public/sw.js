const CACHE = 'kk-v264';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  // Do NOT call clients.claim() here — it causes a mid-navigation SW takeover
  // on first PWA install which leaves iOS WebKit with a white screen.
  // The SW controls new navigations naturally after activation.
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET requests
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Skip API and auth routes — let them fall through
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // Static assets: cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Navigation: network-first, fall back to cache then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const offlinePage = await caches.match(OFFLINE_URL);
        return offlinePage ?? Response.error();
      })
    );
    return;
  }

  // Everything else: network only
});

// Badge API: receive count from the page and set it on the app icon
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SET_BADGE' && 'setAppBadge' in self) {
    const count = event.data.count ?? 0;
    if (count > 0) {
      self.setAppBadge(count).catch(() => {});
    } else {
      self.clearAppBadge?.().catch(() => {});
    }
  }
});

// Push notification received
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'KakiSewa';
  const options = {
    body: data.body ?? '',
    icon: '/pwa-icon/192',
    badge: '/pwa-icon/96',
    data: { url: data.url ?? '/home' },
    tag: data.tag ?? 'kk-notification',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification tapped — open or focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/home';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
