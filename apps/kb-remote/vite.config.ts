import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'kb_remote',
      filename: 'remoteEntry.js',
      exposes: {
        './KbApp': './src/KbApp.vue',
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
    chunkSizeWarningLimit: 650,
  },
  server: {
    port: 3020,
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  preview: {
    port: 3020,
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
});
