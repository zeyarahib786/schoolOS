import { z } from 'zod';

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
  body: z.object({}).optional(), params: z.object({}).optional(),
  query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }),
});

export const topUpSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    studentId: objectId,
    amount: z.number().positive(),
    description: z.string().trim().min(1).max(200).default('Wallet top-up'),
  }),
});

export const purchaseSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    studentId: objectId,
    amount: z.number().positive(),
    description: z.string().trim().min(1).max(200),
  }),
});

export const listAllergyPlansSchema = z.object({
  body: z.object({}).optional(), params: z.object({}).optional(),
  query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }),
});
export const saveAllergyPlanSchema = z.object({
  query: z.object({}).optional(), params: z.object({}).optional(),
  body: z.object({ studentId: objectId, allergens: z.string().trim().min(1).max(300), severity: z.enum(['Severe', 'Moderate', 'Mild']), carePlan: z.string().trim().min(1).max(1000) }),
});
const menuDay = z.enum(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']);
const mealSlot = z.enum(['Breakfast', 'Lunch', 'Snack']);
export const saveMenuItemSchema = z.object({
  query: z.object({}).optional(), params: z.object({}).optional(),
  body: z.object({ day: menuDay, meal: mealSlot, item: z.string().trim().min(1).max(200), calories: z.number().int().min(0).max(5000), vegetarian: z.boolean(), allergens: z.array(z.string().trim().min(1).max(80)).max(20).default([]) }),
});

export type SaveAllergyPlanInput = z.infer<typeof saveAllergyPlanSchema>['body'];
export type SaveMenuItemInput = z.infer<typeof saveMenuItemSchema>['body'];

export type ListWalletsQuery = z.infer<typeof listWalletsSchema>['query'];
export type TopUpInput = z.infer<typeof topUpSchema>['body'];
export type PurchaseInput = z.infer<typeof purchaseSchema>['body'];
