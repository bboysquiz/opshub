/// <reference lib="webworker" />

import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    url: string;
    revision: string | null;
  }>;
};

type PushPayload = {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
};

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    ['3010', '3020', '3030'].includes(url.port) &&
    url.pathname.startsWith('/assets/'),
  new StaleWhileRevalidate({
    cacheName: 'remote-assets',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  }),
);

registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.origin === 'http://localhost:3001' &&
    (url.pathname === '/tickets' ||
      url.pathname.startsWith('/tickets/') ||
      url.pathname === '/kb/articles' ||
      url.pathname.startsWith('/kb/articles/') ||
      url.pathname === '/analytics/tickets'),
  new NetworkFirst({
    cacheName: 'opshub-api',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60,
      }),
    ],
  }),
);

function parsePushPayload(event: PushEvent): PushPayload {
  if (!event.data) {
    return {};
  }

  try {
    return event.data.json() as PushPayload;
  } catch {
    return {
      body: event.data.text(),
    };
  }
}

self.addEventListener('push', (event) => {
  const payload = parsePushPayload(event);
  const title = payload.title ?? 'OpsHub';
  const body = payload.body ?? 'У вас новое уведомление';
  const url = payload.url ?? '/notifications';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
      tag: payload.tag ?? 'opshub-notification',
      data: {
        url,
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(
    String(event.notification.data?.url ?? '/notifications'),
    self.location.origin,
  ).toString();

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientsList) {
        const windowClient = client as WindowClient;
        if (windowClient.url === targetUrl) {
          await windowClient.focus();
          return;
        }
      }

      await self.clients.openWindow(targetUrl);
    })(),
  );
});

export {};
