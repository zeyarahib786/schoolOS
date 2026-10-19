import { User } from '../../models/User';
import { Guardian } from '../../models/Guardian';
import mongoose from 'mongoose';
import { Invoice } from '../../models/Invoice';
import { InvoicePayment } from '../../models/InvoicePayment';
import { Student } from '../../models/Student';
import { FeeHead } from '../../models/FeeHead';
import { z } from 'zod';
import { createFeeHeadSchema } from './fees.validation';
import { schoolToday } from '../attendance/attendance.dates';
import { ApiError } from '../../utils/ApiError';
import { IInvoice } from '../../models/Invoice';
import { Message } from '../../models/Message';
import * as repo from './fees.repository';
import {
  ListInvoicesQuery,
  CreateInvoiceInput,
  RecordPaymentInput,
  StudentPaymentInput,
  ListPaymentsQuery,
  SendFeeRemindersInput,
} from './fees.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeInvoiceFilter, canManageFees } from './fees.ownership';
import { logAudit } from '../audit/audit.service';
import { getSettings } from '../settings/settings.repository';

type InvoiceForResponse = ReturnType<IInvoice['toObject']> & {
  amount: number;
  paidAmount: number;
  balanceDue: number;
  dueDate: Date;
  status: 'Pending' | 'Paid' | 'Overdue';
};

function invoiceForResponse(invoice: IInvoice, today = new Date().toISOString().slice(0, 10)): InvoiceForResponse {
  const row = invoice.toObject() as InvoiceForResponse;
  row.paidAmount = row.paidAmount || 0;
  row.balanceDue = Math.max(0, Math.round((row.amount - row.paidAmount) * 100) / 100);
  if (row.status !== 'Paid' && row.dueDate && new Date(row.dueDate).toISOString().slice(0, 10) < today)
    row.status = 'Overdue';
  return row;
}

export async function listInvoices(query: ListInvoicesQuery, requester: AuthenticatedUser) {
  const authorizedStudentIds =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Accountant'
      ? []
      : await repo.findAuthorizedStudentIds(requester.id, requester.role);

  const { items, total } = await repo.findMany(query, (base) =>
    scopeInvoiceFilter(base, requester, authorizedStudentIds),
  );
  const today = await schoolToday();
  return {
    items: items.map((row) => invoiceForResponse(row, today)),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function createInvoice(input: CreateInvoiceInput, requester: AuthenticatedUser): Promise<IInvoice> {
  if (!canManageFees(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Accountant may raise invoices');
  const settings = await getSettings();
  const schoolCurrency = settings.currency.toUpperCase();
  if (input.currency && input.currency.toUpperCase() !== schoolCurrency) {
    throw ApiError.badRequest(`Invoice currency must match the school currency (${schoolCurrency})`);
  }
  if (!(await Student.exists({ _id: input.studentId, status: 'Active' })))
    throw ApiError.badRequest('Choose an existing active student');
  const existing = await repo.findByRefId(input.refId);
  if (existing) throw ApiError.conflict(`An invoice with reference ${input.refId} already exists`);
  const created = await repo.create({ ...input, currency: schoolCurrency, dueDate: input.dueDate.slice(0, 10) });
  await logAudit(`Raised invoice ${created.refId} for ${created.amount} ${created.currency}`, 'Fees', requester.id);
  return created;
}

async function applyPayment(
  invoice: IInvoice,
  input: RecordPaymentInput,
  requester: AuthenticatedUser,
): Promise<IInvoice> {
  const key = input.idempotencyKey ? `${requester.id}:${input.idempotencyKey}` : undefined;
  const session = await mongoose.startSession();
  let updated: IInvoice | null = null;
  const today = await schoolToday();
  try {
    await session.withTransaction(async () => {
      const row = await Invoice.findById(invoice._id).session(session);
      if (!row) throw ApiError.notFound('Invoice not found');
      if (key) {
        const previous = await InvoicePayment.findOne({ idempotencyKey: key }).session(session);
        if (previous) {
          if (
            previous.invoice.toString() !== row._id.toString() ||
            previous.paymentMethod !== input.paymentMethod ||
            previous.reference !== (input.reference || undefined) ||
            (input.amount !== undefined && previous.amount !== input.amount)
          )
            throw ApiError.conflict('Payment request key was already used for different details');
          updated = row;
          return;
        }
      }
      const balance = Math.round(row.amount * 100) - Math.round((row.paidAmount || 0) * 100);
      if (balance <= 0 || row.status === 'Paid') throw ApiError.conflict('Invoice is already fully paid');
      const amount = input.amount === undefined ? balance : Math.round(input.amount * 100);
      if (amount > balance) throw ApiError.badRequest(`Payment exceeds outstanding balance (${balance / 100})`);
      await InvoicePayment.create(
        [
          {
            invoice: row._id,
            student: row.student,
            amount: amount / 100,
            currency: row.currency,
            paymentMethod: input.paymentMethod,
            reference: input.reference || undefined,
            recordedBy: requester.id,
            idempotencyKey: key,
          },
        ],
        { session },
      );
      row.paidAmount = (Math.round((row.paidAmount || 0) * 100) + amount) / 100;
      row.status = amount === balance ? 'Paid' : row.dueDate.toISOString().slice(0, 10) < today ? 'Overdue' : 'Pending';
      row.paymentMethod = input.paymentMethod;
      if (row.status === 'Paid') row.paidDate = new Date();
      await row.save({ session });
      updated = row;
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      throw ApiError.conflict('Payment request was already recorded; refresh before retrying');
    throw error;
  } finally {
    await session.endSession();
  }
  if (!updated) throw ApiError.conflict('Payment could not be saved');
  await logAudit(`Recorded/replayed payment for invoice ${invoice.refId}`, 'Fees', requester.id);
  return updated;
}

export async function recordPayment(
  id: string,
  input: RecordPaymentInput,
  requester: AuthenticatedUser,
): Promise<IInvoice> {
  if (!canManageFees(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Accountant may record payments');
  const invoice = await repo.findById(id);
  if (!invoice) throw ApiError.notFound('Invoice not found');
  return applyPayment(invoice, input, requester);
}

export async function recordStudentPayment(
  input: StudentPaymentInput,
  requester: AuthenticatedUser,
): Promise<IInvoice> {
  if (!canManageFees(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Accountant may record payments');
  const invoice = await repo.findOldestUnpaidByStudent(input.studentId);
  if (!invoice) throw ApiError.notFound('No unpaid invoice found for this student');
  return applyPayment(invoice, input, requester);
}

export async function listPayments(query: ListPaymentsQuery, requester: AuthenticatedUser) {
  const authorizedStudentIds =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Accountant'
      ? []
      : await repo.findAuthorizedStudentIds(requester.id, requester.role);
  const { items, total } = await repo.findPayments(query, (base) => {
    if (requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Accountant')
      return base;
    return { $and: [base, { student: { $in: authorizedStudentIds } }] };
  });
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function sendFeeReminders(input: SendFeeRemindersInput | undefined, requester: AuthenticatedUser) {
  if (!canManageFees(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Accountant may send fee reminders');
  const invoices =
    input?.invoiceIds !== undefined
      ? await repo.findInvoicesByIds(input.invoiceIds)
      : await repo.findReminderCandidates();
  let sent = 0;
  let skipped = 0;
  await Promise.all(
    invoices.map(async (invoice) => {
      const view = invoiceForResponse(invoice);
      if (view.status === 'Paid') {
        skipped++;
        return;
      }
      const student = invoice.student as unknown as {
        name?: string;
        refId?: string;
        guardianUserId?: { toString(): string };
      };
      const guardianId = student.guardianUserId?.toString();
      if (
        !guardianId ||
        !(await User.exists({ _id: guardianId, isActive: true })) ||
        (await Guardian.exists({ userId: guardianId, portalStatus: 'Suspended' }))
      ) {
        skipped += 1;
        return;
      }
      await Message.create({
        sender: requester.id,
        recipient: guardianId,
        subject: `Fee reminder: ${invoice.refId}`,
        body: `This is a reminder that ${invoice.currency} ${view.balanceDue} remains due for ${student.name || 'your child'} (${invoice.term}).`,
      });
      sent += 1;
    }),
  );
  await logAudit(`Sent fee reminders (${sent} sent, ${skipped} skipped)`, 'Fees', requester.id);
  return { sent, skipped, considered: invoices.length };
}

export async function listHeads(requester: AuthenticatedUser) {
  if (!canManageFees(requester.role)) throw ApiError.forbidden('Fee configuration is restricted to finance staff');
  return FeeHead.find().sort({ status: 1, name: 1 });
}
export async function saveHead(
  id: string | undefined,
  input: z.infer<typeof createFeeHeadSchema>['body'] & { expectedUpdatedAt?: string },
  requester: AuthenticatedUser,
) {
  if (!canManageFees(requester.role)) throw ApiError.forbidden('Fee configuration is restricted to finance staff');
  const settings = await getSettings();
  const { expectedUpdatedAt, ...values } = input;
  const row = id
    ? await FeeHead.findOneAndUpdate(
        { _id: id, updatedAt: new Date(expectedUpdatedAt || '') },
        { $set: { ...values, currency: settings.currency } },
        { new: true, runValidators: true },
      )
    : await FeeHead.create({ ...values, currency: settings.currency });
  if (!row) throw ApiError.conflict('Fee head changed or is unavailable. Reload before saving');
  await logAudit(`${id ? 'Updated' : 'Created'} fee head ${row.name}`, 'Fees', requester.id);
  return row;
}
