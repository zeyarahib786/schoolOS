import { pdfSigningStatus, certificatePdf } from './certificates.pdf';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { z } from 'zod';
import { Router } from 'express';
import * as controller from './certificates.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  listCertificatesSchema,
  issueCertificateSchema,
  certificateDecisionSchema,
  requestCertificateSchema,
  cancelCertificateSchema,
} from './certificates.validation';

const router = Router();

router.use(requireAuth);

router.get(
  '/pdf-status',
  asyncHandler(async (_req, res) => {
    sendSuccess(res, 200, pdfSigningStatus());
  }),
);
router.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const id = z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .parse(req.params.id);
    const signed = z.enum(['true', 'false']).default('false').parse(req.query.signed) === 'true';
    const asset = await certificatePdf(id, signed, req.user!);
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="certificate-' + id + (signed ? '-signed' : '') + '.pdf"',
        'Cache-Control': 'private, no-store',
        'X-PDF-Signed': String(asset.signed),
        'X-PDF-SHA256': asset.sha256,
      })
      .send(Buffer.from(asset.content));
  }),
);
router.get('/requests', controller.requests);
router.post('/requests', requireRole('Parent', 'Student'), validate(requestCertificateSchema), controller.request);
router.post('/:id/cancel', requireRole('Parent', 'Student'), validate(cancelCertificateSchema), controller.cancel);
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
