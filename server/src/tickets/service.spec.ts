import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccessPayload } from '../auth/types';
import {
  logTicketCreatedActivity,
  logTicketDeletedActivity,
  logTicketStatusChangedActivity,
  logTicketUpdatedActivity,
} from '../activity/service';
import {
  notifyTicketAssigned,
  notifyTicketStatusChanged,
  notifyTicketUpdated,
} from '../push/service';
import {
  createTicket,
  deleteTicketById,
  findFirstProjectIdForActor,
  getTicketByIdForActor,
  isProjectMember,
  listTicketsForActor,
  updateTicketById,
} from './repository';
import { createTicketRecord, deleteTicketRecord, getTickets, updateTicketRecord } from './service';
import type { TicketDto, TicketRow } from './types';

vi.mock('../activity/service', () => ({
  logTicketAssignedActivity: vi.fn(() => Promise.resolve()),
  logTicketCreatedActivity: vi.fn(() => Promise.resolve()),
  logTicketDeletedActivity: vi.fn(() => Promise.resolve()),
  logTicketStatusChangedActivity: vi.fn(() => Promise.resolve()),
  logTicketUpdatedActivity: vi.fn(() => Promise.resolve()),
}));

vi.mock('../push/service', () => ({
  notifyTicketAssigned: vi.fn(),
  notifyTicketDeleted: vi.fn(),
  notifyTicketStatusChanged: vi.fn(),
  notifyTicketUpdated: vi.fn(),
}));

vi.mock('./repository', () => ({
  createTicket: vi.fn(),
  deleteTicketById: vi.fn(),
  findFirstProjectIdForActor: vi.fn(),
  getTicketByIdForActor: vi.fn(),
  isProjectMember: vi.fn(),
  listTicketsForActor: vi.fn(),
  updateTicketById: vi.fn(),
}));

const actor: AccessPayload = {
  sub: '11111111-1111-4111-8111-111111111111',
  email: 'agent@example.test',
  role: 'agent',
};

const employeeActor: AccessPayload = {
  sub: '22222222-2222-4222-8222-222222222222',
  email: 'employee@example.test',
  role: 'employee',
};

const ticketId = '33333333-3333-4333-8333-333333333333';
const sourceProjectId = '44444444-4444-4444-8444-444444444444';
const targetProjectId = '55555555-5555-4555-8555-555555555555';
const fallbackProjectId = '66666666-6666-4666-8666-666666666666';
const assigneeId = '77777777-7777-4777-8777-777777777777';
const createdAt = '2026-07-02T09:00:00.000Z';

// `Partial<TicketRow>` позволяет в тестах менять только поля, важные для конкретного project-access сценария.
function createTicketRow(overrides: Partial<TicketRow> = {}): TicketRow {
  return {
    id: ticketId,
    project_id: sourceProjectId,
    project_name: 'Source project',
    space_id: '88888888-8888-4888-8888-888888888888',
    space_name: 'Ops space',
    title: 'VPN access',
    description: 'Need project-scoped access',
    status: 'open',
    priority: 'medium',
    created_by: actor.sub,
    created_by_email: actor.email,
    assigned_to: null,
    assigned_to_email: null,
    due_at: null,
    updated_at: createdAt,
    created_at: createdAt,
    ...overrides,
  };
}

function expectTicketDto(row: TicketRow): TicketDto {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.project_name,
    spaceId: row.space_id,
    spaceName: row.space_name,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdBy: row.created_by,
    createdByEmail: row.created_by_email,
    assignedTo: row.assigned_to,
    assignedToEmail: row.assigned_to_email,
    dueAt: row.due_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
}

const mockedCreateTicket = vi.mocked(createTicket);
const mockedDeleteTicketById = vi.mocked(deleteTicketById);
const mockedFindFirstProjectIdForActor = vi.mocked(findFirstProjectIdForActor);
const mockedGetTicketByIdForActor = vi.mocked(getTicketByIdForActor);
const mockedIsProjectMember = vi.mocked(isProjectMember);
const mockedListTicketsForActor = vi.mocked(listTicketsForActor);
const mockedUpdateTicketById = vi.mocked(updateTicketById);

describe('tickets service project access contracts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('lists only rows provided by the actor-scoped repository query', async () => {
    const row = createTicketRow();
    mockedListTicketsForActor.mockResolvedValue([row]);

    await expect(getTickets(actor)).resolves.toEqual([expectTicketDto(row)]);
    expect(mockedListTicketsForActor).toHaveBeenCalledWith(actor.sub);
  });

  it('creates a ticket in an explicit project when actor and assignee are project members', async () => {
    const row = createTicketRow({
      project_id: targetProjectId,
      project_name: 'Target project',
      assigned_to: assigneeId,
      assigned_to_email: 'assignee@example.test',
    });
    mockedIsProjectMember.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    mockedCreateTicket.mockResolvedValue(row);

    const created = await createTicketRecord(actor, {
      projectId: targetProjectId,
      title: row.title,
      description: row.description,
      priority: row.priority,
      assignedTo: assigneeId,
    });

    expect(created).toEqual(expectTicketDto(row));
    expect(mockedIsProjectMember).toHaveBeenNthCalledWith(1, targetProjectId, actor.sub);
    expect(mockedIsProjectMember).toHaveBeenNthCalledWith(2, targetProjectId, assigneeId);
    expect(mockedCreateTicket).toHaveBeenCalledWith({
      projectId: targetProjectId,
      title: row.title,
      description: row.description,
      priority: row.priority,
      assignedTo: assigneeId,
      createdBy: actor.sub,
    });
    expect(vi.mocked(logTicketCreatedActivity)).toHaveBeenCalled();
    expect(vi.mocked(notifyTicketAssigned)).toHaveBeenCalled();
  });

  it('uses actor fallback project when create payload omits projectId', async () => {
    const row = createTicketRow({
      project_id: fallbackProjectId,
      project_name: 'Fallback project',
    });
    mockedFindFirstProjectIdForActor.mockResolvedValue(fallbackProjectId);
    mockedCreateTicket.mockResolvedValue(row);

    await expect(
      createTicketRecord(actor, {
        title: row.title,
        description: row.description,
        priority: row.priority,
      }),
    ).resolves.toEqual(expectTicketDto(row));

    expect(mockedFindFirstProjectIdForActor).toHaveBeenCalledWith(actor.sub);
    expect(mockedCreateTicket).toHaveBeenCalledWith({
      projectId: fallbackProjectId,
      title: row.title,
      description: row.description,
      priority: row.priority,
      createdBy: actor.sub,
    });
  });

  it('rejects ticket creation when actor has no fallback project', async () => {
    mockedFindFirstProjectIdForActor.mockResolvedValue(null);

    await expect(
      createTicketRecord(actor, {
        title: 'No project',
        description: '',
        priority: 'medium',
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Project is required',
    });
    expect(mockedCreateTicket).not.toHaveBeenCalled();
  });

  it('rejects ticket creation in a project where actor is not a member', async () => {
    mockedIsProjectMember.mockResolvedValue(false);

    await expect(
      createTicketRecord(actor, {
        projectId: targetProjectId,
        title: 'Forbidden project',
        description: '',
        priority: 'medium',
      }),
    ).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden project',
    });
    expect(mockedCreateTicket).not.toHaveBeenCalled();
  });

  it('rejects assignment to a user outside the selected project', async () => {
    mockedIsProjectMember.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(
      createTicketRecord(actor, {
        projectId: targetProjectId,
        title: 'Invalid assignee',
        description: '',
        priority: 'medium',
        assignedTo: assigneeId,
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Invalid assignedTo project member',
    });
    expect(mockedCreateTicket).not.toHaveBeenCalled();
  });

  it('moves a ticket to another project when actor and assignee are target project members', async () => {
    const previous = createTicketRow({ assigned_to: assigneeId });
    const moved = createTicketRow({
      ...previous,
      project_id: targetProjectId,
      project_name: 'Target project',
    });
    mockedGetTicketByIdForActor.mockResolvedValue(previous);
    mockedIsProjectMember.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    mockedUpdateTicketById.mockResolvedValue(moved);

    await expect(
      updateTicketRecord(ticketId, { projectId: targetProjectId }, actor),
    ).resolves.toEqual(expectTicketDto(moved));
    expect(mockedUpdateTicketById).toHaveBeenCalledWith(ticketId, { projectId: targetProjectId });
  });

  it('rejects moving a ticket to a project where actor is not a member', async () => {
    mockedGetTicketByIdForActor.mockResolvedValue(createTicketRow());
    mockedIsProjectMember.mockResolvedValue(false);

    await expect(
      updateTicketRecord(ticketId, { projectId: targetProjectId }, actor),
    ).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden project',
    });
    expect(mockedUpdateTicketById).not.toHaveBeenCalled();
  });

  it('rejects moving an assigned ticket when assignee is not in the target project', async () => {
    mockedGetTicketByIdForActor.mockResolvedValue(createTicketRow({ assigned_to: assigneeId }));
    mockedIsProjectMember.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await expect(
      updateTicketRecord(ticketId, { projectId: targetProjectId }, actor),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Invalid assignedTo project member',
    });
    expect(mockedUpdateTicketById).not.toHaveBeenCalled();
  });

  it('does not update tickets outside actor project membership', async () => {
    mockedGetTicketByIdForActor.mockResolvedValue(null);

    await expect(updateTicketRecord(ticketId, { title: 'No access' }, actor)).rejects.toMatchObject(
      {
        status: 404,
        message: 'Ticket not found',
      },
    );
    expect(mockedUpdateTicketById).not.toHaveBeenCalled();
  });

  it('does not delete tickets outside actor project membership', async () => {
    mockedGetTicketByIdForActor.mockResolvedValue(null);

    await expect(deleteTicketRecord(ticketId, actor)).rejects.toMatchObject({
      status: 404,
      message: 'Ticket not found',
    });
    expect(mockedDeleteTicketById).not.toHaveBeenCalled();
    expect(vi.mocked(logTicketDeletedActivity)).not.toHaveBeenCalled();
  });

  it('keeps employee assignment changes forbidden even when the ticket is visible', async () => {
    mockedGetTicketByIdForActor.mockResolvedValue(
      createTicketRow({ created_by: employeeActor.sub, assigned_to: null }),
    );

    await expect(
      updateTicketRecord(ticketId, { assignedTo: assigneeId }, employeeActor),
    ).rejects.toMatchObject({
      status: 403,
      message: 'Forbidden',
    });
    expect(mockedUpdateTicketById).not.toHaveBeenCalled();
  });

  it('does not notify status updates when project-access validation fails before persistence', async () => {
    mockedGetTicketByIdForActor.mockResolvedValue(createTicketRow());
    mockedIsProjectMember.mockResolvedValue(false);

    await expect(
      updateTicketRecord(ticketId, { projectId: targetProjectId }, actor),
    ).rejects.toMatchObject({
      status: 403,
    });
    expect(vi.mocked(logTicketStatusChangedActivity)).not.toHaveBeenCalled();
    expect(vi.mocked(logTicketUpdatedActivity)).not.toHaveBeenCalled();
    expect(vi.mocked(notifyTicketStatusChanged)).not.toHaveBeenCalled();
    expect(vi.mocked(notifyTicketUpdated)).not.toHaveBeenCalled();
  });
});
