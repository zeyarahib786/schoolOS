import { ApiError } from '../../utils/ApiError';
import { ICafeteriaWallet } from '../../models/CafeteriaWallet';
import * as repo from './cafeteria.repository';
import { ListWalletsQuery, TopUpInput, PurchaseInput } from './cafeteria.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeWalletFilter, canManageWallet } from './cafeteria.ownership';
import { SaveAllergyPlanInput } from './cafeteria.validation';
import { SaveMenuItemInput } from './cafeteria.validation';
import { logAudit } from '../audit/audit.service';

async function requireActiveStudent(studentId: string) {
  const student = await repo.findStudentById(studentId);
  if (!student) throw ApiError.notFound('Student not found');
  if (student.status !== 'Active') throw ApiError.conflict('Cafeteria activity is only available for active students');
  return student;
}

export async function listWallets(query: ListWalletsQuery, requester: AuthenticatedUser) {
  const authorizedStudentIds =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Accountant'
      ? []
      : await repo.findAuthorizedStudentIds(requester.id);

  const { items, total } = await repo.findManyWallets(query, (base) =>
    scopeWalletFilter(base, requester, authorizedStudentIds),
  );
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function topUp(input: TopUpInput, requester: AuthenticatedUser): Promise<ICafeteriaWallet> {
  if (!canManageWallet(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Accountant may top up a wallet');
  const student = await requireActiveStudent(input.studentId);
  const wallet = await repo.topUpWallet(input.studentId, input.amount, input.description);
  await logAudit(`Topped up cafeteria wallet for ${student.refId} by AED ${input.amount}`, 'Cafeteria', requester.id);
  return wallet;
}

export async function purchase(input: PurchaseInput, requester: AuthenticatedUser): Promise<ICafeteriaWallet> {
  if (!canManageWallet(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Accountant may record a purchase');
  const student = await requireActiveStudent(input.studentId);
  const updated = await repo.purchaseIfSufficientBalance(input.studentId, input.amount, input.description);
  if (!updated) throw ApiError.conflict('Insufficient wallet balance for this purchase');
  await logAudit(`Recorded cafeteria purchase for ${student.refId} of AED ${input.amount}`, 'Cafeteria', requester.id);
  return updated;
}

export async function listTransactions(query: { page: number; limit: number }, requester: AuthenticatedUser) {
  const unrestricted = requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Accountant';
  const studentIds = unrestricted ? null : (await repo.findAuthorizedStudentIds(requester.id)).map(String);
  const { items, total } = await repo.findTransactions(studentIds, query.page, query.limit);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function listAllergyPlans(query: { page: number; limit: number }, requester: AuthenticatedUser) {
  const unrestricted = requester.role === 'Administrator' || requester.role === 'Principal';
  const studentIds = unrestricted ? null : (await repo.findAuthorizedStudentIds(requester.id)).map(String);
  const { items, total } = await repo.findAllergyPlans(studentIds, query.page, query.limit);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function saveAllergyPlan(input: SaveAllergyPlanInput, requester: AuthenticatedUser) {
  if (requester.role !== 'Administrator' && requester.role !== 'Principal')
    throw ApiError.forbidden('Only Administrator or Principal may manage allergy care plans');
  const student = await requireActiveStudent(input.studentId);
  const plan = await repo.saveAllergyPlan(input, requester.id);
  await logAudit(`Saved cafeteria allergy care plan for ${student.refId}`, 'Cafeteria', requester.id);
  return plan;
}

export function listMenu() {
  return repo.listMenu();
}

export async function saveMenuItem(input: SaveMenuItemInput, requester: AuthenticatedUser) {
  if (requester.role !== 'Administrator' && requester.role !== 'Principal')
    throw ApiError.forbidden('Only Administrator or Principal may update the cafeteria menu');
  const menu = await repo.saveMenuItem(input);
  await logAudit(`Updated ${input.day} ${input.meal} cafeteria menu`, 'Cafeteria', requester.id);
  return menu;
}
