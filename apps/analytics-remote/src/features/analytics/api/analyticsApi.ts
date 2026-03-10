import type { AnalyticsTicket } from '../domain/models';
import { http } from './http';

type AnalyticsTicketsResponse = {
  items: AnalyticsTicket[];
};

export const analyticsApi = {
  async listTickets(): Promise<AnalyticsTicket[]> {
    const response = await http<AnalyticsTicketsResponse>('/analytics/tickets');
    return response.items;
  },
};
