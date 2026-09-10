
self.addEventListener('push', event => {
  if (!event.data) {
    console.warn('[custom-sw] Push event received with no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[custom-sw] Failed to parse push payload:', e);
    return;
  }

  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/assets/icons/icon-72x72.png',
    badge: data.badge || '/assets/icons/badge-72x72.png',
    image: data.image || undefined,
    vibrate: [100, 50, 100],
    tag: data.tag || 'default',          
    renotify: true,
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: '🔗 Open App' },
      { action: 'dismiss', title: '✖ Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

self.addEventListener('pushsubscriptionchange', event => {
  console.log('[custom-sw] Push subscription changed — resubscribing...');
  event.waitUntil(
    self.registration.pushManager
      .subscribe({ userVisibleOnly: true })
      .then(subscription => {
        return fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription)
        });
      })
      .catch(err => console.error('[custom-sw] Resubscription failed:', err))
  );
});