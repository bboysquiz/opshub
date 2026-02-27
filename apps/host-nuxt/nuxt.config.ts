// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: true,
  devServer: { port: 3000 },
  vite: {
    optimizeDeps: {
      exclude: ['tickets_remote/TicketsApp'],
    },
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
});
