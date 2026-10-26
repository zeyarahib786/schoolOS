import mongoose from 'mongoose';
import { createHash } from 'crypto';
import { TeacherAiDraft } from '../../models/TeacherAiDraft';
import { CurriculumUnit } from '../../models/CurriculumUnit';
import { Student } from '../../models/Student';
import { Assignment } from '../../models/Assignment';
import { Submission } from '../../models/Submission';
import { Attendance } from '../../models/Attendance';
import { User } from '../../models/User';
import { Message } from '../../models/Message';
import { InboxNotification } from '../../models/InboxNotification';
import { ClassSection } from '../../models/ClassSection';
import { AuthenticatedUser } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { requireTeaching, teacherScope } from './lms.teaching.service';
import { prepareAssignment } from './lms.service';
import { createAssignmentSchema } from './lms.validation';
import { validateAssessment } from './lms.assessment';
import { AiRequest, AiContent, AiApply, aiContent } from './lms.ai.validation';
import { generateTeacherContent, teacherAiConfig } from './lms.ai.provider';
import { queueNotification } from '../notifications/notifications.service';
import { assertGuardianPortalAccess } from '../guardians/guardians.access';
import { logAudit } from '../audit/audit.service';

async function scope(input: AiRequest, user: AuthenticatedUser) {
  await requireTeaching(user, input.grade, input.subject, input.academicYear);
  const classes = await ClassSection.find({ status: 'Active' }).select('grade section');
  if (!classes.some((c) => c.grade + ' · ' + c.section === input.grade))
    throw ApiError.badRequest('Select an active class section');
}
async function studentContext(input: AiRequest) {
  if (!input.studentId) throw ApiError.badRequest('Select a student from this class');
  const student = await Student.findOne({ _id: input.studentId, grade: input.grade, status: 'Active' });
  if (!student) throw ApiError.notFound('Active student in this class not found');
  return student;
}
export async function teacherAiStudents(
  input: { grade: string; subject: string; academicYear: string },
  user: AuthenticatedUser,
) {
  await requireTeaching(user, input.grade, input.subject, input.academicYear);
  return Student.find({ grade: input.grade, status: 'Active' }).select('_id name refId').sort({ name: 1 }).limit(300);
}
async function buildContext(input: AiRequest) {
  const baseGrade = input.grade.split(' · ')[0];
  const units = await CurriculumUnit.find({
    subject: input.subject,
    academicYear: input.academicYear,
    archived: false,
    grade: { $in: [input.grade, baseGrade, 'All grades'] },
  })
    .sort({ sequenceOrder: 1 })
    .limit(20)
    .select('title outcomes framework updatedAt');
  const sources = units.map((u) => ({ title: u.title, updatedAt: u.updatedAt.toISOString() }));
  const warnings = units.length ? [] : ['No matching school curriculum was found. Review alignment before use.'];
  const facts: Record<string, unknown> = {};
  let sourceVersion: string | undefined;
  let studentWork: unknown;
  if (input.kind === 'Feedback') {
    if (!input.submissionId) throw ApiError.badRequest('Select a submission to assess');
    const submission = await Submission.findById(input.submissionId);
    const assignment = submission ? await Assignment.findById(submission.assignment) : null;
    if (
      !submission ||
      !assignment ||
      assignment.grade !== input.grade ||
      assignment.subject !== input.subject ||
      assignment.academicYear !== input.academicYear
    )
      throw ApiError.notFound('Submission in this teaching scope not found');
    facts.maxScore = assignment.maxScore;
    facts.objectiveScore = submission.objectiveScore ?? null;
    sourceVersion =
      submission.updatedAt.toISOString() +
      '|' +
      createHash('sha256')
        .update(
          JSON.stringify([
            assignment.description,
            assignment.questions,
            assignment.maxScore,
            assignment.grade,
            assignment.subject,
            assignment.academicYear,
          ]),
        )
        .digest('hex');
    facts.objectiveMaximum = assignment.questions.filter((q) => q.type === 'MCQ').reduce((n, q) => n + q.marks, 0);
    studentWork = {
      assignment: assignment.description,
      questions: assignment.questions,
      response: submission.content,
      answers: submission.answers.map(({ questionId, value }) => ({ questionId, value })),
      maxScore: assignment.maxScore,
      objectiveScore: submission.objectiveScore,
    };
    warnings.push('Suggested assessment requires teacher review; no grade has been saved.');
  }
  if (input.kind === 'ParentMessage' || input.kind === 'Progress') {
    const student = await studentContext(input);
    // Attendance has no academic-year field: report an explicit rolling window, never assume school term dates.
    const start = new Date(Date.now() - input.reportDays * 86400000);
    const end = new Date();
    const assignments = await Assignment.find({
      grade: input.grade,
      subject: input.subject,
      academicYear: input.academicYear,
      status: { $in: ['Published', 'Closed'] },
    }).select('_id maxScore dueDate');
    const submissions = await Submission.find({
      student: student._id,
      assignment: { $in: assignments.map((a) => a._id) },
    }).select('assignment status score');
    const attendance = await Attendance.find({
      student: student._id,
      date: { $gte: start, $lt: new Date(Math.min(end.getTime(), Date.now())) },
    }).select('status');
    const graded = submissions.filter((s) => s.status === 'Graded' && typeof s.score === 'number');
    const counted = attendance.filter((a) => a.status !== 'Excused');
    Object.assign(facts, {
      windowStart: start.toISOString(),
      windowEnd: new Date(Math.min(end.getTime(), Date.now())).toISOString(),
      subject: input.subject,
      publishedAssignments: assignments.length,
      submitted: submissions.length,
      graded: graded.length,
      overdueUnsubmitted: assignments.filter(
        (a) => a.dueDate < new Date() && !submissions.some((s) => String(s.assignment) === String(a._id)),
      ).length,
      averagePercent: graded.length
        ? Math.round(
            graded.reduce(
              (n, s) =>
                n + (100 * s.score!) / assignments.find((a) => String(a._id) === String(s.assignment))!.maxScore,
              0,
            ) / graded.length,
          )
        : null,
      recordedSessions: attendance.length,
      countedSessions: counted.length,
      presentOrLate: counted.filter((a) => a.status === 'Present' || a.status === 'Late').length,
      absent: counted.filter((a) => a.status === 'Absent').length,
      excused: attendance.filter((a) => a.status === 'Excused').length,
      attendancePercent: counted.length
        ? Math.round(
            (100 * counted.filter((a) => a.status === 'Present' || a.status === 'Late').length) / counted.length,
          )
        : null,
    });
    warnings.push(
      'Attendance covers the selected rolling window across subjects. Coursework covers the selected academic year. Missing registers are not absence.',
    );
    if (!graded.length) warnings.push('No graded coursework is available for this subject and year.');
  }
  return {
    sources,
    warnings,
    facts,
    sourceVersion,
    provider: {
      request: { ...input, studentId: undefined, submissionId: undefined },
      curriculum: units.map((u) => ({ title: u.title, outcomes: u.outcomes, framework: u.framework })),
      facts,
      reportingScope: input.kind === 'ParentMessage' || input.kind === 'Progress' ? {
        attendance: 'This student only, across all subjects in the explicit rolling date window; not subject sessions or whole-class attendance.',
        coursework: 'Selected academic year, not necessarily within the attendance date window.',
        averagePercent: 'Mean of graded submission percentages only; not completion rate and not the average of all published work.',
        submissionTiming: 'No on-time submission evidence is supplied; overdueUnsubmitted does not establish on-time submission.',
      } : undefined,
      studentWork,
    },
  };
}
function validateContent(input: AiRequest, content: AiContent, facts: Record<string, unknown>) {
  aiContent.parse(content);
  if (input.kind === 'Assignment' || input.kind === 'Quiz') {
    if (content.questions.length !== input.questionCount)
      throw ApiError.badRequest('AI question count differs from the request');
    validateAssessment(content.questions, input.maxScore);
    if (content.body.length > 2000)
      throw ApiError.badRequest('Assignment instructions must be 2000 characters or less');
  } else if (content.questions.length)
    throw ApiError.badRequest('Only assignment and quiz drafts may contain questions');
  if (input.kind === 'Feedback' && (content.suggestedScore === null || content.suggestedScore > Number(facts.maxScore)))
    throw ApiError.badRequest('Suggested score must be within assignment marks');
  if (
    input.kind === 'Feedback' &&
    typeof facts.objectiveScore === 'number' &&
    (content.suggestedScore! < facts.objectiveScore ||
      (facts.objectiveMaximum === facts.maxScore && content.suggestedScore !== facts.objectiveScore))
  )
    throw ApiError.badRequest('Suggested grade must respect the deterministic objective score');
  if (input.kind !== 'Feedback' && content.suggestedScore !== null)
    throw ApiError.badRequest('A score is only allowed for feedback');
}
export async function generateAiDraft(input: AiRequest, requestId: string, user: AuthenticatedUser) {
  await scope(input, user);
  if (['Assignment', 'Quiz'].includes(input.kind) && input.maxScore < input.questionCount)
    throw ApiError.badRequest('Maximum marks must allow at least one mark per question');
  const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const previous = await TeacherAiDraft.findOne({ owner: user.id, requestId });
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw ApiError.conflict('Request already used for different content');
    return previous;
  }
  const config = teacherAiConfig();
  if (!config.configured) throw new ApiError(503, 'AI_NOT_CONFIGURED', config.reason);
  const context = await buildContext(input);
  // Persist reservation before contacting the provider; retries never silently create a second paid generation.
  if (
    (await TeacherAiDraft.countDocuments({ owner: user.id, createdAt: { $gte: new Date(Date.now() - 3600000) } })) >= 30
  )
    throw new ApiError(429, 'AI_LIMIT', 'Hourly AI draft limit reached. Reuse an existing draft or try later.');
  let draft;
  try {
    draft = await TeacherAiDraft.create({
      owner: user.id,
      requestId,
      fingerprint,
      request: input,
      status: 'Generating',
      model: config.model,
      provider: config.provider as 'openai' | 'gemini' | 'groq',
      sources: context.sources,
      facts: context.facts,
      sourceVersion: context.sourceVersion,
    });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) return TeacherAiDraft.findOne({ owner: user.id, requestId });
    throw e;
  }
  try {
    const content = await generateTeacherContent(context.provider);
    validateContent(input, content, context.facts);
    content.warnings = [...new Set([...context.warnings, ...content.warnings])].slice(0, 10);
    // Permissions can change during a slow provider call.
    await scope(input, user);
    draft.content = content;
    draft.status = 'Draft';
    await draft.save();
    await logAudit('Generated teacher AI ' + input.kind + ' draft ' + draft._id, 'LMS', user.id);
    return draft;
  } catch (e) {
    draft.status = 'Failed';
    draft.failureMessage =
      e instanceof ApiError
        ? e.message
        : 'Generation failed unexpectedly. Please try again or contact school administration.';
    await draft.save();
    throw e;
  }
}
export async function listAiDrafts(user: AuthenticatedUser) {
  await TeacherAiDraft.updateMany(
    { owner: user.id, status: 'Generating', createdAt: { $lt: new Date(Date.now() - 180000) } },
    {
      $set: {
        status: 'Failed',
        failureMessage: 'Generation was interrupted or timed out. Please create a new attempt.',
      },
    },
  );
  const scopes = user.role === 'Teacher' ? await teacherScope(user) : null;
  return TeacherAiDraft.find({
    owner: user.id,
    ...(scopes
      ? {
          $or: scopes.length
            ? scopes.map((s) => ({
                'request.grade': s.grade,
                'request.subject': s.subject,
                'request.academicYear': s.academicYear,
              }))
            : [{ _id: { $in: [] } }],
        }
      : {}),
  })
    .select('request.kind request.grade request.topic status content.title createdAt updatedAt')
    .sort({ createdAt: -1 })
    .limit(50);
}
export async function ownDraft(id: string, user: AuthenticatedUser) {
  const draft = await TeacherAiDraft.findOne({ _id: id, owner: user.id });
  if (!draft) throw ApiError.notFound('AI draft not found');
  await scope(draft.request, user);
  return draft;
}
export async function editAiDraft(id: string, content: AiContent, expectedUpdatedAt: string, user: AuthenticatedUser) {
  const draft = await ownDraft(id, user);
  validateContent(draft.request, content, draft.facts);
  const row = await TeacherAiDraft.findOneAndUpdate(
    { _id: id, owner: user.id, status: 'Draft', updatedAt: new Date(expectedUpdatedAt) },
    { $set: { content } },
    { new: true },
  );
  if (!row) throw ApiError.conflict('Draft changed or was already applied. Refresh before saving');
  return row;
}
export async function applyAiDraft(id: string, input: AiApply, user: AuthenticatedUser) {
  const draft = await ownDraft(id, user);
  const actionFingerprint = createHash('sha256')
    .update(JSON.stringify({ ...input, expectedUpdatedAt: undefined }))
    .digest('hex');
  if (draft.status === 'Applied') {
    if (draft.appliedAction !== actionFingerprint)
      throw ApiError.conflict('This draft was already applied with different options');
    return draft;
  }
  if (!draft.content) throw ApiError.conflict('Generate a complete draft first');
  validateContent(draft.request, draft.content, draft.facts);
  const kind = draft.request.kind;
  if (
    (input.action === 'SaveAssignment' && !['Assignment', 'Quiz'].includes(kind)) ||
    (input.action === 'Grade' && kind !== 'Feedback') ||
    (input.action === 'Message' && kind !== 'ParentMessage')
  )
    throw ApiError.badRequest('This action does not match the draft');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const locked = await TeacherAiDraft.findOneAndUpdate(
        { _id: id, owner: user.id, status: 'Draft', updatedAt: new Date(input.expectedUpdatedAt) },
        { $set: { status: 'Applying' } },
        { session, new: true },
      );
      if (!locked) throw ApiError.conflict('Draft changed or another action is in progress');
      const content = draft.content!;
      let record = '';
      if (input.action === 'SaveAssignment') {
        const parsed = createAssignmentSchema.shape.body.parse({
          title: content.title,
          description: content.body,
          questions: content.questions,
          grade: draft.request.grade,
          subject: draft.request.subject,
          academicYear: draft.request.academicYear,
          maxScore: draft.request.maxScore,
          dueDate: input.dueDate,
          status: input.status,
          publishAt: input.publishAt,
          acceptLate: false,
        });
        const prepared = await prepareAssignment(parsed, user);
        const [assignment] = await Assignment.create([prepared], { session });
        record = String(assignment._id);
      } else if (input.action === 'Grade') {
        const sub = await Submission.findById(draft.request.submissionId).session(session);
        const assignment = sub ? await Assignment.findById(sub.assignment).session(session) : null;
        if (
          !sub ||
          !assignment ||
          sub.updatedAt.toISOString() +
            '|' +
            createHash('sha256')
              .update(
                JSON.stringify([
                  assignment.description,
                  assignment.questions,
                  assignment.maxScore,
                  assignment.grade,
                  assignment.subject,
                  assignment.academicYear,
                ]),
              )
              .digest('hex') !==
            draft.sourceVersion ||
          assignment.grade !== draft.request.grade ||
          assignment.subject !== draft.request.subject ||
          assignment.academicYear !== draft.request.academicYear
        )
          throw ApiError.conflict('Source submission changed; generate a new assessment draft');
        if (
          content.body.length > 2000 ||
          content.suggestedScore === null ||
          content.suggestedScore > assignment.maxScore
        )
          throw ApiError.badRequest('Review feedback length and score');
        const saved = await Submission.findOneAndUpdate(
          { _id: sub._id, updatedAt: sub.updatedAt },
          {
            $set: {
              score: content.suggestedScore,
              feedback: content.body,
              status: 'Graded',
              gradedBy: user.id,
              gradedAt: new Date(),
            },
            $push: {
              gradeHistory: {
                at: new Date(),
                actor: user.id,
                reason: 'Teacher reviewed AI suggestion',
                previousScore: sub.score,
                score: content.suggestedScore,
                feedback: content.body,
              },
            },
          },
          { session, new: true },
        );
        if (!saved) throw ApiError.conflict('Submission changed');
        record = String(saved._id);
      } else {
        const student = await studentContext(draft.request);
        const parent = student.guardianUserId
          ? await User.findOne({ _id: student.guardianUserId, role: 'Parent', isActive: true })
          : null;
        if (!parent) throw ApiError.badRequest('No active parent portal account is linked to this student');
        await assertGuardianPortalAccess(String(parent._id), parent.role);
        if (input.channel === 'InApp') {
          const [message] = await Message.create(
            [{ sender: user.id, recipient: parent._id, subject: content.title, body: content.body }],
            { session },
          );
          await InboxNotification.create(
            [
              {
                recipient: parent._id,
                eventKey: 'message:' + message._id,
                title: 'New school message',
                body: content.title,
                module: 'communication',
                recordId: message._id,
              },
            ],
            { session },
          );
          record = String(message._id);
        } else {
          // Queue only, never call an external provider inside the transaction. The queue row commits atomically with the reviewed draft.
          const delivery = await queueNotification(
            {
              recipientEmail: parent.email,
              channel: input.channel,
              subject: content.title,
              body: content.body,
              idempotencyKey: 'teacher-ai:' + id,
            },
            user,
            { teacherAiDraft: id },
            session,
          );
          record = String(delivery._id);
        }
      }
      await TeacherAiDraft.updateOne(
        { _id: id },
        { $set: { status: 'Applied', appliedRecord: record, appliedAction: actionFingerprint } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  await logAudit('Applied reviewed teacher AI ' + kind + ' draft ' + id, 'LMS', user.id);
  return TeacherAiDraft.findById(id);
}
