import { ApiError } from '../../utils/ApiError';
import { IVisitorLog } from '../../models/VisitorLog';
import * as repo from './visitors.repository';
import { ListVisitorsQuery, CheckInInput } from './visitors.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role, WRITE_ROLES } from '../../types/roles';

function canManageVisitors(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

export async function listVisitors(query: ListVisitorsQuery, requester: AuthenticatedUser) {
  if (!canManageVisitors(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may view the visitor log');
  const { items, total } = await repo.findMany(query);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function checkInVisitor(input: CheckInInput, requester: AuthenticatedUser): Promise<IVisitorLog> {
  if (!canManageVisitors(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may check in a visitor');
  return repo.checkIn(input, requester.id);
}

export async function checkOutVisitor(id: string, requester: AuthenticatedUser): Promise<IVisitorLog> {
  if (!canManageVisitors(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may check out a visitor');
  const visitor = await repo.findById(id);
  if (!visitor) throw ApiError.notFound('Visitor log entry not found');
  if (visitor.status === 'CheckedOut') throw ApiError.conflict('This visitor has already checked out');
  const updated = await repo.checkOut(id);
  if (!updated) throw ApiError.conflict('This visitor has already checked out');
  return updated;
}
