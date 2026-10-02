import { FilterQuery } from 'mongoose';
import { Student, IStudent } from '../../models/Student';
import { ListStudentsQuery, CreateStudentInput, UpdateStudentInput } from './student.validation';

/** Repository layer isolates every Mongoose query in one place - the service layer never
 * touches `Student.find()` directly, which keeps query-shape changes (e.g. adding an index-aware
 * filter) to a single file instead of scattered across the codebase. */
export async function findMany(
  query: ListStudentsQuery,
  applyOwnershipScope: (base: FilterQuery<IStudent>) => FilterQuery<IStudent>,
): Promise<{ items: IStudent[]; total: number }> {
  let filter: FilterQuery<IStudent> = {};
  if (query.grade) filter.grade = query.grade;
  if (query.status) filter.status = query.status;
  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { refId: { $regex: escaped, $options: 'i' } },
    ];
  }
  filter = applyOwnershipScope(filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Student.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Student.countDocuments(filter),
  ]);
  return { items, total };
}

export function findById(id: string): Promise<IStudent | null> {
  return Student.findById(id);
}

export function findByRefId(refId: string): Promise<IStudent | null> {
  return Student.findOne({ refId });
}

export function create(input: CreateStudentInput): Promise<IStudent> {
  return Student.create(input);
}

export function updateById(id: string, input: UpdateStudentInput): Promise<IStudent | null> {
  return Student.findByIdAndUpdate(id, input, { new: true, runValidators: true });
}

export function deleteById(id: string): Promise<IStudent | null> {
  return Student.findByIdAndDelete(id);
}
