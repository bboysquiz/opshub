import { toLocalTicket, type TicketDto } from './models';

function createTicket(overrides: Partial<TicketDto> = {}): TicketDto {
  return {
    id: 'ticket-1',
    projectId: 'project-1',
    projectName: 'Support',
    spaceId: 'space-1',
    spaceName: 'Ops',
    title: 'Ticket',
    description: 'Description',
    status: 'open',
    priority: 'medium',
    createdBy: 'user-1',
    createdByEmail: 'creator@example.com',
    assignedTo: null,
    assignedToEmail: null,
    dueAt: null,
    updatedAt: '2025-01-01T10:00:00.000Z',
    createdAt: '2025-01-01T09:00:00.000Z',
    ...overrides,
  };
}

describe('ticket domain models', () => {
  it('stores project relation fields on local tickets', () => {
    const localTicket = toLocalTicket(createTicket());

    expect(localTicket).toMatchObject({
      projectId: 'project-1',
      projectName: 'Support',
      spaceId: 'space-1',
      spaceName: 'Ops',
    });
  });

  it('does not stringify missing legacy relation fields into undefined text', () => {
    const legacyTicket = {
      ...createTicket(),
      projectId: undefined,
      projectName: undefined,
      spaceId: undefined,
      spaceName: undefined,
    } as unknown as TicketDto;

    const localTicket = toLocalTicket(legacyTicket);

    expect(localTicket).toMatchObject({
      projectId: '',
      projectName: '',
      spaceId: '',
      spaceName: '',
    });
  });
});
