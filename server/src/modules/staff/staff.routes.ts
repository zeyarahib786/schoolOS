import { Router } from 'express';
import * as controller from './staff.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  listStaffSchema,
  staffIdParamSchema,
  createStaffSchema,
  updateStaffSchema,
  staffDocumentParamSchema,
  onboardingTaskParamSchema,
  staffAccountSchema,
} from './staff.validation';
import express from 'express';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listStaffSchema), controller.list);
router.put(
  '/:id/documents/:key',
  requireRole('Administrator', 'Principal'),
  express.raw({
    type: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    limit: '4mb',
  }),
  validate(staffDocumentParamSchema),
  controller.uploadDocument,
);
router.get('/:id/documents/:key', validate(staffDocumentParamSchema), controller.downloadDocument);
router.delete(
  '/:id/documents/:key',
  requireRole('Administrator', 'Principal'),
  validate(staffDocumentParamSchema),
  controller.deleteDocument,
);
router.post(
  '/:id/onboarding/:key/toggle',
  requireRole('Administrator', 'Principal'),
  validate(onboardingTaskParamSchema),
  controller.toggleOnboarding,
);
router.get('/:id', validate(staffIdParamSchema), controller.getOne);
router.post('/', requireRole('Administrator', 'Principal'), validate(createStaffSchema), controller.create);
router.patch(
  '/:id/account',
  requireRole('Administrator', 'Principal'),
  validate(staffAccountSchema),
  controller.linkAccount,
);
router.patch('/:id', requireRole('Administrator', 'Principal'), validate(updateStaffSchema), controller.update);
router.delete('/:id', requireRole('Administrator'), validate(staffIdParamSchema), controller.remove);

export default router;
