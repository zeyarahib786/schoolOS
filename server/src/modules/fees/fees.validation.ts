import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const isoDate = z
  .string()
  .refine(
    (v) =>
      /^\d{4}-\d{2}-\d{2}/.test(v) &&
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v.slice(0, 10),
    'Invalid calendar date',
  );
const money = z
  .number()
  .positive('Amount must be greater than zero')
  .max(1_000_000_000)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001, 'Use at most two decimal places');

export const listInvoicesSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    studentId: objectId.optional(),
    status: z.enum(['Pending', 'Paid', 'Overdue']).optional(),
  }),
  params: z.object({}).optional(),
});

export const invoiceIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export const studentPaymentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    studentId: objectId,
    amount: money,
    paymentMethod: z.enum(['Card', 'Bank transfer', 'Cash', 'Cheque', 'Online portal']),
    reference: z.string().trim().max(120).optional(),
    idempotencyKey: z.string().trim().min(8).max(100).optional(),
  }),
});

export const createInvoiceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    refId: z.string().trim().min(1).max(30),
    studentId: objectId,
    term: z.string().trim().min(1).max(60),
    amount: money,
    currency: z.string().trim().length(3).optional(),
    dueDate: isoDate,
  }),
});

export const recordPaymentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    amount: money.optional(),
    paymentMethod: z.enum(['Card', 'Bank transfer', 'Cash', 'Cheque', 'Online portal']),
    reference: z.string().trim().max(120).optional(),
    idempotencyKey: z.string().trim().min(8).max(100).optional(),
  }),
});

export const listPaymentsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    studentId: objectId.optional(),
    invoiceId: objectId.optional(),
  }),
  params: z.object({}).optional(),
});

export const sendFeeRemindersSchema = z.object({
  body: z
    .object({
      invoiceIds: z.array(objectId).max(100).optional(),
    })
    .optional(),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>['body'];
export type ListInvoicesQuery = z.infer<typeof listInvoicesSchema>['query'];
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>['body'];
export type StudentPaymentInput = z.infer<typeof studentPaymentSchema>['body'];
export type ListPaymentsQuery = z.infer<typeof listPaymentsSchema>['query'];
export type SendFeeRemindersInput = z.infer<typeof sendFeeRemindersSchema>['body'];

const feeHeadBody = z.object({
  name: z.string().trim().min(2).max(100),
  appliesTo: z.string().trim().min(1).max(100),
  amount: money,
  frequency: z.enum(['Annual', 'Term', 'One-time']),
  status: z.enum(['Active', 'Archived']).default('Active'),
});
export const createFeeHeadSchema = z.object({
  body: feeHeadBody,
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
export const updateFeeHeadSchema = z.object({
  body: feeHeadBody.extend({ expectedUpdatedAt: z.string().datetime() }),
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
});
