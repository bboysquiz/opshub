import type { Request, Response } from 'express';
import { z } from 'zod';
import { getKbArticleBySlug, getKbArticlesList, ifNoneMatchMatches } from './service';

const kbSlugParamsSchema = z.object({
  slug: z.string().trim().min(1),
});

export async function listKbArticlesHandler(_req: Request, res: Response): Promise<Response> {
  try {
    const items = await getKbArticlesList();
    return res.json({ items });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
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
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
