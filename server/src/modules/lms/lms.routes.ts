import { z } from 'zod';
import aiRouter from './lms.ai.routes';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import { TeachingAssignment } from '../../models/TeachingAssignment';
import { AssignmentTemplate } from '../../models/AssignmentTemplate';
import { teacherMappings, assignTeaching, teachingOptions } from './lms.teaching.service';
import { createAssignmentBatch } from './lms.batch.service';
import { teachingSchema, templateSchema, batchAssignmentSchema } from './lms.validation';
import { Router } from 'express';
import * as controller from './lms.controller';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  createCourseSchema,
  updateCourseSchema,
  updateAssignmentSchema,
  submissionListSchema,
  listAssignmentsSchema,
  createAssignmentSchema,
  submitSchema,
  gradeSchema,
} from './lms.validation';

const router = Router();

router.use(requireAuth);
router.use('/ai', aiRouter);

const teachingRoles = requireRole('Administrator', 'Principal', 'Teacher');
router.get(
  '/teaching-assignments',
  teachingRoles,
  asyncHandler(async (req, res) => {
    sendSuccess(res, 200, await teacherMappings(req.user!));
  }),
);
router.get(
  '/teaching-options',
  requireRole('Administrator', 'Principal'),
  asyncHandler(async (_req, res) => {
    sendSuccess(res, 200, await teachingOptions());
  }),
);
router.post(
  '/teaching-assignments',
  requireRole('Administrator', 'Principal'),
  validate(teachingSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 201, await assignTeaching(req.body, req.user!));
  }),
);
router.patch(
  '/teaching-assignments/:id',
  requireRole('Administrator', 'Principal'),
  validate(
    z.object({
      params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }),
      body: z.object({ active: z.boolean(), expectedUpdatedAt: z.string().datetime() }),
    }),
  ),
  asyncHandler(async (req, res) => {
    const row = await TeachingAssignment.findOneAndUpdate(
      { _id: req.params.id, updatedAt: new Date(req.body.expectedUpdatedAt) },
      { $set: { active: req.body.active } },
      { new: true },
    );
    if (!row) throw ApiError.conflict('Teaching assignment changed; refresh');
    sendSuccess(res, 200, row);
  }),
);
router.get(
  '/templates',
  teachingRoles,
  asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      200,
      await AssignmentTemplate.find(
        req.user!.role === 'Teacher' ? { $or: [{ createdBy: req.user!.id }, { shared: true }] } : {},
      )
        .sort({ updatedAt: -1 })
        .limit(100),
    );
  }),
);
router.post(
  '/templates',
  teachingRoles,
  validate(templateSchema),
  asyncHandler(async (req, res) => {
    if (req.user!.role === 'Teacher' && req.body.shared)
      throw ApiError.forbidden('Only school leadership can share templates school-wide');
    sendSuccess(res, 201, await AssignmentTemplate.create({ ...req.body, createdBy: req.user!.id }));
  }),
);
router.delete(
  '/templates/:id',
  teachingRoles,
  validate(z.object({ params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }) })),
  asyncHandler(async (req, res) => {
    const row = await AssignmentTemplate.findOneAndDelete({
      _id: req.params.id,
      ...(req.user!.role === 'Teacher' ? { createdBy: req.user!.id } : {}),
    });
    if (!row) throw ApiError.notFound('Template not found');
    sendSuccess(res, 200, { deleted: true });
  }),
);
router.post(
  '/assignments/batch',
  teachingRoles,
  validate(batchAssignmentSchema),
  asyncHandler(async (req, res) => {
    sendSuccess(res, 201, await createAssignmentBatch(req.body, req.user!));
  }),
);
router.get('/courses', validate(listAssignmentsSchema), controller.listCourses);
router.post(
  '/courses',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createCourseSchema),
  controller.createCourse,
);

router.get('/assignments', validate(listAssignmentsSchema), controller.listAssignments);
router.post(
  '/assignments',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(createAssignmentSchema),
  controller.createAssignment,
);
router.post('/assignments/:id/submit', requireRole('Student'), validate(submitSchema), controller.submit);

router.get('/submissions', validate(submissionListSchema), controller.listSubmissions);
router.post(
  '/submissions/:id/grade',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(gradeSchema),
  controller.grade,
);

router.patch(
  '/assignments/:id',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(updateAssignmentSchema),
  controller.updateAssignment,
);
router.patch(
  '/courses/:id',
  requireRole('Administrator', 'Principal', 'Teacher'),
  validate(updateCourseSchema),
  controller.updateCourse,
);
export default router;
