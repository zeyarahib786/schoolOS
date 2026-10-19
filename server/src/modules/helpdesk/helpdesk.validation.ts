import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const listTicketsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['Open', 'Assigned', 'Resolved', 'Closed']).optional(),
    category: z.string().trim().max(80).optional(),
  }),
});

export const raiseTicketSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    category: z.string().trim().min(1).max(80),
    subject: z.string().trim().min(2).max(160),
    description: z.string().trim().min(1).max(2000),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  }),
});

export const transitionTicketSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(['Open', 'Assigned', 'Resolved', 'Closed']),
    assignedTo: objectId.optional(),
    expectedUpdatedAt: z.string().datetime().optional(),
    resolutionNotes: z.string().trim().max(2000).optional(),
  }),
});

export const ticketIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export type ListTicketsQuery = z.infer<typeof listTicketsSchema>['query'];
export type RaiseTicketInput = z.infer<typeof raiseTicketSchema>['body'];
export type TransitionTicketInput = z.infer<typeof transitionTicketSchema>['body'];

export const replyTicketSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: z.object({ expectedUpdatedAt: z.string().datetime(), message: z.string().trim().min(1).max(2000) }),
});
