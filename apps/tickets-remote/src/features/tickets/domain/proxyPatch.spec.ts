import { buildTicketUpdatePatch, hasTicketUpdateChanges } from './proxyPatch';
import { toLocalTicket, type UpdateTicketInput } from './models';

describe('proxyPatch', () => {
  it('returns only changed fields from the candidate patch', () => {
    const current = toLocalTicket({
      id: 'ticket-1',
      title: 'Старый заголовок',
      description: 'Описание',
      status: 'open',
      priority: 'medium',
      createdBy: 'user-1',
      createdByEmail: 'creator@example.com',
      assignedTo: 'agent-1',
      assignedToEmail: 'agent@example.com',
      updatedAt: '2025-01-01T09:00:00.000Z',
      createdAt: '2025-01-01T08:00:00.000Z',
    });

    const candidate: UpdateTicketInput = {
      title: 'Новый заголовок',
      description: 'Описание',
      assignedTo: null,
    };

    expect(buildTicketUpdatePatch(current, candidate)).toEqual({
      title: 'Новый заголовок',
      assignedTo: null,
    });
  });

  it('detects when there are no actual changes', () => {
    const patch = buildTicketUpdatePatch(
      {
        title: 'Тикет',
        description: 'Описание',
        status: 'open',
        priority: 'low',
        assignedTo: null,
      },
      {
        title: 'Тикет',
        description: 'Описание',
      },
    );

    expect(patch).toEqual({});
    expect(hasTicketUpdateChanges(patch)).toBe(false);
  });
});
