import { ApiError } from '../../utils/ApiError';
import { IHostelRoom } from '../../models/HostelRoom';
import * as repo from './hostel.repository';
import { CreateRoomInput, ListRoomsQuery } from './hostel.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeRoomFilter, canManageHostel } from './hostel.ownership';
import * as leaveRepo from './hostel-leave.repository';
import { CreateHostelLeaveInput, ListHostelLeaveQuery } from './hostel.validation';
import * as rollRepo from './hostel-roll.repository';
import { MarkRollCallInput } from './hostel.validation';
import * as maintenanceRepo from './hostel-maintenance.repository';
import { CreateHostelMaintenanceInput, ListHostelMaintenanceQuery } from './hostel.validation';

export async function addRoom(input: CreateRoomInput, requester: AuthenticatedUser): Promise<IHostelRoom> {
  if (!canManageHostel(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may add a hostel room');
  return repo.createRoom(input);
}

export async function listRooms(query: ListRoomsQuery, requester: AuthenticatedUser) {
  const authorizedStudentIds =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Teacher'
      ? []
      : await repo.findAuthorizedStudentIds(requester.id);

  const { items, total } = await repo.findManyRooms(query, (base) =>
    scopeRoomFilter(base, requester, authorizedStudentIds),
  );
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function allocateRoom(
  roomId: string,
  studentId: string,
  requester: AuthenticatedUser,
): Promise<IHostelRoom> {
  if (!canManageHostel(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may allocate a hostel room');
  const room = await repo.findRoomById(roomId);
  if (!room) throw ApiError.notFound('Room not found');
  const updated = await repo.allocateIfCapacityAvailable(roomId, studentId, room.capacity);
  if (!updated) throw ApiError.conflict('This room is at full capacity - no beds available');
  return updated;
}

function requireHostelManager(requester: AuthenticatedUser) {
  if (!canManageHostel(requester.role)) throw ApiError.forbidden('Only Administrator, Principal, or Teacher may manage hostel leave');
}

export async function listHostelLeave(query: ListHostelLeaveQuery, requester: AuthenticatedUser) {
  requireHostelManager(requester);
  // Rejected requests remain stored for audit, while the existing Hostel UI keeps its
  // original behaviour of removing them from the active gate-pass list.
  const filter = query.status ? { status: query.status } : { status: { $ne: 'Rejected' } };
  const { items, total } = await leaveRepo.list(filter, query.page, query.limit);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function createHostelLeave(input: CreateHostelLeaveInput, requester: AuthenticatedUser) {
  requireHostelManager(requester);
  const room = await leaveRepo.findAllocatedRoom(input.studentId, input.roomId);
  if (!room) throw ApiError.badRequest('The selected student is not allocated to this room');
  return leaveRepo.create(input.studentId, input.roomId, input.type, new Date(input.fromDate), new Date(input.toDate), input.reason);
}

export async function transitionHostelLeave(id: string, action: 'approve' | 'reject' | 'mark-out' | 'return', requester: AuthenticatedUser) {
  requireHostelManager(requester);
  const rules = {
    approve: { from: ['Requested'] as const, to: 'Approved' as const },
    reject: { from: ['Requested'] as const, to: 'Rejected' as const },
    'mark-out': { from: ['Approved'] as const, to: 'Out' as const },
    return: { from: ['Approved', 'Out'] as const, to: 'Returned' as const },
  }[action];
  const updated = await leaveRepo.transition(id, [...rules.from], rules.to, action === 'approve' ? requester.id : undefined);
  if (!updated) throw ApiError.conflict(`This leave request cannot be ${action.replace('-', ' ')} in its current state`);
  return updated;
}

export async function listRollCall(date: string, requester: AuthenticatedUser) {
  requireHostelManager(requester);
  return rollRepo.list(date);
}

export async function markRollCall(input: MarkRollCallInput, requester: AuthenticatedUser) {
  requireHostelManager(requester);
  if (!(await rollRepo.isBoarder(input.studentId))) throw ApiError.badRequest('Roll-call can only be marked for an allocated boarder');
  return rollRepo.upsert(input.studentId, input.date, input.status, requester.id);
}

export async function markAllRollCall(date: string, requester: AuthenticatedUser) {
  requireHostelManager(requester);
  return rollRepo.markAllPresent(date, requester.id);
}

export async function listMaintenance(query: ListHostelMaintenanceQuery, requester: AuthenticatedUser) {
  requireHostelManager(requester);
  const { items, total } = await maintenanceRepo.list(query.page, query.limit, query.status);
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function createMaintenance(input: CreateHostelMaintenanceInput, requester: AuthenticatedUser) {
  requireHostelManager(requester);
  if (!(await maintenanceRepo.roomExists(input.roomId))) throw ApiError.badRequest('The selected hostel room does not exist');
  return maintenanceRepo.create(input, requester.id);
}

export async function resolveMaintenance(id: string, requester: AuthenticatedUser) {
  requireHostelManager(requester);
  const request = await maintenanceRepo.resolve(id, requester.id);
  if (!request) throw ApiError.conflict('This maintenance request is already resolved or does not exist');
  return request;
}
