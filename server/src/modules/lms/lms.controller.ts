import { requireTeaching, teacherScope } from './lms.teaching.service';
import { Request, Response } from 'express';
import { Assignment } from '../../models/Assignment';
import { Student } from '../../models/Student';
import { getSettings } from '../settings/settings.repository';
import { listAssignmentsSchema } from './lms.validation';
import { Course } from '../../models/Course';
import { logAudit } from '../audit/audit.service';
import { asyncHandler } from '../../middleware/errorHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { ApiError } from '../../utils/ApiError';
import * as service from './lms.service';

function requireUser(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}

export const listAssignments = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listAssignments(listAssignmentsSchema.shape.query.parse(req.query), requireUser(req));
  sendSuccess(res, 200, result.items, { pagination: result.pagination });
});

export const createAssignment = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const assignment = await service.createAssignment(req.body, requester);
  sendSuccess(res, 201, assignment);
});

export const listSubmissions = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const assignmentId = typeof req.query.assignmentId === 'string' ? req.query.assignmentId : undefined;
  const submissions = await service.listSubmissions(requester, assignmentId);
  sendSuccess(res, 200, submissions);
});

export const submit = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const submission = await service.submitAssignment(req.params.id, req.body, requester);
  sendSuccess(res, 201, {...submission.toObject(),objectiveScore:undefined});
});

export const grade = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  const submission = await service.gradeSubmission(req.params.id, req.body, requester);
  sendSuccess(res, 200, submission);
});

export const listCourses = asyncHandler(async (req: Request, res: Response) => {
  const query = listAssignmentsSchema.shape.query.parse(req.query),
    { page, limit } = query,
    user = requireUser(req);
  const filter: Record<string, unknown> = { archived: query.archived ? true : { $ne: true } };
  if (query.grade) filter.grade = query.grade;
  if (query.subject) filter.subject = query.subject;
  if (query.academicYear) filter.academicYear = query.academicYear;
  if (user.role === 'Student' || user.role === 'Parent') {
    const students = await Student.find(
      user.role === 'Student' ? { studentUserId: user.id } : { guardianUserId: user.id },
    ).select('grade');
    const grades = students.map((r) => r.grade);
    filter.grade = query.grade ? (grades.includes(query.grade) ? query.grade : { $in: [] }) : { $in: grades };
  }
  const scopes = user.role === 'Teacher' ? await teacherScope(user) : [];
  const scoped =
    user.role === 'Teacher' ? { $and: [filter, { $or: scopes.length ? scopes : [{ _id: { $in: [] } }] }] } : filter;
  const [items, total] = await Promise.all([
    Course.find(scoped)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Course.countDocuments(scoped),
  ]);
  sendSuccess(res, 200, serviceCoursePrivacy(items, user.role), {
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export const createCourse = asyncHandler(async (req: Request, res: Response) => {
  const requester = requireUser(req);
  await requireTeaching(
    requester,
    req.body.grade,
    req.body.subject,
    req.body.academicYear || (await getSettings()).academicYear,
  );
  const course = await Course.create({
    ...req.body,
    academicYear: req.body.academicYear || (await getSettings()).academicYear,
    createdBy: requester.id,
  });
  await logAudit(`Created course ${course.title}`, 'LMS', requester.id);
  sendSuccess(res, 201, course);
});

export const updateAssignment = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, 200, await service.updateAssignment(req.params.id, req.body, requireUser(req)));
});
export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req),
    current = await Course.findById(req.params.id);
  if (!current) throw ApiError.notFound('Course not found');
  await requireTeaching(user, current.grade, current.subject, current.academicYear);
  const { expectedUpdatedAt, reason, ...changes } = req.body;
  await requireTeaching(
    user,
    changes.grade || current.grade,
    changes.subject || current.subject,
    changes.academicYear || current.academicYear,
  );
  if (
    (await Assignment.exists({ course: current._id })) &&
    ((changes.grade !== undefined && changes.grade !== current.grade) ||
      (changes.subject !== undefined && changes.subject !== current.subject) ||
      (changes.academicYear !== undefined && changes.academicYear !== current.academicYear))
  )
    throw ApiError.conflict('Linked assignments lock the course scope');
  const course = await Course.findOneAndUpdate(
    { _id: current._id, updatedAt: new Date(expectedUpdatedAt) },
    { $set: changes, $push: { history: { at: new Date(), actor: user.id, reason } } },
    { new: true, runValidators: true },
  );
  if (!course) throw ApiError.conflict('Course changed; refresh before saving');
  await logAudit('Reviewed course ' + current._id, 'LMS', user.id);
  sendSuccess(res, 200, course);
});

function serviceCoursePrivacy(items: Array<{ toObject: () => Record<string, unknown> }>, role: string) {
  return ['Administrator', 'Principal', 'Teacher'].includes(role)
    ? items
    : items.map((r) => ({ ...r.toObject(), history: [] }));
}
