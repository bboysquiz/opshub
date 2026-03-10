import type { Request, Response } from 'express';
import { listUsersForAssignment } from '../auth/repository';

export async function listAssignableUsersHandler(_req: Request, res: Response): Promise<Response> {
  const items = await listUsersForAssignment();
  return res.json({ items });
}
