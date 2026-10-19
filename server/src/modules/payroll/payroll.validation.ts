import { z } from 'zod';
import { calendarDateSchema } from '../../utils/calendarDate';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const monthFormat = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'month must be in YYYY-MM format');

export const listPayslipsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    staffId: objectId.optional(),
    month: monthFormat.optional(),
    status: z.enum(['Draft', 'Processed', 'Paid']).optional(),
  }),
});

export const generatePayslipSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    staffId: objectId,
    month: monthFormat,
    basicSalary: z.number().positive().max(1000000000).multipleOf(0.01),
    allowances: z.number().min(0).max(1000000000).multipleOf(0.01).default(0),
    expectedUpdatedAt: z.string().datetime().optional(),
    correctionReason: z.string().trim().min(3).max(500).optional(),
    deductions: z.number().min(0).max(1000000000).multipleOf(0.01).default(0),
  }),
});

export const payslipIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export type ListPayslipsQuery = z.infer<typeof listPayslipsSchema>['query'];
export type GeneratePayslipInput = z.infer<typeof generatePayslipSchema>['body'];

export const payPayslipSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    expectedUpdatedAt: z.string().datetime(),
    paidDate: calendarDateSchema,
    paymentReference: z.string().trim().min(3).max(120),
    paymentMethod: z.enum(['Bank transfer', 'Cash', 'Cheque', 'Other']),
  }),
});
export type PayPayslipInput = z.infer<typeof payPayslipSchema>['body'];
