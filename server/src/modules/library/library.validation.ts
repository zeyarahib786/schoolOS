import { z } from 'zod';

import { calendarDateSchema } from '../../utils/calendarDate';
const dateFormat = z.union([calendarDateSchema, z.string().datetime({ offset: true })]);
const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const listBooksSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional(),
    category: z.string().trim().max(80).optional(),
  }),
});

export const createBookSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    isbn: z.string().trim().min(1).max(30),
    title: z.string().trim().min(1).max(200),
    author: z.string().trim().min(1).max(120),
    category: z.string().trim().min(1).max(80),
    totalCopies: z.number().int().positive().max(10000),
    shelf: z.string().trim().max(80).optional(),
  }),
});

export const issueLoanSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    bookId: objectId,
    studentId: objectId,
    dueDate: dateFormat,
  }),
});

export const loanIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export const listLoansSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    studentId: objectId.optional(),
    status: z.enum(['Active', 'Returned', 'Overdue']).optional(),
  }),
});

export const createBookRequestSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({ bookId: objectId, studentId: objectId.optional(), note: z.string().trim().max(300).optional() }),
});
export const listBookRequestsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['Pending', 'Fulfilled', 'Rejected', 'Cancelled']).optional(),
  }),
});
export const bookRequestIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});
export const sendRemindersSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({ loanIds: z.array(objectId).min(1).max(100) }),
});

export type CreateBookInput = z.infer<typeof createBookSchema>['body'];
export type ListBooksQuery = z.infer<typeof listBooksSchema>['query'];
export type IssueLoanInput = z.infer<typeof issueLoanSchema>['body'];
export type ListLoansQuery = z.infer<typeof listLoansSchema>['query'];
export type CreateBookRequestInput = z.infer<typeof createBookRequestSchema>['body'];
export type ListBookRequestsQuery = z.infer<typeof listBookRequestsSchema>['query'];
export type SendRemindersInput = z.infer<typeof sendRemindersSchema>['body'];

export const reviewBookSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    author: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    shelf: z.string().trim().max(80).optional(),
    expectedUpdatedAt: z.string().datetime(),
    reason: z.string().trim().min(3).max(500),
  }),
});
export const renewLoanSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: z.object({
    dueDate: dateFormat,
    expectedUpdatedAt: z.string().datetime(),
    reason: z.string().trim().min(3).max(500),
  }),
});
export const fulfillRequestSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: z.object({ dueDate: dateFormat.optional() }),
});
export const decideRequestSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: z.object({ status: z.enum(['Rejected', 'Cancelled']), reason: z.string().trim().min(3).max(500) }),
});
