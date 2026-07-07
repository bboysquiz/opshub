import { z } from 'zod';

export const ticketIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createTicketSchema = z.object({
  projectId: z.string().uuid().optional(),
  title: z.string().trim().min(1),
  description: z.string().optional().default(''),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  assignedTo: z.string().uuid().nullable().optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const updateTicketSchema = z
  .object({
    projectId: z.string().uuid().optional(),
    title: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(['open', 'in_progress', 'resolved']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    assignedTo: z.string().uuid().nullable().optional(),
    dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine(
    (data) =>
      data.projectId !== undefined ||
      data.title !== undefined ||
      data.description !== undefined ||
      data.status !== undefined ||
      data.priority !== undefined ||
      data.assignedTo !== undefined ||
      data.dueAt !== undefined,
    { message: 'At least one field is required' },
  );
