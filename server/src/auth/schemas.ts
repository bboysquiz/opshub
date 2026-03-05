import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'agent', 'employee']).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});
