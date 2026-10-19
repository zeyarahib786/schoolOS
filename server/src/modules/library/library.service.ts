import mongoose, { ClientSession } from 'mongoose';
import { Book } from '../../models/Book';
import { Loan } from '../../models/Loan';
import { Student } from '../../models/Student';
import { User } from '../../models/User';
import { Guardian } from '../../models/Guardian';
import { Message } from '../../models/Message';
import { BookRequest } from '../../models/BookRequest';
import { schoolDeadline } from '../../utils/schoolDeadline';
import { schoolToday } from '../attendance/attendance.dates';
import { ApiError } from '../../utils/ApiError';
import { IBook } from '../../models/Book';
import { ILoan } from '../../models/Loan';
import * as repo from './library.repository';
import {
  ListBooksQuery,
  CreateBookInput,
  IssueLoanInput,
  ListLoansQuery,
  CreateBookRequestInput,
  ListBookRequestsQuery,
  SendRemindersInput,
} from './library.validation';
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
    if (existing.title !== input.title || existing.author !== input.author)
      throw ApiError.conflict('This ISBN belongs to a different title/author; review the catalogue before restocking');
    // Adding an already-known ISBN restocks it rather than erroring - a real librarian receiving
    // more copies of a title already in the catalogue expects this to just work.
    const updated = await repo.addCopies(existing._id.toString(), input.totalCopies);
    if (!updated) throw ApiError.internal('Failed to restock book');
    await logAudit(`Restocked ${input.totalCopies} copies of ${updated.title}`, 'Library', requester.id);
    return updated;
  }
  try {
    const book = await repo.createBook(input);
    await logAudit(`Added library title ${book.title}`, 'Library', requester.id);
    return book;
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw ApiError.conflict('A book with this ISBN already exists');
    throw error;
  }
}

export async function issueLoan(input: IssueLoanInput, requester: AuthenticatedUser): Promise<ILoan> {
  if (!canManageLibrary(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may issue a book');
  const dueDate = await schoolDeadline(input.dueDate);
  const session = await mongoose.startSession();
  let loan: ILoan | undefined;
  try {
    await session.withTransaction(async () => {
      loan = await issueInTransaction(input.bookId, input.studentId, dueDate, requester, session);
    });
  } finally {
    await session.endSession();
  }
  if (!loan) throw ApiError.conflict('Loan could not be saved');
  await logAudit('Issued library loan ' + loan._id, 'Library', requester.id);
  return loan;
}
async function issueInTransaction(
  bookId: string,
  studentId: string,
  dueDate: Date,
  user: AuthenticatedUser,
  session: ClientSession,
): Promise<ILoan> {
  if (dueDate <= new Date()) throw ApiError.badRequest('Due date must be in the future');
  const student = await Student.findById(studentId).session(session);
  if (!student) throw ApiError.notFound('Student not found');
  if (student.status !== 'Active') throw ApiError.conflict('Only active students may borrow library books');
  // Every intake/request locks the same student row, serializing duplicate and allowance checks.
  await Student.updateOne({ _id: studentId }, { $inc: { __v: 1 } }, { session });
  if (await Loan.exists({ book: bookId, student: studentId, status: { $in: ['Active', 'Overdue'] } }).session(session))
    throw ApiError.conflict('This student already has an open loan for this title');
  const limit = /^(KG|Grade 1)\b/.test(student.grade) ? 3 : 5;
  if (
    (await Loan.countDocuments({ student: studentId, status: { $in: ['Active', 'Overdue'] } }).session(session)) >=
    limit
  )
    throw ApiError.conflict('Borrowing limit reached: ' + limit + ' open loans');
  const book = await Book.findOneAndUpdate(
    { _id: bookId, availableCopies: { $gt: 0 } },
    { $inc: { availableCopies: -1 } },
    { new: true, session },
  );
  if (!book) throw ApiError.conflict('No copies are currently available');
  const [loan] = await Loan.create(
    [
      {
        book: bookId,
        student: studentId,
        dueDate,
        history: [{ at: new Date(), actor: user.id, action: 'Issued', dueDate }],
      },
    ],
    { session },
  );
  return loan;
}
export async function returnLoan(loanId: string, user: AuthenticatedUser): Promise<ILoan> {
  if (!canManageLibrary(user.role)) throw ApiError.forbidden('Only library staff may process a return');
  const session = await mongoose.startSession();
  let saved: ILoan | null = null;
  try {
    await session.withTransaction(async () => {
      saved = await Loan.findOneAndUpdate(
        { _id: loanId, status: { $in: ['Active', 'Overdue'] } },
        {
          $set: { status: 'Returned', returnedDate: new Date() },
          $push: { history: { at: new Date(), actor: user.id, action: 'Returned' } },
        },
        { new: true, session },
      );
      if (!saved) throw ApiError.conflict('Loan not found or already returned');
      const book = await Book.findOneAndUpdate(
        { _id: saved.book, $expr: { $lt: ['$availableCopies', '$totalCopies'] } },
        { $inc: { availableCopies: 1 } },
        { session },
      );
      if (!book) throw ApiError.conflict('Catalogue stock needs review before this return');
    });
  } finally {
    await session.endSession();
  }
  if (!saved) throw ApiError.conflict('Return could not be saved');
  await logAudit('Returned library loan ' + loanId, 'Library', user.id);
  return saved;
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
  const student = input.studentId
    ? students.find((r) => r._id.toString() === input.studentId)
    : students.length === 1
      ? students[0]
      : undefined;
  if (!student) throw ApiError.badRequest('Select an authorized child for the request');
  if (student.status !== 'Active') throw ApiError.conflict('Only active students may request books');
  if (!(await repo.findBookById(input.bookId))) throw ApiError.notFound('Book not found');
  const session = await mongoose.startSession();
  let created;
  try {
    await session.withTransaction(async () => {
      await Student.updateOne({ _id: student._id }, { $inc: { __v: 1 } }, { session });
      if (await BookRequest.exists({ book: input.bookId, student: student._id, status: 'Pending' }).session(session))
        throw ApiError.conflict('There is already a pending request for this title');
      [created] = await BookRequest.create(
        [{ book: input.bookId, student: student._id, requestedBy: requester.id, note: input.note }],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  await logAudit('Requested library book ' + input.bookId, 'Library', requester.id);
  return created;
}

export async function listBookRequests(query: ListBookRequestsQuery, requester: AuthenticatedUser) {
  const managed = canManageLibrary(requester.role);
  const students = managed ? undefined : await requesterStudents(requester);
  if (!managed && !(students && students.length))
    return { items: [], pagination: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
  const { items, total } = await repo.findManyBookRequests(
    query,
    students && students.map((student) => student._id.toString()),
  );
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function fulfillRequest(id: string, user: AuthenticatedUser, due?: string) {
  if (!canManageLibrary(user.role)) throw ApiError.forbidden('Only library staff may fulfil requests');
  const day = new Date(await schoolToday());
  day.setUTCDate(day.getUTCDate() + 14);
  const dueDate = await schoolDeadline(due || day.toISOString().slice(0, 10));
  const session = await mongoose.startSession();
  let saved;
  try {
    await session.withTransaction(async () => {
      const current = await BookRequest.findById(id).session(session);
      if (!current) throw ApiError.notFound('Book request not found');
      if (current.status !== 'Pending') throw ApiError.conflict('Request has already been decided');
      const loan = await issueInTransaction(
        current.book.toString(),
        current.student.toString(),
        dueDate,
        user,
        session,
      );
      saved = await BookRequest.findOneAndUpdate(
        { _id: id, status: 'Pending' },
        { $set: { status: 'Fulfilled', loan: loan._id, fulfilledBy: user.id, fulfilledAt: new Date() } },
        { new: true, session },
      );
      if (!saved) throw ApiError.conflict('Request changed; refresh');
    });
  } finally {
    await session.endSession();
  }
  await logAudit('Fulfilled library request ' + id, 'Library', user.id);
  return saved;
}
export async function decideRequest(
  id: string,
  input: { status: 'Cancelled' | 'Rejected'; reason: string },
  user: AuthenticatedUser,
) {
  const current = await BookRequest.findById(id);
  if (!current) throw ApiError.notFound('Request not found');
  if (!canManageLibrary(user.role)) {
    const students = await requesterStudents(user);
    if (input.status !== 'Cancelled' || !students.some((r) => r._id.equals(current.student)))
      throw ApiError.forbidden('You may cancel only your own family requests');
  }
  const saved = await BookRequest.findOneAndUpdate(
    { _id: id, status: 'Pending' },
    { $set: { status: input.status, decisionReason: input.reason, fulfilledBy: user.id, fulfilledAt: new Date() } },
    { new: true },
  );
  if (!saved) throw ApiError.conflict('Request has already been decided');
  await logAudit('Reviewed library request ' + id, 'Library', user.id);
  return saved;
}
export async function reviewBook(
  id: string,
  input: {
    expectedUpdatedAt: string;
    reason: string;
    title?: string;
    author?: string;
    category?: string;
    shelf?: string;
  },
  user: AuthenticatedUser,
) {
  const { expectedUpdatedAt, reason, ...changes } = input;
  const saved = await Book.findOneAndUpdate(
    { _id: id, updatedAt: new Date(expectedUpdatedAt) },
    { $set: changes, $push: { history: { at: new Date(), actor: user.id, reason } } },
    { new: true, runValidators: true },
  );
  if (!saved) throw ApiError.conflict('Book changed; refresh before saving');
  await logAudit('Reviewed library title ' + id, 'Library', user.id);
  return saved;
}
export async function renewLoan(
  id: string,
  input: { dueDate: string; expectedUpdatedAt: string; reason: string },
  user: AuthenticatedUser,
) {
  const dueDate = await schoolDeadline(input.dueDate),
    current = await Loan.findById(id);
  if (!current) throw ApiError.notFound('Loan not found');
  if (dueDate <= new Date() || dueDate <= current.dueDate)
    throw ApiError.badRequest('Renewal must extend the current due date into the future');
  const saved = await Loan.findOneAndUpdate(
    {
      _id: id,
      updatedAt: new Date(input.expectedUpdatedAt),
      status: { $in: ['Active', 'Overdue'] },
      $or: [{ renewalCount: { $lt: 3 } }, { renewalCount: { $exists: false } }],
    },
    {
      $set: { dueDate, status: 'Active' },
      $inc: { renewalCount: 1 },
      $push: {
        history: {
          at: new Date(),
          actor: user.id,
          action: 'Renewed',
          reason: input.reason,
          previousDueDate: current.dueDate,
          dueDate,
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!saved) throw ApiError.conflict('Loan changed, returned or renewal limit reached');
  await logAudit('Renewed library loan ' + id, 'Library', user.id);
  return saved;
}

export async function sendOverdueReminders(input: SendRemindersInput, requester: AuthenticatedUser) {
  if (!canManageLibrary(requester.role)) throw ApiError.forbidden('Only library staff may send overdue reminders');
  const loans = await repo.findLoansForReminder(input.loanIds);
  if (loans.length !== input.loanIds.length) throw ApiError.badRequest('Every selected loan must still be overdue');
  let sent = 0,
    skipped = 0;
  for (const loan of loans) {
    const student = loan.student as unknown as {
        name: string;
        guardianUserId?: { toString(): string };
        studentUserId?: { toString(): string };
      },
      book = loan.book as unknown as { title: string };
    let recipient: string | undefined;
    for (const id of [student.guardianUserId, student.studentUserId])
      if (id) {
        const user = await User.findOne({ _id: id, isActive: true }).select('role');
        if (user && !(await Guardian.exists({ userId: id, portalStatus: 'Suspended' }))) {
          recipient = id.toString();
          break;
        }
      }
    if (!recipient) {
      skipped++;
      continue;
    }
    const session = await mongoose.startSession();
    let claimed = false;
    try {
      await session.withTransaction(async () => {
        const saved = await Loan.findOneAndUpdate(
          {
            _id: loan._id,
            status: 'Overdue',
            $or: [
              { lastReminderAt: { $exists: false } },
              { lastReminderAt: { $lte: new Date(Date.now() - 86400000) } },
            ],
          },
          { $inc: { reminderCount: 1 }, $set: { lastReminderAt: new Date() } },
          { new: true, session },
        );
        if (!saved) {
          claimed = false;
          return;
        }
        await Message.create(
          [
            {
              sender: requester.id,
              recipient,
              subject: 'Overdue library book: ' + book.title,
              body:
                'The library book "' +
                book.title +
                '" issued to ' +
                student.name +
                ' is overdue. Please return it to the school library.',
            },
          ],
          { session },
        );
        claimed = true;
      });
    } finally {
      await session.endSession();
    }
    if (claimed) sent++;
    else skipped++;
  }
  await logAudit(
    'Sent ' + sent + ' overdue library portal reminder(s); ' + skipped + ' skipped',
    'Library',
    requester.id,
  );
  return { sent, skipped };
}
