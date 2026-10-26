/** Explicit development-data consolidation; preserves IDs, account links and historical snapshots. */
import mongoose from 'mongoose';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { connectDb, disconnectDb } from '../config/db';
import { logger } from '../utils/logger';

type DbRecord = mongoose.mongo.Document;

const scopes: Record<string, string[]> = {
  students: ['grade'],
  teachingassignments: ['grade'],
  assignments: ['grade'],
  courses: ['grade'],
  curriculumunits: ['grade'],
  timetableslots: ['grade'],
  parentbroadcasts: ['grade'],
  crmleads: ['grade'],
  admissionapplications: ['gradeAppliedFor'],
  feeheads: ['appliesTo'],
  teacheraidrafts: ['request.grade'],
};
export function sectionA(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  const match = value.match(/^(KG\s*[12]|Grade\s*\d{1,2})\s*[·.-]\s*([A-Z])$/i);
  if (!match || match[2].toUpperCase() === 'A') return;
  const base = match[1]
    .replace(/\s+/g, ' ')
    .replace(/^grade/i, 'Grade')
    .replace(/^kg/i, 'KG');
  return base + ' · A';
}
function valueAt(row: DbRecord, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((value, key) => (value && typeof value === 'object' ? (value as DbRecord)[key] : undefined), row);
}
export async function mergeSectionsToA(apply = false) {
  if (process.env.NODE_ENV === 'production') throw new Error('Section consolidation is disabled in production');
  const db = mongoose.connection.db!;
  const collections = new Set((await db.listCollections().toArray()).map((c) => c.name));
  const names = ['classsections', ...Object.keys(scopes)].filter((name) => collections.has(name));
  const snapshot: Record<string, DbRecord[]> = {};
  for (const name of names) snapshot[name] = await db.collection(name).find({}).toArray();
  const admin = await db
    .collection('users')
    .findOne({ role: 'Administrator', isActive: true }, { projection: { _id: 1 } });
  if (!admin) throw new Error('An active Administrator is required');
  const sections = snapshot.classsections || [];
  const retired = sections.filter((s) => s.section !== 'A');
  const sectionIds = new Map<string, mongoose.Types.ObjectId>();
  for (const old of retired) {
    const target = sections.find((s) => s.grade === old.grade && s.section === 'A');
    if (!target || target.status !== 'Active')
      throw new Error('Create an active section A for ' + old.grade + ' first');
    sectionIds.set(String(old._id), target._id);
  }
  const assignments = snapshot.teachingassignments || [];
  const mappingIds = new Map<string, mongoose.Types.ObjectId>();
  const retained: DbRecord[] = [];
  // Prefer existing target records so their public IDs and AI references remain stable.
  const ordered = [...assignments].sort(
    (a, b) => Number(sectionIds.has(String(a.classSection))) - Number(sectionIds.has(String(b.classSection))),
  );
  for (const row of ordered) {
    const classSection = sectionIds.get(String(row.classSection)) || row.classSection;
    const match = retained.find(
      (t) =>
        String(t.teacher) === String(row.teacher) &&
        String(t.classSection) === String(classSection) &&
        t.subject === row.subject &&
        t.academicYear === row.academicYear,
    );
    if (match) mappingIds.set(String(row._id), match._id);
    else retained.push({ ...row, classSection });
  }
  const changes: Array<{
    collection: string;
    id: mongoose.Types.ObjectId;
    set: DbRecord;
    history?: DbRecord;
    expectedUpdatedAt?: Date;
  }> = [];
  const rolls = new Map<string, Set<string>>();
  for (const row of snapshot.students || [])
    if (!sectionA(row.grade)) {
      const used = rolls.get(row.grade) || new Set<string>();
      used.add(String(row.roll).padStart(3, '0'));
      rolls.set(row.grade, used);
    }
  for (const [collection, paths] of Object.entries(scopes))
    for (const row of snapshot[collection] || []) {
      if (collection === 'teachingassignments' && mappingIds.has(String(row._id))) continue;
      const set: DbRecord = {};
      for (const path of paths) {
        const next = sectionA(valueAt(row, path));
        if (next) set[path] = next;
      }
      if (collection === 'teachingassignments' && sectionIds.has(String(row.classSection)))
        set.classSection = sectionIds.get(String(row.classSection));
      let history;
      if (collection === 'students' && set.grade) {
        const used = rolls.get(set.grade) || new Set<string>();
        if (used.has(String(row.roll).padStart(3, '0'))) {
          let n = 1;
          while (used.has(String(n).padStart(3, '0'))) n++;
          set.roll = String(n);
        }
        used.add(String(set.roll || row.roll).padStart(3, '0'));
        rolls.set(set.grade, used);
        history = {
          from: row.grade,
          to: set.grade,
          reason: 'Consolidated local test sections into A',
          effectiveDate: new Date(),
          changedAt: new Date(),
          changedBy: admin._id,
        };
      }
      if (Object.keys(set).length)
        changes.push({ collection, id: row._id, set, history, expectedUpdatedAt: row.updatedAt });
    }
  // Abort on incompatible unique scopes rather than dropping coursework or timetables.
  for (const [collection, fields] of Object.entries({
    timetableslots: ['grade', 'dayOfWeek', 'periodNumber'],
    curriculumunits: ['subject', 'term', 'title', 'grade', 'academicYear'],
    assignments: ['batchKey', 'grade'],
  })) {
    const seen = new Set<string>();
    for (const row of snapshot[collection] || []) {
      if (collection === 'assignments' && typeof row.batchKey !== 'string') continue;
      const set = changes.find((c) => c.collection === collection && String(c.id) === String(row._id))?.set || {};
      const key = JSON.stringify(fields.map((f) => String(set[f] ?? row[f] ?? '').toLowerCase()));
      if (seen.has(key)) throw new Error('Conflicting ' + collection + ' records need review before merging');
      seen.add(key);
    }
  }
  const summary = {
    studentsMoved: changes.filter((c) => c.collection === 'students').length,
    rollsAdjusted: changes.filter((c) => c.collection === 'students' && c.set.roll).length,
    sectionsRemoved: retired.length,
    duplicateTeachingMappingsMerged: mappingIds.size,
    updatedCollections: changes.reduce<Record<string, number>>(
      (a, c) => ((a[c.collection] = (a[c.collection] || 0) + 1), a),
      {},
    ),
  };
  if (!apply) return summary;
  const backup = '/tmp/schoolos-section-merge-' + Date.now();
  await mkdir(backup, { mode: 0o700 });
  await writeFile(join(backup, 'before.json'), mongoose.mongo.BSON.EJSON.stringify(snapshot), { mode: 0o600 });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const change of changes) {
        const result = await db.collection<{ _id: mongoose.Types.ObjectId; updatedAt?: Date; enrollmentHistory?: DbRecord[] }>(change.collection).updateOne(
          { _id: change.id, updatedAt: change.expectedUpdatedAt },
          {
            $set: { ...change.set, updatedAt: new Date() },
            ...(change.history ? { $push: { enrollmentHistory: change.history } } : {}),
          },
          { session },
        );
        if (result.matchedCount !== 1) throw new Error('A record changed while consolidating; retry after refreshing');
      }
      for (const [oldId, targetId] of mappingIds) {
        const old = assignments.find((t) => String(t._id) === oldId)!;
        if (old.active)
          await db
            .collection('teachingassignments')
            .updateOne({ _id: targetId }, { $set: { active: true } }, { session });
        await db.collection('teachingassignments').deleteOne({ _id: old._id }, { session });
      }
      for (const old of retired) await db.collection('classsections').deleteOne({ _id: old._id }, { session });
      for (const target of sections.filter((s) => s.section === 'A')) {
        const count = await db
          .collection('students')
          .countDocuments({ grade: target.grade + ' · A', status: 'Active' }, { session });
        if (count > target.capacity)
          await db
            .collection('classsections')
            .updateOne({ _id: target._id }, { $set: { capacity: count, updatedAt: new Date() } }, { session });
      }
      await db.collection('auditlogs').insertOne(
        {
          action: 'Consolidated local test sections into A: ' + JSON.stringify(summary),
          module: 'Classes',
          performedBy: admin._id,
          severity: 'Info',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  await writeFile(join(backup, 'summary.json'), JSON.stringify(summary, null, 2), { mode: 0o600 });
  return { ...summary, backup };
}
async function main() {
  await connectDb();
  try {
    logger.info(await mergeSectionsToA(process.argv.includes('--apply')), 'Section A consolidation');
  } finally {
    await disconnectDb();
  }
}
if (require.main === module)
  main().catch((error) => {
    logger.error({ message: error.message }, 'Section merge failed');
    process.exitCode = 1;
  });
