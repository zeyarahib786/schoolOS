import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const createDeviceSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().trim().min(1).max(120),
    location: z.string().trim().min(1).max(160),
    mode: z.enum(['Face', 'Fingerprint', 'Card', 'Face + Card', 'Unspecified']).default('Unspecified'),
    manufacturer: z.string().trim().max(160).optional(),
    serialNumber: z.string().trim().max(160).optional(),
  }),
});

export const deviceIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>['body'];

export const updateDeviceSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: createDeviceSchema.shape.body.extend({
    expectedUpdatedAt: z.string().datetime(),
    reason: z.string().trim().min(3).max(500),
    status: z.enum(['Unknown', 'Online', 'Offline']),
    enabled: z.boolean(),
    observedAt: z.string().datetime().optional(),
  }),
});
