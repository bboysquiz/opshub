import type { Request, Response } from 'express';
import { z } from 'zod';
import { listUsersForAssignment } from '../auth/repository';
import { isProjectMember, isSpaceMember } from '../spaces/repository';

const usersOptionsQuerySchema = z
  .object({
    spaceId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
  })
  .refine((query) => !(query.spaceId && query.projectId), {
    message: 'Use either spaceId or projectId',
  });

export async function listAssignableUsersHandler(req: Request, res: Response): Promise<Response> {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const parsed = usersOptionsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid query' });
  }

  if (parsed.data.projectId && !(await isProjectMember(parsed.data.projectId, req.user.sub))) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  if (
    parsed.data.spaceId &&
    req.user.role !== 'admin' &&
    !(await isSpaceMember(parsed.data.spaceId, req.user.sub))
  ) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const items = await listUsersForAssignment(parsed.data);
  return res.json({ items });
}
