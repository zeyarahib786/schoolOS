import request from 'supertest';
import { createApp } from '../src/app';
import { Student } from '../src/models/Student';

const app = createApp();

async function account(role: 'Administrator' | 'Student', email: string) {
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: role === 'Student' ? 'Linked Learner' : 'School Administrator',
      email,
      password: 'StrongPass123',
      role,
    });
  expect(response.status).toBe(201);
  return { token: response.body.data.accessToken as string, id: response.body.data.user._id as string };
}

async function student(token: string, refId: string) {
  const response = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${token}`).send({
    refId,
    name: refId,
    grade: 'Grade 10 · A',
    gender: 'Female',
    roll: refId,
    guardianName: 'Guardian',
    phone: '+971501234567',
  });
  expect(response.status).toBe(201);
  return response.body.data._id as string;
}

describe('Linked Student dashboard data access', () => {
  it('shows only own invoices, published marks, loans, and issued certificates', async () => {
    const admin = await account('Administrator', 'family-access-admin@school.test');
    const learner = await account('Student', 'family-access-student@school.test');
    const ownId = await student(admin.token, 'ANS-FAMILY-OWN');
    const otherId = await student(admin.token, 'ANS-FAMILY-OTHER');
    await Student.updateOne({ _id: ownId }, { $set: { studentUserId: learner.id } });

    for (const [refId, studentId] of [
      ['INV-FAMILY-OWN', ownId],
      ['INV-FAMILY-OTHER', otherId],
    ] as const) {
      const invoice = await request(app).post('/api/v1/fees').set('Authorization', `Bearer ${admin.token}`).send({
        refId,
        studentId,
        term: 'Term 1',
        amount: 1000,
        dueDate: '2027-07-01',
      });
      expect(invoice.status).toBe(201);
    }
    const fees = await request(app).get('/api/v1/fees').set('Authorization', `Bearer ${learner.token}`);
    expect(fees.status).toBe(200);
    expect(fees.body.data.map((invoice: { refId: string }) => invoice.refId)).toEqual(['INV-FAMILY-OWN']);

    const exam = await request(app)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        name: 'Family dashboard exam',
        term: 'Term 1',
        subjects: ['Mathematics'],
        maxMarks: 100,
        passMark: 50,
      });
    expect(exam.status).toBe(201);
    for (const studentId of [ownId, otherId]) {
      const result = await request(app)
        .post('/api/v1/exams/results')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          examId: exam.body.data._id,
          studentId,
          scores: [{ subject: 'Mathematics', marks: 80 }],
        });
      expect(result.status).toBe(201);
    }
    const unpublished = await request(app).get('/api/v1/exams/results').set('Authorization', `Bearer ${learner.token}`);
    expect(unpublished.status).toBe(200);
    expect(unpublished.body.data).toHaveLength(0);
    expect(unpublished.body.meta.pagination.total).toBe(0);
    const published = await request(app)
      .post(`/api/v1/exams/${exam.body.data._id}/publish`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(published.status).toBe(200);
    const results = await request(app).get('/api/v1/exams/results').set('Authorization', `Bearer ${learner.token}`);
    expect(results.status).toBe(200);
    expect(results.body.data).toHaveLength(1);
    expect(results.body.meta.pagination.total).toBe(1);
    expect(String(results.body.data[0].student._id)).toBe(ownId);

    const book = await request(app).post('/api/v1/library/books').set('Authorization', `Bearer ${admin.token}`).send({
      isbn: '978-0-13-468599-1',
      title: 'School Book',
      author: 'Test Author',
      category: 'Non-fiction',
      totalCopies: 1,
    });
    expect(book.status).toBe(201);
    const loan = await request(app).post('/api/v1/library/loans').set('Authorization', `Bearer ${admin.token}`).send({
      bookId: book.body.data._id,
      studentId: ownId,
      dueDate: '2027-07-01',
    });
    expect(loan.status).toBe(201);
    const loans = await request(app).get('/api/v1/library/loans').set('Authorization', `Bearer ${learner.token}`);
    expect(loans.status).toBe(200);
    expect(loans.body.data).toHaveLength(1);
    expect(String(loans.body.data[0].student._id)).toBe(ownId);

    const certificate = await request(app)
      .post('/api/v1/certificates')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        studentId: ownId,
        type: 'Bonafide',
        purpose: 'School record',
      });
    expect(certificate.status).toBe(201);
    const certificates = await request(app).get('/api/v1/certificates').set('Authorization', `Bearer ${learner.token}`);
    expect(certificates.status).toBe(200);
    expect(certificates.body.data).toHaveLength(1);
    expect(String(certificates.body.data[0].student._id)).toBe(ownId);
  });
});
