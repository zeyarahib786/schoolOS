import { FilterQuery } from 'mongoose';
import { ClassSection, IClassSection } from '../../models/ClassSection';
import { Staff } from '../../models/Staff';
import { Student } from '../../models/Student';
import { CreateClassInput, ListClassesQuery } from './classes.validation';

export async function findMany(query: ListClassesQuery): Promise<{ items: IClassSection[]; total: number }> {
  const filter: FilterQuery<IClassSection> = {};
  if (query.stream) filter.stream = query.stream;
  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ grade: new RegExp(escaped, 'i') }, { section: new RegExp(escaped, 'i') }];
  }
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    ClassSection.find(filter)
      .collation({ locale: 'en', strength: 2 })
      .sort({ grade: 1, section: 1 })
      .skip(skip)
      .limit(query.limit)
      .populate('teacherStaffId', 'name type status')
      .populate('representativeStudentId', 'name grade status'),
    ClassSection.countDocuments(filter),
  ]);
  return { items, total };
}

export function findDuplicate(grade: string, section: string): Promise<IClassSection | null> {
  return ClassSection.findOne({ grade, section }).collation({ locale: 'en', strength: 2 });
}

export function findTeacher(id: string) {
  return Staff.findById(id);
}

export function countActiveStudents(className: string): Promise<number> {
  return Student.countDocuments({ grade: className, status: 'Active' });
}

export async function countActiveStudentsByClass(classNames: string[]): Promise<Map<string, number>> {
  const rows = await Student.aggregate<{ _id: string; count: number }>([
    { $match: { grade: { $in: classNames }, status: 'Active' } },
    { $group: { _id: '$grade', count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [row._id, row.count]));
}

export function create(input: CreateClassInput): Promise<IClassSection> {
  return ClassSection.create(input);
}
