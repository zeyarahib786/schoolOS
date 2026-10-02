import { FilterQuery, Types } from 'mongoose';
import { Attendance, IAttendance } from '../../models/Attendance';
import { StaffAttendance, IStaffAttendance } from '../../models/StaffAttendance';
import { AbsenceRequest, IAbsenceRequest } from '../../models/AbsenceRequest';
import { Student } from '../../models/Student';
import { ListAbsenceRequestsQuery, ListAttendanceQuery } from './attendance.validation';
import { AuthenticatedUser } from '../../middleware/auth';

export async function findMany(
  query: ListAttendanceQuery,
  applyOwnershipScope: (base: FilterQuery<IAttendance>) => FilterQuery<IAttendance>,
): Promise<{ items: IAttendance[]; total: number }> {
  let filter: FilterQuery<IAttendance> = {};
  if (query.studentId) filter.student = query.studentId;
  if (query.session) filter.session = query.session;
  if (query.status) filter.status = query.status;
  if (query.dateFrom || query.dateTo) {
    filter.date = {};
    if (query.dateFrom) filter.date.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.date.$lte = new Date(query.dateTo);
  }
  filter = applyOwnershipScope(filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Attendance.find(filter).sort({ date: -1 }).skip(skip).limit(query.limit).populate('student', 'name refId grade'),
    Attendance.countDocuments(filter),
  ]);
  return { items, total };
}

/** Student ids linked to a given guardian - the DB-dependent half of ownership scoping that
 * attendance.ownership.ts's pure function deliberately doesn't do itself. */
export async function findAuthorizedStudentIds(guardianUserId: string) {
  const students = await Student.find({ guardianUserId }).select('_id');
  return students.map((s) => s._id);
}

export function findStaffAttendance(
  filter: FilterQuery<IStaffAttendance>,
) {
  return StaffAttendance.find(filter).sort({ role: 1, name: 1 });
}

export function saveStaffAttendance(input: {
  userId: string;
  name: string;
  role: AuthenticatedUser['role'];
  date: Date;
  status: 'Present' | 'Remote' | 'Late';
}) {
  return StaffAttendance.findOneAndUpdate(
    { user: input.userId, date: input.date },
    {
      $set: {
        name: input.name,
        role: input.role,
        status: input.status,
        markedAt: new Date(),
      },
      $setOnInsert: {
        user: input.userId,
        date: input.date,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

export async function findAbsenceRequests(
  query: ListAbsenceRequestsQuery,
  filter: FilterQuery<IAbsenceRequest>,
): Promise<{ items: IAbsenceRequest[]; total: number }> {
  if (query.studentId) filter.student = query.studentId;
  if (query.status) filter.status = query.status;
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    AbsenceRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('student', 'name refId grade guardianUserId')
      .populate('requestedBy', 'name role'),
    AbsenceRequest.countDocuments(filter),
  ]);
  return { items, total };
}

export function createAbsenceRequest(input: {
  student: string;
  requestedBy: string;
  fromDate: Date;
  toDate: Date;
  days: number;
  type: 'Medical' | 'Family event' | 'Travel' | 'Religious observance' | 'Other';
  note: string;
}) {
  return AbsenceRequest.create(input);
}

export function findAbsenceRequestById(id: string) {
  return AbsenceRequest.findById(id).populate('student', 'name refId grade guardianUserId');
}

export function updateAbsenceRequestStatus(
  id: string,
  update: {
    status: 'Approved' | 'Rejected' | 'Cancelled';
    decidedBy?: string;
    decisionNote?: string;
    decidedAt?: Date;
  },
) {
  return AbsenceRequest.findByIdAndUpdate(id, { $set: update }, { new: true })
    .populate('student', 'name refId grade guardianUserId')
    .populate('requestedBy', 'name role');
}

export async function findExistingForEntries(date: Date, session: 'AM' | 'PM', studentIds: string[]) {
  return Attendance.find({ date, session, student: { $in: studentIds } }).select('student');
}

export function bulkCreate(
  records: Array<{
    student: string;
    date: Date;
    session: 'AM' | 'PM';
    status: 'Present' | 'Absent' | 'Late' | 'Excused';
    markedBy: string;
    notes?: string;
  }>,
) {
  return Attendance.insertMany(records, { ordered: true });
}

export async function bulkUpsert(
  records: Array<{
    student: string;
    date: Date;
    session: 'AM' | 'PM';
    status: 'Present' | 'Absent' | 'Late' | 'Excused';
    markedBy: string;
    notes?: string;
  }>,
) {
  if (!records.length) return { upsertedCount: 0, modifiedCount: 0, matchedCount: 0 };
  const result = await Attendance.bulkWrite(records.map((record) => {
    const student = new Types.ObjectId(record.student);
    const markedBy = new Types.ObjectId(record.markedBy);
    return {
      updateOne: {
        filter: { student, date: record.date, session: record.session },
        update: {
          $set: {
            status: record.status,
            markedBy,
            notes: record.notes,
          },
          $setOnInsert: {
            student,
            date: record.date,
            session: record.session,
          },
        },
        upsert: true,
      },
    };
  }));
  return {
    upsertedCount: result.upsertedCount,
    modifiedCount: result.modifiedCount,
    matchedCount: result.matchedCount,
  };
}
