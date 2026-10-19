import { Router } from 'express';
import * as controller from './inventory.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  createItemSchema,
  listItemsSchema,
  createPOSchema,
  poIdParamSchema,
  adjustStockSchema,
  updateItemSchema,
} from './inventory.validation';

const router = Router();

router.use(requireAuth);
router.use(requireRole('Administrator', 'Principal', 'Teacher', 'Accountant'));

router.get('/items', validate(listItemsSchema), controller.listItems);
router.post(
  '/items',
  requireRole('Administrator', 'Principal', 'Teacher', 'Accountant'),
  validate(createItemSchema),
  controller.addItem,
);
router.post(
  '/items/:id/adjust',
  requireRole('Administrator', 'Principal', 'Teacher', 'Accountant'),
  validate(adjustStockSchema),
  controller.adjustStock,
);

router.get('/purchase-orders', controller.listPOs);
router.post(
  '/purchase-orders',
  requireRole('Administrator', 'Principal', 'Teacher', 'Accountant'),
  validate(createPOSchema),
  controller.createPO,
);
router.post(
  '/purchase-orders/:id/send',
  requireRole('Administrator', 'Principal', 'Teacher', 'Accountant'),
  validate(poIdParamSchema),
  controller.sendPO,
);
router.post(
  '/purchase-orders/:id/receive',
  requireRole('Administrator', 'Principal', 'Teacher', 'Accountant'),
  validate(poIdParamSchema),
  controller.receivePO,
);
router.post(
  '/purchase-orders/:id/cancel',
  requireRole('Administrator', 'Principal', 'Teacher', 'Accountant'),
  validate(poIdParamSchema),
  controller.cancelPO,
);

router.patch('/items/:id', validate(updateItemSchema), controller.updateItem);

export default router;
