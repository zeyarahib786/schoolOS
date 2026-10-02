import request from 'supertest';
import { createApp } from '../src/app';
import { Guardian } from '../src/models/Guardian';
import { MeetingSlot } from '../src/models/MeetingSlot';
import { Staff } from '../src/models/Staff';
import { Student } from '../src/models/Student';

const app = createApp();

async function login(role: 'Administrator' | 'Teacher', email: string) {
  const response = await request(app).post('/api/v1/auth/register').send({ name: `PTM ${role}`, email, password: 'StrongPass123', role });
  return response.body.data.accessToken as string;
}

async function fixture() {
  const teacher = await Staff.create({ refId: 'EMP-PTM', name: 'PTM Teacher', designation: 'Teacher', department: 'Primary', type: 'Teaching', email: 'ptm.teacher@alnoor.ae', phone: '+971501010101', joinedDate: new Date('2020-01-01') });
  const student = await Student.create({ refId: 'ANS-PTM', name: 'PTM Student', grade: 'Grade 4 · A', gender: 'Male', roll: '8', guardianName: 'PTM Guardian', phone: '+971502020202' });
  const guardian = await Guardian.create({ refId: 'GRD-PTM', name: 'PTM Guardian', phone: '+971502020202', email: 'ptm.guardian@family.ae', studentIds: [student._id], portalStatus: 'Active', custody: 'Full', consents: { media: true, trips: true, medical: true } });
  const first = await MeetingSlot.create({ teacher: teacher._id, date: new Date('2026-10-18'), startTime: '09:00', room: 'Room 12' });
  const second = await MeetingSlot.create({ teacher: teacher._id, date: new Date('2026-10-18'), startTime: '09:20', room: 'Room 12' });
  return { teacher, student, guardian, first, second };
}

describe('Parents PTM staff workflows', () => {
  it('books a slot on behalf of a correctly linked guardian and persists room/status', async () => {
    const admin = await login('Administrator', 'ptm-admin1@alnoor.ae');
    const { student, guardian, first } = await fixture();
    const response = await request(app).post(`/api/v1/meetings/${first._id}/book-on-behalf`).set('Authorization', `Bearer ${admin}`).send({ guardianId: guardian._id, studentId: student._id, note: 'Discuss progress' });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ status: 'Confirmed', room: 'Room 12' });
  });

  it('rejects a guardian/student mismatch', async () => {
    const admin = await login('Administrator', 'ptm-admin2@alnoor.ae');
    const { first } = await fixture();
    const stranger = await Student.create({ refId: 'ANS-OTHER', name: 'Other Child', grade: 'Grade 5 · A', gender: 'Female', roll: '2', guardianName: 'Other', phone: '+971503030303' });
    const guardian = await Guardian.findOne({ refId: 'GRD-PTM' });
    const response = await request(app).post(`/api/v1/meetings/${first._id}/book-on-behalf`).set('Authorization', `Bearer ${admin}`).send({ guardianId: guardian!._id, studentId: stranger._id });
    expect(response.status).toBe(400);
  });

  it('cancels and reschedules booked meetings without leaving a double booking', async () => {
    const admin = await login('Administrator', 'ptm-admin3@alnoor.ae');
    const { student, guardian, first, second } = await fixture();
    await request(app).post(`/api/v1/meetings/${first._id}/book-on-behalf`).set('Authorization', `Bearer ${admin}`).send({ guardianId: guardian._id, studentId: student._id });
    const moved = await request(app).post(`/api/v1/meetings/${first._id}/reschedule`).set('Authorization', `Bearer ${admin}`).send({ targetSlotId: second._id });
    expect(moved.status).toBe(200);
    expect(moved.body.data.status).toBe('Confirmed');
    expect((await MeetingSlot.findById(first._id))!.status).toBe('Available');
    const cancelled = await request(app).post(`/api/v1/meetings/${second._id}/cancel`).set('Authorization', `Bearer ${admin}`);
    expect(cancelled.body.data.status).toBe('Available');
  });

  it('keeps leadership-only actions protected and refuses notifying an open slot', async () => {
    const teacherToken = await login('Teacher', 'ptm-teacher-role@alnoor.ae');
    const admin = await login('Administrator', 'ptm-admin4@alnoor.ae');
    const { first } = await fixture();
    expect((await request(app).post(`/api/v1/meetings/${first._id}/cancel`).set('Authorization', `Bearer ${teacherToken}`)).status).toBe(403);
    expect((await request(app).post(`/api/v1/meetings/${first._id}/notify`).set('Authorization', `Bearer ${admin}`)).status).toBe(409);
  });
});

