import type { AnalyticsTicket, SlaSettings } from '../domain/models';
import { http } from './http';

type AnalyticsTicketsResponse = {
  items: AnalyticsTicket[];
  slaSettings: SlaSettings;
};

export const analyticsApi = {
  async listTickets(): Promise<AnalyticsTicketsResponse> {
    return http<AnalyticsTicketsResponse>('/analytics/tickets');
  },
};
