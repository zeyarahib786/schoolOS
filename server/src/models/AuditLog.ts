import { Schema, model, Document, Types } from 'mongoose';

/** Deliberately the only collection in this codebase with NO update or delete route exposed via
 * HTTP at all, for any role, including Administrator - an audit trail that could be edited or
 * erased by the very users it's meant to hold accountable isn't an audit trail. Entries are only
 * ever created through server-authored logAudit() calls. The export acknowledgement records
 * a fixed action for its authenticated caller; it does not accept arbitrary log text. */
export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  action: string;
  module: string;
  performedBy: Types.ObjectId;
  severity: 'Info' | 'Warning' | 'Critical';
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, trim: true, maxlength: 300 },
    module: { type: String, required: true, trim: true, index: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    severity: { type: String, enum: ['Info', 'Warning', 'Critical'], default: 'Info', index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }, // no updatedAt either - these documents never change after creation
);

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);
