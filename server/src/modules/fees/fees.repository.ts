import { schoolToday } from '../attendance/attendance.dates';
import { FilterQuery } from 'mongoose';
import { Invoice, IInvoice } from '../../models/Invoice';
import { InvoicePayment, IInvoicePayment } from '../../models/InvoicePayment';
import { Student } from '../../models/Student';
import { Role } from '../../types/roles';
import { ListInvoicesQuery, CreateInvoiceInput, ListPaymentsQuery } from './fees.validation';

export async function findMany(
  query: ListInvoicesQuery,
  applyOwnershipScope: (base: FilterQuery<IInvoice>) => FilterQuery<IInvoice>,
): Promise<{ items: IInvoice[]; total: number }> {
  let filter: FilterQuery<IInvoice> = {};
  if (query.studentId) filter.student = query.studentId;
  if (query.status === 'Paid') filter.status = 'Paid';
  else if (query.status) {
    filter.status = { $ne: 'Paid' };
    filter.dueDate =
      query.status === 'Overdue' ? { $lt: new Date(await schoolToday()) } : { $gte: new Date(await schoolToday()) };
  }
  filter = applyOwnershipScope(filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Invoice.find(filter).sort({ dueDate: -1 }).skip(skip).limit(query.limit).populate('student', 'name refId grade'),
    Invoice.countDocuments(filter),
  ]);
  return { items, total };
}

export function findById(id: string): Promise<IInvoice | null> {
  return Invoice.findById(id).populate('student', 'name refId grade');
}

export function findByRefId(refId: string): Promise<IInvoice | null> {
  return Invoice.findOne({ refId });
}

export function create(input: CreateInvoiceInput): Promise<IInvoice> {
  return Invoice.create({
    refId: input.refId,
    student: input.studentId,
    term: input.term,
    amount: input.amount,
    currency: input.currency ?? 'AED',
    dueDate: new Date(input.dueDate),
  });
}

export function updateAfterPayment(
  id: string,
  input: { paidAmount: number; status: 'Pending' | 'Paid' | 'Overdue'; paymentMethod: string; paidDate?: Date },
): Promise<IInvoice | null> {
  return Invoice.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true }).populate(
    'student',
    'name refId grade guardianUserId guardianEmail',
  );
}

export function createPayment(input: {
  invoice: string;
  student: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  reference?: string;
  recordedBy: string;
}): Promise<IInvoicePayment> {
  return InvoicePayment.create(input);
}

export async function findPayments(
  query: ListPaymentsQuery,
  applyOwnershipScope: (base: FilterQuery<IInvoicePayment>) => FilterQuery<IInvoicePayment>,
): Promise<{ items: IInvoicePayment[]; total: number }> {
  let filter: FilterQuery<IInvoicePayment> = {};
  if (query.studentId) filter.student = query.studentId;
  if (query.invoiceId) filter.invoice = query.invoiceId;
  filter = applyOwnershipScope(filter);
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    InvoicePayment.find(filter)
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('invoice', 'refId term')
      .populate('student', 'name refId grade')
      .populate('recordedBy', 'name role'),
    InvoicePayment.countDocuments(filter),
  ]);
  return { items, total };
}

export function findOldestUnpaidByStudent(studentId: string): Promise<IInvoice | null> {
  return Invoice.findOne({ student: studentId, status: { $ne: 'Paid' } })
    .sort({ dueDate: 1 })
    .populate('student', 'name refId grade guardianUserId guardianEmail');
}

export function findInvoicesByIds(ids: string[]) {
  return Invoice.find({ _id: { $in: ids } }).populate('student', 'name refId grade guardianUserId guardianEmail');
}

export function findReminderCandidates() {
  return Invoice.find({ status: { $ne: 'Paid' } })
    .sort({ dueDate: 1 })
    .populate('student', 'name refId grade guardianUserId guardianEmail');
}

export function findAuthorizedStudentIds(userId: string, role: Role) {
  const filter =
    role === 'Parent'
      ? { guardianUserId: userId }
      : role === 'Student'
        ? { studentUserId: userId }
        : { _id: { $in: [] } };
  return Student.find(filter)
    .select('_id')
    .then((students) => students.map((s) => s._id));
}
