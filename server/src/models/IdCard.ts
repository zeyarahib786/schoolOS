import { Schema, model, Document, Types } from 'mongoose';

/** The first POLYMORPHIC reference in this codebase: a card belongs to EITHER a Student OR a
 * Staff member. `subjectType` holds the literal Mongoose model name and `subject` resolves
 * through `refPath` against it - one collection of cards spanning two kinds of holders, with
 * populate() still working per record. The enum values MUST exactly match the registered model
 * names ('Student', 'Staff') for refPath to resolve. */
export interface IIdCard extends Document {
  _id: Types.ObjectId;
  serial: string;
  subjectType: 'Student' | 'Staff';
  subject: Types.ObjectId;
  issuedDate: Date;
  expiryDate: Date;
  status: 'Active' | 'Lost' | 'Revoked';
  replaces?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const idCardSchema = new Schema<IIdCard>(
  {
    serial: { type: String, required: true, unique: true },
    subjectType: { type: String, enum: ['Student', 'Staff'], required: true },
    subject: { type: Schema.Types.ObjectId, required: true, refPath: 'subjectType', index: true },
    issuedDate: { type: Date, required: true, default: Date.now },
    expiryDate: { type: Date, required: true },
    status: { type: String, enum: ['Active', 'Lost', 'Revoked'], default: 'Active', index: true },
    replaces: { type: Schema.Types.ObjectId, ref: 'IdCard', default: null },
  },
  { timestamps: true },
);

// One ACTIVE card per holder - Documents' partial-unique technique, recognized and reused:
// uniqueness on (subjectType, subject) applies only to Active cards, so a holder's full history
// of Lost/Revoked cards coexists while a second concurrent Active issuance is rejected.
idCardSchema.index({ subjectType: 1, subject: 1 }, { unique: true, partialFilterExpression: { status: 'Active' } });

export const IdCard = model<IIdCard>('IdCard', idCardSchema);
