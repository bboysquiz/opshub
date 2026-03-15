import { defaultFeatureFlags, hasPermission, normalizeFeatureFlags, roleLabels } from './access';

describe('access utils', () => {
  it('normalizes missing feature flags to defaults', () => {
    expect(normalizeFeatureFlags(undefined)).toEqual(defaultFeatureFlags);
    expect(normalizeFeatureFlags({ newTicketsTable: true })).toEqual({
      newTicketsTable: true,
    });
  });

  it('resolves permissions from the role matrix', () => {
    expect(hasPermission('admin', 'manageUsers')).toBe(true);
    expect(hasPermission('agent', 'viewAnalytics')).toBe(true);
    expect(hasPermission('employee', 'updateTicket')).toBe(false);
    expect(hasPermission(null, 'viewAnalytics')).toBe(false);
    expect(roleLabels.agent).toBe('Агент');
  });
});
