import { Guardian } from '../models/Guardian';
import { GuardianMessage } from '../models/GuardianMessage';
import { MeetingSlot } from '../models/MeetingSlot';
import { ParentBroadcast } from '../models/ParentBroadcast';
import { Staff } from '../models/Staff';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { logger } from '../utils/logger';

export async function seedParents(): Promise<void> {
  const students = await Student.find({ refId: { $in: ['ANS-1042', 'ANS-1043', 'ANS-1044'] } });
  const byRef = new Map(students.map((student) => [student.refId, student]));
  const profiles = [
    {
      refId: 'GRD-101',
      name: 'Khalid Al Hashimi',
      relation: 'Father',
      phone: '+971501234567',
      email: 'parent@alnoor.ae',
      studentRefs: ['ANS-1042'],
      portalStatus: 'Active',
      custody: 'Full',
      pickupAuthorized: true,
      media: true,
    },
    {
      refId: 'GRD-102',
      name: 'Aisha Siddiqui',
      relation: 'Mother',
      phone: '+971502345678',
      email: 'aisha.siddiqui@family.ae',
      studentRefs: ['ANS-1043'],
      portalStatus: 'Invited',
      custody: 'Full',
      pickupAuthorized: true,
      media: true,
    },
    {
      refId: 'GRD-103',
      name: 'Yusuf Saleh',
      relation: 'Father',
      phone: '+971503456789',
      email: 'yusuf.saleh@family.ae',
      studentRefs: ['ANS-1044'],
      portalStatus: 'Active',
      custody: 'Court order on file',
      pickupAuthorized: false,
      media: false,
    },
  ] as const;
  for (const profile of profiles) {
    const studentIds = profile.studentRefs.map((ref) => byRef.get(ref)?._id).filter(Boolean);
    await Guardian.updateOne(
      { refId: profile.refId },
      {
        $setOnInsert: {
          refId: profile.refId,
          name: profile.name,
          relation: profile.relation,
          phone: profile.phone,
          email: profile.email,
          studentIds,
          portalStatus: profile.portalStatus,
          lastLoginAt: profile.portalStatus === 'Active' ? new Date() : null,
          pickupAuthorized: profile.pickupAuthorized,
          financialResponsible: true,
          custody: profile.custody,
          consents: { media: profile.media, trips: true, medical: true },
        },
      },
      { upsert: true },
    );
  }

  const guardians = await Guardian.find({ refId: { $in: profiles.map((profile) => profile.refId) } });
  const admin = await User.findOne({ email: 'admin@alnoor.ae' });
  if (admin) {
    for (const seed of [
      ['Term 2 fee reminder', 'Due-fee parents', 'SMS + Email', 3, 2, 'Term 2 fees are due by 01 September.'],
      [
        'Parent-teacher meeting invite',
        'All parents',
        'In-app + Email',
        3,
        2,
        'Parent-teacher meeting bookings are now open.',
      ],
      ['Sports day schedule', 'All parents', 'In-app only', 3, 3, 'The sports day schedule is now available.'],
      ['Exam timetable released', 'All parents', 'In-app + Email', 3, 2, 'The exam timetable has been released.'],
    ] as const) {
      const [subject, audienceLabel, channel, deliveredCount, readCount, message] = seed;
      await ParentBroadcast.updateOne(
        { subject },
        {
          $setOnInsert: {
            subject,
            message,
            audience: 'All parents',
            audienceLabel,
            channel,
            recipientCount: guardians.length,
            deliveredCount,
            readCount,
            sentBy: admin._id,
          },
        },
        { upsert: true },
      );
    }
    for (const guardian of guardians) {
      await GuardianMessage.updateOne(
        { guardianId: guardian._id, text: 'Welcome to the SchoolOS parent portal.' },
        {
          $setOnInsert: {
            guardianId: guardian._id,
            direction: 'out',
            from: 'Front Office',
            text: 'Welcome to the SchoolOS parent portal.',
            sentBy: admin._id,
          },
        },
        { upsert: true },
      );
    }
  }

  const teacher = await Staff.findOne({ refId: 'EMP-209' });
  if (teacher) {
    const meetingDate = new Date('2026-06-18T00:00:00.000Z');
    const times = ['09:00', '09:20', '09:40', '10:00', '10:20', '10:40', '11:00'];
    for (let index = 0; index < times.length; index += 1) {
      const guardian = guardians[index % guardians.length];
      const studentId = guardian?.studentIds[0];
      const booked = index < 4 && guardian && studentId;
      await MeetingSlot.updateOne(
        { teacher: teacher._id, date: meetingDate, startTime: times[index] },
        {
          $setOnInsert: {
            teacher: teacher._id,
            date: meetingDate,
            startTime: times[index],
            room: 'Room 12',
            status: booked ? (index === 2 ? 'Pending' : 'Confirmed') : 'Available',
            bookedGuardian: booked ? guardian._id : null,
            bookedForStudent: booked ? studentId : null,
            link: booked ? `https://meet.alnoor.ae/ptm-${String(index + 1).padStart(3, '0')}` : null,
          },
        },
        { upsert: true },
      );
    }
  }
  logger.info(`Seeded Parents module: ${guardians.length} guardians and 7 PTM slots`);
}
