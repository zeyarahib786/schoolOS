import { Router } from 'express';
import * as controller from './audit.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listAuditLogSchema, recordAuditExportSchema } from './audit.validation';

/** Read access and a narrowly-scoped export acknowledgement are restricted to management.
 * There is deliberately no client-supplied create/update/delete route for audit entries. */
const router = Router();

router.use(requireAuth);
router.get('/', requireRole('Administrator', 'Principal'), validate(listAuditLogSchema), controller.list);
router.post('/exports', requireRole('Administrator', 'Principal'), validate(recordAuditExportSchema), controller.recordExport);

export default router;
