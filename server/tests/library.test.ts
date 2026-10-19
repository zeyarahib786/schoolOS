import request from 'supertest';
import { createApp } from '../src/app';
import { Loan } from '../src/models/Loan';
import { Message } from '../src/models/Message';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

async function createStudent(token: string, refId: string, guardianUserId?: string) {
  if (guardianUserId)
    token = (await registerAndLogin('Administrator', 'library-link-' + refId.toLowerCase() + '@example.invalid')).token;
  const res = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send({
    refId,
    name: 'Fatima Al Hashimi',
    grade: 'Grade 10 · A',
    gender: 'Female',
    roll: '12',
    guardianName: 'Khalid',
    guardianUserId,
    phone: '+971501234567',
  });
  return res.body.data._id as string;
}

const validBook = {
  isbn: '978-0-13-468599-1',
  title: 'Clean Code',
  author: 'Robert Martin',
  category: 'Non-fiction',
  totalCopies: 1,
};

describe('Library API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/library/books');
    expect(res.status).toBe(401);
  });

  it('rejects adding a book by a Parent', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/library/books')
      .set('Authorization', `Bearer ${parent.token}`)
      .send(validBook);
    expect(res.status).toBe(403);
  });

  it('allows a Teacher to add a new arrival', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/library/books')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validBook);
    expect(res.status).toBe(201);
    expect(res.body.data.availableCopies).toBe(1);
  });

  it('restocks (rather than duplicates) when adding a book with an already-known ISBN', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    await request(app).post('/api/v1/library/books').set('Authorization', `Bearer ${teacher.token}`).send(validBook);
    const res = await request(app)
      .post('/api/v1/library/books')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validBook, totalCopies: 2 });
    expect(res.status).toBe(201);
    expect(res.body.data.totalCopies).toBe(3); // 1 original + 2 restocked
    expect(res.body.data.availableCopies).toBe(3);
  });

  it('issues a loan and decrements availableCopies', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const book = await request(app)
      .post('/api/v1/library/books')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validBook);
    const studentId = await createStudent(teacher.token, 'ANS-6001');
    const res = await request(app)
      .post('/api/v1/library/loans')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ bookId: book.body.data._id, studentId, dueDate: '2027-07-01' });
    expect(res.status).toBe(201);

    const booksAfter = await request(app).get('/api/v1/library/books').set('Authorization', `Bearer ${teacher.token}`);
    const updated = booksAfter.body.data.find((b: { _id: string }) => b._id === book.body.data._id);
    expect(updated.availableCopies).toBe(0);
  });

  it('rejects issuing a loan when no copies are available (the real, atomic prevention - not a race-prone read-then-write)', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const book = await request(app)
      .post('/api/v1/library/books')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validBook); // 1 copy
    const studentA = await createStudent(teacher.token, 'ANS-6002');
    const studentB = await createStudent(teacher.token, 'ANS-6003');

    const first = await request(app)
      .post('/api/v1/library/loans')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ bookId: book.body.data._id, studentId: studentA, dueDate: '2027-07-01' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/v1/library/loans')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ bookId: book.body.data._id, studentId: studentB, dueDate: '2027-07-01' });
    expect(second.status).toBe(409);
  });

  it('CONCURRENT loan requests for the last copy: exactly one succeeds, not both - the actual property the atomic decrement exists to guarantee', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher5@alnoor.ae');
    const book = await request(app)
      .post('/api/v1/library/books')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validBook); // 1 copy
    const studentA = await createStudent(teacher.token, 'ANS-6004');
    const studentB = await createStudent(teacher.token, 'ANS-6005');

    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/v1/library/loans')
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({ bookId: book.body.data._id, studentId: studentA, dueDate: '2027-07-01' }),
      request(app)
        .post('/api/v1/library/loans')
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({ bookId: book.body.data._id, studentId: studentB, dueDate: '2027-07-01' }),
    ]);
    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]); // exactly one 201, exactly one 409 - never both 201
  });

  it('returning a loan increments availableCopies back', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher6@alnoor.ae');
    const book = await request(app)
      .post('/api/v1/library/books')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validBook);
    const studentId = await createStudent(teacher.token, 'ANS-6006');
    const loan = await request(app)
      .post('/api/v1/library/loans')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ bookId: book.body.data._id, studentId, dueDate: '2027-07-01' });

    const res = await request(app)
      .post(`/api/v1/library/loans/${loan.body.data._id}/return`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Returned');

    const booksAfter = await request(app).get('/api/v1/library/books').set('Authorization', `Bearer ${teacher.token}`);
    const updated = booksAfter.body.data.find((b: { _id: string }) => b._id === book.body.data._id);
    expect(updated.availableCopies).toBe(1);
  });

  it('rejects returning an already-returned loan', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher7@alnoor.ae');
    const book = await request(app)
      .post('/api/v1/library/books')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validBook);
    const studentId = await createStudent(teacher.token, 'ANS-6007');
    const loan = await request(app)
      .post('/api/v1/library/loans')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ bookId: book.body.data._id, studentId, dueDate: '2027-07-01' });
    await request(app)
      .post(`/api/v1/library/loans/${loan.body.data._id}/return`)
      .set('Authorization', `Bearer ${teacher.token}`);
    const res = await request(app)
      .post(`/api/v1/library/loans/${loan.body.data._id}/return`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(409);
  });

  it('CONCURRENT returns increment availableCopies exactly once', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-concurrent-return@alnoor.ae');
    const book = await request(app)
      .post('/api/v1/library/books')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validBook);
    const studentId = await createStudent(teacher.token, 'ANS-6010');
    const loan = await request(app)
      .post('/api/v1/library/loans')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ bookId: book.body.data._id, studentId, dueDate: '2027-07-01' });

    const [first, second] = await Promise.all([
      request(app)
        .post(`/api/v1/library/loans/${loan.body.data._id}/return`)
        .set('Authorization', `Bearer ${teacher.token}`),
      request(app)
        .post(`/api/v1/library/loans/${loan.body.data._id}/return`)
        .set('Authorization', `Bearer ${teacher.token}`),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);

    const booksAfter = await request(app).get('/api/v1/library/books').set('Authorization', `Bearer ${teacher.token}`);
    const updated = booksAfter.body.data.find((b: { _id: string }) => b._id === book.body.data._id);
    expect(updated.availableCopies).toBe(1);
  });

  it('a Parent sees loans only for their linked child', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher8@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const book = await request(app)
      .post('/api/v1/library/books')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validBook, totalCopies: 2 });
    const myChildId = await createStudent(teacher.token, 'ANS-6008', parent.userId);
    const otherChildId = await createStudent(teacher.token, 'ANS-6009');
    await request(app)
      .post('/api/v1/library/loans')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ bookId: book.body.data._id, studentId: myChildId, dueDate: '2027-07-01' });
    await request(app)
      .post('/api/v1/library/loans')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ bookId: book.body.data._id, studentId: otherChildId, dueDate: '2027-07-01' });

    const res = await request(app).get('/api/v1/library/loans').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('persists a parent book request, scopes it to their child, and lets staff fulfil it once', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-library-request@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent-library-request@alnoor.ae');
    const stranger = await registerAndLogin('Parent', 'parent-library-stranger@alnoor.ae');
    const book = await request(app)
      .post('/api/v1/library/books')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validBook);
    await createStudent(teacher.token, 'ANS-6011', parent.userId);
    const created = await request(app)
      .post('/api/v1/library/requests')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ bookId: book.body.data._id, note: 'Needed for a reading project' });
    expect(created.status).toBe(201);

    const mine = await request(app).get('/api/v1/library/requests').set('Authorization', `Bearer ${parent.token}`);
    const hidden = await request(app).get('/api/v1/library/requests').set('Authorization', `Bearer ${stranger.token}`);
    expect(mine.body.data).toHaveLength(1);
    expect(hidden.body.data).toHaveLength(0);

    const fulfilled = await request(app)
      .post(`/api/v1/library/requests/${created.body.data._id}/fulfill`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(fulfilled.status).toBe(200);
    expect(fulfilled.body.data.status).toBe('Fulfilled');
    const repeated = await request(app)
      .post(`/api/v1/library/requests/${created.body.data._id}/fulfill`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(repeated.status).toBe(409);
  });

  it('blocks duplicate pending requests for the same child and title', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-library-duplicate-request@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent-library-duplicate-request@alnoor.ae');
    const book = await request(app)
      .post('/api/v1/library/books')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validBook);
    await createStudent(teacher.token, 'ANS-6012', parent.userId);
    const first = await request(app)
      .post('/api/v1/library/requests')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ bookId: book.body.data._id });
    const duplicate = await request(app)
      .post('/api/v1/library/requests')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ bookId: book.body.data._id });
    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
  });

  it('sends an overdue portal reminder to the linked guardian and records it', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-library-reminder@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent-library-reminder@alnoor.ae');
    const book = await request(app)
      .post('/api/v1/library/books')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validBook);
    const studentId = await createStudent(teacher.token, 'ANS-6013', parent.userId);
    const issued = await request(app)
      .post('/api/v1/library/loans')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ bookId: book.body.data._id, studentId, dueDate: '2027-07-01' });
    await Loan.findByIdAndUpdate(issued.body.data._id, { dueDate: new Date('2020-01-01') });
    await request(app).get('/api/v1/library/loans').set('Authorization', `Bearer ${teacher.token}`);
    const reminder = await request(app)
      .post('/api/v1/library/reminders')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ loanIds: [issued.body.data._id] });
    expect(reminder.status).toBe(200);
    expect(reminder.body.data).toEqual({ sent: 1, skipped: 0 });
    expect(await Message.countDocuments({ recipient: parent.userId, subject: /Overdue library book/ })).toBe(1);
    expect((await Loan.findById(issued.body.data._id))?.reminderCount).toBe(1);
  });
});
