import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import { FilterQuery } from 'mongoose';
import { CafeteriaWallet, ICafeteriaWallet } from '../../models/CafeteriaWallet';
import { CafeteriaTransaction } from '../../models/CafeteriaTransaction';
import { Student } from '../../models/Student';
import { ListWalletsQuery } from './cafeteria.validation';
import { CafeteriaAllergyPlan } from '../../models/CafeteriaAllergyPlan';
import { CafeteriaMenu } from '../../models/CafeteriaMenu';

export async function findManyWallets(
  query: ListWalletsQuery,
  applyOwnershipScope: (base: FilterQuery<ICafeteriaWallet>) => FilterQuery<ICafeteriaWallet>,
): Promise<{ items: ICafeteriaWallet[]; total: number }> {
  const filter = applyOwnershipScope({});
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    CafeteriaWallet.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('student', 'name refId grade'),
    CafeteriaWallet.countDocuments(filter),
  ]);
  return { items, total };
}

export async function findOrCreateWallet(studentId: string): Promise<ICafeteriaWallet> {
  const existing = await CafeteriaWallet.findOne({ student: studentId });
  if (existing) return existing;
  return CafeteriaWallet.create({ student: studentId, balance: 0 });
}

/** Wallet and immutable ledger entry commit together. Student serialization also protects first use. */
export async function recordWalletMovement(
  studentId: string,
  amount: number,
  description: string,
  type: 'TopUp' | 'Purchase',
  actor: string,
  requestId?: string,
  method?: string,
  reference?: string,
) {
  const session = await mongoose.startSession();
  let result: ICafeteriaWallet | null = null;
  try {
    await session.withTransaction(async () => {
      const student = await Student.findOneAndUpdate(
        { _id: studentId, status: 'Active' },
        { $inc: { __v: 1 } },
        { session },
      );
      if (!student) throw ApiError.conflict('Cafeteria activity requires an active student');
      let wallet = await CafeteriaWallet.findOne({ student: studentId }).session(session);
      if (!wallet) wallet = (await CafeteriaWallet.create([{ student: studentId, balance: 0 }], { session }))[0];
      if (requestId) {
        const previous = await CafeteriaTransaction.findOne({ wallet: wallet._id, requestId }).session(session);
        if (previous) {
          if (
            previous.type !== type ||
            previous.amount !== amount ||
            previous.description !== description ||
            previous.method !== method ||
            previous.reference !== reference
          )
            throw ApiError.conflict('This request ID was already used for a different transaction');
          result = wallet;
          return;
        }
      }
      const cents = Math.round(wallet.balance * 100);
      if (Math.abs(wallet.balance * 100 - cents) > 0.000001)
        throw ApiError.conflict('Legacy wallet balance requires a reviewed reconciliation');
      const delta = Math.round(amount * 100) * (type === 'Purchase' ? -1 : 1);
      if (cents + delta < 0) throw ApiError.conflict('Insufficient wallet balance for this purchase');
      if (cents + delta > 100000000) throw ApiError.conflict('Wallet balance exceeds the supported limit');
      wallet.balance = (cents + delta) / 100;
      await wallet.save({ session });
      await CafeteriaTransaction.create(
        [
          {
            wallet: wallet._id,
            type,
            amount,
            description,
            requestId,
            method,
            reference,
            recordedBy: actor,
            balanceAfter: wallet.balance,
          },
        ],
        { session },
      );
      result = wallet;
    });
    return result as unknown as ICafeteriaWallet;
  } finally {
    await session.endSession();
  }
}

export function findAuthorizedStudentIds(userId: string, role: string) {
  return Student.find(
    role === 'Parent'
      ? { guardianUserId: userId }
      : role === 'Student'
        ? { studentUserId: userId }
        : { _id: { $in: [] } },
  )
    .select('_id')
    .then((students) => students.map((s) => s._id));
}

export async function findTransactions(studentIds: string[] | null, page: number, limit: number) {
  const walletFilter = studentIds === null ? {} : { student: { $in: studentIds } };
  const walletIds = await CafeteriaWallet.find(walletFilter).distinct('_id');
  const filter = { wallet: { $in: walletIds } };
  const [items, total] = await Promise.all([
    CafeteriaTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: 'wallet', populate: { path: 'student', select: 'name refId grade' } }),
    CafeteriaTransaction.countDocuments(filter),
  ]);
  return { items, total };
}

export async function findAllergyPlans(studentIds: string[] | null, page: number, limit: number) {
  const filter = studentIds === null ? {} : { student: { $in: studentIds } };
  const [items, total] = await Promise.all([
    CafeteriaAllergyPlan.find(filter)
      .sort({ severity: 1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('student', 'name refId grade'),
    CafeteriaAllergyPlan.countDocuments(filter),
  ]);
  return { items, total };
}

export async function saveAllergyPlan(input: import('./cafeteria.validation').SaveAllergyPlanInput, createdBy: string) {
  const { studentId, expectedUpdatedAt, reason, ...plan } = input;
  const current = await CafeteriaAllergyPlan.findOne({ student: studentId });
  if (!current) {
    if (expectedUpdatedAt) throw ApiError.conflict('The care plan no longer exists');
    try {
      return await (
        await CafeteriaAllergyPlan.create({ student: studentId, ...plan, createdBy })
      ).populate('student', 'name refId grade');
    } catch (e) {
      if ((e as { code?: number }).code === 11000)
        throw ApiError.conflict('A care plan was created concurrently; reload it');
      throw e;
    }
  }
  if (!expectedUpdatedAt || !reason) throw ApiError.badRequest('Corrections require the saved version and a reason');
  const updated = await CafeteriaAllergyPlan.findOneAndUpdate(
    { _id: current._id, updatedAt: new Date(expectedUpdatedAt) },
    {
      $set: { ...plan },
      $push: {
        history: {
          at: new Date(),
          by: createdBy,
          reason,
          previous: { allergens: current.allergens, severity: current.severity, carePlan: current.carePlan },
        },
      },
    },
    { new: true, runValidators: true },
  ).populate('student', 'name refId grade');
  if (!updated) throw ApiError.conflict('The care plan changed; reload before correcting it');
  return updated;
}

export function studentExists(studentId: string) {
  return Student.exists({ _id: studentId });
}

export function findStudentById(studentId: string) {
  return Student.findById(studentId);
}

const menuDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
export async function listMenu() {
  const rows = await CafeteriaMenu.find({});
  return rows.sort((a, b) => menuDays.indexOf(a.day) - menuDays.indexOf(b.day));
}

export async function saveMenuItem(input: import('./cafeteria.validation').SaveMenuItemInput, actor: string) {
  const slot = input.meal.toLowerCase() as 'breakfast' | 'lunch' | 'snack';
  const dish = { item: input.item, calories: input.calories, vegetarian: input.vegetarian, allergens: input.allergens };
  const current = await CafeteriaMenu.findOne({ day: input.day });
  if (!current) {
    if (input.expectedUpdatedAt) throw ApiError.conflict('Menu changed; reload');
    try {
      return await CafeteriaMenu.create({ day: input.day, [slot]: dish });
    } catch (e) {
      if ((e as { code?: number }).code === 11000) throw ApiError.conflict('Menu created concurrently; reload');
      throw e;
    }
  }
  if (current[slot] && (!input.expectedUpdatedAt || !input.reason))
    throw ApiError.badRequest('Dish corrections require the saved version and a reason');
  const updated = await CafeteriaMenu.findOneAndUpdate(
    { _id: current._id, updatedAt: input.expectedUpdatedAt ? new Date(input.expectedUpdatedAt) : current.updatedAt },
    {
      $set: { [slot]: dish },
      $push: {
        history: {
          at: new Date(),
          by: actor,
          meal: input.meal,
          reason: input.reason || 'Added meal slot',
          previous: current[slot],
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!updated) throw ApiError.conflict('Menu changed; reload before saving');
  return updated;
}
