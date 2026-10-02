import { Router } from 'express';
import * as controller from './certificates.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listCertificatesSchema, issueCertificateSchema, certificateDecisionSchema } from './certificates.validation';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listCertificatesSchema), controller.list);
router.post(
  '/',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(issueCertificateSchema),
  controller.issue,
);
router.post(
  '/:id/decision',
  requireRole('Administrator', 'Principal'),
  validate(certificateDecisionSchema),
  controller.decide,
);

export default router;
