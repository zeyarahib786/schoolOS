import { AuthenticatedUser } from '../../middleware/auth';
import { ClassSection, IClassSection } from '../../models/ClassSection';
import { ApiError } from '../../utils/ApiError';
import { logAudit } from '../audit/audit.service';
import * as repo from './classes.repository';
import { CreateClassInput, ListClassesQuery, UpdateClassInput } from './classes.validation';

function className(row: Pick<IClassSection, 'grade' | 'section'>): string {
  return `${row.grade} · ${row.section}`;
}

function serialize(row: IClassSection, filled: number) {
  const value = row.toObject();
  return { ...value, className: className(row), filled };
}

export async function listClasses(query: ListClassesQuery) {
  const { items, total } = await repo.findMany(query);
  const counts = await repo.countActiveStudentsByClass(items.map(className));
  return {
    items: items.map((row) => serialize(row, counts.get(className(row)) ?? 0)),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function createClass(input: CreateClassInput, requester: AuthenticatedUser) {
  if (!['Administrator', 'Principal', 'Teacher'].includes(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may create a class section');
  if (await repo.findDuplicate(input.grade, input.section))
    throw ApiError.conflict('This grade and section already exists');

  if (input.teacherStaffId) {
    const teacher = await repo.findTeacher(input.teacherStaffId);
    if (!teacher) throw ApiError.notFound('Class teacher not found');
    if (teacher.type !== 'Teaching' || teacher.status !== 'Active')
      throw ApiError.conflict('Class teacher must be an active teaching staff member');
  }

  const name = `${input.grade} · ${input.section}`;
  const filled = await repo.countActiveStudents(name);
  if (filled > input.capacity)
    throw ApiError.conflict(`Capacity cannot be below the ${filled} active students already in this class`);

  try {
    const created = await repo.create(input);
    await created.populate('teacherStaffId', 'name type status');
    await logAudit(`Created class section ${name}`, 'Classes', requester.id);
    return serialize(created, filled);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw ApiError.conflict('This grade and section already exists');
    throw error;
  }
}

export async function updateClass(id: string, input: UpdateClassInput, requester: AuthenticatedUser) {
  if (!['Administrator', 'Principal'].includes(requester.role))
    throw ApiError.forbidden('Only school managers may edit sections');
  const row = await ClassSection.findById(id);
  if (!row) throw ApiError.notFound('Section not found');
  const filled = await repo.countActiveStudents(className(row));
  if (input.capacity < filled) throw ApiError.conflict('Capacity cannot be below the active roster');
  if (input.status === 'Archived' && filled)
    throw ApiError.conflict('Move active students before archiving this section');
  if (input.teacherStaffId) {
    const teacher = await repo.findTeacher(input.teacherStaffId);
    if (!teacher || teacher.type !== 'Teaching' || teacher.status !== 'Active')
      throw ApiError.conflict('Choose an active teaching staff member');
  }
  const { expectedUpdatedAt, ...changes } = input;
  const updated = await ClassSection.findOneAndUpdate(
    { _id: id, updatedAt: new Date(expectedUpdatedAt) },
    { $set: changes },
    { new: true, runValidators: true },
  ).populate('teacherStaffId', 'name type status');
  if (!updated) throw ApiError.conflict('Section changed. Reload before saving');
  await logAudit(`Updated section ${className(row)} (${input.status})`, 'Classes', requester.id);
  return serialize(updated, filled);
}
