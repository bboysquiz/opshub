import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('workspace route access', () => {
  it('requires workspace permission only for settings and keeps the catalog authenticated', () => {
    const source = readFileSync(
      join(process.cwd(), 'apps/host-nuxt/app/middleware/access.global.ts'),
      'utf8',
    );

    const settingsRule = source.indexOf("path.startsWith('/spaces-settings')");
    const catalogRule = source.indexOf("path.startsWith('/spaces')");

    expect(settingsRule).toBeGreaterThan(-1);
    expect(catalogRule).toBeGreaterThan(settingsRule);
    expect(source.slice(settingsRule, catalogRule)).toContain("permission: 'manageWorkspaces'");
    expect(source.slice(catalogRule)).not.toContain("permission: 'manageWorkspaces'");
  });
});
