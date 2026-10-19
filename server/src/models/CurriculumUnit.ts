import { Schema, model, Document, Types } from 'mongoose';

/** Curriculum content is not access-restricted the way Students/Fees/Exams are - every
 * authenticated role (including Parent/Student) can reasonably want to see what's being taught,
 * so unlike every prior module this one has no ownership-scoping layer at all - only a write-role
 * check. Simpler by design, not by omission. */
export interface ICurriculumUnit extends Document {
  _id: Types.ObjectId;
  grade: string;
  academicYear: string;
  archived: boolean;
  history: Array<{
    at: Date;
    actor: Types.ObjectId;
    reason: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  }>;
  subject: string;
  term: string;
  title: string;
  outcomes: string;
  sequenceOrder: number;
  plannedDate?: Date;
  completedDate?: Date | null;
  framework: string;
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

const curriculumUnitSchema = new Schema<ICurriculumUnit>(
  {
    grade: { type: String, default: 'All grades', required: true, maxlength: 60 },
    academicYear: { type: String, default: 'Legacy', required: true },
    archived: { type: Boolean, default: false, index: true },
    history: [
      {
        _id: false,
        at: Date,
        actor: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: { type: String, maxlength: 500 },
        before: Schema.Types.Mixed,
        after: Schema.Types.Mixed,
      },
    ],
    subject: { type: String, required: true, trim: true, index: true },
    term: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    outcomes: { type: String, required: true, trim: true, maxlength: 2000 },
    sequenceOrder: { type: Number, required: true, min: 0, default: 0 },
    plannedDate: { type: Date },
    completedDate: { type: Date, default: null },
    framework: { type: String, required: true, trim: true, maxlength: 120, default: 'School-defined' },
    owner: { type: String, required: true, trim: true, maxlength: 120, default: 'Subject coordinator' },
  },
  { timestamps: true },
);

curriculumUnitSchema.index({ subject: 1, sequenceOrder: 1 });
curriculumUnitSchema.index(
  { subject: 1, term: 1, title: 1, grade: 1, academicYear: 1 },
  { name: 'curriculum_scope_unique', unique: true, collation: { locale: 'en', strength: 2 } },
);
curriculumUnitSchema.index({ title: 'text', outcomes: 'text' });

export const CurriculumUnit = model<ICurriculumUnit>('CurriculumUnit', curriculumUnitSchema);
