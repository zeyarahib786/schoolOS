import { z } from 'zod';
import { calendarDateSchema } from '../../utils/calendarDate';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const listClaimsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['Pending', 'Approved', 'Rejected', 'Paid', 'Cancelled']).optional(),
    category: z.string().trim().max(80).optional(),
  }),
});

export const submitClaimSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    category: z.string().trim().min(1).max(80),
    amount: z
      .number()
      .positive()
      .max(1000000)
      .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001, 'Use at most two decimal places'),
    vendor: z.string().trim().max(200).optional(),
    receiptReference: z.string().trim().max(200).optional(),
    description: z.string().trim().min(1).max(500),
    expenseDate: calendarDateSchema,
  }),
});

export const reviewClaimSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(['Approved', 'Rejected']),
    expectedUpdatedAt: z.string().datetime(),
    reviewNotes: z.string().trim().min(3).max(500),
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

export const payClaimSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    expectedUpdatedAt: z.string().datetime(),
    paidDate: calendarDateSchema,
    paymentMethod: z.enum(['Cash', 'Bank transfer', 'Cheque']),
    paymentReference: z.string().trim().min(1).max(200),
    reason: z.string().trim().min(3).max(500),
  }),
  query: z.object({}).optional(),
});
export const cancelClaimSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ expectedUpdatedAt: z.string().datetime(), reason: z.string().trim().min(3).max(500) }),
  query: z.object({}).optional(),
});
