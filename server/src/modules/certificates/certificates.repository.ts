import { ApiError } from '../../utils/ApiError';
import mongoose, { FilterQuery, Types } from 'mongoose';
import { Certificate, ICertificate } from '../../models/Certificate';
import { Counter } from '../../models/Counter';
import { Student } from '../../models/Student';
import { Role } from '../../types/roles';
import { ListCertificatesQuery, IssueCertificateInput } from './certificates.validation';
import { formatCertNumber, counterKey } from './certificates.numbering';

/**
 * The atomic sequence generation itself. `$inc` on a single counter document is atomic in
 * MongoDB - two concurrent requests for the same (type, year) counter cannot both receive the
 * same `seq` value, the same underlying guarantee Library's atomic stock decrement relies on,
 * applied to a different problem (generating a unique number, not checking availability).
 * `upsert: true` means the very first certificate of a given type/year creates the counter
 * document starting at 1, with no separate "initialize the counter" step needed.
 */
async function nextSequence(type: string, year: number): Promise<number> {
  const counter = await Counter.findOneAndUpdate(
    { _id: counterKey(type, year) },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return counter.seq;
}

export async function findMany(
  query: ListCertificatesQuery,
  applyOwnershipScope: (base: FilterQuery<ICertificate>) => FilterQuery<ICertificate>,
): Promise<{ items: ICertificate[]; total: number }> {
  let filter: FilterQuery<ICertificate> = {};
  if (query.studentId) filter.student = query.studentId;
  if (query.type) filter.type = query.type;
  if (query.status === 'Issued') filter.$or = [{ status: 'Issued' }, { status: { $exists: false } }];
  else if (query.status) filter.status = query.status;
  filter = applyOwnershipScope(filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Certificate.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('student', 'name refId grade')
      .populate('issuedBy', 'name'),
    Certificate.countDocuments(filter),
  ]);
  return { items, total };
}

export async function issue(input: IssueCertificateInput, issuedBy: string): Promise<ICertificate> {
  if (input.status === 'Pending') {
    const id = new Types.ObjectId();
    return Certificate.create({
      _id: id,
      certNumber: `REQ-${id.toString().slice(-12).toUpperCase()}`,
      student: input.studentId,
      type: input.type,
      purpose: input.purpose,
      status: 'Pending',
      requestedBy: issuedBy,
    });
  }
  const year = new Date().getFullYear();
  const seq = await nextSequence(input.type, year);
  const certNumber = formatCertNumber(input.type, year, seq);
  return Certificate.create({
    certNumber,
    student: input.studentId,
    type: input.type,
    purpose: input.purpose,
    status: 'Issued',
    requestedBy: issuedBy,
    issuedBy,
    issuedDate: new Date(),
  });
}

export async function findById(id: string): Promise<ICertificate | null> {
  return Certificate.findById(id);
}

export async function decide(
  id: string,
  decision: 'Issued' | 'Rejected',
  decisionBy: string,
  type: string,
  expectedUpdatedAt?: string,
  reason?: string,
): Promise<ICertificate | null> {
  const now = new Date();
  if (decision === 'Rejected') {
    return Certificate.findOneAndUpdate(
      { _id: id, status: 'Pending', ...(expectedUpdatedAt ? { updatedAt: new Date(expectedUpdatedAt) } : {}) },
      {
        $set: { status: 'Rejected', decisionBy, decisionAt: now, decisionReason: reason || 'Office decision recorded' },
      },
      { new: true },
    );
  }
  const seq = await nextSequence(type, now.getFullYear());
  return Certificate.findOneAndUpdate(
    { _id: id, status: 'Pending', ...(expectedUpdatedAt ? { updatedAt: new Date(expectedUpdatedAt) } : {}) },
    {
      $set: {
        status: 'Issued',
        certNumber: formatCertNumber(type, now.getFullYear(), seq),
        issuedBy: decisionBy,
        issuedDate: now,
        decisionBy,
        decisionAt: now,
        decisionReason: reason || 'Office decision recorded',
      },
    },
    { new: true },
  );
}

export function findAuthorizedStudentIds(userId: string, role: Role) {
  const filter =
    role === 'Parent'
      ? { guardianUserId: userId }
      : role === 'Student'
        ? { studentUserId: userId }
        : { _id: { $in: [] } };
  return Student.find(filter)
    .select('_id')
    .then((students) => students.map((s) => s._id));
}

export async function createPendingRequest(input: IssueCertificateInput, requester: string, role?: string) {
  const session = await mongoose.startSession();
  let created: ICertificate | null = null;
  try {
    await session.withTransaction(async () => {
      const student = await Student.findOneAndUpdate(
        {
          _id: input.studentId,
          ...(role === 'Parent'
            ? { guardianUserId: requester }
            : role === 'Student'
              ? { studentUserId: requester }
              : {}),
        },
        { $inc: { __v: 1 } },
        { session },
      );
      if (!student) throw ApiError.forbidden('Student ownership changed or the student is unavailable');
      const existing = await Certificate.exists({
        student: input.studentId,
        type: input.type,
        status: 'Pending',
      }).session(session);
      if (existing) throw ApiError.conflict('A pending request already exists for this document type');
      const id = new Types.ObjectId();
      created = (
        await Certificate.create(
          [
            {
              _id: id,
              certNumber: 'REQ-' + id.toString().slice(-12).toUpperCase(),
              student: input.studentId,
              type: input.type,
              purpose: input.purpose,
              requestedBy: requester,
              status: 'Pending',
            },
          ],
          { session },
        )
      )[0];
    });
    return created;
  } finally {
    await session.endSession();
  }
}
