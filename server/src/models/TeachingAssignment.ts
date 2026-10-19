import { model, Schema } from 'mongoose';
const schema = new Schema(
  {
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classSection: { type: Schema.Types.ObjectId, ref: 'ClassSection', required: true },
    grade: { type: String, required: true },
    subject: { type: String, required: true, trim: true, maxlength: 80 },
    academicYear: { type: String, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
schema.index({ teacher: 1, classSection: 1, subject: 1, academicYear: 1 }, { unique: true });
export const TeachingAssignment = model('TeachingAssignment', schema);
