import { Document, Schema, model } from 'mongoose';
import { ACCESS_MODULES, AccessModule } from '../modules/roles/roles.constants';

export interface IAccessRole extends Document {
  key: string;
  name: string;
  description: string;
  basedOn?: string | null;
  isSystem: boolean;
  permissions: Map<AccessModule, boolean>;
  history: { at: Date; by: string; module: string; enabled: boolean; reason: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const accessRoleSchema = new Schema<IAccessRole>(
  {
    history: [{ at: Date, by: String, module: String, enabled: Boolean, reason: String }],
    key: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    basedOn: { type: String, trim: true, maxlength: 80, default: null },
    isSystem: { type: Boolean, required: true, default: false, index: true },
    permissions: {
      type: Map,
      of: Boolean,
      required: true,
      validate: {
        validator(value: Map<string, boolean>) {
          return ACCESS_MODULES.every((moduleName) => value.has(moduleName));
        },
        message: 'Every governed module must have an explicit permission',
      },
    },
  },
  { timestamps: true, toJSON: { flattenMaps: true }, toObject: { flattenMaps: true } },
);

export const AccessRole = model<IAccessRole>('AccessRole', accessRoleSchema);
