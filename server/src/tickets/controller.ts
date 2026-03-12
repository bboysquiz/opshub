import type { Request, Response } from 'express';
import { isTicketsError } from './errors';
import { createTicketSchema, ticketIdParamsSchema, updateTicketSchema } from './schemas';
import { createTicketRecord, deleteTicketRecord, getTickets, updateTicketRecord } from './service';

function handleTicketsError(err: unknown, res: Response): Response {
  if (isTicketsError(err)) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

export async function listTicketsHandler(_req: Request, res: Response): Promise<Response> {
  try {
    const tickets = await getTickets();
    return res.json({ items: tickets });
  } catch (err) {
    return handleTicketsError(err, res);
  }
}

export async function createTicketHandler(req: Request, res: Response): Promise<Response> {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid body' });
  }

  if (!req.user?.sub) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.user.role === 'employee' && parsed.data.assignedTo) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const ticket = await createTicketRecord(req.user.sub, parsed.data);
    return res.status(201).json(ticket);
  } catch (err) {
    return handleTicketsError(err, res);
  }
}

export async function patchTicketHandler(req: Request, res: Response): Promise<Response> {
  const params = ticketIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  const parsed = updateTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid body' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const ticket = await updateTicketRecord(params.data.id, parsed.data, req.user);
    return res.json(ticket);
  } catch (err) {
    return handleTicketsError(err, res);
  }
}

export async function deleteTicketHandler(req: Request, res: Response): Promise<Response> {
  const params = ticketIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await deleteTicketRecord(params.data.id, req.user);
    return res.status(204).send();
  } catch (err) {
    return handleTicketsError(err, res);
  }
}
