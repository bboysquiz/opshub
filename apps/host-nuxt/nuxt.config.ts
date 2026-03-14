const isDev = process.env.NODE_ENV !== 'production';
const devFavicon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%231976D2'/%3E%3Ctext x='50%25' y='54%25' text-anchor='middle' font-family='Arial' font-size='34' fill='white'%3EO%3C/text%3E%3C/svg%3E";

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
        isDev
          ? { rel: 'icon', type: 'image/svg+xml', href: devFavicon }
          : { rel: 'icon', type: 'image/png', href: '/pwa-64x64.png' },
        ...(isDev ? [] : [{ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }]),
      ],
    },
  },
  pwa: {
    strategies: 'injectManifest',
    srcDir: '.',
    filename: 'sw.ts',
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2}'],
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
      enabled: false,
      suppressWarnings: true,
      navigateFallbackAllowlist: [
        /^\/$/,
        /^\/(tickets|kb|analytics|notifications|profile|about)(\/.*)?$/,
      ],
    },
  },
  vite: {
    optimizeDeps: {
      exclude: ['tickets_remote/TicketsApp', 'kb_remote/KbApp', 'analytics_remote/AnalyticsApp'],
    },
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
  devtools: { enabled: false },
});
