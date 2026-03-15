import { downloadAnalyticsCsv } from './csv';
import type { AnalyticsTicketViewModel } from '../domain/models';

function createRow(): AnalyticsTicketViewModel {
  return {
    id: 'ticket-1',
    title: 'Тикет "А"',
    description: 'Описание',
    status: 'resolved',
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
    responseMinutes: 61,
    slaTargetMinutes: 240,
    slaBreached: false,
  };
}

describe('downloadAnalyticsCsv', () => {
  it('builds a csv file and clicks a temporary anchor', async () => {
    const anchor = document.createElement('a');
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
    const createElement = vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    const createObjectUrl = vi.fn().mockReturnValue('blob:test');
    const revokeObjectUrl = vi.fn();

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl,
    });

    downloadAnalyticsCsv([createRow()]);

    expect(createElement).toHaveBeenCalledWith('a');
    expect(click).toHaveBeenCalled();
    expect(createObjectUrl).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:test');

    const csvBlob = createObjectUrl.mock.calls[0]?.[0];
    expect(csvBlob).toBeInstanceOf(Blob);
    await expect(csvBlob.text()).resolves.toContain('Роль исполнителя');
    await expect(csvBlob.text()).resolves.toContain('Агент');
  });
});
