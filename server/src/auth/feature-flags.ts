export type FeatureFlags = {
  newTicketsTable: boolean;
};

export const defaultFeatureFlags: FeatureFlags = {
  newTicketsTable: false,
};

export function normalizeFeatureFlags(value: unknown): FeatureFlags {
  const raw = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

  return {
    newTicketsTable:
      typeof raw.newTicketsTable === 'boolean'
        ? raw.newTicketsTable
        : defaultFeatureFlags.newTicketsTable,
  };
}
