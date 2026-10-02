import { Schema, model, Document, Types } from 'mongoose';

export interface IHostelRoom extends Document {
  _id: Types.ObjectId;
  roomNumber: string;
  block: string;
  capacity: number;
  occupants: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const hostelRoomSchema = new Schema<IHostelRoom>(
  {
    roomNumber: { type: String, required: true, trim: true },
    block: { type: String, required: true, trim: true, index: true },
    capacity: { type: Number, required: true, min: 1 },
    occupants: [{ type: Schema.Types.ObjectId, ref: 'Student', index: true }],
  },
  { timestamps: true },
);

hostelRoomSchema.index({ block: 1, roomNumber: 1 }, { unique: true });

export const HostelRoom = model<IHostelRoom>('HostelRoom', hostelRoomSchema);
