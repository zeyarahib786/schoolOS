import { Schema, model, Document } from 'mongoose';

/** The first SINGLETON document in this codebase: exactly one settings record exists, enforced
 * by a fixed string _id (the same string-_id technique the Counter model uses, applied to
 * "there is exactly one of this thing" rather than "one counter per key space"). All writes are
 * an upsert against that fixed _id - there is no create endpoint, no list, no id parameter
 * anywhere in the module's API. */
export const SETTINGS_ID = 'school-settings';

export interface ISchoolSettings extends Document<string> {
  _id: string;
  schoolName: string;
  academicYear: string;
  timezone: string;
  currency: string;
  defaultAnnualLeave: number;
  license: string;
  principal: string;
  address: string;
  disabledModules: string[];
  updatedAt: Date;
  createdAt: Date;
}

const schoolSettingsSchema = new Schema<ISchoolSettings>(
  {
    _id: { type: String, required: true },
    schoolName: { type: String, required: true, trim: true, maxlength: 160 },
    academicYear: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{4}-\d{4}$/, 'academicYear must look like 2026-2027'],
    },
    timezone: { type: String, required: true, trim: true, maxlength: 60 },
    currency: { type: String, required: true, trim: true, uppercase: true, length: 3 },
    defaultAnnualLeave: { type: Number, required: true, min: 0, max: 365 },
    license: { type: String, trim: true, maxlength: 120, default: '' },
    principal: { type: String, trim: true, maxlength: 160, default: '' },
    address: { type: String, trim: true, maxlength: 500, default: '' },
    disabledModules: { type: [String], default: ['hostel', 'visitors', 'cafeteria'] },
  },
  { timestamps: true },
);

export const SchoolSettings = model<ISchoolSettings>('SchoolSettings', schoolSettingsSchema);

/** What GET returns before anyone has ever saved settings - honest, clearly-default values
 * rather than a 404 that every client would have to special-case. */
export const DEFAULT_SETTINGS = {
  _id: SETTINGS_ID,
  schoolName: 'Al Noor International School',
  academicYear: '2026-2027',
  timezone: 'Asia/Dubai',
  currency: 'AED',
  defaultAnnualLeave: 30,
  license: '',
  principal: '',
  address: '',
  disabledModules: ['hostel', 'visitors', 'cafeteria'],
};
