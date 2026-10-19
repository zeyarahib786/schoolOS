import { Schema, model, Document, Types } from 'mongoose';

/** A genuinely different access pattern from every prior module: visibility is declared BY THE
 * CONTENT itself (each announcement names its audience), not derived from a relationship between
 * the requester and a student record. The read filter maps the requester's role to the set of
 * audiences they may see - see announcements.audience.ts for the pure mapping. */
export interface IAnnouncement extends Document {
  _id: Types.ObjectId;
  title: string;
  body: string;
  audience: 'All' | 'Staff' | 'Parents' | 'Students';
  status: 'Draft' | 'Pending approval' | 'Published';
  pinned: boolean;
  reviewNote: string;
  publishedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 3000 },
    audience: { type: String, enum: ['All', 'Staff', 'Parents', 'Students'], default: 'All', index: true },
    status: { type: String, enum: ['Draft', 'Pending approval', 'Published'], default: 'Published', index: true },
    reviewNote: { type: String, trim: true, maxlength: 300, default: '' },
    pinned: { type: Boolean, default: false },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export const Announcement = model<IAnnouncement>('Announcement', announcementSchema);
