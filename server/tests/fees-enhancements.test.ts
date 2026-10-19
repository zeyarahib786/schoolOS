import request from 'supertest';
import { createApp } from '../src/app';
import { Student } from '../src/models/Student';
import { Invoice } from '../src/models/Invoice';
import { InvoicePayment } from '../src/models/InvoicePayment';
import { Message } from '../src/models/Message';
import { Role } from '../src/types/roles';
const app = createApp();
async function account(role: Role, name: string) {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ name, email: name + '@example.invalid', password: 'StrongPass123', role });
  expect(r.status).toBe(201);
  return r.body.data;
}
const auth = (a: { accessToken: string }) => ({ Authorization: 'Bearer ' + a.accessToken });
async function child(refId: string, links = {}) {
  return Student.create({
    refId,
    name: refId,
    grade: 'Grade 7 · A',
    gender: 'Female',
    roll: '007',
    guardianName: 'QA Parent',
    phone: '123456789',
    ...links,
  });
}
async function invoice(a: { accessToken: string }, s: { _id: { toString(): string } }, refId = 'INV-QA', amount = 100) {
  const r = await request(app)
    .post('/api/v1/fees')
    .set(auth(a))
    .send({ refId, studentId: s._id.toString(), term: 'Tuition', amount, dueDate: '2020-01-01' });
  expect(r.status).toBe(201);
  return r.body.data;
}
describe('Fees production workflows', () => {
  it('records decimal partial/full payments atomically, replays the same request and rejects conflicting reuse', async () => {
    const a = await account('Accountant', 'decimal'),
      s = await child('QA-DEC'),
      i = await invoice(a, s, 'INV-DEC', 100.25);
    const pay = (body: Record<string, unknown>) =>
      request(app)
        .post('/api/v1/fees/' + i._id + '/pay')
        .set(auth(a))
        .send(body);
    const body = { amount: 30.15, paymentMethod: 'Cash', idempotencyKey: 'request-decimal-1' };
    expect((await pay(body)).status).toBe(200);
    expect((await pay(body)).status).toBe(200);
    expect((await pay({ ...body, amount: 31 })).status).toBe(409);
    expect(await InvoicePayment.countDocuments({ invoice: i._id })).toBe(1);
    expect((await Invoice.findById(i._id))?.paidAmount).toBe(30.15);
    expect((await pay({ amount: 70.11, paymentMethod: 'Cash' })).status).toBe(400);
    expect((await pay({ amount: 70.1, paymentMethod: 'Cash', idempotencyKey: 'request-decimal-2' })).status).toBe(200);
    expect((await Invoice.findById(i._id))?.status).toBe('Paid');
    expect((await pay({ amount: 1, paymentMethod: 'Cash' })).status).toBe(409);
  });
  it('serializes competing payments without losing balances or issuing an unpaid receipt', async () => {
    const a = await account('Administrator', 'concurrent'),
      s = await child('QA-CON'),
      i = await invoice(a, s);
    const responses = await Promise.all(
      ['payment-concurrent-1', 'payment-concurrent-2'].map((idempotencyKey) =>
        request(app)
          .post('/api/v1/fees/' + i._id + '/pay')
          .set(auth(a))
          .send({ amount: 70, paymentMethod: 'Cash', idempotencyKey }),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([200, 400]);
    expect((await Invoice.findById(i._id))?.paidAmount).toBe(70);
    expect(await InvoicePayment.countDocuments({ invoice: i._id })).toBe(1);
  });
  it('rejects fractional cents, impossible due dates, missing/inactive students and foreign currency', async () => {
    const a = await account('Administrator', 'invalid'),
      s = await child('QA-INVALID');
    for (const override of [
      { amount: 10.123 },
      { dueDate: '2026-02-30' },
      { studentId: '000000000000000000000001' },
      { currency: 'USD' },
    ])
      expect(
        (
          await request(app)
            .post('/api/v1/fees')
            .set(auth(a))
            .send({
              refId: 'INV-INVALID',
              studentId: s._id.toString(),
              term: 'Tuition',
              amount: 10,
              dueDate: '2026-12-01',
              ...override,
            })
        ).status,
      ).toBe(400);
    s.status = 'Inactive';
    await s.save();
    expect(
      (
        await request(app).post('/api/v1/fees').set(auth(a)).send({
          refId: 'INV-INACTIVE',
          studentId: s._id.toString(),
          term: 'Tuition',
          amount: 10,
          dueDate: '2026-12-01',
        })
      ).status,
    ).toBe(400);
  });
  it('intersects requested children with family ownership, derives overdue filtering and keeps finance writes private', async () => {
    const a = await account('Administrator', 'owner-admin'),
      p = await account('Parent', 'owner-parent'),
      u = await account('Student', 'owner-student'),
      t = await account('Teacher', 'owner-teacher');
    const own = await child('QA-OWN', { guardianUserId: p.user._id, studentUserId: u.user._id }),
      other = await child('QA-OTHER');
    await invoice(a, own, 'INV-OWN');
    await invoice(a, other, 'INV-OTHER');
    for (const family of [p, u]) {
      const r = await request(app)
        .get('/api/v1/fees?studentId=' + other.id)
        .set(auth(family));
      expect(r.status).toBe(200);
      expect(r.body.data).toHaveLength(0);
      expect((await request(app).get('/api/v1/fees?status=Overdue').set(auth(family))).body.data).toHaveLength(1);
      expect((await request(app).get('/api/v1/fees/heads').set(auth(family))).status).toBe(403);
    }
    expect((await request(app).get('/api/v1/fees').set(auth(t))).body.data).toHaveLength(0);
  });
  it('persists versioned fee heads and sends only explicitly selected valid reminder messages', async () => {
    const a = await account('Principal', 'heads'),
      p = await account('Parent', 'reminder-parent'),
      s = await child('QA-REM', { guardianUserId: p.user._id }),
      i = await invoice(a, s);
    const h = await request(app)
      .post('/api/v1/fees/heads')
      .set(auth(a))
      .send({ name: 'Tuition', appliesTo: 'Grade 7', amount: 200, frequency: 'Term' });
    expect(h.status).toBe(201);
    const patch = {
      name: 'Tuition revised',
      appliesTo: 'Grade 7',
      amount: 200,
      frequency: 'Term',
      expectedUpdatedAt: h.body.data.updatedAt,
    };
    expect(
      (
        await request(app)
          .patch('/api/v1/fees/heads/' + h.body.data._id)
          .set(auth(a))
          .send(patch)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .patch('/api/v1/fees/heads/' + h.body.data._id)
          .set(auth(a))
          .send(patch)
      ).status,
    ).toBe(409);
    expect(
      (await request(app).post('/api/v1/fees/reminders').set(auth(a)).send({ invoiceIds: [] })).body.data.sent,
    ).toBe(0);
    expect(await Message.countDocuments({ recipient: p.user._id })).toBe(0);
    expect(
      (
        await request(app)
          .post('/api/v1/fees/reminders')
          .set(auth(a))
          .send({ invoiceIds: [i._id] })
      ).body.data.sent,
    ).toBe(1);
    expect(await Message.countDocuments({ recipient: p.user._id })).toBe(1);
  });
});
