import { Schema, model } from 'mongoose';

const courseSchema = new Schema(
  {
    subject: { type: String, default: 'General', maxlength: 80 },
    academicYear: { type: String, default: 'Legacy' },
    archived: { type: Boolean, default: false },
    history: [{ _id: false, at: Date, actor: { type: Schema.Types.ObjectId, ref: 'User' }, reason: String }],
    title: { type: String, required: true, trim: true, maxlength: 160 },
    teacher: { type: String, required: true, trim: true, maxlength: 120 },
    grade: { type: String, required: true, trim: true, maxlength: 60 },
    startDate: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const Course = model('Course', courseSchema);
