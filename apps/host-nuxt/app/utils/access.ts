export type UserRole = 'admin' | 'agent' | 'employee';
export type AuthPermission = 'viewAnalytics' | 'manageUsers' | 'updateTicket' | 'deleteTicket';

export type FeatureFlags = {
  newTicketsTable: boolean;
};

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  featureFlags: FeatureFlags;
};

export type SlaSettings = {
  lowMinutes: number;
  mediumMinutes: number;
  highMinutes: number;
  updatedAt: string;
};

export const defaultSlaSettings: SlaSettings = {
  lowMinutes: 24 * 60,
  mediumMinutes: 8 * 60,
  highMinutes: 4 * 60,
  updatedAt: '',
};

export const defaultFeatureFlags: FeatureFlags = {
  newTicketsTable: false,
};

export const roleLabels: Record<UserRole, string> = {
  admin: 'Администратор',
  agent: 'Агент',
  employee: 'Сотрудник',
};

export const featureFlagLabels: Record<keyof FeatureFlags, string> = {
  newTicketsTable: 'Новая таблица тикетов',
};

const permissionMatrix: Record<UserRole, AuthPermission[]> = {
  admin: ['viewAnalytics', 'manageUsers', 'updateTicket', 'deleteTicket'],
  agent: ['viewAnalytics', 'updateTicket'],
  employee: [],
};

export function normalizeFeatureFlags(
  value: Partial<FeatureFlags> | null | undefined,
): FeatureFlags {
  return {
    newTicketsTable:
      typeof value?.newTicketsTable === 'boolean'
        ? value.newTicketsTable
        : defaultFeatureFlags.newTicketsTable,
  };
}

export function hasPermission(
  role: UserRole | null | undefined,
  permission: AuthPermission,
): boolean {
  if (!role) {
    return false;
  }

  return permissionMatrix[role].includes(permission);
}
