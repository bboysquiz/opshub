import { loadRemoteContainerOnce } from '~/composables/useRemoteModule';

const hostPageWarmers = [
  () => import('~/pages/tickets.vue'),
  () => import('~/pages/kb.vue'),
  () => import('~/pages/analytics.vue'),
  () => import('~/pages/notifications.vue'),
  () => import('~/pages/profile.vue'),
  () => import('~/pages/about.vue'),
];

const remoteWarmers = [
  async () => {
    const container = await loadRemoteContainerOnce('http://localhost:3010/remoteEntry.js');
    const factory = await container.get('./TicketsApp');
    await factory();
  },
  async () => {
    const container = await loadRemoteContainerOnce('http://localhost:3020/remoteEntry.js');
    const factory = await container.get('./KbApp');
    await factory();
  },
  async () => {
    const container = await loadRemoteContainerOnce('http://localhost:3030/remoteEntry.js');
    const factory = await container.get('./AnalyticsApp');
    await factory();
  },
];

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.dev || typeof window === 'undefined') {
    return;
  }

  let warmed = false;
  let warmingInFlight: Promise<void> | null = null;

  async function warmRoutesAndRemotes() {
    if (warmed || warmingInFlight || navigator.onLine === false) {
      return;
    }

    warmingInFlight = Promise.allSettled([
      ...hostPageWarmers.map((warmer) => warmer()),
      ...remoteWarmers.map((warmer) => warmer()),
    ])
      .then((results) => {
        warmed = results.every((result) => result.status === 'fulfilled');
      })
      .finally(() => {
        warmingInFlight = null;
      });

    await warmingInFlight;
  }

  nuxtApp.hook('app:mounted', () => {
    void warmRoutesAndRemotes();
    window.addEventListener('online', () => {
      void warmRoutesAndRemotes();
    });
  });
});
