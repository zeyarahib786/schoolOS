import { logAudit } from '../audit/audit.service';
import mongoose from 'mongoose';
import { createHash } from 'crypto';
import { Assignment } from '../../models/Assignment';
import { AssignmentBatch } from '../../models/AssignmentBatch';
import { assignmentScope, prepareAssignment } from './lms.service';
import { AuthenticatedUser } from '../../middleware/auth';
import { CreateAssignmentInput } from './lms.validation';
import { ApiError } from '../../utils/ApiError';
export async function createAssignmentBatch(
  input: { assignment: CreateAssignmentInput; grades: string[]; idempotencyKey: string },
  user: AuthenticatedUser,
) {
  const grades = [...new Set(input.grades)].sort(),
    key = user.id + ':' + input.idempotencyKey;
  if (input.assignment.course && grades.length > 1)
    throw ApiError.badRequest('Multi-section assignments must be standalone; a course belongs to one section');
  const fingerprint = createHash('sha256')
    .update(JSON.stringify([input.assignment, grades]))
    .digest('hex');
  const existing = await AssignmentBatch.findOne({ requestKey: key });
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      throw ApiError.conflict('Batch key already used for different coursework');
    return Assignment.find({ $and: [{ batchKey: key }, await assignmentScope(user)] });
  }
  const prepared: Array<Awaited<ReturnType<typeof prepareAssignment>> & { batchKey: string }> = [];
  for (const grade of grades)
    prepared.push({ ...(await prepareAssignment({ ...input.assignment, grade }, user)), batchKey: key });
  let inserted = false;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const batch = await AssignmentBatch.findOne({ requestKey: key }).session(session);
      if (batch) {
        if (batch.fingerprint !== fingerprint)
          throw ApiError.conflict('Batch key already used for different coursework');
        return;
      }
      await AssignmentBatch.create([{ requestKey: key, fingerprint }], { session });
      await Assignment.create(prepared, { session, ordered: true });
      inserted = true;
    });
  } catch (e) {
    if ((e as { code?: number }).code !== 11000) throw e;
    const batch = await AssignmentBatch.findOne({ requestKey: key });
    if (!batch || batch.fingerprint !== fingerprint) throw ApiError.conflict('Batch changed; refresh');
  } finally {
    await session.endSession();
  }
  if (inserted) await logAudit('Created coursework batch for ' + grades.length + ' sections', 'LMS', user.id);
  return Assignment.find({ $and: [{ batchKey: key }, await assignmentScope(user)] });
}
