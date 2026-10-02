import { FilterQuery } from 'mongoose';
import { Book, IBook } from '../../models/Book';
import { Loan, ILoan } from '../../models/Loan';
import { Student } from '../../models/Student';
import { Role } from '../../types/roles';
import { BookRequest, IBookRequest } from '../../models/BookRequest';
import { Message } from '../../models/Message';
import { ListBooksQuery, CreateBookInput, ListLoansQuery } from './library.validation';

export async function findManyBooks(query: ListBooksQuery): Promise<{ items: IBook[]; total: number }> {
  const filter: FilterQuery<IBook> = {};
  if (query.category) filter.category = query.category;
  if (query.search) filter.$text = { $search: query.search };

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Book.find(filter).sort({ title: 1 }).skip(skip).limit(query.limit),
    Book.countDocuments(filter),
  ]);
  return { items, total };
}

export function findBookByIsbn(isbn: string): Promise<IBook | null> {
  return Book.findOne({ isbn });
}

export function findBookById(id: string): Promise<IBook | null> {
  return Book.findById(id);
}

export function createBook(input: CreateBookInput): Promise<IBook> {
  return Book.create({ ...input, availableCopies: input.totalCopies });
}

/**
 * Adds stock with one atomic $inc on both counters, avoiding lost updates when concurrent
 * restock requests target the same book.
 */
export function addCopies(bookId: string, additionalCopies: number): Promise<IBook | null> {
  return Book.findByIdAndUpdate(
    bookId,
    { $inc: { totalCopies: additionalCopies, availableCopies: additionalCopies } },
    { new: true, runValidators: true },
  );
}

/**
 * The real fix for the class of bug that would otherwise let two concurrent "issue this book"
 * requests both succeed when only one copy remains: the decrement and the availability check
 * happen in the SAME atomic database operation (a filter requiring availableCopies > 0, updated
 * in one findOneAndUpdate), not a separate read-then-write that could race. If two requests hit
 * this at once for the last copy, exactly one succeeds and the other gets null back.
 */
export function decrementAvailableCopy(bookId: string): Promise<IBook | null> {
  return Book.findOneAndUpdate(
    { _id: bookId, availableCopies: { $gt: 0 } },
    { $inc: { availableCopies: -1 } },
    { new: true },
  );
}

export function incrementAvailableCopy(bookId: string): Promise<IBook | null> {
  return Book.findByIdAndUpdate(bookId, { $inc: { availableCopies: 1 } }, { new: true });
}

export function createLoan(bookId: string, studentId: string, dueDate: Date): Promise<ILoan> {
  return Loan.create({ book: bookId, student: studentId, dueDate });
}

export function findLoanById(id: string): Promise<ILoan | null> {
  return Loan.findById(id);
}

export function findStudentById(id: string) { return Student.findById(id); }

export function findActiveLoanForBookAndStudent(bookId: string, studentId: string): Promise<ILoan | null> {
  return Loan.findOne({ book: bookId, student: studentId, status: { $in: ['Active', 'Overdue'] } });
}

export function countOpenLoansForStudent(studentId: string): Promise<number> {
  return Loan.countDocuments({ student: studentId, status: { $in: ['Active', 'Overdue'] } });
}

export function markPastDueLoansOverdue(now: Date): Promise<unknown> {
  return Loan.updateMany({ status: 'Active', dueDate: { $lt: now } }, { status: 'Overdue' });
}

export function markLoanReturned(id: string): Promise<ILoan | null> {
  return Loan.findOneAndUpdate(
    { _id: id, status: { $ne: 'Returned' } },
    { status: 'Returned', returnedDate: new Date() },
    { new: true },
  );
}

export async function findManyLoans(
  query: ListLoansQuery,
  applyOwnershipScope: (base: FilterQuery<ILoan>) => FilterQuery<ILoan>,
): Promise<{ items: ILoan[]; total: number }> {
  let filter: FilterQuery<ILoan> = {};
  if (query.studentId) filter.student = query.studentId;
  if (query.status) filter.status = query.status;
  filter = applyOwnershipScope(filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Loan.find(filter)
      .sort({ issuedDate: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('book', 'title author isbn')
      .populate('student', 'name refId grade'),
    Loan.countDocuments(filter),
  ]);
  return { items, total };
}

export function findAuthorizedStudentIds(userId: string, role: Role) {
  const filter = role === 'Parent' ? { guardianUserId: userId }
    : role === 'Student' ? { studentUserId: userId }
    : { _id: { $in: [] } };
  return Student.find(filter)
    .select('_id')
    .then((students) => students.map((s) => s._id));
}

export function findStudentForStudentUser(userId: string) { return Student.findOne({ studentUserId: userId }); }
export function findStudentsForGuardian(userId: string) { return Student.find({ guardianUserId: userId }); }

export function findPendingRequest(bookId: string, studentId: string): Promise<IBookRequest | null> {
  return BookRequest.findOne({ book: bookId, student: studentId, status: 'Pending' });
}
export function createBookRequest(bookId: string, studentId: string, requestedBy: string, note?: string): Promise<IBookRequest> {
  return BookRequest.create({ book: bookId, student: studentId, requestedBy, note });
}
export function findBookRequestById(id: string): Promise<IBookRequest | null> { return BookRequest.findById(id); }
export function fulfillBookRequest(id: string, fulfilledBy: string): Promise<IBookRequest | null> {
  return BookRequest.findOneAndUpdate({ _id: id, status: 'Pending' }, { status: 'Fulfilled', fulfilledBy, fulfilledAt: new Date() }, { new: true });
}
export async function findManyBookRequests(query: { page: number; limit: number; status?: 'Pending' | 'Fulfilled' }, studentIds?: string[]): Promise<{ items: IBookRequest[]; total: number }> {
  const filter: FilterQuery<IBookRequest> = {};
  if (query.status) filter.status = query.status;
  if (studentIds) filter.student = { $in: studentIds };
  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    BookRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).populate('book', 'title author').populate('student', 'name refId grade').populate('requestedBy', 'name role'),
    BookRequest.countDocuments(filter),
  ]);
  return { items, total };
}
export function findLoansForReminder(ids: string[]): Promise<ILoan[]> {
  return Loan.find({ _id: { $in: ids }, status: 'Overdue' }).populate('book', 'title').populate('student', 'name guardianUserId studentUserId');
}
export function recordReminder(loanId: string): Promise<ILoan | null> {
  return Loan.findByIdAndUpdate(loanId, { $inc: { reminderCount: 1 }, lastReminderAt: new Date() }, { new: true });
}
export function createPortalReminder(sender: string, recipient: string, subject: string, body: string) {
  return Message.create({ sender, recipient, subject, body });
}
