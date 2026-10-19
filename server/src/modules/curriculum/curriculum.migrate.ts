import mongoose from 'mongoose';
import { CurriculumUnit } from '../../models/CurriculumUnit';
/** Run with curriculum writes paused. Missing historical scope stays explicitly Legacy. */
export async function migrateCurriculumScope(apply = false) {
  const collection = CurriculumUnit.collection;
  const missingGrade = await collection.countDocuments({ grade: { $exists: false } }),
    missingYear = await collection.countDocuments({ academicYear: { $exists: false } });
  const indexes = await collection.indexes();
  const obsolete = indexes.filter(
    (index) => index.unique && JSON.stringify(index.key) === JSON.stringify({ subject: 1, term: 1, title: 1 }),
  );
  if (!apply) return { apply: false, missingGrade, missingYear, obsoleteIndexes: obsolete.map((index) => index.name) };
  await collection.updateMany({ grade: { $exists: false } }, { $set: { grade: 'All grades' } });
  await collection.updateMany({ academicYear: { $exists: false } }, { $set: { academicYear: 'Legacy' } });
  // Install the stricter scoped constraint before removing the obsolete cross-grade constraint.
  await collection.createIndex(
    { subject: 1, term: 1, title: 1, grade: 1, academicYear: 1 },
    { name: 'curriculum_scope_unique', unique: true, collation: { locale: 'en', strength: 2 } },
  );
  for (const index of obsolete) if (index.name) await collection.dropIndex(index.name);
  return { apply: true, missingGrade, missingYear, removedIndexes: obsolete.map((index) => index.name) };
}
if (require.main === module) {
  (async () => {
    if (!process.env.MONGO_URI) throw Error('Provide MONGO_URI through the server environment');
    try {
      await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
      process.stdout.write(JSON.stringify(await migrateCurriculumScope(process.argv.includes('--apply'))) + '\n');
    } finally {
      await mongoose.disconnect();
    }
  })().catch(() => {
    console.error(
      'Curriculum scope migration failed; inspect database/index readiness. No connection secret is printed.',
    );
    process.exitCode = 1;
  });
}
