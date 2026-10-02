import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const createDeviceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().trim().min(1).max(120),
    location: z.string().trim().min(1).max(160),
  }),
});

export const deviceIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>['body'];
