import type { Request, Response } from 'express';
import { z } from 'zod';
import { listRecentActivityPage } from './service';

const activityQuerySchema = z
  .object({
    limit: z.coerce.number().int().positive().max(50).optional(),
    cursorCreatedAt: z.string().optional(),
    cursorId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    const hasCreatedAt = Boolean(value.cursorCreatedAt);
    const hasId = Boolean(value.cursorId);

    if (hasCreatedAt !== hasId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cursor must include cursorCreatedAt and cursorId',
      });
    }

    if (value.cursorCreatedAt && Number.isNaN(Date.parse(value.cursorCreatedAt))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid cursorCreatedAt',
      });
    }
  });

export async function listActivityFeedHandler(req: Request, res: Response): Promise<Response> {
  const parsedQuery = activityQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({ message: 'Invalid query' });
  }

  try {
    const page = await listRecentActivityPage({
      limit: parsedQuery.data.limit ?? 20,
      cursor:
        parsedQuery.data.cursorCreatedAt && parsedQuery.data.cursorId
          ? {
              createdAt: parsedQuery.data.cursorCreatedAt,
              id: parsedQuery.data.cursorId,
            }
          : null,
    });
    return res.json(page);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
