import { Schema, model, Document, Types } from 'mongoose';

/** Unlike every prior module, ticket CREATION is open to every authenticated role, including
 * Parent and Student - anyone in the school community should be able to raise an IT/facilities
 * issue. Only resolution (assign/resolve/close) is role-gated. See ticket.state-machine.ts for
 * the valid status transitions - enforced there, not left to whatever the client happens to send. */
export interface ITicket extends Document {
  _id: Types.ObjectId;
  raisedBy: Types.ObjectId;
  category: string;
  subject: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'Assigned' | 'Resolved' | 'Closed';
  assignedTo?: Types.ObjectId;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
    status: { type: String, enum: ['Open', 'Assigned', 'Resolved', 'Closed'], default: 'Open', index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Staff' },
    resolutionNotes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true },
);

export const Ticket = model<ITicket>('Ticket', ticketSchema);
