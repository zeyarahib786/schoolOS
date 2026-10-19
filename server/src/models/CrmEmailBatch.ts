import { model, Schema } from 'mongoose';
// Records a batch request identity; individual delivery jobs hold message content and status.
export const CrmEmailBatch = model(
  'CrmEmailBatch',
  new Schema(
    {
      requestKey: { type: String, required: true, unique: true },
      fingerprint: { type: String, required: true },
      sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true },
  ),
);
