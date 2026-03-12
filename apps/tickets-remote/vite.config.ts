import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import federation from '@originjs/vite-plugin-federation';

// https://vite.dev/config/
export default defineConfig({
  base: '',
  plugins: [
    vue(),
    federation({
      name: 'tickets_remote',
      filename: 'remoteEntry.js',
      exposes: {
        './TicketsApp': './src/TicketsApp.vue',
      },
      shared: {
        vue: { requiredVersion: '^3.5.0' },
        pinia: { requiredVersion: '^3.0.0' },
        quasar: { requiredVersion: '^2.18.0' },
      },
    }),
  ],
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
  build: {
    target: 'esnext',
    assetsDir: '',
    cssCodeSplit: false,
    chunkSizeWarningLimit: 650,
  },
  server: {
    port: 3010,
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  preview: {
    port: 3010,
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
});
