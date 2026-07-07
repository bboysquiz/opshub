import { z } from 'zod';

export const spaceIdParamsSchema = z.object({
  spaceId: z.string().uuid(),
});

export const projectParamsSchema = z.object({
  spaceId: z.string().uuid(),
  projectId: z.string().uuid(),
});

export const spaceMemberParamsSchema = z.object({
  spaceId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const projectMemberParamsSchema = z.object({
  spaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const memberBodySchema = z.object({
  userId: z.string().uuid(),
});

export const createSpaceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().default(''),
});

export const updateSpaceSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).optional(),
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: 'At least one field is required',
  });

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().default(''),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).optional(),
    archivedAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined || data.description !== undefined || data.archivedAt !== undefined,
    { message: 'At least one field is required' },
  );
