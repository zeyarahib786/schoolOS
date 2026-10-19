import bcrypt from 'bcryptjs';
import { Student } from '../models/Student';
import { User } from '../models/User';

export const DEMO_STUDENT_EMAIL = 'student@alnoor.ae';
export const DEMO_STUDENT_REF_ID = 'ANS-1042';

/** Create the demo Student login only when its existing roster record can be linked safely. */
export async function ensureDemoStudentAccount(password: string): Promise<'created' | 'already linked'> {
  const student = await Student.findOne({ refId: DEMO_STUDENT_REF_ID });
  if (!student) throw new Error(`Student ${DEMO_STUDENT_REF_ID} is missing; seed the roster first`);

  let user = await User.findOne({ email: DEMO_STUDENT_EMAIL });
  if (user && user.role !== 'Student') throw new Error('Demo Student email belongs to a different role');
  if (student.studentUserId && (!user || !student.studentUserId.equals(user._id))) {
    throw new Error('Demo student record is already linked to another login');
  }
  const created = !user;
  if (!user) {
    user = await User.create({
      name: student.name,
      email: DEMO_STUDENT_EMAIL,
      role: 'Student',
      passwordHash: await bcrypt.hash(password, 12),
    });
  }
  if (!student.studentUserId) {
    const result = await Student.updateOne(
      { _id: student._id, studentUserId: { $exists: false } },
      { $set: { studentUserId: user._id } },
    );
    if (result.modifiedCount !== 1)
      throw new Error('Student link changed concurrently; verify it before using this account');
  }
  return created ? 'created' : 'already linked';
}
