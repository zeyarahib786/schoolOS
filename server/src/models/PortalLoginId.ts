import { Schema, model } from 'mongoose';
// Permanent issuance ledger: deleting a school record/account must never recycle its login ID.
const schema = new Schema(
  {
    loginId: { type: String, required: true, unique: true },
    recordKind: { type: String, required: true, enum: ['Student', 'Staff', 'Guardian'] },
    recordId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);
export const PortalLoginId = model('PortalLoginId', schema);
