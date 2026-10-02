import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string };
}

const validSlot = {
  grade: 'Grade 10 · A',
  dayOfWeek: 'Monday',
  periodNumber: 3,
  subject: 'Mathematics',
  teacherName: 'Rohan Mehta',
};

describe('Timetable API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/timetable');
    expect(res.status).toBe(401);
  });

  it('allows a Parent to READ the timetable - open read like Curriculum, since parents need to consult it', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app).get('/api/v1/timetable').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
  });

  it('rejects slot creation by a Parent', async () => {
    const parent = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/timetable')
      .set('Authorization', `Bearer ${parent.token}`)
      .send(validSlot);
    expect(res.status).toBe(403);
  });

  it('schedules a period successfully', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/timetable')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validSlot);
    expect(res.status).toBe(201);
  });

  it('THE CLASH CONSTRAINT, PROVEN: scheduling a second subject in the SAME grade/day/period gets a real 409, not a silent overwrite', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    await request(app)
      .post('/api/v1/timetable')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validSlot, grade: 'Grade 11 · B' });
    const res = await request(app)
      .post('/api/v1/timetable')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validSlot, grade: 'Grade 11 · B', subject: 'Physics' });
    expect(res.status).toBe(409);
  });

  it('the SAME period in a DIFFERENT grade is fine - the constraint is per grade, not global', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    await request(app)
      .post('/api/v1/timetable')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validSlot, grade: 'Grade 12 · A' });
    const res = await request(app)
      .post('/api/v1/timetable')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validSlot, grade: 'Grade 12 · B', teacherName: 'Different Teacher', room: 'Room 12' });
    expect(res.status).toBe(201);
  });

  it('filters by grade and day', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    await request(app)
      .post('/api/v1/timetable')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validSlot, grade: 'Grade 9 · A', dayOfWeek: 'Tuesday' });
    const res = await request(app)
      .get('/api/v1/timetable')
      .set('Authorization', `Bearer ${teacher.token}`)
      .query({ grade: 'Grade 9 · A', dayOfWeek: 'Tuesday' });
    expect(res.status).toBe(200);
    expect(
      res.body.data.every(
        (s: { grade: string; dayOfWeek: string }) => s.grade === 'Grade 9 · A' && s.dayOfWeek === 'Tuesday',
      ),
    ).toBe(true);
  });
  it('persists edit, substitute, publish, and removal operations', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-edit@alnoor.ae');
    const created = await request(app)
      .post('/api/v1/timetable')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validSlot, grade: 'Grade 7 · A', room: 'Lab 1' });
    const id = created.body.data._id;
    const updated = await request(app)
      .patch(`/api/v1/timetable/${id}`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ room: 'Lab 2', teacherName: 'Substitute Teacher', isSubstitute: true });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({ room: 'Lab 2', isSubstitute: true });
    const published = await request(app)
      .post('/api/v1/timetable/publish')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ grade: 'Grade 7 · A' });
    expect(published.status).toBe(200);
    const listed = await request(app)
      .get('/api/v1/timetable')
      .set('Authorization', `Bearer ${teacher.token}`)
      .query({ grade: 'Grade 7 · A' });
    expect(listed.body.data[0].status).toBe('Published');
    expect((await request(app).delete(`/api/v1/timetable/${id}`).set('Authorization', `Bearer ${teacher.token}`)).status).toBe(204);
  });
  it('rejects cross-class teacher and room double-booking',async()=>{const teacher=await registerAndLogin('Teacher','teacher-clash@alnoor.ae');await request(app).post('/api/v1/timetable').set('Authorization',`Bearer ${teacher.token}`).send({...validSlot,grade:'Grade 6 · A',room:'Room 10'});const teacherClash=await request(app).post('/api/v1/timetable').set('Authorization',`Bearer ${teacher.token}`).send({...validSlot,grade:'Grade 6 · B',room:'Room 11'});expect(teacherClash.status).toBe(409);const roomClash=await request(app).post('/api/v1/timetable').set('Authorization',`Bearer ${teacher.token}`).send({...validSlot,grade:'Grade 6 · C',teacherName:'Another Teacher',room:'Room 10'});expect(roomClash.status).toBe(409);});
  it('rejects timetable mutations by a Parent',async()=>{const teacher=await registerAndLogin('Teacher','teacher-owner@alnoor.ae');const parent=await registerAndLogin('Parent','parent-owner@alnoor.ae');const created=await request(app).post('/api/v1/timetable').set('Authorization',`Bearer ${teacher.token}`).send({...validSlot,grade:'Grade 5 · A'});const id=created.body.data._id;expect((await request(app).patch(`/api/v1/timetable/${id}`).set('Authorization',`Bearer ${parent.token}`).send({room:'X'})).status).toBe(403);expect((await request(app).delete(`/api/v1/timetable/${id}`).set('Authorization',`Bearer ${parent.token}`)).status).toBe(403);expect((await request(app).post('/api/v1/timetable/publish').set('Authorization',`Bearer ${parent.token}`).send({grade:'Grade 5 · A'})).status).toBe(403);});

  it('shows drafts to staff but only published slots to parents', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-visibility@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'parent-visibility@alnoor.ae');
    const grade = 'Grade 4 · A';
    await request(app)
      .post('/api/v1/timetable')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validSlot, grade });
    const draftView = await request(app)
      .get('/api/v1/timetable')
      .set('Authorization', `Bearer ${parent.token}`)
      .query({ grade });
    expect(draftView.body.data).toHaveLength(0);
    await request(app)
      .post('/api/v1/timetable/publish')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ grade });
    const publishedView = await request(app)
      .get('/api/v1/timetable')
      .set('Authorization', `Bearer ${parent.token}`)
      .query({ grade });
    expect(publishedView.body.data).toHaveLength(1);
    expect(publishedView.body.data[0].status).toBe('Published');
  });

  it('atomically swaps two scheduled periods and a scheduled period with a free period', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-swap@alnoor.ae');
    const grade = 'Grade 3 · A';
    await request(app)
      .post('/api/v1/timetable')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validSlot, grade, periodNumber: 1, subject: 'English', teacherName: 'English Teacher', room: 'Room 1' });
    await request(app)
      .post('/api/v1/timetable')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validSlot, grade, periodNumber: 2, subject: 'Physics', teacherName: 'Physics Teacher', room: 'Room 2' });

    const swap = await request(app)
      .post('/api/v1/timetable/swap')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        grade,
        source: { dayOfWeek: 'Monday', periodNumber: 1 },
        target: { dayOfWeek: 'Monday', periodNumber: 2 },
      });
    expect(swap.status).toBe(200);
    let listed = await request(app)
      .get('/api/v1/timetable')
      .set('Authorization', `Bearer ${teacher.token}`)
      .query({ grade });
    expect(listed.body.data.find((slot: { periodNumber: number }) => slot.periodNumber === 1).subject).toBe('Physics');
    expect(listed.body.data.find((slot: { periodNumber: number }) => slot.periodNumber === 2).subject).toBe('English');

    const moveToFree = await request(app)
      .post('/api/v1/timetable/swap')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        grade,
        source: { dayOfWeek: 'Monday', periodNumber: 2 },
        target: { dayOfWeek: 'Tuesday', periodNumber: 3 },
      });
    expect(moveToFree.status).toBe(200);
    listed = await request(app)
      .get('/api/v1/timetable')
      .set('Authorization', `Bearer ${teacher.token}`)
      .query({ grade });
    expect(listed.body.data.some((slot: { dayOfWeek: string; periodNumber: number }) => slot.dayOfWeek === 'Monday' && slot.periodNumber === 2)).toBe(false);
    expect(listed.body.data.find((slot: { dayOfWeek: string; periodNumber: number }) => slot.dayOfWeek === 'Tuesday' && slot.periodNumber === 3).subject).toBe('English');
  });

});
