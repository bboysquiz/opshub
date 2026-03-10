import type { Request, Response } from 'express';
import { z } from 'zod';
import { isAuthError } from '../auth/errors';
import { listAdminUsers, updateAdminUserAccess } from '../auth/service';

const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const patchUserAccessSchema = z
  .object({
    role: z.enum(['admin', 'agent', 'employee']).optional(),
    featureFlags: z
      .object({
        newTicketsTable: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .refine((data) => data.role !== undefined || data.featureFlags !== undefined, {
    message: 'At least one field is required',
  });

function handleAdminError(err: unknown, res: Response): Response {
  if (isAuthError(err)) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

export async function listAdminUsersHandler(_req: Request, res: Response): Promise<Response> {
  try {
    const items = await listAdminUsers();
    return res.json({ items });
  } catch (err) {
    return handleAdminError(err, res);
  }
}

export async function patchAdminUserAccessHandler(req: Request, res: Response): Promise<Response> {
  const params = userIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  const body = patchUserAccessSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ message: 'Invalid body' });
  }

  try {
    const user = await updateAdminUserAccess(params.data.id, {
      role: body.data.role,
      featureFlags:
        body.data.featureFlags?.newTicketsTable !== undefined
          ? {
              newTicketsTable: body.data.featureFlags.newTicketsTable,
            }
          : undefined,
    });

    return res.json(user);
  } catch (err) {
    return handleAdminError(err, res);
  }
}
