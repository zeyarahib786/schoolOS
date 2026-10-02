import { ApiError } from '../../utils/ApiError';
import { ICurriculumUnit } from '../../models/CurriculumUnit';
import * as repo from './curriculum.repository';
import { ListUnitsQuery, CreateUnitInput, UpdateUnitInput } from './curriculum.validation';
import { Role, WRITE_ROLES } from '../../types/roles';
import { AuthenticatedUser } from '../../middleware/auth';
import { logAudit } from '../audit/audit.service';

function canManageCurriculum(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

export async function listUnits(query: ListUnitsQuery) {
  const { items, total } = await repo.findMany(query);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function createUnit(input: CreateUnitInput, requester: AuthenticatedUser): Promise<ICurriculumUnit> {
  if (!canManageCurriculum(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may add a curriculum unit');
  if (await repo.findDuplicate(input.subject, input.term, input.title))
    throw ApiError.conflict('This curriculum unit already exists for the selected subject and term');
  try {
    const unit = await repo.create(input);
    await logAudit(`Added curriculum unit ${unit.subject} · ${unit.title}`, 'Curriculum', requester.id);
    return unit;
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw ApiError.conflict('This curriculum unit already exists for the selected subject and term');
    throw error;
  }
}

export async function updateUnit(id: string, input: UpdateUnitInput, requester: AuthenticatedUser): Promise<ICurriculumUnit> {
  if (!canManageCurriculum(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may edit a curriculum unit');
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Curriculum unit not found');
  const subject = input.subject ?? existing.subject;
  const term = input.term ?? existing.term;
  const title = input.title ?? existing.title;
  if (await repo.findDuplicate(subject, term, title, id))
    throw ApiError.conflict('This curriculum unit already exists for the selected subject and term');
  try {
    const updated = await repo.updateById(id, input);
    if (!updated) throw ApiError.notFound('Curriculum unit not found');
    const coverageAction = input.completedDate === null
      ? 'Reopened'
      : input.completedDate
        ? 'Completed'
        : 'Updated';
    await logAudit(`${coverageAction} curriculum unit ${updated.subject} · ${updated.title}`, 'Curriculum', requester.id);
    return updated;
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw ApiError.conflict('This curriculum unit already exists for the selected subject and term');
    throw error;
  }
}

export async function deleteUnit(id: string, requester: AuthenticatedUser): Promise<void> {
  if (!canManageCurriculum(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may remove a curriculum unit');
  const deleted = await repo.deleteById(id);
  if (!deleted) throw ApiError.notFound('Curriculum unit not found');
  await logAudit(`Removed curriculum unit ${deleted.subject} · ${deleted.title}`, 'Curriculum', requester.id, 'Warning');
}

export function listSubjects(): Promise<string[]> {
  return repo.distinctSubjects();
}
