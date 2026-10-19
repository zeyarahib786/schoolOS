import { z } from 'zod';
import { calendarDateSchema } from '../../utils/calendarDate';
const cost = z
  .number()
  .min(0)
  .max(1000000)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001, 'Use at most two decimal places');

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const createItemSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    name: z.string().trim().min(1).max(160),
    sku: z.string().trim().min(1).max(60),
    category: z.string().trim().min(1).max(80),
    quantityOnHand: z.number().int().min(0).default(0),
    reorderLevel: z.number().int().min(0).default(10),
    unitCost: cost,
    supplier: z.string().trim().max(160).optional(),
    location: z.string().trim().max(160).optional(),
  }),
});

export const listItemsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    category: z.string().trim().max(80).optional(),
  }),
});

export const createPOSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    refId: z.string().trim().min(1).max(30),
    supplier: z.string().trim().min(1).max(160),
    expectedDelivery: calendarDateSchema.optional(),
    notes: z.string().trim().max(300).optional(),
    lines: z
      .array(z.object({ itemId: objectId, quantity: z.number().int().positive(), unitCost: cost }))
      .min(1, 'A purchase order needs at least one line item')
      .max(100)
      .refine((lines) => new Set(lines.map((l) => l.itemId)).size === lines.length, 'Combine duplicate item lines'),
  }),
});

export const adjustStockSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
  body: z.object({
    expectedUpdatedAt: z.string().datetime().optional(),
    quantityDelta: z
      .number()
      .int()
      .refine((value) => value !== 0, 'Quantity adjustment cannot be zero'),
    type: z.string().trim().min(1).max(80),
    note: z.string().trim().max(300).optional(),
  }),
});

export const poIdParamSchema = z.object({
  body: z
    .object({
      expectedUpdatedAt: z.string().datetime().optional(),
      reason: z.string().trim().min(3).max(300).optional(),
    })
    .optional(),
  query: z.object({}).optional(),
  params: z.object({ id: objectId }),
});

export type CreateItemInput = z.infer<typeof createItemSchema>['body'];
export type ListItemsQuery = z.infer<typeof listItemsSchema>['query'];
export type CreatePOInput = z.infer<typeof createPOSchema>['body'];
export type AdjustStockInput = z.infer<typeof adjustStockSchema>['body'];

export const updateItemSchema = z.object({
  params: z.object({ id: objectId }),
  query: z.object({}).optional(),
  body: z.object({
    expectedUpdatedAt: z.string().datetime(),
    reason: z.string().trim().min(3).max(300),
    name: z.string().trim().min(1).max(160),
    category: z.string().trim().min(1).max(80),
    reorderLevel: z.number().int().min(0),
    unitCost: cost,
    supplier: z.string().trim().max(160),
    location: z.string().trim().max(160),
    condition: z.enum(['Good', 'Worn', 'Damaged']),
  }),
});
