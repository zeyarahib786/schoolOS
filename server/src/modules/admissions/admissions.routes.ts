import { Router } from 'express';
import * as controller from './admissions.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  listApplicationsSchema,
  createApplicationSchema,
  transitionSchema,
  enrollSchema,
  admissionDocumentParamSchema,
} from './admissions.validation';
import express from 'express';

const router = Router();

router.use(requireAuth);
router.use(requireRole('Administrator', 'Principal', 'Teacher')); // whole-module gate like Visitors - an admissions pipeline is internal staff work

router.get('/', validate(listApplicationsSchema), controller.list);
router.post('/', validate(createApplicationSchema), controller.create);
router.put(
  '/:id/documents/:key',
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
  validate(admissionDocumentParamSchema),
  controller.uploadDocument,
);
router.post(
  '/:id/documents/:key/mark-received',
  validate(admissionDocumentParamSchema),
  controller.markDocumentReceived,
);
router.get('/:id/documents/:key', validate(admissionDocumentParamSchema), controller.downloadDocument);
router.delete('/:id/documents/:key', validate(admissionDocumentParamSchema), controller.deleteDocument);
router.post('/:id/transition', validate(transitionSchema), controller.transition);
router.post('/:id/enroll', validate(enrollSchema), controller.enroll);

export default router;
