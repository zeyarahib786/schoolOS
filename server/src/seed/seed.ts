import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from '../config/db';
import { User } from '../models/User';
import { Student } from '../models/Student';
import { Staff } from '../models/Staff';
import { Invoice } from '../models/Invoice';
import { Book } from '../models/Book';
import { Vehicle } from '../models/Vehicle';
import { Route } from '../models/Route';
import { InventoryItem } from '../models/InventoryItem';
import { Event } from '../models/Event';
import { Announcement } from '../models/Announcement';
import { HostelRoom } from '../models/HostelRoom';
import { Facility } from '../models/Facility';
import { Ticket } from '../models/Ticket';
import { ClassSection } from '../models/ClassSection';
import { seedCrmLeads } from './crmSeed';
import { seedParents } from './parentsSeed';
import { seedAccessRoles } from './rolesSeed';
import { ensureDemoStudentAccount } from './studentAccountSeed';
import { logger } from '../utils/logger';

/**
 * Idempotent seed script - safe to run repeatedly against the same database (skips existing
 * records by unique key rather than blindly inserting duplicates or wiping the collection).
 * Seed data provides the fictional "Al Noor International, Dubai" development dataset.
 */

const SEED_PASSWORD = 'ChangeMe123'; // demo-only password for every seeded account - never reuse in a real deployment

const seedUsers = [
  { name: 'Rashid Al Maktoum', email: 'admin@alnoor.ae', role: 'Administrator' as const },
  { name: 'Dr. Salma Haddad', email: 'principal@alnoor.ae', role: 'Principal' as const },
  { name: 'Rohan Mehta', email: 'teacher@alnoor.ae', role: 'Teacher' as const },
  { name: 'Joseph Thomas', email: 'accountant@alnoor.ae', role: 'Accountant' as const },
  { name: 'Khalid Al Hashimi', email: 'parent@alnoor.ae', role: 'Parent' as const },
];

const seedStudents = [
  {
    refId: 'ANS-1042',
    name: 'Fatima Al Hashimi',
    grade: 'Grade 10 · A',
    gender: 'Female' as const,
    roll: '12',
    guardianName: 'Khalid Al Hashimi',
    guardianEmail: 'parent@alnoor.ae', // linked below to the seeded Parent user, demonstrating real ownership scoping
    phone: '+971501234567',
    feeStatus: 'Paid' as const,
    attendancePct: 96,
    gpa: 3.8,
    status: 'Active' as const,
  },
  {
    refId: 'ANS-1043',
    name: 'Omar Siddiqui',
    grade: 'Grade 11 · C',
    gender: 'Male' as const,
    roll: '7',
    guardianName: 'Aisha Siddiqui',
    guardianEmail: null,
    phone: '+971502345678',
    feeStatus: 'Pending' as const,
    attendancePct: 88,
    gpa: 3.1,
    status: 'Active' as const,
  },
  {
    refId: 'ANS-1044',
    name: 'Mariam Saleh',
    grade: 'Grade 8 · B',
    gender: 'Female' as const,
    roll: '19',
    guardianName: 'Yusuf Saleh',
    guardianEmail: null,
    phone: '+971503456789',
    feeStatus: 'Overdue' as const,
    attendancePct: 79,
    gpa: 2.6,
    status: 'Active' as const,
  },
];

const seedStaff = [
  {
    refId: 'EMP-209',
    name: 'Rohan Mehta',
    designation: 'Mathematics Teacher',
    department: 'Mathematics',
    type: 'Teaching' as const,
    status: 'Active' as const,
    email: 'teacher@alnoor.ae', // linked to the seeded Teacher user below, demonstrating staff self-service ownership scoping
    phone: '+971502223344',
    joinedDate: new Date('2020-08-15'),
  },
  {
    refId: 'EMP-104',
    name: 'Joseph Thomas',
    designation: 'Chief Accountant',
    department: 'Finance',
    type: 'Non-Teaching' as const,
    status: 'Active' as const,
    email: 'accountant@alnoor.ae',
    phone: '+971504445566',
    joinedDate: new Date('2018-01-10'),
  },
];

async function run(): Promise<void> {
  await connectDb();

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  const emailToUserId = new Map<string, string>();

  for (const u of seedUsers) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      logger.info(`User already exists, skipping: ${u.email}`);
      emailToUserId.set(u.email, existing._id.toString());
      continue;
    }
    const created = await User.create({ ...u, passwordHash });
    emailToUserId.set(u.email, created._id.toString());
    logger.info(`Seeded user: ${u.email} (${u.role})`);
  }

  for (const s of seedStudents) {
    const existing = await Student.findOne({ refId: s.refId });
    if (existing) {
      logger.info(`Student already exists, skipping: ${s.refId}`);
      continue;
    }
    const { guardianEmail, ...rest } = s;
    const guardianUserId = guardianEmail ? emailToUserId.get(guardianEmail) : undefined;
    await Student.create({ ...rest, guardianUserId });
    logger.info(
      `Seeded student: ${s.refId} - ${s.name}${guardianUserId ? ' (linked to guardian portal account)' : ''}`,
    );
  }

  await ensureDemoStudentAccount(SEED_PASSWORD);

  for (const s of seedStaff) {
    const existing = await Staff.findOne({ refId: s.refId });
    if (existing) {
      logger.info(`Staff record already exists, skipping: ${s.refId}`);
      continue;
    }
    const { email, ...rest } = s;
    const userId = emailToUserId.get(email);
    await Staff.create({ ...rest, email, userId });
    logger.info(`Seeded staff: ${s.refId} - ${s.name}${userId ? ' (linked to portal account)' : ''}`);
  }

  const rohan = await Staff.findOne({ refId: 'EMP-209' });
  const classSeeds = [
    ['KG 1', 'A', 'Foundation', 22], ['KG 2', 'B', 'Foundation', 24],
    ['Grade 1', 'A', 'Primary', 26], ['Grade 3', 'B', 'Primary', 28], ['Grade 5', 'A', 'Primary', 28],
    ['Grade 8', 'A', 'General', 28], ['Grade 8', 'B', 'General', 28], ['Grade 9', 'B', 'General', 28],
    ['Grade 10', 'A', 'General', 30], ['Grade 10', 'B', 'General', 30],
    ['Grade 11', 'C', 'Commerce', 30], ['Grade 12', 'A', 'Science', 30],
  ] as const;
  for (const [grade, section, stream, capacity] of classSeeds) {
    const teacherStaffId = grade === 'Grade 10' && section === 'A' ? rohan?._id : undefined;
    const representative = await Student.findOne({ grade: `${grade} · ${section}`, status: 'Active' }).sort({ roll: 1 });
    await ClassSection.updateOne(
      { grade, section },
      { $setOnInsert: { grade, section, stream, capacity, teacherStaffId, representativeStudentId: representative?._id } },
      { upsert: true, collation: { locale: 'en', strength: 2 } },
    );
  }
  logger.info(`Seeded class sections: ${classSeeds.length}`);
  await seedCrmLeads();
  await seedParents();
  await seedAccessRoles();

  // ---- Demo-parity seed: one small, idempotent batch per newly hydrated module, so a fresh
  // compose-up shows live server data in the UI rather than only browser demo rows. Every
  // upsert is keyed on a natural unique field, so re-running the seed never duplicates. ----
  const adminUserId = emailToUserId.get('admin@alnoor.ae');
  const teacherUserId = emailToUserId.get('teacher@alnoor.ae');
  const fatima = await Student.findOne({ refId: 'ANS-1042' });

  if (fatima) {
    for (const inv of [
      {
        refId: 'INV-1042-T1',
        student: fatima._id,
        term: 'Term 1 · 2026-27',
        amount: 8500,
        currency: 'AED',
        dueDate: new Date('2026-09-15'),
        status: 'Pending',
      },
      {
        refId: 'INV-1042-T2',
        student: fatima._id,
        term: 'Term 2 · 2026-27',
        amount: 8500,
        currency: 'AED',
        dueDate: new Date('2027-01-15'),
        status: 'Pending',
      },
    ]) {
      await Invoice.updateOne({ refId: inv.refId }, { $setOnInsert: inv }, { upsert: true });
    }
    logger.info('Seeded invoices: 2 (Fatima Al Hashimi)');
  }

  for (const b of [
    {
      isbn: '978-0099590088',
      title: 'Sapiens: A Brief History',
      author: 'Y. N. Harari',
      category: 'History & Geography',
      totalCopies: 6,
      availableCopies: 6,
    },
    {
      isbn: '978-0262046305',
      title: 'Introduction to Algorithms',
      author: 'T. Cormen',
      category: 'Computer Science',
      totalCopies: 3,
      availableCopies: 3,
    },
    {
      isbn: '978-0141439518',
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      category: 'Literature',
      totalCopies: 5,
      availableCopies: 5,
    },
  ])
    await Book.updateOne({ isbn: b.isbn }, { $setOnInsert: b }, { upsert: true });
  logger.info('Seeded library books: 3');

  await Vehicle.updateOne(
    { regNumber: 'DXB-4412' },
    {
      $setOnInsert: {
        regNumber: 'DXB-4412',
        capacity: 42,
        driverName: 'Saeed Al Marri',
        driverPhone: '+971 50 221 4471',
      },
    },
    { upsert: true },
  );
  const bus = await Vehicle.findOne({ regNumber: 'DXB-4412' });
  if (bus) {
    await Route.updateOne(
      { name: 'Route 1 · Jumeirah' },
      {
        $setOnInsert: {
          name: 'Route 1 · Jumeirah',
          vehicle: bus._id,
          stops: [{ name: 'Jumeirah Beach Rd' }, { name: 'Umm Suqeim' }, { name: 'Al Wasl' }],
        },
      },
      { upsert: true },
    );
  }
  logger.info('Seeded transport: 1 vehicle, 1 route');

  for (const i of [
    {
      name: 'Student Laptops (Dell)',
      sku: 'INV-1001',
      category: 'IT',
      quantityOnHand: 312,
      reorderLevel: 300,
      unitCost: 1850,
    },
    {
      name: 'Whiteboard markers',
      sku: 'INV-2044',
      category: 'Stationery',
      quantityOnHand: 120,
      reorderLevel: 30,
      unitCost: 2.5,
    },
    {
      name: 'Science lab goggles',
      sku: 'INV-3120',
      category: 'Lab',
      quantityOnHand: 80,
      reorderLevel: 40,
      unitCost: 14,
    },
  ])
    await InventoryItem.updateOne({ sku: i.sku }, { $setOnInsert: i }, { upsert: true });
  logger.info('Seeded inventory items: 3');

  if (adminUserId) {
    for (const e of [
      {
        title: 'Term 2 Unit Test 3 — Grade 10',
        description: '08:00 · All Grade 10 sections',
        date: new Date('2026-09-16'),
        audience: 'Students',
        createdBy: adminUserId,
      },
      {
        title: 'Parent–Teacher Conference',
        description: 'Grades 6–12, bookings via Parent portal',
        date: new Date('2026-09-21'),
        audience: 'Parents',
        createdBy: adminUserId,
      },
    ])
      await Event.updateOne({ title: e.title }, { $setOnInsert: e }, { upsert: true });
    for (const a of [
      {
        title: 'Parent–Teacher Conference · Term 1',
        body: 'PTC for Grades 6–12 is scheduled for Saturday 21 September. Booking opens Tuesday in the Parent portal.',
        audience: 'Parents',
        pinned: true,
        publishedBy: adminUserId,
      },
      {
        title: 'Winter uniform reminder',
        body: 'Winter uniform starts Monday for all grades.',
        audience: 'All',
        pinned: false,
        publishedBy: adminUserId,
      },
    ])
      await Announcement.updateOne({ title: a.title }, { $setOnInsert: a }, { upsert: true });
    logger.info('Seeded events: 2, announcements: 2');
  }

  for (const r of [
    { roomNumber: 'FB-101', block: 'Falcon Block (Boys)', capacity: 4 },
    { roomNumber: 'OB-201', block: 'Oryx Block (Girls)', capacity: 4 },
  ])
    await HostelRoom.updateOne({ roomNumber: r.roomNumber }, { $setOnInsert: r }, { upsert: true });

  for (const f of [
    { name: 'Main Auditorium', type: 'Hall', capacity: 400 },
    { name: 'Science Lab 1', type: 'Lab', capacity: 30 },
  ])
    await Facility.updateOne({ name: f.name }, { $setOnInsert: f }, { upsert: true });
  logger.info('Seeded hostel rooms: 2, facilities: 2');

  if (teacherUserId) {
    await Ticket.updateOne(
      { subject: 'Projector not working — Room 204' },
      {
        $setOnInsert: {
          raisedBy: teacherUserId,
          category: 'IT',
          subject: 'Projector not working — Room 204',
          description: 'The projector will not power on since this morning.',
          priority: 'High',
          status: 'Open',
        },
      },
      { upsert: true },
    );
    logger.info('Seeded helpdesk tickets: 1');
  }

  logger.info(
    `Seed complete. All seeded users share the password: ${SEED_PASSWORD} (demo only - rotate before any shared/staging use).`,
  );
  await disconnectDb();
}

run().catch((err) => {
  logger.error({ err }, 'Seed script failed');
  process.exit(1);
});
