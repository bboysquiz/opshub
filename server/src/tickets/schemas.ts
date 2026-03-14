import { z } from 'zod';

export const ticketIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createTicketSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().optional().default(''),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  assignedTo: z.string().uuid().nullable().optional(),
});

export const updateTicketSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(['open', 'in_progress', 'resolved']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    assignedTo: z.string().uuid().nullable().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.description !== undefined ||
      data.status !== undefined ||
      data.priority !== undefined ||
      data.assignedTo !== undefined,
    { message: 'At least one field is required' },
  );
