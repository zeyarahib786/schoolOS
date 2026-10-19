import { VisitorLog } from '../../models/VisitorLog';
import { z } from 'zod';
import { updateVisitorSchema } from './visitors.validation';
import { logAudit } from '../audit/audit.service';
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
  if (!input.hostConfirmed) throw ApiError.badRequest('Confirm the host has approved this visit before check-in');
  try {
    const saved = await repo.checkIn(input, requester.id);
    await logAudit('Checked in visitor ' + saved._id, 'Visitors', requester.id);
    return saved;
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw ApiError.conflict('This badge is currently issued to another visitor');
    throw error;
  }
}

export async function checkOutVisitor(
  id: string,
  requester: AuthenticatedUser,
  input: { expectedUpdatedAt?: string; reason?: string } = {},
): Promise<IVisitorLog> {
  if (!canManageVisitors(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may check out a visitor');
  const visitor = await repo.findById(id);
  if (!visitor) throw ApiError.notFound('Visitor log entry not found');
  if (visitor.status === 'CheckedOut') throw ApiError.conflict('This visitor has already checked out');
  const updated = await repo.checkOut(id, requester.id, input.expectedUpdatedAt, input.reason);
  if (!updated) throw ApiError.conflict('This visitor has already checked out');
  await logAudit('Checked out visitor ' + id, 'Visitors', requester.id);
  return updated;
}

export async function updateVisitor(
  id: string,
  input: z.infer<typeof updateVisitorSchema>['body'],
  requester: AuthenticatedUser,
) {
  if (!canManageVisitors(requester.role)) throw ApiError.forbidden('Staff front-desk role required');
  const current = await repo.findById(id);
  if (!current) throw ApiError.notFound('Visitor entry not found');
  if (input.hostName !== current.hostName && input.hostConfirmed !== true)
    throw ApiError.badRequest('Confirm the new host has approved this visit');
  const { expectedUpdatedAt, reason, hostConfirmed, ...fields } = input;
  const saved = await VisitorLog.findOneAndUpdate(
    { _id: id, updatedAt: new Date(expectedUpdatedAt) },
    {
      $set: { ...fields, ...(hostConfirmed === true ? { hostConfirmed: true } : {}) },
      $push: {
        history: {
          at: new Date(),
          by: requester.id,
          action: 'Reviewed',
          reason,
          previous: {
            visitorName: current.visitorName,
            hostName: current.hostName,
            purpose: current.purpose,
            notes: current.notes,
          },
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!saved) throw ApiError.conflict('Visitor entry changed; reload before correcting');
  await logAudit('Reviewed visitor record ' + id, 'Visitors', requester.id);
  return saved;
}
