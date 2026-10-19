import { Schema, model, Document, Types } from 'mongoose';

/** `assignedStudents` is a direct array on Route (rather than a separate join collection) since
 * the access pattern is always "who's on this route" or "which route is this student on" - both
 * cheap with a small array and an index, and simpler than a join collection would be for a
 * relationship of this size (a route has dozens of students, not thousands). */
export interface IRoute extends Document {
  _id: Types.ObjectId;
  archived: boolean;
  studentStops: Array<{ student: Types.ObjectId; stopName: string }>;
  history: Array<{
    at: Date;
    actor: Types.ObjectId;
    action: string;
    reason?: string;
    student?: Types.ObjectId;
    status?: string;
  }>;
  name: string;
  vehicle: Types.ObjectId;
  stops: Array<{ name: string; address?: string; pincode?: string; time?: string; lat?: number; lng?: number }>;
  assignedStudents: Types.ObjectId[];
  status: 'Depot' | 'On road' | 'Delayed';
  onTimePct: number;
  gpsId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const routeSchema = new Schema<IRoute>(
  {
    archived: { type: Boolean, default: false, index: true },
    studentStops: [{ _id: false, student: { type: Schema.Types.ObjectId, ref: 'Student' }, stopName: String }],
    history: [
      {
        _id: false,
        at: Date,
        actor: { type: Schema.Types.ObjectId, ref: 'User' },
        action: String,
        reason: String,
        student: { type: Schema.Types.ObjectId, ref: 'Student' },
        status: String,
      },
    ],
    name: { type: String, required: true, trim: true, unique: true },
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    stops: {
      type: [
        new Schema(
          {
            name: { type: String, required: true, trim: true },
            address: { type: String, trim: true },
            pincode: { type: String, trim: true },
            time: { type: String, trim: true },
            lat: { type: Number },
            lng: { type: Number },
          },
          { _id: false },
        ),
      ],
      required: true,
      validate: { validator: (v: string[]) => v.length > 0, message: 'A route needs at least one stop' },
    },
    assignedStudents: [{ type: Schema.Types.ObjectId, ref: 'Student', index: true }],
    status: { type: String, enum: ['Depot', 'On road', 'Delayed'], default: 'Depot', index: true },
    onTimePct: { type: Number, min: 0, max: 100, default: 100 },
    gpsId: { type: String, trim: true, maxlength: 60 },
  },
  { timestamps: true },
);

export const Route = model<IRoute>('Route', routeSchema);
