import { Schema, model, Document, Types } from 'mongoose';

/** A versioned document registry entry. Every version of a document is its own record sharing a
 * `code` (e.g. POL-001); exactly one version per code carries `isCurrent: true`. That invariant
 * is enforced at the DATABASE layer with a partial unique index - a technique not used anywhere
 * else in this codebase: the index applies only to documents matching `isCurrent: true`, so any
 * number of superseded versions of the same code can coexist while a second concurrent "current"
 * insert is physically rejected with a duplicate-key error. Model name is SchoolDocument (not
 * Document) to avoid shadowing Mongoose's own Document type. */
export interface ISchoolDocument extends Document {
  _id: Types.ObjectId;
  code: string;
  title: string;
  category: 'Policy' | 'Form' | 'Circular' | 'Guideline';
  version: number;
  description: string;
  isCurrent: boolean;
  publishedBy: Types.ObjectId;
  fileId?: Types.ObjectId;
  filename?: string;
  contentType?: string;
  size?: number;
  createdAt: Date;
  updatedAt: Date;
}

const schoolDocumentSchema = new Schema<ISchoolDocument>(
  {
    code: { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, enum: ['Policy', 'Form', 'Circular', 'Guideline'], required: true, index: true },
    version: { type: Number, required: true, min: 1 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    isCurrent: { type: Boolean, required: true, default: true },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileId: { type: Schema.Types.ObjectId },
    filename: { type: String, maxlength: 180 },
    contentType: { type: String },
    size: { type: Number, min: 1 },
  },
  { timestamps: true },
);

// THE PARTIAL UNIQUE INDEX: uniqueness on `code` applies ONLY to records with isCurrent true.
// Superseded versions of the same code coexist freely; two concurrent attempts to be "the
// current version" of one code cannot both land - the second gets a real 11000.
schoolDocumentSchema.index({ code: 1 }, { unique: true, partialFilterExpression: { isCurrent: true } });

// A (code, version) pair is also unique outright - version numbers never repeat within a code.
schoolDocumentSchema.index({ code: 1, version: 1 }, { unique: true });

export const SchoolDocument = model<ISchoolDocument>('SchoolDocument', schoolDocumentSchema);
