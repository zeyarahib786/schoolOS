import { Schema, model, Document, Types } from 'mongoose';

/** Unlike every prior module, this one has NO ownership scoping at all in either direction -
 * not "open to everyone" like Curriculum, and not "Parent scoped" like Attendance. It's an
 * internal security/front-desk log: visible only to staff roles, with no student-linked
 * visibility concept at all, since a visitor log entry isn't "about" any particular student's
 * guardian the way an academic or medical record is. */
export interface IVisitorLog extends Document {
  _id: Types.ObjectId;
  visitorName: string;
  purpose: string;
  hostName: string;
  checkedInAt: Date;
  checkedOutAt?: Date;
  status: 'CheckedIn' | 'CheckedOut';
  checkedInBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const visitorLogSchema = new Schema<IVisitorLog>(
  {
    visitorName: { type: String, required: true, trim: true, maxlength: 160 },
    purpose: { type: String, required: true, trim: true, maxlength: 300 },
    hostName: { type: String, required: true, trim: true, maxlength: 160 },
    checkedInAt: { type: Date, required: true, default: Date.now },
    checkedOutAt: { type: Date },
    status: { type: String, enum: ['CheckedIn', 'CheckedOut'], default: 'CheckedIn', index: true },
    checkedInBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const VisitorLog = model<IVisitorLog>('VisitorLog', visitorLogSchema);
