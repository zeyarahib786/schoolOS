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

/** A simple atomic increment - no guard condition needed, since there's no upper bound on
 * topping up a wallet (unlike a purchase, which must never push the balance negative). */
export async function topUpWallet(studentId: string, amount: number, description: string): Promise<ICafeteriaWallet> {
  const wallet = await findOrCreateWallet(studentId);
  const updated = await CafeteriaWallet.findByIdAndUpdate(wallet._id, { $inc: { balance: amount } }, { new: true });
  await CafeteriaTransaction.create({ wallet: wallet._id, type: 'TopUp', amount, description });
  return updated as ICafeteriaWallet;
}

/**
 * The real balance-safety mechanism - the same atomic guarded-decrement technique as Library's
 * copy count and Transport/Hostel's capacity check, applied here to money instead of physical
 * inventory: the filter requires `balance >= amount` in the SAME operation as the decrement, so
 * two concurrent purchase requests against a low balance can't both succeed and drive the
 * balance negative. Returns null if the guard fails (insufficient funds), the same "loser gets
 * null, not a corrupted write" contract used everywhere else in this codebase.
 */
export async function purchaseIfSufficientBalance(
  studentId: string,
  amount: number,
  description: string,
): Promise<ICafeteriaWallet | null> {
  const wallet = await findOrCreateWallet(studentId);
  const updated = await CafeteriaWallet.findOneAndUpdate(
    { _id: wallet._id, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true },
  );
  if (updated) {
    await CafeteriaTransaction.create({ wallet: wallet._id, type: 'Purchase', amount, description });
  }
  return updated;
}

export function findAuthorizedStudentIds(guardianUserId: string) {
  return Student.find({ guardianUserId })
    .select('_id')
    .then((students) => students.map((s) => s._id));
}

export async function findTransactions(studentIds: string[] | null, page: number, limit: number) {
  const walletFilter = studentIds === null ? {} : { student: { $in: studentIds } };
  const walletIds = await CafeteriaWallet.find(walletFilter).distinct('_id');
  const filter = { wallet: { $in: walletIds } };
  const [items, total] = await Promise.all([
    CafeteriaTransaction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate({ path: 'wallet', populate: { path: 'student', select: 'name refId grade' } }),
    CafeteriaTransaction.countDocuments(filter),
  ]);
  return { items, total };
}

export async function findAllergyPlans(studentIds: string[] | null, page: number, limit: number) {
  const filter = studentIds === null ? {} : { student: { $in: studentIds } };
  const [items, total] = await Promise.all([
    CafeteriaAllergyPlan.find(filter).sort({ severity: 1, updatedAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('student', 'name refId grade'),
    CafeteriaAllergyPlan.countDocuments(filter),
  ]);
  return { items, total };
}

export function saveAllergyPlan(input: { studentId: string; allergens: string; severity: string; carePlan: string }, createdBy: string) {
  const { studentId, ...plan } = input;
  return CafeteriaAllergyPlan.findOneAndUpdate(
    { student: studentId }, { $set: { ...plan, createdBy } }, { new: true, upsert: true, runValidators: true },
  ).populate('student', 'name refId grade');
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

export function saveMenuItem(input: { day: string; meal: string; item: string; calories: number; vegetarian: boolean; allergens: string[] }) {
  const slot = input.meal.toLowerCase();
  const dish = { item: input.item, calories: input.calories, vegetarian: input.vegetarian, allergens: input.allergens };
  return CafeteriaMenu.findOneAndUpdate({ day: input.day }, { $set: { [slot]: dish } }, { new: true, upsert: true, runValidators: true });
}
