const CACHE_NAME = 'tradeforge-v4'

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET') return
  if (url.hostname.includes('supabase.co')) return
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
      })
    )
    return
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
  )
})

// ── Push Notifications ──────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data = {}
  try { data = event.data.json() } catch { data = { title: 'TradeForge', body: event.data.text() } }

  const title = data.title || 'TradeForge'
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'tradeforge-notif',
    data: { url: data.url || '/' },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Clic sur la notification → ouvre l'app sur la bonne page
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const origin = self.location.origin

      // 1. Client contrôlé par le SW → on peut le naviguer
      const controlled = clientList.filter(c =>
        c.url.startsWith(origin) && 'navigate' in c && 'focus' in c
      )
      controlled.sort((a, b) => (a.focused ? -1 : 1))
      if (controlled.length > 0) {
        const target = controlled[0]
        return target.navigate(url).then(() => target.focus()).catch(() => target.focus())
      }

      // 2. Client non contrôlé → on ne peut pas naviguer dessus, mieux vaut en ouvrir un neuf
      const anyClient = clientList.find(c => c.url.startsWith(origin) && 'focus' in c)
      if (anyClient) return anyClient.focus()

      // 3. Aucun client → ouvre une nouvelle fenêtre
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})