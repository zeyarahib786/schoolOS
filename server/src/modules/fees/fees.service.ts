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

function invoiceForResponse(invoice: IInvoice): InvoiceForResponse {
  const row = invoice.toObject() as InvoiceForResponse;
  row.paidAmount = row.paidAmount || 0;
  row.balanceDue = Math.max(0, row.amount - row.paidAmount);
  if (row.status !== 'Paid' && row.dueDate && new Date(row.dueDate) < new Date()) row.status = 'Overdue';
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
  return {
    items: items.map(invoiceForResponse),
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
  const existing = await repo.findByRefId(input.refId);
  if (existing) throw ApiError.conflict(`An invoice with reference ${input.refId} already exists`);
  const created = await repo.create({ ...input, currency: schoolCurrency });
  await logAudit(`Raised invoice ${created.refId} for ${created.amount} ${created.currency}`, 'Fees', requester.id);
  return created;
}

async function applyPayment(invoice: IInvoice, input: RecordPaymentInput, requester: AuthenticatedUser): Promise<IInvoice> {
  const currentPaid = invoice.paidAmount || 0;
  const balance = Math.max(0, invoice.amount - currentPaid);
  if (balance <= 0 || invoice.status === 'Paid') throw ApiError.conflict('Invoice is already fully paid');
  const amount = input.amount ?? balance;
  if (amount > balance) throw ApiError.badRequest(`Payment amount exceeds balance due (${balance})`);
  await repo.createPayment({
    invoice: invoice._id.toString(),
    student: invoice.student._id?.toString?.() || invoice.student.toString(),
    amount,
    currency: invoice.currency,
    paymentMethod: input.paymentMethod,
    reference: input.reference,
    recordedBy: requester.id,
  });
  const paidAmount = currentPaid + amount;
  const paidInFull = paidAmount >= invoice.amount;
  const dueStatus = invoice.dueDate < new Date() ? 'Overdue' : 'Pending';
  const updated = await repo.updateAfterPayment(invoice._id.toString(), {
    paidAmount,
    status: paidInFull ? 'Paid' : dueStatus,
    paymentMethod: input.paymentMethod,
    paidDate: paidInFull ? new Date() : undefined,
  });
  if (!updated) throw ApiError.notFound('Invoice not found');
  await logAudit(`Recorded ${invoice.currency} ${amount} payment for invoice ${invoice.refId}`, 'Fees', requester.id);
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

export async function recordStudentPayment(input: StudentPaymentInput, requester: AuthenticatedUser): Promise<IInvoice> {
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
    if (requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Accountant') return base;
    return { ...base, student: { $in: authorizedStudentIds } };
  });
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function sendFeeReminders(input: SendFeeRemindersInput | undefined, requester: AuthenticatedUser) {
  if (!canManageFees(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Accountant may send fee reminders');
  const invoices = input?.invoiceIds?.length ? await repo.findInvoicesByIds(input.invoiceIds) : await repo.findReminderCandidates();
  let sent = 0;
  let skipped = 0;
  await Promise.all(invoices.map(async (invoice) => {
    const view = invoiceForResponse(invoice);
    if (view.status === 'Paid') return;
    const student = invoice.student as unknown as { name?: string; refId?: string; guardianUserId?: { toString(): string } };
    const guardianId = student.guardianUserId?.toString();
    if (!guardianId) { skipped += 1; return; }
    await Message.create({
      sender: requester.id,
      recipient: guardianId,
      subject: `Fee reminder: ${invoice.refId}`,
      body: `This is a reminder that ${invoice.currency} ${view.balanceDue} remains due for ${student.name || 'your child'} (${invoice.term}).`,
    });
    sent += 1;
  }));
  await logAudit(`Sent fee reminders (${sent} sent, ${skipped} skipped)`, 'Fees', requester.id);
  return { sent, skipped, considered: invoices.length };
}
