import mongoose from 'mongoose';
import { z } from 'zod';
import { ApiError } from '../../utils/ApiError';
import { HostelRoom, IHostelRoom } from '../../models/HostelRoom';
import { HostelLeave } from '../../models/HostelLeave';
import { HostelRollCall } from '../../models/HostelRollCall';
import { HostelMaintenance } from '../../models/HostelMaintenance';
import { Student } from '../../models/Student';
import * as repo from './hostel.repository';
import {
  CreateRoomInput,
  ListRoomsQuery,
  CreateHostelLeaveInput,
  ListHostelLeaveQuery,
  MarkRollCallInput,
  CreateHostelMaintenanceInput,
  ListHostelMaintenanceQuery,
  reviewRoomSchema,
  dischargeSchema,
  hostelLeaveTransitionSchema,
  resolveHostelMaintenanceSchema,
} from './hostel.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { canManageHostel, scopeRoomFilter } from './hostel.ownership';
import { schoolToday } from '../attendance/attendance.dates';
import { schoolDeadline } from '../../utils/schoolDeadline';
import { logAudit } from '../audit/audit.service';
function manager(user: AuthenticatedUser) {
  if (!canManageHostel(user.role)) throw ApiError.forbidden('Only hostel staff may manage this record');
}
export async function addRoom(input: CreateRoomInput, user: AuthenticatedUser): Promise<IHostelRoom> {
  manager(user);
  try {
    const room = await repo.createRoom(input);
    await logAudit('Added hostel room ' + room._id, 'Hostel', user.id);
    return room;
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw ApiError.conflict('This block/room already exists');
    throw e;
  }
}
export async function listRooms(query: ListRoomsQuery, user: AuthenticatedUser) {
  const ids = canManageHostel(user.role) ? [] : await repo.findAuthorizedStudentIds(user.id, user.role);
  const { items, total } = await repo.findManyRooms(query, (base) => scopeRoomFilter(base, user, ids));
  return {
    items: canManageHostel(user.role)
      ? items
      : items.map((r) => ({
          ...r.toObject(),
          history: [],
          occupants: (r.occupants as unknown as Array<{ _id: { toString(): string } }>).filter(
            (s) => s && ids.some((id) => id.toString() === s._id.toString()),
          ),
          allocations: r.allocations.filter((s) => ids.some((id) => id.equals(s.student))),
        })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}
export async function allocateRoom(
  roomId: string,
  studentId: string,
  user: AuthenticatedUser,
  bedLabel = '',
): Promise<IHostelRoom> {
  manager(user);
  const session = await mongoose.startSession();
  let saved: IHostelRoom | undefined;
  try {
    await session.withTransaction(async () => {
      const student = await Student.findOneAndUpdate({ _id: studentId }, { $inc: { __v: 1 } }, { new: true, session });
      if (!student) throw ApiError.notFound('Student not found');
      if (student.status !== 'Active') throw ApiError.conflict('Only active students may be allocated');
      const room = await HostelRoom.findById(roomId).session(session);
      if (!room) throw ApiError.notFound('Room not found');
      if (room.occupants.map(String).includes(studentId)) {
        saved = room;
        return;
      }
      if (room.archived || room.status === 'Unavailable') throw ApiError.conflict('Room is not accepting allocations');
      if (room.genderPolicy !== 'Any' && room.genderPolicy !== student.gender)
        throw ApiError.conflict('Student does not match the configured room gender policy');
      if (await HostelRoom.exists({ _id: { $ne: roomId }, occupants: studentId }).session(session))
        throw ApiError.conflict('Student is already allocated to another room');
      if (room.occupants.length >= room.capacity) throw ApiError.conflict('Room has no available beds');
      if (bedLabel && room.allocations.some((a) => a.bedLabel === bedLabel))
        throw ApiError.conflict('This bed label is already allocated');
      saved =
        (await HostelRoom.findByIdAndUpdate(
          roomId,
          {
            $addToSet: { occupants: studentId },
            $push: {
              allocations: { student: studentId, bedLabel, allocatedAt: new Date() },
              history: { at: new Date(), actor: user.id, action: 'Allocated', student: studentId },
            },
          },
          { new: true, session },
        )) || undefined;
    });
  } finally {
    await session.endSession();
  }
  if (!saved) throw ApiError.conflict('Allocation could not be saved');
  await logAudit('Allocated hostel student ' + studentId, 'Hostel', user.id);
  return saved;
}
export async function reviewRoom(id: string, input: z.infer<typeof reviewRoomSchema>['body'], user: AuthenticatedUser) {
  manager(user);
  const session = await mongoose.startSession();
  let saved;
  const { expectedUpdatedAt, reason, ...changes } = input;
  try {
    await session.withTransaction(async () => {
      const current = await HostelRoom.findById(id).session(session);
      if (!current) throw ApiError.notFound('Room not found');
      if (changes.capacity !== undefined && changes.capacity < current.occupants.length)
        throw ApiError.conflict('Capacity cannot be below allocated boarders');
      if (changes.archived && current.occupants.length) throw ApiError.conflict('Discharge boarders before archiving');
      if (
        changes.genderPolicy &&
        changes.genderPolicy !== 'Any' &&
        (await Student.exists({ _id: { $in: current.occupants }, gender: { $ne: changes.genderPolicy } }).session(
          session,
        ))
      )
        throw ApiError.conflict('Existing boarders do not match this gender policy');
      saved = await HostelRoom.findOneAndUpdate(
        { _id: id, updatedAt: new Date(expectedUpdatedAt) },
        { $set: changes, $push: { history: { at: new Date(), actor: user.id, action: 'Room reviewed', reason } } },
        { new: true, session, runValidators: true },
      );
      if (!saved) throw ApiError.conflict('Room changed; refresh before saving');
    });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw ApiError.conflict('This block/room already exists');
    throw e;
  } finally {
    await session.endSession();
  }
  await logAudit('Reviewed hostel room ' + id, 'Hostel', user.id);
  return saved;
}
export async function discharge(id: string, input: z.infer<typeof dischargeSchema>['body'], user: AuthenticatedUser) {
  manager(user);
  const session = await mongoose.startSession();
  let saved;
  try {
    await session.withTransaction(async () => {
      await Student.updateOne({ _id: input.studentId }, { $inc: { __v: 1 } }, { session });
      if (
        await HostelLeave.exists({
          student: input.studentId,
          status: { $in: ['Requested', 'Approved', 'Out'] },
        }).session(session)
      )
        throw ApiError.conflict('Decide or return active gate passes before discharge');
      saved = await HostelRoom.findOneAndUpdate(
        { _id: id, updatedAt: new Date(input.expectedUpdatedAt), occupants: input.studentId },
        {
          $pull: { occupants: input.studentId, allocations: { student: input.studentId } },
          $push: {
            history: {
              at: new Date(),
              actor: user.id,
              action: 'Discharged',
              reason: input.reason,
              student: input.studentId,
            },
          },
        },
        { new: true, session },
      );
      if (!saved) throw ApiError.conflict('Room changed or student is not allocated');
    });
  } finally {
    await session.endSession();
  }
  await logAudit('Discharged hostel student ' + input.studentId, 'Hostel', user.id);
  return saved;
}
export async function listHostelLeave(query: ListHostelLeaveQuery, user: AuthenticatedUser) {
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (!canManageHostel(user.role)) filter.student = { $in: await repo.findAuthorizedStudentIds(user.id, user.role) };
  const [items, total] = await Promise.all([
    HostelLeave.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('student', 'name refId grade')
      .populate('room', 'block roomNumber'),
    HostelLeave.countDocuments(filter),
  ]);
  return {
    items: canManageHostel(user.role) ? items : items.map((r) => ({ ...r.toObject(), history: [] })),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}
export async function createHostelLeave(input: CreateHostelLeaveInput, user: AuthenticatedUser) {
  if (!canManageHostel(user.role)) {
    const ids = await repo.findAuthorizedStudentIds(user.id, user.role);
    if (!ids.some((id) => id.toString() === input.studentId))
      throw ApiError.forbidden('Request leave only for your linked boarder');
  }
  const session = await mongoose.startSession();
  let saved;
  try {
    await session.withTransaction(async () => {
      const student = await Student.findOneAndUpdate(
        { _id: input.studentId, status: 'Active' },
        { $inc: { __v: 1 } },
        { new: true, session },
      );
      if (!student) throw ApiError.conflict('Only active boarders may request leave');
      if (!(await HostelRoom.exists({ _id: input.roomId, occupants: input.studentId }).session(session)))
        throw ApiError.badRequest('Student is not allocated to the selected room');
      if (
        await HostelLeave.exists({
          student: input.studentId,
          status: { $in: ['Requested', 'Approved', 'Out'] },
          fromDate: { $lte: new Date(input.toDate) },
          toDate: { $gte: new Date(input.fromDate) },
        }).session(session)
      )
        throw ApiError.conflict('Gate pass dates overlap another active request');
      [saved] = await HostelLeave.create(
        [
          {
            student: input.studentId,
            room: input.roomId,
            type: input.type,
            fromDate: new Date(input.fromDate),
            toDate: new Date(input.toDate),
            reason: input.reason,
            requestedBy: user.id,
          },
        ],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  await logAudit('Requested hostel gate pass ' + input.studentId, 'Hostel', user.id);
  return saved;
}
export async function transitionHostelLeave(
  id: string,
  input: z.infer<typeof hostelLeaveTransitionSchema>['body'],
  user: AuthenticatedUser,
) {
  if (input.action !== 'cancel') manager(user);
  const current = await HostelLeave.findById(id);
  if (!current) throw ApiError.notFound('Gate pass not found');
  if (input.action === 'cancel' && !canManageHostel(user.role)) {
    const ids = await repo.findAuthorizedStudentIds(user.id, user.role);
    if (!ids.some((id) => id.equals(current.student)))
      throw ApiError.forbidden('Cancel only your own linked boarder request');
  }
  const rules = {
    cancel: { from: ['Requested'], to: 'Cancelled' },
    approve: { from: ['Requested'], to: 'Approved' },
    reject: { from: ['Requested', 'Approved'], to: 'Rejected' },
    'mark-out': { from: ['Approved'], to: 'Out' },
    return: { from: ['Out'], to: 'Returned' },
  }[input.action];
  const changes: Record<string, unknown> = { status: rules.to };
  if (input.action === 'approve') {
    if (!input.pickupName?.trim() || !input.pickupPhone || input.guardianConsentConfirmed !== true)
      throw ApiError.badRequest('Record authorized pickup contact and confirmed guardian consent before approval');
    Object.assign(changes, {
      approvedBy: user.id,
      pickupName: input.pickupName,
      pickupPhone: input.pickupPhone,
      guardianConsentConfirmed: true,
    });
  }
  if (input.action === 'mark-out') {
    const today = await schoolToday();
    if (today < current.fromDate.toISOString().slice(0, 10) || today > current.toDate.toISOString().slice(0, 10))
      throw ApiError.conflict('Departure must be within the approved dates');
    if (!current.guardianConsentConfirmed || !current.pickupName || !current.pickupPhone)
      throw ApiError.conflict('Approved pickup and consent are missing');
    if (!(await HostelRoom.exists({ _id: current.room, occupants: current.student })))
      throw ApiError.conflict('Boarder is no longer allocated to this room');
    changes.departedAt = new Date();
  }
  if (input.action === 'return') changes.returnedAt = new Date();
  const saved = await HostelLeave.findOneAndUpdate(
    { _id: id, updatedAt: new Date(input.expectedUpdatedAt), status: { $in: rules.from } },
    {
      $set: changes,
      $push: { history: { at: new Date(), actor: user.id, action: input.action, reason: input.reason } },
    },
    { new: true, runValidators: true },
  );
  if (!saved) throw ApiError.conflict('Gate pass changed or action is invalid for this state');
  await logAudit('Reviewed hostel gate pass ' + id + ' ' + input.action, 'Hostel', user.id);
  return saved;
}
export async function listRollCall(date: string, user: AuthenticatedUser) {
  const filter: Record<string, unknown> = { date };
  if (!canManageHostel(user.role)) filter.student = { $in: await repo.findAuthorizedStudentIds(user.id, user.role) };
  const rows = await HostelRollCall.find(filter).sort({ updatedAt: -1 }).populate('student', 'name refId grade');
  return canManageHostel(user.role) ? rows : rows.map((r) => ({ ...r.toObject(), history: [] }));
}
export async function markRollCall(input: MarkRollCallInput, user: AuthenticatedUser) {
  manager(user);
  const today = await schoolToday();
  if (input.date > today) throw ApiError.badRequest('Cannot mark future roll-call');
  if (input.date < today && user.role === 'Teacher')
    throw ApiError.forbidden('Historical roll-call requires office review');
  if (!(await HostelRoom.exists({ occupants: input.studentId })))
    throw ApiError.badRequest('Only allocated boarders may be marked');
  if (
    input.status === 'On leave' &&
    !(await HostelLeave.exists({
      student: input.studentId,
      status: 'Out',
      fromDate: { $lte: new Date(input.date) },
      departedAt: { $lte: await schoolDeadline(input.date) },
    }))
  )
    throw ApiError.conflict('On leave requires an actual departed gate pass');
  const current = await HostelRollCall.findOne({ student: input.studentId, date: input.date });
  let saved;
  if (current) {
    if (!input.expectedUpdatedAt || !input.reason)
      throw ApiError.badRequest('Roll-call corrections require current version and reason');
    saved = await HostelRollCall.findOneAndUpdate(
      { _id: current._id, updatedAt: new Date(input.expectedUpdatedAt) },
      {
        $set: { status: input.status, markedBy: user.id },
        $push: {
          history: {
            at: new Date(),
            actor: user.id,
            previousStatus: current.status,
            status: input.status,
            reason: input.reason,
          },
        },
      },
      { new: true },
    );
    if (!saved) throw ApiError.conflict('Roll-call changed; refresh before correcting');
  } else
    try {
      saved = await HostelRollCall.create({
        student: input.studentId,
        date: input.date,
        status: input.status,
        markedBy: user.id,
        history: [],
      });
    } catch (e) {
      if ((e as { code?: number }).code === 11000)
        throw ApiError.conflict('Roll-call already marked; refresh to correct');
      throw e;
    }
  await logAudit('Marked hostel roll-call ' + input.studentId + ' ' + input.date, 'Hostel', user.id);
  return saved;
}
export async function markAllRollCall(date: string, user: AuthenticatedUser) {
  manager(user);
  if (date !== (await schoolToday())) throw ApiError.badRequest('Bulk confirmation is for today only');
  const rooms = await HostelRoom.find({ archived: { $ne: true } }).select('occupants'),
    ids = [...new Set(rooms.flatMap((r) => r.occupants.map(String)))];
  const away = await HostelLeave.find({ student: { $in: ids }, status: 'Out' }).distinct('student');
  const absent = new Set(away.map(String));
  for (const id of ids.filter((id) => !absent.has(id))) {
    try {
      await HostelRollCall.updateOne(
        { student: id, date },
        {
          $setOnInsert: {
            student: id,
            date,
            status: 'Present',
            markedBy: user.id,
            history: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true, timestamps: false },
      );
    } catch (e) {
      if ((e as { code?: number }).code !== 11000) throw e;
    }
  }
  await logAudit('Confirmed unmarked hostel roll-call ' + date, 'Hostel', user.id);
  return listRollCall(date, user);
}
export async function listMaintenance(query: ListHostelMaintenanceQuery, user: AuthenticatedUser) {
  manager(user);
  const filter = query.status ? { status: query.status } : {};
  const [items, total] = await Promise.all([
    HostelMaintenance.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('room', 'block roomNumber'),
    HostelMaintenance.countDocuments(filter),
  ]);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}
export async function createMaintenance(input: CreateHostelMaintenanceInput, user: AuthenticatedUser) {
  manager(user);
  if (!(await HostelRoom.exists({ _id: input.roomId }))) throw ApiError.badRequest('Room does not exist');
  try {
    const r = await HostelMaintenance.create({ ...input, room: input.roomId, reportedBy: user.id });
    await logAudit('Reported hostel maintenance ' + r.refId, 'Hostel', user.id);
    await r.populate('room', 'block roomNumber');
    return r;
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw ApiError.conflict('Maintenance reference already exists');
    throw e;
  }
}
export async function resolveMaintenance(
  id: string,
  user: AuthenticatedUser,
  input: z.infer<typeof resolveHostelMaintenanceSchema>['body'],
) {
  manager(user);
  const saved = await HostelMaintenance.findOneAndUpdate(
    { _id: id, updatedAt: new Date(input.expectedUpdatedAt) },
    {
      $set: {
        status: input.status,
        resolution: input.resolution,
        resolvedBy: input.status === 'Resolved' ? user.id : null,
        resolvedAt: input.status === 'Resolved' ? new Date() : null,
      },
      $push: { history: { at: new Date(), actor: user.id, status: input.status, reason: input.reason } },
    },
    { new: true, runValidators: true },
  );
  if (!saved) throw ApiError.conflict('Maintenance changed; refresh before review');
  await logAudit('Reviewed hostel maintenance ' + id, 'Hostel', user.id);
  return saved;
}
