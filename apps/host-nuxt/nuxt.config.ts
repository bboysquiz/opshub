// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: true,
  devServer: { port: 3000 },
  modules: ['@pinia/nuxt', '@vite-pwa/nuxt'],
  app: {
    head: {
      title: 'OpsHub',
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
        { name: 'theme-color', content: '#1976D2' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/pwa-64x64.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
  pwa: {
    workbox: {
      runtimeCaching: [
        {
          urlPattern: /^http:\/\/localhost:3010\/assets\/.*$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'tickets-remote-assets',
            cacheableResponse: { statuses: [0, 200] },
            expiration: { maxEntries: 40, maxAgeSeconds: 7 * 24 * 60 * 60 },
          },
        },
        {
          urlPattern: /^http:\/\/localhost:3001\/tickets(?:\/.*)?$/,
          method: 'GET',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'tickets-api',
            networkTimeoutSeconds: 3,
            cacheableResponse: { statuses: [0, 200] },
            expiration: { maxEntries: 20, maxAgeSeconds: 24 * 60 * 60 },
          },
        },
      ],
    },
    registerType: 'autoUpdate',
    manifest: {
      name: 'OpsHub',
      short_name: 'OpsHub',
      description: 'OpsHub workspace',
      theme_color: '#1976D2',
      background_color: '#ffffff',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      icons: [
        { src: '/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        {
          src: '/maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      navigateFallbackAllowlist: [/^\/$/, /^\/(tickets|kb|analytics|profile|about)(\/.*)?$/],
    },
  },
  vite: {
    css: {
      preprocessorOptions: {
        sass: {
          quietDeps: true,
          silenceDeprecations: ['import'],
        },
        scss: {
          quietDeps: true,
          silenceDeprecations: ['import'],
        },
      },
    },
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
});
