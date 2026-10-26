/** Additive, repeatable fictional dataset. Never resets existing accounts or sends messages. */
import { mkdir, readFile, writeFile, chmod } from 'fs/promises';
import { join } from 'path';
import { connectDb, disconnectDb } from '../config/db';
import { Student } from '../models/Student';
import { Staff } from '../models/Staff';
import { Guardian } from '../models/Guardian';
import { User } from '../models/User';
import { ClassSection } from '../models/ClassSection';
import { TeachingAssignment } from '../models/TeachingAssignment';
import { provisionAccount } from '../modules/auth/auth.accounts';
import { getSettings } from '../modules/settings/settings.repository';
import { studentLoginId } from '../modules/auth/auth.login-id';
import { PortalLoginId } from '../models/PortalLoginId';
import { logAudit } from '../modules/audit/audit.service';
import { logger } from '../utils/logger';

const output = '/tmp/schoolos-local-school';
const prefix = 'LOCAL26';
const names = [
  ['Ayaan Rahmani', 'Layla Mansouri', 'Zain Kapoor', 'Sara Nasser', 'Rayan Fernandes'],
  ['Inaya Mirza', 'Omar Qureshi', 'Maya Menon', 'Adam Farouqi', 'Zoya Siddiqui'],
  ['Yusuf Hamdan', 'Anaya Kulkarni', 'Ibrahim Khalili', 'Noor Ansari', 'Arjun Mathew'],
  ['Hana Darwish', 'Kabir Malhotra', 'Maryam Zaki', 'Vihaan Nair', 'Amina Suleiman'],
  ['Rehan Bhat', 'Alina Saeed', 'Ethan Dsouza', 'Safiya Abbas', 'Danish Malik'],
  ['Meera Krishnan', 'Ahmed Bashir', 'Riya Thomas', 'Hassan Faris', 'Zahra Rizvi'],
  ['Aditya Rao', 'Salma Jaber', 'Isa Khan', 'Tara Shah', 'Hamza Idrisi'],
  ['Aarav Deshmukh', 'Nadia Habib', 'Bilal Saleem', 'Diya Joseph', 'Lina Younis'],
  ['Samar Hussain', 'Kiara Pinto', 'Mustafa Amin', 'Amira Haddad', 'Neil Varghese'],
  ['Sana Chaudhry', 'Zaid Marwan', 'Anika Iyer', 'Faris Mahmoud', 'Leena Shaikh'],
  ['Dev Patel', 'Huda Rashwan', 'Imran Latif', 'Aisha Karim', 'Nikhil Sethi'],
  ['Samira Azmi', 'Rohan Prakash', 'Yasmin Ebrahim', 'Taha Rafiq', 'Anjali Balan'],
  ['Fahad Muneer', 'Sofia Dantas', 'Karan Bedi', 'Rania Hakim', 'Aryan Suresh'],
  ['Mariam Jalal', 'Sameer Naqvi', 'Naina Chawla', 'Khalid Anwar', 'Elena George'],
];
const teachers = [
  { refId: 'EMP-L2601', name: 'Sarah Ahmed', subject: 'English', phone: '+12025550190', joinedDate: '2022-08-22' },
  { refId: 'EMP-L2602', name: 'Vikram Iyer', subject: 'Science', phone: '+12025550191', joinedDate: '2021-08-16' },
  {
    refId: 'EMP-L2603',
    name: 'Mariam Al Mansoori',
    subject: 'Arabic',
    phone: '+12025550192',
    joinedDate: '2023-08-21',
  },
  {
    refId: 'EMP-L2604',
    name: 'Daniel Fernandes',
    subject: 'Social Studies',
    phone: '+12025550193',
    joinedDate: '2020-08-17',
  },
];
type Credential = {
  name: string;
  role: string;
  loginId: string;
  email: string;
  temporaryPassword: string;
  expiresAt: string;
  grade?: string;
  subject?: string;
};
async function run() {
  if (process.env.NODE_ENV === 'production' || !process.argv.includes('--apply'))
    throw new Error('Development only. Run with --apply to add fictional records to the configured database.');
  await mkdir(output, { recursive: true, mode: 0o700 });
  await chmod(output, 0o700);
  const file = join(output, 'credentials.json');
  let credentials: Credential[] = [];
  try {
    credentials = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const save = async () => {
    await writeFile(file, JSON.stringify(credentials, null, 2), { mode: 0o600 });
    await chmod(file, 0o600);
    const quote = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const keys: (keyof Credential)[] = [
      'role',
      'name',
      'grade',
      'subject',
      'loginId',
      'email',
      'temporaryPassword',
      'expiresAt',
    ];
    await writeFile(
      join(output, 'credentials.csv'),
      [keys.join(','), ...credentials.map((row) => keys.map((key) => quote(row[key])).join(','))].join('\n'),
      { mode: 0o600 },
    );
  };
  await connectDb();
  try {
    const admin = await User.findOne({ role: 'Administrator', isActive: true }).sort({ createdAt: 1 });
    if (!admin) throw new Error('An active Administrator is required.');
    const { academicYear } = await getSettings();
    // Validate target classes and the ID configuration before adding records.
    for (let g = 0; g < 14; g++) {
      const grade = g < 2 ? 'KG ' + (g + 1) : 'Grade ' + (g - 1);
      studentLoginId(grade + ' · A', '1', academicYear);
      if (await ClassSection.exists({ grade, section: 'A', status: 'Archived' }))
        throw new Error(grade + ' · A is archived; activate it before adding students.');
    }
    const counts = {
      teachersAdded: 0,
      sectionsAdded: 0,
      studentsAdded: 0,
      guardiansAdded: 0,
      accountsAdded: 0,
      teachingMappingsAdded: 0,
    };
    const ensureLogin = async (
      kind: 'Student' | 'Staff' | 'Guardian',
      record: typeof Student.prototype,
      extra: { role?: 'Teacher'; email?: string },
      context: { grade?: string; subject?: string } = {},
    ) => {
      const link = kind === 'Student' ? record.get('studentUserId') : record.get('userId');
      if (link) return link;
      const result = await provisionAccount({ kind, recordId: String(record._id), ...extra }, String(admin._id));
      credentials.push({ ...result, ...context } as Credential);
      counts.accountsAdded++;
      await save(); // Persist each one-time password immediately; never print credentials.
      return result.userId;
    };
    const subjectStaff: Array<{ staff: typeof Staff.prototype; subject: string }> = [];
    const math = await Staff.findOne({
      type: 'Teaching',
      status: 'Active',
      department: /^mathematics$/i,
      userId: { $exists: true },
    });
    if (!math) throw new Error('Existing active Mathematics teacher with a linked login is required.');
    subjectStaff.push({ staff: math, subject: 'Mathematics' });
    for (const [i, t] of teachers.entries()) {
      let staff = await Staff.findOne({ refId: t.refId });
      if (!staff) {
        staff = await Staff.create({
          refId: t.refId,
          name: t.name,
          designation: t.subject + ' Teacher',
          department: t.subject,
          type: 'Teaching',
          status: 'Active',
          email: t.name.toLowerCase().replace(/ /g, '.') + '@demo.schoolos.example',
          phone: t.phone,
          joinedDate: new Date(t.joinedDate),
          annualLeaveRemaining: 30,
        });
        counts.teachersAdded++;
      }
      staff.userId = await ensureLogin('Staff', staff, { role: 'Teacher', email: staff.email }, { subject: t.subject });
      subjectStaff.push({ staff, subject: t.subject });
      logger.info({ completed: i + 1, total: 4 }, 'Fictional teachers ready');
    }
    for (let g = 0; g < 14; g++) {
      const grade = g < 2 ? 'KG ' + (g + 1) : 'Grade ' + (g - 1),
        fullGrade = grade + ' · A';
      let section = await ClassSection.findOne({ grade, section: 'A' });
      if (!section) {
        section = await ClassSection.create({
          grade,
          section: 'A',
          stream: g < 2 ? 'Foundation' : g < 7 ? 'Primary' : g > 11 ? 'Science' : 'General',
          teacherStaffId: subjectStaff[g % 5].staff._id,
          capacity: 30,
          room: (g < 2 ? 'Early Years ' : 'Room ') + (101 + g),
          status: 'Active',
        });
        counts.sectionsAdded++;
      }
      if (section.status !== 'Active') throw new Error(fullGrade + ' is archived; activate it before adding students.');
      if (!section.room) {
        section.room = (g < 2 ? 'Early Years ' : 'Room ') + (101 + g);
        await section.save();
      }
      if (!section.teacherStaffId) {
        section.teacherStaffId = subjectStaff[g % 5].staff._id;
        await section.save();
      }
      for (const t of subjectStaff) {
        const teacher = t.staff.userId;
        const mapping = await TeachingAssignment.updateOne(
          { teacher, classSection: section._id, subject: t.subject, academicYear },
          {
            $setOnInsert: {
              teacher,
              classSection: section._id,
              subject: t.subject,
              academicYear,
              grade: fullGrade,
              active: true,
            },
          },
          { upsert: true },
        );
        counts.teachingMappingsAdded += mapping.upsertedCount;
      }
      for (let n = 0; n < 5; n++) {
        const refId = `${prefix}-${String(g + 1).padStart(2, '0')}-${n + 1}`,
          index = g * 5 + n;
        let student = await Student.findOne({ refId });
        if (!student) {
          const used = await Student.find({ grade: fullGrade }).select('roll').lean();
          const rolls = new Set(used.map((s) => String(s.roll).padStart(3, '0')));
          let roll = 1;
          while (
            rolls.has(String(roll).padStart(3, '0')) ||
            (await PortalLoginId.exists({ loginId: studentLoginId(fullGrade, String(roll), academicYear) }))
          )
            roll++;
          const name = names[g][n],
            surname = name.split(' ').slice(1).join(' '),
            gender = (g + n) % 2 === 0 ? 'Male' : 'Female';
          const guardianName = (n % 2 === 0 ? 'Faisal ' : 'Nadia ') + surname;
          const mailbox = name.toLowerCase().replace(/ /g, '.');
          student = await Student.create({
            refId,
            name,
            grade: fullGrade,
            gender,
            roll: String(roll),
            guardianName,
            guardianRelationship: n % 2 === 0 ? 'Father' : 'Mother',
            phone: '+120255501' + String(index).padStart(2, '0'),
            dateOfBirth: new Date(Date.UTC(2026 - (g + 4), n + 1, 10 + n)),
            nationality: ['United Arab Emirates', 'India', 'Pakistan', 'Jordan', 'Philippines'][n],
            studentEmail: mailbox + '@students.schoolos.example',
            guardianEmail: mailbox + '.parent@families.schoolos.example',
            emergencyContact: '+120255501' + String((index + 1) % 70).padStart(2, '0'),
            preferredLanguage: 'English',
            address: `Apartment ${201 + index}, Demo Cedar Residence, Al Nahda, Dubai (fictional test address)`,
            previousSchool: g === 0 ? 'Not applicable' : 'Demo Horizon Academy (fictional)',
            previousGrade: g === 0 ? 'Not applicable' : g === 1 ? 'KG 1' : g === 2 ? 'KG 2' : 'Grade ' + (g - 2),
            languages: n === 0 ? 'Arabic, English' : 'English, Hindi',
            bloodGroup: 'Unknown',
            allergies: 'None reported in fictional test scenario',
            medicalNotes: 'Fictional test student; no medical records or documents supplied.',
            transportRequirement: n % 2 === 0 ? 'Two-way' : 'No',
            feeStatus: 'Pending',
            attendancePct: 0,
            gpa: 0,
            status: 'Active',
          });
          counts.studentsAdded++;
        }
        await ensureLogin('Student', student, { email: student.studentEmail }, { grade: fullGrade });
        let guardian = await Guardian.findOne({ refId: 'GRD-' + refId });
        if (!guardian) {
          guardian = await Guardian.create({
            refId: 'GRD-' + refId,
            name: student.guardianName,
            relation: student.guardianRelationship,
            phone: student.phone,
            email: student.guardianEmail,
            studentIds: [student._id],
            portalStatus: 'Invited',
            pickupAuthorized: true,
            financialResponsible: true,
            custody: 'Parent — fictional testing record',
            consents: { media: null, trips: null, medical: null },
            note: 'Fictional local test family. Reserved example email/telephone; do not use for delivery testing.',
          });
          counts.guardiansAdded++;
        }
        await ensureLogin('Guardian', guardian, { email: guardian.email }, { grade: fullGrade });
      }
      const demoCount = await Student.countDocuments({ grade: fullGrade, refId: { $regex: '^' + prefix + '-' } });
      if (demoCount !== 5) throw new Error(fullGrade + ' demo count must be five');
      logger.info({ grade: fullGrade, students: 5 }, 'Fictional class and linked parent logins ready');
    }
    await logAudit(
      'Added fictional local-school testing dataset: ' + JSON.stringify(counts),
      'Settings',
      String(admin._id),
    );
    await save();
    await writeFile(
      join(output, 'README.md'),
      '# Local school testing accounts\n\nFictional data only. Emails use reserved .example domains; phone numbers use the reserved +1 202-555-01xx range. No outbound messages were sent.\n\nOpen http://localhost:5173. Select the role shown in credentials.csv, enter loginId (or email) and temporaryPassword. On first sign-in choose a new password. Temporary passwords expire after seven days. Do not share or commit credentials. Accounts already present are never reset by rerunning this script.\n\n70 new demo students: 5 per section A, KG 1, KG 2 and Grades 1–12. Existing class members remain, so total class size may exceed five. Four new teachers: English, Science, Arabic, Social Studies. Existing Mathematics teacher is reused without changing credentials. Teaching mappings cover all 14 demo classes for testing, not a realistic staffing timetable. No fake documents, payments, attendance marks or assessment results were created.\n\n' +
        JSON.stringify(counts, null, 2) +
        '\n',
      { mode: 0o600 },
    );
    logger.info(counts, 'Fictional local dataset ready');
    logger.info({ directory: output }, 'Private credentials saved');
  } finally {
    await disconnectDb();
  }
}
run().catch((error) => {
  console.error('Local dataset failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
