import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('default layout workspace navigation', () => {
  it('keeps the spaces tab behind the manageWorkspaces permission', () => {
    const source = readFileSync(
      join(process.cwd(), 'apps/host-nuxt/app/layouts/default.vue'),
      'utf8',
    );

    expect(source).toContain('v-if="auth.canManageWorkspaces"');
    expect(source).toContain('to="/spaces"');
  });
});
