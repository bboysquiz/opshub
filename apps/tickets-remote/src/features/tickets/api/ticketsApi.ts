import { http } from './http';
import {
  normalizeTicketRelationField,
  type CreateTicketInput,
  type TicketDto,
  type UpdateTicketInput,
} from '../domain/models';

function normalizeTicketDto(ticket: TicketDto): TicketDto {
  return {
    ...ticket,
    projectId: normalizeTicketRelationField(ticket.projectId),
    projectName: normalizeTicketRelationField(ticket.projectName),
    spaceId: normalizeTicketRelationField(ticket.spaceId),
    spaceName: normalizeTicketRelationField(ticket.spaceName),
    dueAt: ticket.dueAt ? String(ticket.dueAt) : null,
    updatedAt: String(ticket.updatedAt),
    createdAt: String(ticket.createdAt),
  };
}

export const ticketsApi = {
  async list(): Promise<TicketDto[]> {
    const data = await http<{ items: TicketDto[] }>('/tickets');
    return data.items.map(normalizeTicketDto);
  },

  async create(payload: CreateTicketInput): Promise<TicketDto> {
    const data = await http<TicketDto>('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return normalizeTicketDto(data);
  },

  async update(id: string, payload: UpdateTicketInput): Promise<TicketDto> {
    const data = await http<TicketDto>(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    return normalizeTicketDto(data);
  },

  remove(id: string): Promise<void> {
    return http<void>(`/tickets/${id}`, {
      method: 'DELETE',
    });
  },
};
