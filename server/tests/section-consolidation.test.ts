import { mergeSectionsToA, sectionA } from '../src/seed/mergeSectionsToA';
import { User } from '../src/models/User';
import { Student } from '../src/models/Student';
import { ClassSection } from '../src/models/ClassSection';
import { TeachingAssignment } from '../src/models/TeachingAssignment';
import { Assignment } from '../src/models/Assignment';

it('merges section membership and teaching scopes atomically without changing logins or history', async () => {
  const admin = await User.create({
    name: 'Fictional administrator',
    email: 'merge-admin@example.invalid',
    role: 'Administrator',
    passwordHash: 'fixture',
  });
  const login = await User.create({
    name: 'Fictional learner',
    email: 'merge-student@example.invalid',
    role: 'Student',
    loginId: 'sch-stu-old-b-001',
    passwordHash: 'fixture',
  });
  const a = await ClassSection.create({ grade: 'Grade 1', section: 'A', capacity: 1, status: 'Active' });
  const b = await ClassSection.create({ grade: 'Grade 1', section: 'B', capacity: 30, status: 'Active' });
  const common = {
    grade: 'Grade 1 · A',
    name: 'Fictional learner',
    gender: 'Female',
    roll: '1',
    guardianName: 'Fictional guardian',
    phone: '+12025550101',
  };
  await Student.create({ ...common, refId: 'MERGE-A' });
  const moved = await Student.create({ ...common, refId: 'MERGE-B', grade: 'Grade 1 · B', studentUserId: login._id });
  await TeachingAssignment.create({
    teacher: admin._id,
    classSection: a._id,
    grade: 'Grade 1 · A',
    subject: 'English',
    academicYear: '2026-2027',
    active: true,
  });
  await TeachingAssignment.create({
    teacher: admin._id,
    classSection: b._id,
    grade: 'Grade 1 · B',
    subject: 'English',
    academicYear: '2026-2027',
    active: true,
  });
  const work = await Assignment.create({
    title: 'Fictional assignment',
    description: 'Practice',
    subject: 'English',
    grade: 'Grade 1 · B',
    dueDate: new Date(),
    maxScore: 10,
    createdBy: admin._id,
    history: [{ before: { grade: 'Grade 1 · B' } }],
  });
  expect((await mergeSectionsToA()).studentsMoved).toBe(1);
  expect((await Student.findById(moved._id))!.grade).toBe('Grade 1 · B');
  const report = await mergeSectionsToA(true);
  expect(report.studentsMoved).toBe(1);
  expect(report.rollsAdjusted).toBe(1);
  const student = (await Student.findById(moved._id))!;
  expect(student.grade).toBe('Grade 1 · A');
  expect(student.roll).toBe('2');
  expect(student.enrollmentHistory[0].from).toBe('Grade 1 · B');
  expect(String(student.studentUserId)).toBe(String(login._id));
  expect((await User.findById(login._id))!.loginId).toBe('sch-stu-old-b-001');
  expect(await ClassSection.countDocuments()).toBe(1);
  expect((await ClassSection.findById(a._id))!.capacity).toBe(2);
  expect(await TeachingAssignment.countDocuments()).toBe(1);
  expect((await Assignment.findById(work._id))!.grade).toBe('Grade 1 · A');
  expect((await Assignment.findById(work._id))!.history[0].before.grade).toBe('Grade 1 · B');
  expect((await mergeSectionsToA()).studentsMoved).toBe(0);
});
it('recognizes scoped class labels without rewriting grade-only values', () => {
  expect(sectionA('KG 2 · B')).toBe('KG 2 · A');
  expect(sectionA('Grade 11 · C')).toBe('Grade 11 · A');
  expect(sectionA('Grade 1')).toBeUndefined();
  expect(sectionA('Grade 1 · A')).toBeUndefined();
});
