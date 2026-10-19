import { FilterQuery } from 'mongoose';
import { ClinicVisit, IClinicVisit } from '../../models/ClinicVisit';
import { Student } from '../../models/Student';
import { ListVisitsQuery, CreateVisitInput } from './health.validation';

export async function findMany(
  query: ListVisitsQuery,
  applyOwnershipScope: (base: FilterQuery<IClinicVisit>) => FilterQuery<IClinicVisit>,
): Promise<{ items: IClinicVisit[]; total: number }> {
  let filter: FilterQuery<IClinicVisit> = {};
  if (query.studentId) filter.student = query.studentId;
  filter = applyOwnershipScope(filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    ClinicVisit.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('student', 'name refId grade')
      .populate('recordedBy', 'name role'),
    ClinicVisit.countDocuments(filter),
  ]);
  return { items, total };
}

export function create(input: CreateVisitInput, recordedBy: string): Promise<IClinicVisit> {
  const { studentId, ...visit } = input;
  return ClinicVisit.create({ ...visit, student: studentId, recordedBy });
}

export function findStudentById(id: string) {
  return Student.findById(id);
}

export function findAuthorizedStudentIds(userId: string, role: string) {
  return Student.find(
    role === 'Parent'
      ? { guardianUserId: userId }
      : role === 'Student'
        ? { studentUserId: userId }
        : { _id: { $in: [] } },
  )
    .select('_id')
    .then((students) => students.map((s) => s._id));
}
