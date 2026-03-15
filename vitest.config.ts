import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

function resolvePath(path: string) {
  return fileURLToPath(new URL(path, import.meta.url));
}

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@opshub/shared-config': resolvePath('./packages/shared-config/src/index.ts'),
      '@opshub/shared-ui': resolvePath('./packages/shared-ui/src/index.ts'),
      '~': resolvePath('./apps/host-nuxt/app'),
      '@': resolvePath('./apps/host-nuxt/app'),
      '#imports': resolvePath('./tests/mocks/nuxt-imports.ts'),
    },
    dedupe: ['vue', 'pinia', 'quasar'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['apps/**/*.spec.ts', 'packages/**/*.spec.ts', 'tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage/frontend',
      exclude: [
        '**/*.d.ts',
        '**/*.spec.ts',
        '**/main.ts',
        '**/bootstrap.ts',
        'apps/host-nuxt/app/sw.ts',
        'apps/host-nuxt/app/types/**',
        'apps/host-nuxt/app/plugins/dev-route-warmup.client.ts',
        'apps/host-nuxt/app/plugins/pwa-reset.client.ts',
      ],
    },
  },
});
