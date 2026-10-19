import { Schema, model, Document, Types } from 'mongoose';

export interface ISubmission extends Document {
  _id: Types.ObjectId;
  assignment: Types.ObjectId;
  student: Types.ObjectId;
  answers: Array<{ questionId: string; value: string }>;
  objectiveScore?: number;
  content: string;
  submittedAt: Date;
  isLate: boolean;
  gradedBy?: Types.ObjectId;
  gradedAt?: Date;
  gradeHistory: Array<{
    at: Date;
    actor: Types.ObjectId;
    reason: string;
    previousScore?: number;
    score: number;
    feedback?: string;
  }>;
  score?: number;
  feedback?: string;
  status: 'Submitted' | 'Graded';
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    answers: { type: [{ _id: false, questionId: String, value: String }], default: [] },
    objectiveScore: Number,
    content: { type: String, required: true, trim: true, maxlength: 40000 },
    submittedAt: { type: Date, required: true, default: Date.now },
    isLate: { type: Boolean, required: true, default: false },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    gradedAt: Date,
    gradeHistory: [
      {
        _id: false,
        at: Date,
        actor: { type: Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        previousScore: Number,
        score: Number,
        feedback: String,
      },
    ],
    score: { type: Number, min: 0 },
    feedback: { type: String, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['Submitted', 'Graded'], default: 'Submitted', index: true },
  },
  { timestamps: true },
);

// One submission per student per assignment - matching Certificates/Attendance's exact-match
// uniqueness pattern; a student resubmitting isn't supported at this stage (a real "allow
// resubmission before the deadline" feature would need explicit product sign-off on the rule,
// not a default assumption baked in silently).
submissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

export const Submission = model<ISubmission>('Submission', submissionSchema);
