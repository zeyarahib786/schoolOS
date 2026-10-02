import { Document, model, Schema, Types } from 'mongoose';

export const CLASS_STREAMS = ['Foundation', 'Primary', 'General', 'Commerce', 'Science', 'Arts'] as const;

export interface IClassSection extends Document {
  _id: Types.ObjectId;
  grade: string;
  section: string;
  stream: (typeof CLASS_STREAMS)[number];
  teacherStaffId?: Types.ObjectId;
  representativeStudentId?: Types.ObjectId;
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
}

const classSectionSchema = new Schema<IClassSection>(
  {
    grade: { type: String, required: true, trim: true, maxlength: 30 },
    section: { type: String, required: true, trim: true, uppercase: true, maxlength: 3 },
    stream: { type: String, enum: CLASS_STREAMS, required: true, default: 'General', index: true },
    teacherStaffId: { type: Schema.Types.ObjectId, ref: 'Staff', index: true },
    representativeStudentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    capacity: { type: Number, required: true, min: 1, max: 100, default: 30 },
  },
  { timestamps: true },
);

classSectionSchema.index(
  { grade: 1, section: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);

export const ClassSection = model<IClassSection>('ClassSection', classSectionSchema);
