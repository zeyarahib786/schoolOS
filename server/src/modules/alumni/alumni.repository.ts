import { ApiError } from '../../utils/ApiError';
import { Loan } from '../../models/Loan';
import { Route } from '../../models/Route';
import { HostelRoom } from '../../models/HostelRoom';
import mongoose, { FilterQuery } from 'mongoose';
import { AlumniProfile, IAlumniProfile } from '../../models/AlumniProfile';
import { Student } from '../../models/Student';
import { ListAlumniQuery, GraduateInput } from './alumni.validation';

export async function findMany(
  query: ListAlumniQuery,
  scope: FilterQuery<IAlumniProfile>,
): Promise<{ items: IAlumniProfile[]; total: number }> {
  const filter: FilterQuery<IAlumniProfile> = {};
  if (query.graduationYear) filter.graduationYear = query.graduationYear;

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    AlumniProfile.find({ $and: [filter, scope] })
      .sort({ graduationYear: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('student', 'name refId grade'),
    AlumniProfile.countDocuments({ $and: [filter, scope] }),
  ]);
  return { items, total };
}

export function findByStudentId(studentId: string): Promise<IAlumniProfile | null> {
  return AlumniProfile.findOne({ student: studentId });
}

/**
 * A THIRD transaction use case in this codebase (after Facilities' check-then-write and
 * Inventory's multi-item all-or-nothing): here it's cross-COLLECTION consistency - the Student's
 * `status` flips to 'Alumni' and the new AlumniProfile is created together, or neither happens.
 * Without a transaction, a crash between the two writes could leave a student marked Active with
 * no alumni profile ever created (recoverable, if annoying) or - worse - an AlumniProfile
 * pointing at a Student who's still marked Active everywhere else in the system (a genuinely
 * inconsistent, confusing state: is this person a current student or an alumnus?).
 */
export async function graduateStudent(input: GraduateInput, actor: string): Promise<IAlumniProfile> {
  const session = await mongoose.startSession();
  try {
    let created: IAlumniProfile | null = null;
    await session.withTransaction(async () => {
      const student = await Student.findById(input.studentId).session(session);
      if (!student) throw Object.assign(new Error('STUDENT_NOT_FOUND'), { code: 'STUDENT_NOT_FOUND' });
      if (student.status === 'Alumni') throw Object.assign(new Error('ALREADY_ALUMNI'), { code: 'ALREADY_ALUMNI' });

      if (student.status !== 'Active') throw ApiError.conflict('Only an active student can graduate');
      if (input.expectedUpdatedAt && student.updatedAt.toISOString() !== input.expectedUpdatedAt)
        throw ApiError.conflict('Student record changed; reload before graduating');
      // Serialize with circulation and allocation before checking outstanding operational links.
      student.__v += 1;
      await student.save({ session });
      const loan = await Loan.exists({ student: student._id, status: { $ne: 'Returned' } }).session(session);
      const route = await Route.exists({ assignedStudents: student._id }).session(session);
      const room = await HostelRoom.exists({ occupants: student._id }).session(session);
      if (loan || route || room)
        throw ApiError.conflict('Return library loans and remove transport/hostel allocations before graduation');
      student.status = 'Alumni';
      await student.save({ session });

      const [profile] = await AlumniProfile.create(
        [
          {
            student: input.studentId,
            graduatedBy: actor,
            academicCompletionConfirmed: true,
            graduationYear: input.graduationYear,
            currentEmployer: input.currentEmployer,
            contactEmail: input.contactEmail,
            notes: input.notes,
          },
        ],
        { session },
      );
      created = profile;
    });
    if (!created) throw new Error('Graduation transaction completed without producing a profile');
    return created;
  } finally {
    await session.endSession();
  }
}
