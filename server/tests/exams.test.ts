import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Accountant' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string, userId: res.body.data.user._id as string };
}

async function createStudent(token: string, refId: string, guardianUserId?: string) {
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

const validExam = {
  name: 'Unit Test 3',
  term: 'Term 2',
  subjects: ['Mathematics', 'Science'],
  maxMarks: 100,
  passMark: 50,
};

describe('Exams API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/exams');
    expect(res.status).toBe(401);
  });

  it('rejects exam creation by an Accountant', async () => {
    const accountant = await registerAndLogin('Accountant', 'accountant1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${accountant.token}`)
      .send(validExam);
    expect(res.status).toBe(403);
  });

  it('allows a Teacher to create an exam scheme', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validExam);
    expect(res.status).toBe(201);
    expect(res.body.data.subjects).toEqual(['Mathematics', 'Science']);
  });

  it('adds a subject to an existing exam', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const exam = await request(app)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validExam);
    const res = await request(app)
      .post(`/api/v1/exams/${exam.body.data._id}/subjects`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ subject: 'Geography' });
    expect(res.status).toBe(200);
    expect(res.body.data.subjects).toContain('Geography');
  });

  it('removes a subject from an exam', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const exam = await request(app)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validExam);
    const res = await request(app)
      .delete(`/api/v1/exams/${exam.body.data._id}/subjects/${encodeURIComponent('Science')}`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.subjects).not.toContain('Science');
  });

  it('rejects removing the LAST subject on an exam', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const exam = await request(app)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validExam, subjects: ['Mathematics'] });
    const res = await request(app)
      .delete(`/api/v1/exams/${exam.body.data._id}/subjects/${encodeURIComponent('Mathematics')}`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(400);
  });

  it('records a result and computes average/grade correctly, not stored but returned live', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher5@alnoor.ae');
    const exam = await request(app)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validExam);
    const studentId = await createStudent(teacher.token, 'ANS-7001');
    const res = await request(app)
      .post('/api/v1/exams/results')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        examId: exam.body.data._id,
        studentId,
        scores: [
          { subject: 'Mathematics', marks: 90 },
          { subject: 'Science', marks: 70 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.averagePercent).toBe(80);
    expect(res.body.data.grade).toBe('A');
    expect(res.body.data.passing).toBe(true);
  });

  it('rejects a result with a subject not in the exam scheme', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher6@alnoor.ae');
    const exam = await request(app)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validExam);
    const studentId = await createStudent(teacher.token, 'ANS-7002');
    const res = await request(app)
      .post('/api/v1/exams/results')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ examId: exam.body.data._id, studentId, scores: [{ subject: 'French', marks: 90 }] });
    expect(res.status).toBe(400);
  });

  it('re-recording a result for the same (exam, student) UPDATES rather than duplicates', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher7@alnoor.ae');
    const exam = await request(app)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validExam);
    const studentId = await createStudent(teacher.token, 'ANS-7003');
    await request(app)
      .post('/api/v1/exams/results')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        examId: exam.body.data._id,
        studentId,
        scores: [
          { subject: 'Mathematics', marks: 60 },
          { subject: 'Science', marks: 60 },
        ],
      });
    const corrected = await request(app)
      .post('/api/v1/exams/results')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        examId: exam.body.data._id,
        studentId,
        scores: [
          { subject: 'Mathematics', marks: 95 },
          { subject: 'Science', marks: 95 },
        ],
      });
    expect(corrected.status).toBe(201);
    expect(corrected.body.data.averagePercent).toBe(95);

    const list = await request(app)
      .get('/api/v1/exams/results')
      .set('Authorization', `Bearer ${teacher.token}`)
      .query({ examId: exam.body.data._id, studentId });
    expect(list.body.data.length).toBe(1); // exactly one record, not two
  });

  it('a Parent sees results only for their linked child', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher8@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const exam = await request(app)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validExam);
    const myChildId = await createStudent(teacher.token, 'ANS-7004', parent.userId);
    const otherChildId = await createStudent(teacher.token, 'ANS-7005');
    await request(app)
      .post('/api/v1/exams/results')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        examId: exam.body.data._id,
        studentId: myChildId,
        scores: [
          { subject: 'Mathematics', marks: 80 },
          { subject: 'Science', marks: 80 },
        ],
      });
    await request(app)
      .post('/api/v1/exams/results')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        examId: exam.body.data._id,
        studentId: otherChildId,
        scores: [
          { subject: 'Mathematics', marks: 40 },
          { subject: 'Science', marks: 40 },
        ],
      });

    // Guardians must not see marks until the school formally publishes the exam.
    expect((await request(app).get('/api/v1/exams/results').set('Authorization', `Bearer ${parent.token}`)).body.data).toHaveLength(0);
    await request(app).post(`/api/v1/exams/${exam.body.data._id}/publish`).set('Authorization', `Bearer ${teacher.token}`);
    const res = await request(app).get('/api/v1/exams/results').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it('the class summary aggregate computes the correct average and pass rate across multiple students', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher9@alnoor.ae');
    const exam = await request(app)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validExam);
    const examId = exam.body.data._id;
    const s1 = await createStudent(teacher.token, 'ANS-7006');
    const s2 = await createStudent(teacher.token, 'ANS-7007');
    // s1: (90+90)/200 = 90% (pass), s2: (30+30)/200 = 30% (fail)
    await request(app)
      .post('/api/v1/exams/results')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        examId,
        studentId: s1,
        scores: [
          { subject: 'Mathematics', marks: 90 },
          { subject: 'Science', marks: 90 },
        ],
      });
    await request(app)
      .post('/api/v1/exams/results')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        examId,
        studentId: s2,
        scores: [
          { subject: 'Mathematics', marks: 30 },
          { subject: 'Science', marks: 30 },
        ],
      });

    const res = await request(app)
      .get(`/api/v1/exams/${examId}/summary`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.studentCount).toBe(2);
    expect(res.body.data.classAverage).toBe(60); // (90+30)/2
    expect(res.body.data.passRate).toBe(50); // 1 of 2 passed
  });

  it('the /results route is not shadowed by the /:id/summary route (a real route-ordering check, not assumed safe)', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher10@alnoor.ae');
    const res = await request(app).get('/api/v1/exams/results').set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(200); // if shadowed by /:id/summary, this would 400/404 on an invalid ObjectId "results"
  });

  it('rejects entering results for a locked exam', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher11@alnoor.ae');
    const exam = await request(app)
      .post('/api/v1/exams')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validExam);
    const { Exam } = await import('../src/models/Exam');
    await Exam.findByIdAndUpdate(exam.body.data._id, { locked: true });
    const studentId = await createStudent(teacher.token, 'ANS-7008');
    const res = await request(app)
      .post('/api/v1/exams/results')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ examId: exam.body.data._id, studentId, scores: [{ subject: 'Mathematics', marks: 50 }] });
    expect(res.status).toBe(403);
  });

  it('requires every scheme subject exactly once and rejects marks above the scheme maximum', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher12@alnoor.ae');
    const exam = await request(app).post('/api/v1/exams').set('Authorization', `Bearer ${teacher.token}`).send(validExam);
    const studentId = await createStudent(teacher.token, 'ANS-7009');
    const incomplete = await request(app).post('/api/v1/exams/results').set('Authorization', `Bearer ${teacher.token}`).send({
      examId: exam.body.data._id, studentId, scores: [{ subject: 'Mathematics', marks: 80 }],
    });
    expect(incomplete.status).toBe(400);
    const tooHigh = await request(app).post('/api/v1/exams/results').set('Authorization', `Bearer ${teacher.token}`).send({
      examId: exam.body.data._id, studentId,
      scores: [{ subject: 'Mathematics', marks: 101 }, { subject: 'Science', marks: 75 }],
    });
    expect(tooHigh.status).toBe(400);
  });

  it('publishes, notifies linked guardians, locks marks, and can be reopened for moderation', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher13@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent13@alnoor.ae');
    const exam = await request(app).post('/api/v1/exams').set('Authorization', `Bearer ${teacher.token}`).send(validExam);
    const studentId = await createStudent(teacher.token, 'ANS-7010', parent.userId);
    await request(app).post('/api/v1/exams/results').set('Authorization', `Bearer ${teacher.token}`).send({
      examId: exam.body.data._id, studentId,
      scores: [{ subject: 'Mathematics', marks: 80 }, { subject: 'Science', marks: 90 }],
    });
    const published = await request(app).post(`/api/v1/exams/${exam.body.data._id}/publish`).set('Authorization', `Bearer ${teacher.token}`);
    expect(published.status).toBe(200);
    expect(published.body.data.exam.locked).toBe(true);
    expect(published.body.data.notified).toBe(1);
    const { Message } = await import('../src/models/Message');
    expect(await Message.countDocuments({ recipient: parent.userId })).toBeGreaterThan(0);
    expect((await request(app).post('/api/v1/exams/results').set('Authorization', `Bearer ${teacher.token}`).send({
      examId: exam.body.data._id, studentId,
      scores: [{ subject: 'Mathematics', marks: 81 }, { subject: 'Science', marks: 90 }],
    })).status).toBe(403);
    const reopened = await request(app).post(`/api/v1/exams/${exam.body.data._id}/reopen`).set('Authorization', `Bearer ${teacher.token}`);
    expect(reopened.status).toBe(200);
    expect(reopened.body.data.exam.locked).toBe(false);
  });

  it('generates persistent report cards once per published exam and student', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher14@alnoor.ae');
    const exam = await request(app).post('/api/v1/exams').set('Authorization', `Bearer ${teacher.token}`).send(validExam);
    const studentId = await createStudent(teacher.token, 'ANS-7011');
    await request(app).post('/api/v1/exams/results').set('Authorization', `Bearer ${teacher.token}`).send({
      examId: exam.body.data._id, studentId,
      scores: [{ subject: 'Mathematics', marks: 75 }, { subject: 'Science', marks: 75 }],
    });
    await request(app).post(`/api/v1/exams/${exam.body.data._id}/publish`).set('Authorization', `Bearer ${teacher.token}`);
    const first = await request(app).post(`/api/v1/exams/${exam.body.data._id}/report-cards`).set('Authorization', `Bearer ${teacher.token}`).send({});
    expect(first.status).toBe(200); expect(first.body.data.generated).toBe(1);
    const second = await request(app).post(`/api/v1/exams/${exam.body.data._id}/report-cards`).set('Authorization', `Bearer ${teacher.token}`).send({});
    expect(second.status).toBe(200); expect(second.body.data.generated).toBe(0); expect(second.body.data.alreadyExisted).toBe(1);
    const cards = await request(app).get('/api/v1/certificates').set('Authorization', `Bearer ${teacher.token}`).query({ type: 'ReportCard' });
    expect(cards.body.data.some((card: { student: { _id: string } }) => card.student._id === studentId)).toBe(true);
  });
});
