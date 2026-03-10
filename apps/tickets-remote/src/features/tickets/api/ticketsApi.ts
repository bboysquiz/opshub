import { http } from './http';
import type { CreateTicketInput, TicketDto, UpdateTicketInput } from '../domain/models';

export const ticketsApi = {
  async list(): Promise<TicketDto[]> {
    const data = await http<{ items: TicketDto[] }>('/tickets');
    return data.items.map((item) => ({
      ...item,
      updatedAt: String(item.updatedAt),
      createdAt: String(item.createdAt),
    }));
  },

  async create(payload: CreateTicketInput): Promise<TicketDto> {
    const data = await http<TicketDto>('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      ...data,
      updatedAt: String(data.updatedAt),
      createdAt: String(data.createdAt),
    };
  },

  async update(id: string, payload: UpdateTicketInput): Promise<TicketDto> {
    const data = await http<TicketDto>(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    return {
      ...data,
      updatedAt: String(data.updatedAt),
      createdAt: String(data.createdAt),
    };
  },

  remove(id: string): Promise<void> {
    return http<void>(`/tickets/${id}`, {
      method: 'DELETE',
    });
  },
};
