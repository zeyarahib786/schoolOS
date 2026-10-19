import request from 'supertest';
import { createApp } from '../src/app';
import { Book } from '../src/models/Book';
import { Loan } from '../src/models/Loan';
import { Message } from '../src/models/Message';
const app = createApp();
async function fixture() {
  const register = async (role: string) => {
    const r = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'QA ' + role, email: role.toLowerCase() + '@example.invalid', password: 'StrongPass123', role });
    return { h: { Authorization: 'Bearer ' + r.body.data.accessToken }, id: r.body.data.user._id };
  };
  const admin = await register('Administrator'),
    parent = await register('Parent');
  const student = (
    await request(app).post('/api/v1/students').set(admin.h).send({
      refId: 'QA-LIB-1',
      name: 'QA child',
      grade: 'Grade 7 · A',
      gender: 'Male',
      roll: '1',
      guardianName: 'QA family',
      phone: '+971501234567',
      guardianUserId: parent.id,
    })
  ).body.data;
  const makeBook = async (n = 1, copies = 3) => {
    const r = await request(app)
      .post('/api/v1/library/books')
      .set(admin.h)
      .send({
        isbn: 'QA-ISBN-' + n,
        title: 'QA Title ' + n,
        author: 'QA Author',
        category: 'QA',
        totalCopies: copies,
        shelf: 'A1',
      });
    expect(r.status).toBe(201);
    return r.body.data;
  };
  return { admin, parent, student, makeBook };
}
it('serializes duplicate issue and return without losing or inventing copies', async () => {
  const { admin, student, makeBook } = await fixture(),
    book = await makeBook();
  const issued = await Promise.all(
    [1, 2].map(() =>
      request(app)
        .post('/api/v1/library/loans')
        .set(admin.h)
        .send({ bookId: book._id, studentId: student._id, dueDate: '2099-01-01' }),
    ),
  );
  expect(issued.map((r) => r.status).sort()).toEqual([201, 409]);
  expect((await Book.findById(book._id))?.availableCopies).toBe(2);
  const loan = issued.find((r) => r.status === 201)!.body.data;
  const returned = await Promise.all(
    [1, 2].map(() =>
      request(app)
        .post('/api/v1/library/loans/' + loan._id + '/return')
        .set(admin.h),
    ),
  );
  expect(returned.map((r) => r.status).sort()).toEqual([200, 409]);
  expect((await Book.findById(book._id))?.availableCopies).toBe(3);
  expect(await Loan.countDocuments()).toBe(1);
});
it('enforces borrower allowance under concurrent different-title issues', async () => {
  const { admin, student, makeBook } = await fixture();
  const books = [];
  for (let n = 0; n < 6; n++) books.push(await makeBook(n, 1));
  const issued = await Promise.all(
    books.map((book) =>
      request(app)
        .post('/api/v1/library/loans')
        .set(admin.h)
        .send({ bookId: book._id, studentId: student._id, dueDate: '2099-01-01' }),
    ),
  );
  expect(issued.filter((r) => r.status === 201)).toHaveLength(5);
  expect(issued.filter((r) => r.status === 409)).toHaveLength(1);
  expect(await Loan.countDocuments()).toBe(5);
  expect((await Book.find()).reduce((n, b) => n + b.availableCopies, 0)).toBe(1);
});
it('requests remain unique and fulfilment actually issues one loan and consumes stock', async () => {
  const { admin, parent, student, makeBook } = await fixture(),
    book = await makeBook();
  const requests = await Promise.all(
    [1, 2].map(() =>
      request(app).post('/api/v1/library/requests').set(parent.h).send({ bookId: book._id, studentId: student._id }),
    ),
  );
  expect(requests.map((r) => r.status).sort()).toEqual([201, 409]);
  const id = requests.find((r) => r.status === 201)!.body.data._id;
  const fulfilled = await Promise.all(
    [1, 2].map(() =>
      request(app)
        .post('/api/v1/library/requests/' + id + '/fulfill')
        .set(admin.h)
        .send({ dueDate: '2099-01-01' }),
    ),
  );
  expect(fulfilled.map((r) => r.status).sort()).toEqual([200, 409]);
  expect(fulfilled.find((r) => r.status === 200)!.body.data.loan).toBeTruthy();
  expect(await Loan.countDocuments()).toBe(1);
  expect((await Book.findById(book._id))?.availableCopies).toBe(2);
});
it('selects authorized children explicitly and protects cancelled/rejected decisions', async () => {
  const { admin, parent, student, makeBook } = await fixture(),
    book = await makeBook();
  const second = (
    await request(app).post('/api/v1/students').set(admin.h).send({
      refId: 'QA-LIB-2',
      name: 'QA child two',
      grade: 'Grade 8',
      gender: 'Male',
      roll: '2',
      guardianName: 'QA family',
      phone: '+971501234567',
      guardianUserId: parent.id,
    })
  ).body.data;
  expect((await request(app).post('/api/v1/library/requests').set(parent.h).send({ bookId: book._id })).status).toBe(
    400,
  );
  expect(
    (await request(app).post('/api/v1/library/requests').set(parent.h).send({ bookId: book._id, studentId: admin.id }))
      .status,
  ).toBe(400);
  const r = (
    await request(app).post('/api/v1/library/requests').set(parent.h).send({ bookId: book._id, studentId: second._id })
  ).body.data;
  expect(
    (
      await request(app)
        .post('/api/v1/library/requests/' + r._id + '/decision')
        .set(parent.h)
        .send({ status: 'Rejected', reason: 'Parent cannot reject' })
    ).status,
  ).toBe(403);
  expect(
    (
      await request(app)
        .post('/api/v1/library/requests/' + r._id + '/decision')
        .set(parent.h)
        .send({ status: 'Cancelled', reason: 'QA request no longer needed' })
    ).status,
  ).toBe(200);
  expect(
    (
      await request(app)
        .post('/api/v1/library/requests/' + r._id + '/fulfill')
        .set(admin.h)
    ).status,
  ).toBe(409);
  expect(await Loan.countDocuments()).toBe(0);
  expect(student._id).not.toBe(second._id);
});
it('reviews metadata with version protection and renews only outstanding loans with dated reasons', async () => {
  const { admin, student, makeBook } = await fixture(),
    book = await makeBook();
  const revised = await request(app)
    .patch('/api/v1/library/books/' + book._id)
    .set(admin.h)
    .send({ shelf: 'B2', expectedUpdatedAt: book.updatedAt, reason: 'QA shelf correction' });
  expect(revised.status).toBe(200);
  expect(revised.body.data.history).toHaveLength(1);
  expect(
    (
      await request(app)
        .patch('/api/v1/library/books/' + book._id)
        .set(admin.h)
        .send({ title: 'Stale title', expectedUpdatedAt: book.updatedAt, reason: 'Stale correction' })
    ).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .post('/api/v1/library/books')
        .set(admin.h)
        .send({ isbn: book.isbn, title: 'Different title', author: book.author, category: 'QA', totalCopies: 1 })
    ).status,
  ).toBe(409);
  const loan = (
    await request(app)
      .post('/api/v1/library/loans')
      .set(admin.h)
      .send({ bookId: book._id, studentId: student._id, dueDate: '2099-01-01' })
  ).body.data;
  const renewal = await request(app)
    .post('/api/v1/library/loans/' + loan._id + '/renew')
    .set(admin.h)
    .send({ dueDate: '2099-02-01', expectedUpdatedAt: loan.updatedAt, reason: 'QA approved reading extension' });
  expect(renewal.status).toBe(200);
  expect(renewal.body.data.renewalCount).toBe(1);
  expect(renewal.body.data.history).toHaveLength(2);
  expect(
    (
      await request(app)
        .post('/api/v1/library/loans/' + loan._id + '/renew')
        .set(admin.h)
        .send({ dueDate: '2099-03-01', expectedUpdatedAt: loan.updatedAt, reason: 'Stale extension' })
    ).status,
  ).toBe(409);
  await request(app)
    .post('/api/v1/library/loans/' + loan._id + '/return')
    .set(admin.h);
  expect(
    (
      await request(app)
        .post('/api/v1/library/loans/' + loan._id + '/renew')
        .set(admin.h)
        .send({ dueDate: '2099-03-01', expectedUpdatedAt: renewal.body.data.updatedAt, reason: 'Returned extension' })
    ).status,
  ).toBe(409);
  expect(
    (
      await request(app)
        .post('/api/v1/library/loans')
        .set(admin.h)
        .send({ bookId: book._id, studentId: student._id, dueDate: '2026-02-30' })
    ).status,
  ).toBe(400);
});
it('concurrent portal reminders create one message with a 24-hour repeat guard', async () => {
  const { admin, student, parent, makeBook } = await fixture(),
    book = await makeBook();
  const loan = (
    await request(app)
      .post('/api/v1/library/loans')
      .set(admin.h)
      .send({ bookId: book._id, studentId: student._id, dueDate: '2099-01-01' })
  ).body.data;
  await Loan.updateOne({ _id: loan._id }, { $set: { dueDate: new Date('2020-01-01'), status: 'Overdue' } });
  const reminders = await Promise.all(
    [1, 2].map(() =>
      request(app)
        .post('/api/v1/library/reminders')
        .set(admin.h)
        .send({ loanIds: [loan._id] }),
    ),
  );
  expect(reminders.every((r) => r.status === 200)).toBe(true);
  expect(reminders.reduce((n, r) => n + r.body.data.sent, 0)).toBe(1);
  expect(await Message.countDocuments({ recipient: parent.id })).toBe(1);
  expect((await Loan.findById(loan._id))?.reminderCount).toBe(1);
});
