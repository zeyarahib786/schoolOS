import { z } from 'zod';
import { ROLES } from '../../types/roles';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[a-z]/, 'Password must contain a lowercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    role: z.enum(ROLES),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().min(1).max(254),
    role: z.enum(ROLES),
    password: z.string().min(1).max(128),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];

export const provisionSchema = z.object({
  body: z.object({
    kind: z.enum(['Student', 'Staff', 'Guardian']),
    recordId: z.string().regex(/^[a-f\d]{24}$/i),
    role: z.enum(['Teacher', 'Principal', 'Accountant']).optional(),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
  }),
});
export const resetAccountSchema = z.object({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }) });
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(10).max(72).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
  }),
});
export const directorySchema = z.object({
  query: z.object({ q: z.string().trim().max(80).default(''), grade: z.string().trim().max(60).default('') }),
});

export const correctAccountSchema = z.object({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }),
  body: z
    .object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(254),
      expectedUpdatedAt: z.string().datetime(),
      reason: z.string().trim().min(3).max(300),
    })
    .strict(),
});
