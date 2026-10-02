import { ApiError } from '../../utils/ApiError';
import { IBook } from '../../models/Book';
import { ILoan } from '../../models/Loan';
import * as repo from './library.repository';
import { ListBooksQuery, CreateBookInput, IssueLoanInput, ListLoansQuery, CreateBookRequestInput, ListBookRequestsQuery, SendRemindersInput } from './library.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeLoanFilter, canManageLibrary } from './library.ownership';
import { logAudit } from '../audit/audit.service';

export async function listBooks(query: ListBooksQuery) {
  const { items, total } = await repo.findManyBooks(query);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function addNewArrival(input: CreateBookInput, requester: AuthenticatedUser): Promise<IBook> {
  if (!canManageLibrary(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may add a book');
  const existing = await repo.findBookByIsbn(input.isbn);
  if (existing) {
    // Adding an already-known ISBN restocks it rather than erroring - a real librarian receiving
    // more copies of a title already in the catalogue expects this to just work.
    const updated = await repo.addCopies(existing._id.toString(), input.totalCopies);
    if (!updated) throw ApiError.internal('Failed to restock book');
    await logAudit(`Restocked ${input.totalCopies} copies of ${updated.title}`, 'Library', requester.id);
    return updated;
  }
  try { const book = await repo.createBook(input); await logAudit(`Added library title ${book.title}`, 'Library', requester.id); return book; }
  catch (error) { if ((error as { code?: number }).code === 11000) throw ApiError.conflict('A book with this ISBN already exists'); throw error; }
}

export async function issueLoan(input: IssueLoanInput, requester: AuthenticatedUser): Promise<ILoan> {
  if (!canManageLibrary(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may issue a book');
  const dueDate = new Date(input.dueDate);
  if (Number.isNaN(dueDate.getTime()) || dueDate <= new Date()) throw ApiError.badRequest('Due date must be in the future');
  const student = await repo.findStudentById(input.studentId);
  if (!student) throw ApiError.notFound('Student not found');
  if (student.status !== 'Active') throw ApiError.conflict('Only active students may borrow library books');
  if (await repo.findActiveLoanForBookAndStudent(input.bookId, input.studentId)) throw ApiError.conflict('This student already has an open loan for this title');
  const limit = /^(KG|Grade 1)\b/.test(student.grade) ? 3 : 5;
  if (await repo.countOpenLoansForStudent(input.studentId) >= limit) throw ApiError.conflict(`This student has reached the library limit of ${limit} open loans`);

  const book = await repo.decrementAvailableCopy(input.bookId);
  if (!book) throw ApiError.conflict('No copies of this book are currently available');

  try {
    const loan = await repo.createLoan(input.bookId, input.studentId, dueDate);
    await logAudit(`Issued ${book.title} to ${student.refId}`, 'Library', requester.id); return loan;
  } catch (err) {
    // If loan creation fails for any reason after the copy was already claimed, give it back -
    // an atomic decrement is only half the safety property; the compensating increment on
    // failure is what prevents a permanently "lost" copy if something downstream goes wrong.
    await repo.incrementAvailableCopy(input.bookId);
    throw err;
  }
}

export async function returnLoan(loanId: string, requester: AuthenticatedUser): Promise<ILoan> {
  if (!canManageLibrary(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may process a return');
  const loan = await repo.findLoanById(loanId);
  if (!loan) throw ApiError.notFound('Loan not found');
  if (loan.status === 'Returned') throw ApiError.conflict('This loan has already been returned');

  const updated = await repo.markLoanReturned(loanId);
  if (!updated) throw ApiError.conflict('This loan has already been returned');
  await repo.incrementAvailableCopy(loan.book.toString());
  await logAudit(`Returned library loan ${loanId}`, 'Library', requester.id);
  return updated;
}

export async function listLoans(query: ListLoansQuery, requester: AuthenticatedUser) {
  await repo.markPastDueLoansOverdue(new Date());
  const authorizedStudentIds =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Teacher'
      ? []
      : await repo.findAuthorizedStudentIds(requester.id, requester.role);

  const { items, total } = await repo.findManyLoans(query, (base) =>
    scopeLoanFilter(base, requester, authorizedStudentIds),
  );
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

async function requesterStudents(requester: AuthenticatedUser) {
  if (requester.role === 'Student') {
    const student = await repo.findStudentForStudentUser(requester.id);
    return student ? [student] : [];
  }
  if (requester.role === 'Parent') return repo.findStudentsForGuardian(requester.id);
  return [];
}

export async function createBookRequest(input: CreateBookRequestInput, requester: AuthenticatedUser) {
  if (requester.role !== 'Student' && requester.role !== 'Parent')
    throw ApiError.forbidden('Only a Student or Parent may request a library book');
  const students = await requesterStudents(requester);
  if (!students.length) throw ApiError.forbidden('Your account is not linked to an active student record');
  const student = students.find((item) => item.status === 'Active');
  if (!student) throw ApiError.conflict('Only active students may request library books');
  const book = await repo.findBookById(input.bookId);
  if (!book) throw ApiError.notFound('Book not found');
  if (await repo.findPendingRequest(input.bookId, student._id.toString()))
    throw ApiError.conflict('There is already a pending request for this title');
  const request = await repo.createBookRequest(input.bookId, student._id.toString(), requester.id, input.note);
  await logAudit(`Requested ${book.title} for ${student.refId}`, 'Library', requester.id);
  return request;
}

export async function listBookRequests(query: ListBookRequestsQuery, requester: AuthenticatedUser) {
  const managed = canManageLibrary(requester.role);
  const students = managed ? undefined : await requesterStudents(requester);
  if (!managed && !(students && students.length))
    return { items: [], pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
  const { items, total } = await repo.findManyBookRequests(query, students && students.map((student) => student._id.toString()));
  return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}

export async function fulfillRequest(id: string, requester: AuthenticatedUser) {
  if (!canManageLibrary(requester.role)) throw ApiError.forbidden('Only library staff may fulfil book requests');
  const existing = await repo.findBookRequestById(id);
  if (!existing) throw ApiError.notFound('Book request not found');
  if (existing.status !== 'Pending') throw ApiError.conflict('This book request has already been fulfilled');
  const request = await repo.fulfillBookRequest(id, requester.id);
  if (!request) throw ApiError.conflict('This book request has already been fulfilled');
  await logAudit(`Fulfilled library request ${id}`, 'Library', requester.id);
  return request;
}

export async function sendOverdueReminders(input: SendRemindersInput, requester: AuthenticatedUser) {
  if (!canManageLibrary(requester.role)) throw ApiError.forbidden('Only library staff may send overdue reminders');
  const loans = await repo.findLoansForReminder(input.loanIds);
  if (loans.length !== input.loanIds.length) throw ApiError.badRequest('Every selected loan must still be overdue');
  let sent = 0; let skipped = 0;
  for (const loan of loans) {
    const student = loan.student as unknown as { name: string; guardianUserId?: { toString(): string }; studentUserId?: { toString(): string } };
    const book = loan.book as unknown as { title: string };
    const recipient = student.guardianUserId || student.studentUserId;
    if (!recipient) { skipped += 1; continue; }
    await repo.createPortalReminder(requester.id, recipient.toString(), `Overdue library book: ${book.title}`, `The library book "${book.title}" issued to ${student.name} is overdue. Please return it to the school library.`);
    await repo.recordReminder(loan._id.toString());
    sent += 1;
  }
  await logAudit(`Sent ${sent} overdue library portal reminder(s)${skipped ? `; ${skipped} unlinked recipient(s) skipped` : ''}`, 'Library', requester.id);
  return { sent, skipped };
}
