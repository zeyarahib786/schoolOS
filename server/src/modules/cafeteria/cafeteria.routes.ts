import { Router } from 'express';
import * as controller from './cafeteria.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listWalletsSchema, topUpSchema, purchaseSchema, listTransactionsSchema, listAllergyPlansSchema, saveAllergyPlanSchema, saveMenuItemSchema } from './cafeteria.validation';

const router = Router();

router.use(requireAuth);

router.get('/wallets', validate(listWalletsSchema), controller.listWallets);
router.get('/transactions', validate(listTransactionsSchema), controller.listTransactions);
router.get('/allergy-plans', validate(listAllergyPlansSchema), controller.listAllergyPlans);
router.post('/allergy-plans', requireRole('Administrator', 'Principal'), validate(saveAllergyPlanSchema), controller.saveAllergyPlan);
router.get('/menu', controller.listMenu);
router.put('/menu/item', requireRole('Administrator', 'Principal'), validate(saveMenuItemSchema), controller.saveMenuItem);
router.post(
  '/wallets/top-up',
  requireRole('Administrator', 'Principal', 'Accountant'),
  validate(topUpSchema),
  controller.topUp,
);
router.post(
  '/wallets/purchase',
  requireRole('Administrator', 'Principal', 'Accountant'),
  validate(purchaseSchema),
  controller.purchase,
);

export default router;
