import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent' | 'Student', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string };
}

describe('Announcements API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/announcements');
    expect(res.status).toBe(401);
  });

  it('rejects publishing by a Parent', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ title: 'X', body: 'x' });
    expect(res.status).toBe(403);
  });

  it('THE AUDIENCE FILTER, PROVEN END TO END: a Staff-targeted announcement is invisible to a Parent but visible to a Teacher', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ title: 'Staff meeting Tuesday', body: 'Room 4, 3pm.', audience: 'Staff' });

    const parent = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const parentView = await request(app).get('/api/v1/announcements').set('Authorization', `Bearer ${parent.token}`);
    expect(parentView.body.data.some((a: { title: string }) => a.title === 'Staff meeting Tuesday')).toBe(false);

    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const teacherView = await request(app).get('/api/v1/announcements').set('Authorization', `Bearer ${teacher.token}`);
    expect(teacherView.body.data.some((a: { title: string }) => a.title === 'Staff meeting Tuesday')).toBe(true);
  });

  it('a Parents-targeted announcement reaches a Parent but not a Student', async () => {
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ title: 'Fee reminder', body: 'Term 2 fees due.', audience: 'Parents' });

    const parent = await registerAndLogin('Parent', 'parent3@alnoor.ae');
    const parentView = await request(app).get('/api/v1/announcements').set('Authorization', `Bearer ${parent.token}`);
    expect(parentView.body.data.some((a: { title: string }) => a.title === 'Fee reminder')).toBe(true);

    const student = await registerAndLogin('Student', 'student1@alnoor.ae');
    const studentView = await request(app).get('/api/v1/announcements').set('Authorization', `Bearer ${student.token}`);
    expect(studentView.body.data.some((a: { title: string }) => a.title === 'Fee reminder')).toBe(false);
  });

  it('an All-audience announcement reaches every role', async () => {
    const admin = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ title: 'School reopens Monday', body: 'Welcome back.', audience: 'All' });

    for (const [role, email] of [
      ['Parent', 'parent4@alnoor.ae'],
      ['Student', 'student2@alnoor.ae'],
      ['Teacher', 'teacher2@alnoor.ae'],
    ] as const) {
      const user = await registerAndLogin(role, email);
      const view = await request(app).get('/api/v1/announcements').set('Authorization', `Bearer ${user.token}`);
      expect(view.body.data.some((a: { title: string }) => a.title === 'School reopens Monday')).toBe(true);
    }
  });

  it('pinned announcements sort before unpinned ones', async () => {
    const admin = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ title: 'Ordinary notice', body: 'x', audience: 'All' });
    await request(app)
      .post('/api/v1/announcements')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ title: 'Pinned notice', body: 'x', audience: 'All', pinned: true });
    const view = await request(app).get('/api/v1/announcements').set('Authorization', `Bearer ${admin.token}`);
    const titles = view.body.data.map((a: { title: string }) => a.title);
    expect(titles.indexOf('Pinned notice')).toBeLessThan(titles.indexOf('Ordinary notice'));
  });

  it('keeps drafts and pending announcements hidden from parents until a reviewer publishes them', async () => {
    const teacher = await registerAndLogin('Teacher', 'draft-teacher@alnoor.ae');
    const admin = await registerAndLogin('Administrator', 'draft-admin@alnoor.ae');
    const parent = await registerAndLogin('Parent', 'draft-parent@alnoor.ae');
    const created = await request(app).post('/api/v1/announcements')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ title: 'Private draft notice', body: 'Not approved yet.', audience: 'All', status: 'Draft' });
    expect(created.status).toBe(201);
    const id = created.body.data._id;
    const directPublish = await request(app).post('/api/v1/announcements')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ title: 'Unreviewed direct notice', body: 'Must not publish.', audience: 'All' });
    expect(directPublish.status).toBe(403);
    const parentList = () => request(app).get('/api/v1/announcements').set('Authorization', `Bearer ${parent.token}`);
    expect((await parentList()).body.data.some((a: { _id: string }) => a._id === id)).toBe(false);
    const submitted = await request(app).patch(`/api/v1/announcements/${id}/status`)
      .set('Authorization', `Bearer ${teacher.token}`).send({ status: 'Pending approval' });
    expect(submitted.status).toBe(200);
    expect((await parentList()).body.data.some((a: { _id: string }) => a._id === id)).toBe(false);
    const teacherApproval = await request(app).patch(`/api/v1/announcements/${id}/status`)
      .set('Authorization', `Bearer ${teacher.token}`).send({ status: 'Published' });
    expect(teacherApproval.status).toBe(403);
    const approved = await request(app).patch(`/api/v1/announcements/${id}/status`)
      .set('Authorization', `Bearer ${admin.token}`).send({ status: 'Published' });
    expect(approved.status).toBe(200);
    expect((await parentList()).body.data.some((a: { _id: string }) => a._id === id)).toBe(true);
  });

  it('prevents another teacher from seeing or submitting a draft', async () => {
    const author = await registerAndLogin('Teacher', 'draft-author@alnoor.ae');
    const other = await registerAndLogin('Teacher', 'draft-other@alnoor.ae');
    const created = await request(app).post('/api/v1/announcements')
      .set('Authorization', `Bearer ${author.token}`)
      .send({ title: 'Author only draft', body: 'Work in progress', status: 'Draft' });
    const id = created.body.data._id;
    const otherList = await request(app).get('/api/v1/announcements').set('Authorization', `Bearer ${other.token}`);
    expect(otherList.body.data.some((a: { _id: string }) => a._id === id)).toBe(false);
    const submit = await request(app).patch(`/api/v1/announcements/${id}/status`)
      .set('Authorization', `Bearer ${other.token}`).send({ status: 'Pending approval' });
    expect(submit.status).toBe(403);
  });
});
