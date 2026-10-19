import { ClassSection } from '../src/models/ClassSection';
import { TeachingAssignment } from '../src/models/TeachingAssignment';
import { getSettings } from '../src/modules/settings/settings.repository';
import request from 'supertest';
import { createApp } from '../src/app';
import { Student } from '../src/models/Student';
import { Assignment } from '../src/models/Assignment';
import { Submission } from '../src/models/Submission';
import { Attendance } from '../src/models/Attendance';
import { Guardian } from '../src/models/Guardian';
import { InboxNotification } from '../src/models/InboxNotification';
import { NotificationDelivery } from '../src/models/NotificationDelivery';
import { runAssignmentReminders } from '../src/modules/lms/lms.reminders.service';
import { runAttendanceAlerts } from '../src/modules/attendance/attendance.alerts.service';
import { schoolToday } from '../src/modules/attendance/attendance.dates';
import { processOneDelivery } from '../src/modules/notifications/notifications.service';
const app = createApp();
async function account(role: string, label = role) {
  const r = await request(app)
    .post('/api/v1/auth/register')
    .send({ role, name: label, email: label + '@example.invalid', password: 'StrongPass123' });
  expect(r.status).toBe(201);
  return { ...r.body.data, h: { Authorization: 'Bearer ' + r.body.data.accessToken } };
}
async function fixture() {
  const a = await account('Administrator'),
    p = await account('Parent'),
    s = await account('Student');
  const child = await Student.create({
    name: 'Fictional child',
    refId: 'QA-REMINDER',
    grade: 'Grade 7 · A',
    gender: 'Female',
    roll: '1',
    guardianName: 'Fictional parent',
    phone: '+971501234567',
    studentUserId: s.user._id,
    guardianUserId: p.user._id,
  });
  const homework = await Assignment.create({
    createdBy: a.user._id,
    publisher: a.user._id,
    title: 'Homework',
    description: 'Fictional instructions',
    subject: 'Science',
    grade: child.grade,
    academicYear: '2026-2027',
    dueDate: new Date(Date.now() + 3600000),
    maxScore: 20,
    status: 'Published',
    remindersEnabled: true,
  });
  return { a, p, s, child, homework };
}
afterEach(() => {
  delete process.env.NOTIFICATIONS_ENABLED;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
});
function email() {
  process.env.NOTIFICATIONS_ENABLED = 'true';
  process.env.RESEND_API_KEY = 'fictional';
  process.env.RESEND_FROM_EMAIL = 'school@example.invalid';
}
describe('Pending homework reminders and confirmed attendance alerts', () => {
  it('sends one before/overdue event per deadline, with no duplicate events from concurrent workers', async () => {
    const { homework } = await fixture();
    await Promise.all([runAssignmentReminders(), runAssignmentReminders()]);
    expect(await InboxNotification.countDocuments({ title: 'Homework deadline reminder' })).toBe(2);
    await runAssignmentReminders(new Date(homework.dueDate.getTime() + 1000));
    expect(await InboxNotification.countDocuments({ title: 'Homework submission overdue' })).toBe(2);
    await runAssignmentReminders(new Date(homework.dueDate.getTime() + 2000));
    expect(await InboxNotification.countDocuments()).toBe(4);
  });
  it('excludes submitted students, inactive records and suspended guardians', async () => {
    const { homework, child, p } = await fixture();
    await Submission.create({ assignment: homework._id, student: child._id, content: 'Done' });
    await runAssignmentReminders();
    expect(await InboxNotification.countDocuments()).toBe(0);
    await Submission.deleteMany({});
    await Guardian.create({
      refId: 'QA-G',
      name: 'Parent',
      phone: '+971501234567',
      userId: p.user._id,
      portalStatus: 'Suspended',
    });
    await Assignment.updateOne({ _id: homework._id }, { $unset: { remindedBeforeFor: 1 } });
    await runAssignmentReminders();
    expect(await InboxNotification.countDocuments()).toBe(1);
    expect(await InboxNotification.countDocuments({ recipient: p.user._id })).toBe(0);
  });
  it('suppresses queued reminders after submission or deadline changes', async () => {
    const { homework, child } = await fixture();
    email();
    await Assignment.updateOne({ _id: homework._id }, { $set: { notifyEmail: true } });
    await runAssignmentReminders();
    expect(await NotificationDelivery.countDocuments()).toBe(2);
    await Submission.create({ assignment: homework._id, student: child._id, content: 'Done' });
    await processOneDelivery();
    expect(await NotificationDelivery.countDocuments({ errorCode: 'ASSIGNMENT_RECIPIENT_CHANGED' })).toBe(1);
    await Submission.deleteMany({});
    await Assignment.updateOne({ _id: homework._id }, { $set: { dueDate: new Date(Date.now() + 7200000) } });
    await processOneDelivery();
    expect(await NotificationDelivery.countDocuments({ errorCode: 'ASSIGNMENT_RECIPIENT_CHANGED' })).toBe(2);
  });
  it('saves opt-in attendance alerts transactionally and ignores present or unmarked students', async () => {
    const { a, child, p } = await fixture(),
      date = await schoolToday();
    const body = {
      date,
      session: 'AM',
      notifyGuardians: true,
      notificationChannel: 'InApp',
      entries: [{ studentId: String(child._id), status: 'Absent', expectedUpdatedAt: null }],
    };
    expect((await request(app).put('/api/v1/attendance/register').set(a.h).send(body)).status).toBe(200);
    const before = await Attendance.findOne();
    await Promise.all([runAttendanceAlerts(), runAttendanceAlerts()]);
    expect(await InboxNotification.countDocuments({ recipient: p.user._id, module: 'attendance' })).toBe(1);
    expect((await Attendance.findOne())?.updatedAt.toISOString()).toBe(before!.updatedAt.toISOString());
    await request(app)
      .put('/api/v1/attendance/register')
      .set(a.h)
      .send({
        ...body,
        entries: [
          { studentId: String(child._id), status: 'Absent', expectedUpdatedAt: before!.updatedAt.toISOString() },
        ],
      });
    await runAttendanceAlerts();
    expect(await InboxNotification.countDocuments({ module: 'attendance' })).toBe(1);
  });
  it('stops attendance delivery after correction or guardian relinking', async () => {
    const { a, child } = await fixture();
    email();
    const row = await Attendance.create({
      student: child._id,
      date: new Date(),
      session: 'AM',
      status: 'Absent',
      markedBy: a.user._id,
      alertRequestedAt: new Date(),
      alertChannel: 'Email',
    });
    await runAttendanceAlerts();
    expect(await NotificationDelivery.countDocuments()).toBe(1);
    await Attendance.updateOne({ _id: row._id }, { $set: { status: 'Present' } });
    await processOneDelivery();
    expect((await NotificationDelivery.findOne())?.errorCode).toBe('ATTENDANCE_RECIPIENT_CHANGED');
  });
  it('requires mapped teachers and denies family roles from requesting alerts', async () => {
    const { child } = await fixture(),
      t = await account('Teacher'),
      p = await account('Parent', 'other-parent'),
      date = await schoolToday();
    const body = {
      date,
      session: 'AM',
      notifyGuardians: true,
      entries: [{ studentId: String(child._id), status: 'Late', expectedUpdatedAt: null }],
    };
    expect((await request(app).put('/api/v1/attendance/register').set(t.h).send(body)).status).toBe(403);
    expect((await request(app).put('/api/v1/attendance/register').set(p.h).send(body)).status).toBe(403);
    expect(await Attendance.countDocuments()).toBe(0);
  });
  it('does not generate historical or disabled reminders and alerts', async () => {
    const { homework, a, child } = await fixture();
    await Assignment.updateOne({ _id: homework._id }, { $set: { remindersEnabled: false } });
    await Attendance.create({
      student: child._id,
      date: new Date(),
      session: 'AM',
      status: 'Absent',
      markedBy: a.user._id,
    });
    await runAssignmentReminders();
    await runAttendanceAlerts();
    expect(await InboxNotification.countDocuments()).toBe(0);
  });
  it('keeps mapped teacher external attendance requests in office approval', async () => {
    const { child } = await fixture(),
      t = await account('Teacher'),
      c = await ClassSection.create({ grade: 'Grade 7', section: 'A' });
    await TeachingAssignment.create({
      teacher: t.user._id,
      classSection: c._id,
      grade: child.grade,
      subject: 'Science',
      academicYear: (await getSettings()).academicYear,
    });
    email();
    const r = await request(app)
      .put('/api/v1/attendance/register')
      .set(t.h)
      .send({
        date: await schoolToday(),
        session: 'PM',
        notifyGuardians: true,
        notificationChannel: 'Email',
        entries: [{ studentId: String(child._id), status: 'Late', expectedUpdatedAt: null }],
      });
    expect(r.status).toBe(200);
    await runAttendanceAlerts();
    expect(await NotificationDelivery.countDocuments({ status: 'Awaiting approval' })).toBe(1);
  });
  it('does not silently claim external delivery when SMS is unavailable', async () => {
    const { a, child } = await fixture();
    await Attendance.create({
      student: child._id,
      date: new Date(),
      session: 'AM',
      status: 'Late',
      markedBy: a.user._id,
      alertRequestedAt: new Date(),
      alertChannel: 'SMS',
    });
    await runAttendanceAlerts();
    expect(await NotificationDelivery.countDocuments()).toBe(0);
    expect((await Attendance.findOne())?.alertSummary).toContain('unconfigured');
    expect(await InboxNotification.countDocuments({ module: 'attendance' })).toBe(1);
  });
  it('does not duplicate external alerts when another staff member saves the same absence again', async () => {
    const { a, child } = await fixture(),
      other = await account('Principal');
    email();
    const row = await Attendance.create({
      student: child._id,
      date: new Date(),
      session: 'AM',
      status: 'Absent',
      markedBy: a.user._id,
      alertRequestedAt: new Date(),
      alertChannel: 'Email',
    });
    await runAttendanceAlerts();
    await Student.updateOne({ _id: child._id }, { $set: { name: 'Updated fictional name' } });
    await Attendance.updateOne(
      { _id: row._id },
      { $set: { markedBy: other.user._id, alertProcessedAt: null, alertRequestedAt: new Date() } },
    );
    await runAttendanceAlerts();
    expect(await NotificationDelivery.countDocuments()).toBe(1);
    expect((await Attendance.findOne())?.alertSummary).toContain('already recorded');
  });
});
