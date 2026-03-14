import type { Request, Response } from 'express';
import { z } from 'zod';
import { isKbError } from './errors';
import {
  createKbArticleRecord,
  deleteKbArticleRecord,
  getKbArticleBySlug,
  getKbArticlesList,
  ifNoneMatchMatches,
  searchKbArticlesList,
  updateKbArticleRecord,
} from './service';
import { createKbArticleSchema, kbArticleIdParamsSchema, updateKbArticleSchema } from './schemas';

const kbSlugParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

const kbSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
});

function handleKbError(err: unknown, res: Response): Response {
  if (isKbError(err)) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

export async function listKbArticlesHandler(_req: Request, res: Response): Promise<Response> {
  try {
    const items = await getKbArticlesList();
    return res.json({ items });
  } catch (err) {
    return handleKbError(err, res);
  }
}

export async function searchKbArticlesHandler(req: Request, res: Response): Promise<Response> {
  const parsedQuery = kbSearchQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({ message: 'Invalid query' });
  }

  try {
    const items = await searchKbArticlesList(parsedQuery.data.q);
    return res.json({ items });
  } catch (err) {
    return handleKbError(err, res);
  }
}

export async function getKbArticleBySlugHandler(req: Request, res: Response): Promise<Response> {
  const parsedParams = kbSlugParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  try {
    const result = await getKbArticleBySlug(parsedParams.data.slug);
    if (!result) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const incomingTag = req.get('If-None-Match') ?? undefined;
    res.setHeader('ETag', result.etag);

    if (ifNoneMatchMatches(incomingTag, result.etag)) {
      return res.status(304).send();
    }

    return res.json(result.article);
  } catch (err) {
    return handleKbError(err, res);
  }
}

export async function createKbArticleHandler(req: Request, res: Response): Promise<Response> {
  const parsed = createKbArticleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid body' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const article = await createKbArticleRecord(parsed.data, req.user);
    return res.status(201).json(article);
  } catch (err) {
    return handleKbError(err, res);
  }
}

export async function patchKbArticleHandler(req: Request, res: Response): Promise<Response> {
  const parsedParams = kbArticleIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  const parsedBody = updateKbArticleSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ message: 'Invalid body' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const article = await updateKbArticleRecord(parsedParams.data.id, parsedBody.data, req.user);
    return res.json(article);
  } catch (err) {
    return handleKbError(err, res);
  }
}

export async function deleteKbArticleHandler(req: Request, res: Response): Promise<Response> {
  const parsedParams = kbArticleIdParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    return res.status(400).json({ message: 'Invalid params' });
  }

  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await deleteKbArticleRecord(parsedParams.data.id, req.user);
    return res.status(204).send();
  } catch (err) {
    return handleKbError(err, res);
  }
}
