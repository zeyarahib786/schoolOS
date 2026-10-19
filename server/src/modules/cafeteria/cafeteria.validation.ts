import { z } from 'zod';

const money = z
  .number()
  .positive()
  .max(100000)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001, 'Use at most two decimal places');
const movementFields = {
  requestId: z.string().trim().min(8).max(100).optional(),
  method: z.enum(['Cash', 'Card receipt', 'Bank receipt', 'Recorded sale']).optional(),
  reference: z.string().trim().min(1).max(200).optional(),
};

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const listWalletsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
export const listTransactionsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const topUpSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    studentId: objectId,
    amount: money,
    ...movementFields,
    description: z.string().trim().min(1).max(200).default('Wallet top-up'),
  }),
});

export const purchaseSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    studentId: objectId,
    amount: money,
    ...movementFields,
    description: z.string().trim().min(1).max(200),
  }),
});

export const listAllergyPlansSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
export const saveAllergyPlanSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    expectedUpdatedAt: z.string().datetime().optional(),
    reason: z.string().trim().min(3).max(500).optional(),
    studentId: objectId,
    allergens: z.string().trim().min(1).max(300),
    severity: z.enum(['Severe', 'Moderate', 'Mild']),
    carePlan: z.string().trim().min(1).max(1000),
  }),
});
const menuDay = z.enum(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']);
const mealSlot = z.enum(['Breakfast', 'Lunch', 'Snack']);
export const saveMenuItemSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    expectedUpdatedAt: z.string().datetime().optional(),
    reason: z.string().trim().min(3).max(500).optional(),
    day: menuDay,
    meal: mealSlot,
    item: z.string().trim().min(1).max(200),
    calories: z.number().int().min(0).max(5000),
    vegetarian: z.boolean(),
    allergens: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  }),
});

export type SaveAllergyPlanInput = z.infer<typeof saveAllergyPlanSchema>['body'];
export type SaveMenuItemInput = z.infer<typeof saveMenuItemSchema>['body'];

export type ListWalletsQuery = z.infer<typeof listWalletsSchema>['query'];
export type TopUpInput = z.infer<typeof topUpSchema>['body'];
export type PurchaseInput = z.infer<typeof purchaseSchema>['body'];
