import type { Request, Response } from 'express';
import { getAnalyticsTickets } from './service';

export async function listAnalyticsTicketsHandler(_req: Request, res: Response): Promise<Response> {
  try {
    const payload = await getAnalyticsTickets();
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
