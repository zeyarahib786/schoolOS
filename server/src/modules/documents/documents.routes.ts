import { Router } from 'express';
import * as controller from './documents.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listDocumentsSchema, publishDocumentSchema, documentIdSchema } from './documents.validation';
import express from 'express';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listDocumentsSchema), controller.list);
router.get('/:id/file', validate(documentIdSchema), controller.downloadFile);
router.post(
  '/file',
  requireRole('Administrator', 'Principal', 'Teacher'),
  express.raw({ type: 'application/pdf', limit: '8mb' }),
  controller.publishFile,
);
router.post(
  '/',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(publishDocumentSchema),
  controller.publish,
);

export default router;
