import { FilterQuery, Types } from 'mongoose';
import { CurriculumUnit, ICurriculumUnit } from '../../models/CurriculumUnit';
import { ListUnitsQuery, CreateUnitInput, UpdateUnitInput } from './curriculum.validation';

export async function findMany(query: ListUnitsQuery): Promise<{ items: ICurriculumUnit[]; total: number }> {
  const filter: FilterQuery<ICurriculumUnit> = { archived: query.archived ? true : { $ne: true } };
  if (query.grade) filter.grade = query.grade;
  if (query.academicYear) filter.academicYear = query.academicYear;
  if (query.term) filter.term = query.term;
  if (query.subject) filter.subject = query.subject;
  if (query.search) filter.$text = { $search: query.search };

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    CurriculumUnit.find(filter).sort({ subject: 1, sequenceOrder: 1 }).skip(skip).limit(query.limit),
    CurriculumUnit.countDocuments(filter),
  ]);
  return { items, total };
}

export function findById(id: string): Promise<ICurriculumUnit | null> {
  return CurriculumUnit.findById(id);
}

export function findDuplicate(
  subject: string,
  term: string,
  title: string,
  grade: string,
  academicYear: string,
  excludeId?: string,
): Promise<ICurriculumUnit | null> {
  const filter: FilterQuery<ICurriculumUnit> = { subject, term, title, grade, academicYear };
  if (excludeId) filter._id = { $ne: new Types.ObjectId(excludeId) };
  return CurriculumUnit.findOne(filter).collation({ locale: 'en', strength: 2 });
}

export function create(input: CreateUnitInput): Promise<ICurriculumUnit> {
  return CurriculumUnit.create(input);
}

export function updateById(id: string, input: UpdateUnitInput): Promise<ICurriculumUnit | null> {
  return CurriculumUnit.findByIdAndUpdate(id, input, { new: true, runValidators: true });
}

export function deleteById(id: string): Promise<ICurriculumUnit | null> {
  return CurriculumUnit.findByIdAndDelete(id);
}

export function distinctSubjects(): Promise<string[]> {
  return CurriculumUnit.distinct('subject', { archived: { $ne: true } });
}
