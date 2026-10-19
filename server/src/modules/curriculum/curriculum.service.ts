import { ApiError } from '../../utils/ApiError';
import { CurriculumUnit, ICurriculumUnit } from '../../models/CurriculumUnit';
import * as repo from './curriculum.repository';
import { ListUnitsQuery, CreateUnitInput, UpdateUnitInput } from './curriculum.validation';
import { Role, WRITE_ROLES } from '../../types/roles';
import { AuthenticatedUser } from '../../middleware/auth';
import { schoolToday } from '../attendance/attendance.dates';
import { getSettings } from '../settings/settings.repository';
import { logAudit } from '../audit/audit.service';

function canManageCurriculum(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

export async function listUnits(query: ListUnitsQuery, user: AuthenticatedUser) {
  const { items, total } = await repo.findMany(query);
  return {
    items: canManageCurriculum(user.role) ? items : items.map((r) => ({ ...r.toObject(), history: [] })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function createUnit(input: CreateUnitInput, requester: AuthenticatedUser): Promise<ICurriculumUnit> {
  if (!canManageCurriculum(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may add a curriculum unit');
  const academicYear = input.academicYear || (await getSettings()).academicYear;
  if (input.completedDate && input.completedDate > (await schoolToday()))
    throw ApiError.badRequest('Completion cannot be in the future');
  if (await repo.findDuplicate(input.subject, input.term, input.title, input.grade, academicYear))
    throw ApiError.conflict('This curriculum unit already exists for the selected subject and term');
  try {
    const unit = await repo.create({ ...input, academicYear });
    await logAudit(`Added curriculum unit ${unit.subject} · ${unit.title}`, 'Curriculum', requester.id);
    return unit;
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw ApiError.conflict('This curriculum unit already exists for the selected subject and term');
    throw error;
  }
}

export async function updateUnit(
  id: string,
  input: UpdateUnitInput,
  requester: AuthenticatedUser,
): Promise<ICurriculumUnit> {
  if (!canManageCurriculum(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may edit a curriculum unit');
  const existing = await repo.findById(id);
  if (!existing) throw ApiError.notFound('Curriculum unit not found');
  const subject = input.subject ?? existing.subject;
  const term = input.term ?? existing.term;
  const title = input.title ?? existing.title;
  if (existing.updatedAt.toISOString() !== input.expectedUpdatedAt)
    throw ApiError.conflict('Curriculum unit changed; refresh before saving');
  if (existing.archived) throw ApiError.conflict('Restore the unit before editing it');
  if (input.completedDate && input.completedDate > (await schoolToday()))
    throw ApiError.badRequest('Completion cannot be in the future');
  if (
    await repo.findDuplicate(
      subject,
      term,
      title,
      input.grade ?? existing.grade,
      input.academicYear ?? existing.academicYear,
      id,
    )
  )
    throw ApiError.conflict('This curriculum unit already exists for the selected subject and term');
  try {
    const { expectedUpdatedAt, reason, ...changes } = input;
    const updated = await CurriculumUnit.findOneAndUpdate(
      { _id: id, updatedAt: new Date(expectedUpdatedAt) },
      {
        $set: changes,
        $push: {
          history: {
            at: new Date(),
            actor: requester.id,
            reason,
            before: unitSnapshot(existing),
            after: { ...unitSnapshot(existing), ...changes },
          },
        },
      },
      { new: true, runValidators: true },
    );
    if (!updated) throw ApiError.conflict('Curriculum unit changed; refresh before saving');
    const coverageAction = input.completedDate === null ? 'Reopened' : input.completedDate ? 'Completed' : 'Updated';
    await logAudit(
      `${coverageAction} curriculum unit ${updated.subject} · ${updated.title}`,
      'Curriculum',
      requester.id,
    );
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
  const current = await repo.findById(id);
  if (!current) throw ApiError.notFound('Curriculum unit not found');
  if (current.completedDate || current.history?.length)
    throw ApiError.conflict('This unit has teaching history; archive it instead');
  const deleted = await CurriculumUnit.findOneAndDelete({
    _id: id,
    updatedAt: current.updatedAt,
    completedDate: null,
    'history.0': { $exists: false },
  });
  if (!deleted) throw ApiError.conflict('Curriculum unit changed; refresh before removing it');
  await logAudit(
    `Removed curriculum unit ${deleted.subject} · ${deleted.title}`,
    'Curriculum',
    requester.id,
    'Warning',
  );
}

export function listSubjects(): Promise<string[]> {
  return repo.distinctSubjects();
}

function unitSnapshot(r: ICurriculumUnit) {
  return {
    subject: r.subject,
    term: r.term,
    title: r.title,
    outcomes: r.outcomes,
    grade: r.grade,
    academicYear: r.academicYear,
    plannedDate: r.plannedDate,
    completedDate: r.completedDate,
    sequenceOrder: r.sequenceOrder,
    framework: r.framework,
    owner: r.owner,
    archived: r.archived,
  };
}
export async function archiveUnit(
  id: string,
  input: { archived: boolean; expectedUpdatedAt: string; reason: string },
  user: AuthenticatedUser,
) {
  const current = await repo.findById(id);
  if (!current) throw ApiError.notFound('Curriculum unit not found');
  const saved = await CurriculumUnit.findOneAndUpdate(
    { _id: id, updatedAt: new Date(input.expectedUpdatedAt) },
    {
      $set: { archived: input.archived },
      $push: {
        history: {
          at: new Date(),
          actor: user.id,
          reason: input.reason,
          before: unitSnapshot(current),
          after: { ...unitSnapshot(current), archived: input.archived },
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!saved) throw ApiError.conflict('Curriculum unit changed; refresh before saving');
  await logAudit((input.archived ? 'Archived' : 'Restored') + ' curriculum unit ' + id, 'Curriculum', user.id);
  return saved;
}
