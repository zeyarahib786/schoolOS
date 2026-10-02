import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const listClaimsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
    category: z.string().trim().max(80).optional(),
  }),
});

export const submitClaimSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    category: z.string().trim().min(1).max(80),
    amount: z.number().positive(),
    description: z.string().trim().min(1).max(500),
    expenseDate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date'),
  }),
});

export const reviewClaimSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(['Approved', 'Rejected']),
    reviewNotes: z.string().trim().max(500).optional(),
  }),
});

export const claimIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export type ListClaimsQuery = z.infer<typeof listClaimsSchema>['query'];
export type SubmitClaimInput = z.infer<typeof submitClaimSchema>['body'];
export type ReviewClaimInput = z.infer<typeof reviewClaimSchema>['body'];
