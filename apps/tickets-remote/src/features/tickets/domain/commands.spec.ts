import { mergeCreatePayload } from './commands';
import type { CreateTicketInput, UpdateTicketInput } from './models';

describe('ticket sync commands', () => {
  it('keeps project relation fields when a queued create absorbs later updates', () => {
    const createPayload: CreateTicketInput = {
      projectId: 'project-1',
      projectName: 'Support',
      spaceId: 'space-1',
      spaceName: 'Ops',
      title: 'Original',
      description: 'Description',
      priority: 'medium',
      assignedTo: 'agent-1',
      dueAt: null,
    };
    const patch: UpdateTicketInput = {
      title: 'Updated',
    };

    expect(mergeCreatePayload(createPayload, patch)).toEqual({
      ...createPayload,
      title: 'Updated',
    });
  });

  it('moves the queued create payload to the patched project relation', () => {
    const createPayload: CreateTicketInput = {
      projectId: 'project-1',
      projectName: 'Support',
      spaceId: 'space-1',
      spaceName: 'Ops',
      title: 'Ticket',
      description: 'Description',
      priority: 'high',
      assignedTo: null,
      dueAt: null,
    };
    const patch: UpdateTicketInput = {
      projectId: 'project-2',
      projectName: 'Payments',
      spaceId: 'space-2',
      spaceName: 'Finance',
    };

    expect(mergeCreatePayload(createPayload, patch)).toEqual({
      ...createPayload,
      ...patch,
    });
  });
});
