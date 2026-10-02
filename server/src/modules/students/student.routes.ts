import { Router } from 'express';
import * as controller from './student.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  listStudentsSchema,
  studentIdParamSchema,
  createStudentSchema,
  updateStudentSchema,
  studentDocumentParamSchema,
} from './student.validation';
import express from 'express';

const router = Router();

// All student routes require authentication. Parent and Student reads are scoped by
// linked account IDs in the service; writes are restricted by role.
router.use(requireAuth);

router.get('/', validate(listStudentsSchema), controller.list);
router.put('/:id/documents/:key', requireRole('Administrator', 'Principal', 'Teacher'),
  express.raw({ type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], limit: '4mb' }),
  validate(studentDocumentParamSchema), controller.uploadDocument);
router.get('/:id/documents/:key', validate(studentDocumentParamSchema), controller.downloadDocument);
router.delete('/:id/documents/:key', requireRole('Administrator', 'Principal', 'Teacher'),
  validate(studentDocumentParamSchema), controller.deleteDocument);
router.get('/:id', validate(studentIdParamSchema), controller.getOne);
router.post(
  '/',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createStudentSchema),
  controller.create,
);
router.patch(
  '/:id',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(updateStudentSchema),
  controller.update,
);
router.delete('/:id', requireRole('Administrator', 'Principal'), validate(studentIdParamSchema), controller.remove);

export default router;
