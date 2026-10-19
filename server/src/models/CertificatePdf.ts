import { Document, model, Schema, Types } from 'mongoose';
export interface ICertificatePdf extends Document {
  _id: Types.ObjectId;
  certificate: Types.ObjectId;
  content: Buffer;
  sha256: string;
  signed: boolean;
  signerFingerprint?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const schema = new Schema<ICertificatePdf>(
  {
    certificate: { type: Schema.Types.ObjectId, ref: 'Certificate', required: true },
    content: { type: Buffer, required: true, select: false },
    sha256: { type: String, required: true },
    signed: { type: Boolean, required: true },
    signerFingerprint: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);
schema.index({ certificate: 1, signed: 1 }, { unique: true });
export const CertificatePdf = model<ICertificatePdf>('CertificatePdf', schema);
