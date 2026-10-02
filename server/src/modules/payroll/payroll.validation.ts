import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const monthFormat = z.string().regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format');

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
    basicSalary: z.number().positive(),
    allowances: z.number().min(0).default(0),
    deductions: z.number().min(0).default(0),
  }),
});

export const payslipIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export type ListPayslipsQuery = z.infer<typeof listPayslipsSchema>['query'];
export type GeneratePayslipInput = z.infer<typeof generatePayslipSchema>['body'];
