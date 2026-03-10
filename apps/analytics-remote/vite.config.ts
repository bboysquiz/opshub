import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'analytics_remote',
      filename: 'remoteEntry.js',
      exposes: {
        './AnalyticsApp': './src/AnalyticsApp.vue',
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
    cssCodeSplit: false,
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 3030,
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  preview: {
    port: 3030,
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
});
