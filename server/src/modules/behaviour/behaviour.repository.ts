import { FilterQuery } from 'mongoose';
import { BehaviourIncident, IBehaviourIncident } from '../../models/BehaviourIncident';
import { Student } from '../../models/Student';
import { ListIncidentsQuery, CreateIncidentInput } from './behaviour.validation';

export async function findMany(
  query: ListIncidentsQuery,
  applyOwnershipScope: (base: FilterQuery<IBehaviourIncident>) => FilterQuery<IBehaviourIncident>,
): Promise<{ items: IBehaviourIncident[]; total: number }> {
  let filter: FilterQuery<IBehaviourIncident> = {};
  if (query.studentId) filter.student = query.studentId;
  if (query.severity) filter.severity = query.severity;
  filter = applyOwnershipScope(filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    BehaviourIncident.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('student', 'name refId grade')
      .populate('reportedBy', 'name role')
      .populate('assignedTo', 'name role email'),
    BehaviourIncident.countDocuments(filter),
  ]);
  return { items, total };
}

export function create(input: CreateIncidentInput, reportedBy: string): Promise<IBehaviourIncident> {
  const { studentId, ...incident } = input;
  return BehaviourIncident.create({
    ...incident,
    student: studentId,
    reportedBy,
    status: input.type === 'Merit' ? 'Closed' : 'Logged',
  });
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
