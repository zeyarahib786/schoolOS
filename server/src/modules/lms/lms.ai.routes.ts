import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middleware/errorHandler';
import { requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess } from '../../utils/apiResponse';
import { teacherAiConfig } from './lms.ai.provider';
import { aiGenerateSchema, aiRequest, aiIdSchema, aiEditSchema, aiApplySchema } from './lms.ai.validation';
import * as ai from './lms.ai.service';
const router = Router();
router.use(requireRole('Administrator', 'Principal', 'Teacher'));
router.get('/status', (_req, res) => sendSuccess(res, 200, teacherAiConfig()));
router.get(
  '/students',
  validate(z.object({ query: aiRequest.pick({ grade: true, subject: true, academicYear: true }) })),
  asyncHandler(async (req, res) =>
    sendSuccess(
      res,
      200,
      await ai.teacherAiStudents(req.query as { grade: string; subject: string; academicYear: string }, req.user!),
    ),
  ),
);
router.get(
  '/drafts',
  asyncHandler(async (req, res) => sendSuccess(res, 200, await ai.listAiDrafts(req.user!))),
);
router.post(
  '/drafts',
  validate(aiGenerateSchema),
  asyncHandler(async (req, res) => {
    const { requestId, ...input } = req.body;
    sendSuccess(res, 201, await ai.generateAiDraft(input, requestId, req.user!));
  }),
);
router.get(
  '/drafts/:id',
  validate(aiIdSchema),
  asyncHandler(async (req, res) => sendSuccess(res, 200, await ai.ownDraft(req.params.id, req.user!))),
);
router.patch(
  '/drafts/:id',
  validate(aiEditSchema),
  asyncHandler(async (req, res) =>
    sendSuccess(res, 200, await ai.editAiDraft(req.params.id, req.body.content, req.body.expectedUpdatedAt, req.user!)),
  ),
);
router.post(
  '/drafts/:id/apply',
  validate(aiApplySchema),
  asyncHandler(async (req, res) => sendSuccess(res, 200, await ai.applyAiDraft(req.params.id, req.body, req.user!))),
);
export default router;
