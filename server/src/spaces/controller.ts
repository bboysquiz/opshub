import type { Request, Response } from 'express';
import { isSpacesError } from './errors';
import {
  createProjectSchema,
  createSpaceSchema,
  memberBodySchema,
  projectMemberParamsSchema,
  projectParamsSchema,
  spaceIdParamsSchema,
  spaceMemberParamsSchema,
  updateProjectSchema,
  updateSpaceSchema,
} from './schemas';
import {
  addProjectMemberRecord,
  addSpaceMemberRecord,
  createProjectRecord,
  createSpaceRecord,
  listProjectMembersRecord,
  listSpaceMembersRecord,
  listSpaceProjectsRecord,
  listSpacesTree,
  removeProjectMemberRecord,
  removeSpaceMemberRecord,
  updateProjectRecord,
  updateSpaceRecord,
} from './service';

function handleSpacesError(err: unknown, res: Response): Response {
  if (isSpacesError(err)) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

export async function listSpacesHandler(req: Request, res: Response): Promise<Response> {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const items = await listSpacesTree(req.user);
    return res.json({ items });
  } catch (err) {
    return handleSpacesError(err, res);
  }
}

export async function createSpaceHandler(req: Request, res: Response): Promise<Response> {
  const parsed = createSpaceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid body' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const space = await createSpaceRecord(parsed.data, req.user);
    return res.status(201).json(space);
  } catch (err) {
    return handleSpacesError(err, res);
  }
}

export async function patchSpaceHandler(req: Request, res: Response): Promise<Response> {
  const params = spaceIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  const parsed = updateSpaceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid body' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const space = await updateSpaceRecord(params.data.spaceId, parsed.data, req.user);
    return res.json(space);
  } catch (err) {
    return handleSpacesError(err, res);
  }
}

export async function listSpaceMembersHandler(req: Request, res: Response): Promise<Response> {
  const params = spaceIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const items = await listSpaceMembersRecord(params.data.spaceId, req.user);
    return res.json({ items });
  } catch (err) {
    return handleSpacesError(err, res);
  }
}

export async function addSpaceMemberHandler(req: Request, res: Response): Promise<Response> {
  const params = spaceIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  const parsed = memberBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid body' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const member = await addSpaceMemberRecord(params.data.spaceId, parsed.data.userId, req.user);
    return res.status(201).json(member);
  } catch (err) {
    return handleSpacesError(err, res);
  }
}

export async function removeSpaceMemberHandler(req: Request, res: Response): Promise<Response> {
  const params = spaceMemberParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await removeSpaceMemberRecord(params.data.spaceId, params.data.userId, req.user);
    return res.status(204).send();
  } catch (err) {
    return handleSpacesError(err, res);
  }
}

export async function listSpaceProjectsHandler(req: Request, res: Response): Promise<Response> {
  const params = spaceIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const items = await listSpaceProjectsRecord(params.data.spaceId, req.user);
    return res.json({ items });
  } catch (err) {
    return handleSpacesError(err, res);
  }
}

export async function createProjectHandler(req: Request, res: Response): Promise<Response> {
  const params = spaceIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid body' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const project = await createProjectRecord(params.data.spaceId, parsed.data, req.user);
    return res.status(201).json(project);
  } catch (err) {
    return handleSpacesError(err, res);
  }
}

export async function patchProjectHandler(req: Request, res: Response): Promise<Response> {
  const params = projectParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid body' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const project = await updateProjectRecord(
      params.data.spaceId,
      params.data.projectId,
      parsed.data,
      req.user,
    );
    return res.json(project);
  } catch (err) {
    return handleSpacesError(err, res);
  }
}

export async function listProjectMembersHandler(req: Request, res: Response): Promise<Response> {
  const params = projectParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const items = await listProjectMembersRecord(
      params.data.spaceId,
      params.data.projectId,
      req.user,
    );
    return res.json({ items });
  } catch (err) {
    return handleSpacesError(err, res);
  }
}

export async function addProjectMemberHandler(req: Request, res: Response): Promise<Response> {
  const params = projectParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  const parsed = memberBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid body' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const member = await addProjectMemberRecord(
      params.data.spaceId,
      params.data.projectId,
      parsed.data.userId,
      req.user,
    );
    return res.status(201).json(member);
  } catch (err) {
    return handleSpacesError(err, res);
  }
}

export async function removeProjectMemberHandler(req: Request, res: Response): Promise<Response> {
  const params = projectMemberParamsSchema.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await removeProjectMemberRecord(
      params.data.spaceId,
      params.data.projectId,
      params.data.userId,
      req.user,
    );
    return res.status(204).send();
  } catch (err) {
    return handleSpacesError(err, res);
  }
}
