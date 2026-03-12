import { z } from 'zod';

export const kbArticleIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createKbArticleSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1),
});

export const updateKbArticleSchema = z
  .object({
    slug: z.string().trim().min(1).max(120).optional(),
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().trim().min(1).optional(),
  })
  .refine(
    (data) => data.slug !== undefined || data.title !== undefined || data.content !== undefined,
    { message: 'At least one field is required' },
  );
