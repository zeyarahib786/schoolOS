import { ApiError } from '../../utils/ApiError';
import { IAlumniProfile } from '../../models/AlumniProfile';
import * as repo from './alumni.repository';
import { ListAlumniQuery, GraduateInput } from './alumni.validation';
import { Role, WRITE_ROLES } from '../../types/roles';

function canManageAlumni(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

export function listAlumni(query: ListAlumniQuery) {
  return repo.findMany(query).then(({ items, total }) => ({
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  }));
}

export async function graduate(input: GraduateInput, role: Role): Promise<IAlumniProfile> {
  if (!canManageAlumni(role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may graduate a student');
  try {
    return await repo.graduateStudent(input);
  } catch (err) {
    if (err instanceof Error) {
      const code = (err as Error & { code?: string }).code;
      if (code === 'STUDENT_NOT_FOUND') throw ApiError.notFound('Student not found');
      if (code === 'ALREADY_ALUMNI') throw ApiError.conflict('This student has already graduated');
    }
    throw err;
  }
}
