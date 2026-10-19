import { FilterQuery, Types } from 'mongoose';
import { Guardian, IGuardian } from '../../models/Guardian';
import { GuardianMessage } from '../../models/GuardianMessage';
import { ParentBroadcast } from '../../models/ParentBroadcast';
import { ListBroadcastsQuery, ListGuardiansQuery, SendBroadcastInput } from './guardians.validation';

function escapeRegex(value: string): string {
  const special = '.*+?^' + '$' + '{}()|[]' + String.fromCharCode(92);
  return Array.from(value)
    .map((character) => (special.includes(character) ? String.fromCharCode(92) + character : character))
    .join('');
}

export async function findMany(query: ListGuardiansQuery, userId?: string) {
  const filter: FilterQuery<IGuardian> = userId ? { userId } : {};
  if (query.portalStatus) filter.portalStatus = query.portalStatus;
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: pattern }, { refId: pattern }, { phone: pattern }, { email: pattern }];
  }
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Guardian.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(query.limit)
      .populate({
        path: 'studentIds',
        select: 'refId name grade feeStatus status',
        ...(userId ? { match: { guardianUserId: userId } } : {}),
      }),
    Guardian.countDocuments(filter),
  ]);
  return { items, total };
}

export function findById(id: string, userId?: string) {
  return Guardian.findById(id).populate({
    path: 'studentIds',
    select: 'refId name grade feeStatus status',
    ...(userId ? { match: { guardianUserId: userId } } : {}),
  });
}

export function updatePortal(id: string, status: 'Active' | 'Suspended') {
  return Guardian.findByIdAndUpdate(id, { $set: { portalStatus: status } }, { new: true }).populate(
    'studentIds',
    'refId name grade feeStatus status',
  );
}

export async function findBroadcastTargets(input: SendBroadcastInput): Promise<IGuardian[]> {
  if (input.audience === 'Individual guardian') return Guardian.find({ _id: input.guardianId });
  if (input.audience === 'All parents') return Guardian.find({});
  const field = input.audience === 'By grade' ? input.grade : input.className;
  const normalizedClass =
    input.audience === 'Single class'
      ? String(field || '')
          .replace(/-([^-]+)$/, ' · $1')
          .replace(/^(\d+)/, 'Grade $1')
      : field;
  const students = await import('../../models/Student').then(({ Student }) =>
    Student.find(
      { grade: input.audience === 'By grade' ? new RegExp(`^${escapeRegex(field || '')}(?: · |$)`) : normalizedClass },
      '_id',
    ),
  );
  return Guardian.find({ studentIds: { $in: students.map((student) => student._id) } });
}

export async function createBroadcast(
  input: SendBroadcastInput,
  audienceLabel: string,
  targetIds: Types.ObjectId[],
  userId: string,
) {
  const session = await Guardian.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      const rows = await ParentBroadcast.create(
        [
          {
            subject: input.subject,
            message: input.message,
            audience: input.audience,
            audienceLabel,
            grade: input.grade,
            className: input.className,
            guardianId: input.guardianId,
            channel: input.channel,
            recipientCount: targetIds.length,
            deliveredCount: targetIds.length,
            readCount: 0,
            sentBy: userId,
          },
        ],
        { session },
      );
      created = rows[0];
      await GuardianMessage.insertMany(
        targetIds.map((guardianId) => ({
          guardianId,
          direction: 'out',
          from: 'School Office',
          text: input.message,
          broadcastId: rows[0]._id,
          sentBy: userId,
        })),
        { session },
      );
    });
    return created!;
  } finally {
    await session.endSession();
  }
}

export async function listBroadcasts(query: ListBroadcastsQuery) {
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    ParentBroadcast.find({}).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    ParentBroadcast.countDocuments({}),
  ]);
  return { items, total };
}

export function listMessages(guardianId: string) {
  return GuardianMessage.find({ guardianId }).sort({ createdAt: 1 });
}

export function createMessage(
  guardianId: string,
  text: string,
  userId: string,
  from: string,
  direction: 'in' | 'out' = 'out',
) {
  return GuardianMessage.create({ guardianId, direction, from, text, sentBy: userId });
}
