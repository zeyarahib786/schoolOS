import { Schema, model, Document, Types } from 'mongoose';

/** Created exclusively by graduating an active Student (see alumni.service.ts's graduate()) -
 * there is no standalone "create an alumni profile from scratch" path, since every alumnus in
 * this system genuinely was a student here. `student` is a real reference to the same Student
 * document whose `status` field gets flipped to 'Alumni' in the same operation, not a disconnected
 * copy - the two records stay linked. */
export interface IAlumniProfile extends Document {
  _id: Types.ObjectId;
  student: Types.ObjectId;
  graduationYear: number;
  currentEmployer?: string;
  contactEmail?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const alumniProfileSchema = new Schema<IAlumniProfile>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
    graduationYear: { type: Number, required: true, min: 1990, max: 2100 },
    currentEmployer: { type: String, trim: true, maxlength: 200 },
    contactEmail: { type: String, trim: true, lowercase: true },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

export const AlumniProfile = model<IAlumniProfile>('AlumniProfile', alumniProfileSchema);
