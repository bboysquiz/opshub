import { nextTick, ref } from 'vue';
import { useMemoizedAnalytics } from './useMemoizedAnalytics';
import type { AnalyticsFilters, AnalyticsTicket, SlaSettings } from '../domain/models';

function createTicket(overrides: Partial<AnalyticsTicket> = {}): AnalyticsTicket {
  return {
    id: 'ticket-1',
    title: 'Проблема с доступом',
    description: 'Не открывается портал',
    status: 'open',
    priority: 'high',
    createdAt: '2025-01-01T09:00:00.000Z',
    updatedAt: '2025-01-01T10:00:00.000Z',
    createdBy: 'user-1',
    createdByEmail: 'creator@example.com',
    createdByRole: 'employee',
    assignedTo: 'agent-1',
    assignedToEmail: 'agent@example.com',
    assignedToRole: 'agent',
    assignedTeam: 'support',
    ...overrides,
  };
}

describe('useMemoizedAnalytics', () => {
  it('builds a stable snapshot and recalculates it only when inputs change', async () => {
    const tickets = ref<AnalyticsTicket[]>([
      createTicket(),
      createTicket({
        id: 'ticket-2',
        status: 'resolved',
        priority: 'medium',
        assignedTeam: 'operations',
        createdAt: '2025-01-02T09:00:00.000Z',
        updatedAt: '2025-01-02T11:00:00.000Z',
      }),
    ]);
    const filters = ref<AnalyticsFilters>({
      dateFrom: '',
      dateTo: '',
      status: 'all',
      team: 'all',
    });
    const slaSettings = ref<SlaSettings>({
      lowMinutes: 1440,
      mediumMinutes: 480,
      highMinutes: 240,
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    const { snapshot } = useMemoizedAnalytics(tickets, filters, slaSettings);

    const initialSnapshot = snapshot.value;

    expect(initialSnapshot.totalCount).toBe(2);
    expect(initialSnapshot.activeCount).toBe(1);
    expect(initialSnapshot.byTeam.map((item) => item.count)).toEqual([1, 1, 0, 0]);
    expect(snapshot.value).toBe(initialSnapshot);

    filters.value = {
      ...filters.value,
      status: 'resolved',
    };
    await nextTick();

    expect(snapshot.value).not.toBe(initialSnapshot);
    expect(snapshot.value.totalCount).toBe(1);
    expect(snapshot.value.tableRows[0]?.status).toBe('resolved');
  });
});
