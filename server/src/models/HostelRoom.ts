import { Schema, model, Document, Types } from 'mongoose';

export interface IHostelRoom extends Document {
  _id: Types.ObjectId;
  status: 'Available' | 'Unavailable';
  archived: boolean;
  genderPolicy: 'Any' | 'Male' | 'Female';
  warden: string;
  wardenPhone: string;
  allocations: Array<{ student: Types.ObjectId; bedLabel: string; allocatedAt: Date }>;
  history: Array<{ at: Date; actor: Types.ObjectId; action: string; reason?: string; student?: Types.ObjectId }>;
  roomNumber: string;
  block: string;
  capacity: number;
  occupants: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const hostelRoomSchema = new Schema<IHostelRoom>(
  {
    status: { type: String, enum: ['Available', 'Unavailable'], default: 'Available' },
    archived: { type: Boolean, default: false },
    genderPolicy: { type: String, enum: ['Any', 'Male', 'Female'], default: 'Any' },
    warden: { type: String, default: '', maxlength: 120 },
    wardenPhone: { type: String, default: '', maxlength: 30 },
    allocations: [
      { _id: false, student: { type: Schema.Types.ObjectId, ref: 'Student' }, bedLabel: String, allocatedAt: Date },
    ],
    history: [
      {
        _id: false,
        at: Date,
        actor: { type: Schema.Types.ObjectId, ref: 'User' },
        action: String,
        reason: String,
        student: { type: Schema.Types.ObjectId, ref: 'Student' },
      },
    ],
    roomNumber: { type: String, required: true, trim: true },
    block: { type: String, required: true, trim: true, index: true },
    capacity: { type: Number, required: true, min: 1 },
    occupants: [{ type: Schema.Types.ObjectId, ref: 'Student', index: true }],
  },
  { timestamps: true },
);

hostelRoomSchema.index({ block: 1, roomNumber: 1 }, { unique: true });

export const HostelRoom = model<IHostelRoom>('HostelRoom', hostelRoomSchema);
