import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('default layout workspace navigation', () => {
  it('shows the spaces catalog to authenticated users and protects workspace settings', () => {
    const source = readFileSync(
      join(process.cwd(), 'apps/host-nuxt/app/layouts/default.vue'),
      'utf8',
    );

    expect(source).toContain('v-if="auth.isAuthenticated" v-ripple clickable to="/spaces"');
    expect(source).toContain(
      'v-if="auth.canManageWorkspaces" v-ripple clickable to="/spaces-settings"',
    );
    expect(source).toContain('Настройка пространств');
  });
});
