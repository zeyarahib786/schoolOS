import { Schema, model, Document, Types } from 'mongoose';

/** Curriculum content is not access-restricted the way Students/Fees/Exams are - every
 * authenticated role (including Parent/Student) can reasonably want to see what's being taught,
 * so unlike every prior module this one has no ownership-scoping layer at all - only a write-role
 * check. Simpler by design, not by omission. */
export interface ICurriculumUnit extends Document {
  _id: Types.ObjectId;
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
  { subject: 1, term: 1, title: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);
curriculumUnitSchema.index({ title: 'text', outcomes: 'text' });

export const CurriculumUnit = model<ICurriculumUnit>('CurriculumUnit', curriculumUnitSchema);
