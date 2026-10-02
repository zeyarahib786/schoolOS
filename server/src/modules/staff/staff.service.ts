import { ApiError } from '../../utils/ApiError';
import { IStaff } from '../../models/Staff';
import * as repo from './staff.repository';
import { ListStaffQuery, CreateStaffInput, UpdateStaffInput } from './staff.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeStaffFilter, assertCanReadStaff } from './staff.ownership';
import { logAudit } from '../audit/audit.service';

export async function listStaff(query: ListStaffQuery, requester: AuthenticatedUser) {
  const { items, total } = await repo.findMany(query, (base) => scopeStaffFilter(base, requester));
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function getStaff(id: string, requester: AuthenticatedUser): Promise<IStaff> {
  const staff = await repo.findById(id);
  if (!staff) throw ApiError.notFound('Staff record not found');
  assertCanReadStaff(staff, requester);
  return staff;
}

export async function createStaff(input: CreateStaffInput, requester: AuthenticatedUser): Promise<IStaff> {
  const [existingRef, existingEmail] = await Promise.all([
    repo.findByRefId(input.refId),
    repo.findByEmail(input.email),
  ]);
  if (existingRef) throw ApiError.conflict(`A staff record with reference ${input.refId} already exists`);
  if (existingEmail) throw ApiError.conflict(`A staff record with email ${input.email} already exists`);
  const created = await repo.create(input);
  await logAudit(`Created staff record ${created.refId} (${created.name})`, 'Staff & HR', requester.id);
  return created;
}

export async function updateStaff(id: string, input: UpdateStaffInput, requester: AuthenticatedUser): Promise<IStaff> {
  const current = await repo.findById(id);
  if (!current) throw ApiError.notFound('Staff record not found');
  if (input.email) {
    const existing = await repo.findByEmail(input.email);
    if (existing && existing._id.toString() !== id) throw ApiError.conflict(`A staff record with email ${input.email} already exists`);
  }
  if (input.status === 'Active' && current.status === 'Onboarding') {
    const required = ['id', 'degree', 'photo'];
    if (!required.every((key) => current.documents.some((document) => document.key === key)))
      throw ApiError.badRequest('Required onboarding documents must be uploaded before activation');
    if (!current.onboarding.every((task) => task.done))
      throw ApiError.badRequest('Complete all onboarding tasks before activation');
  }
  const updated = await repo.updateById(id, input);
  if (!updated) throw ApiError.notFound('Staff record not found');
  await logAudit(`Updated staff record ${updated.refId}`, 'Staff & HR', requester.id, input.status === 'Inactive' ? 'Warning' : 'Info');
  return updated;
}

export async function deleteStaff(id: string, requester: AuthenticatedUser): Promise<void> {
  const dependencyCount = await repo.countDependencies(id);
  if (dependencyCount > 0)
    throw ApiError.conflict('This staff record has operational history and cannot be deleted; set it to Inactive instead');
  const deleted = await repo.deleteById(id);
  if (!deleted) throw ApiError.notFound('Staff record not found');
  await logAudit(`Deleted staff record ${deleted.refId}`, 'Staff & HR', requester.id, 'Warning');
}
