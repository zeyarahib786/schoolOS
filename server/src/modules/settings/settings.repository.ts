import { ApiError } from '../../utils/ApiError';
import { SchoolSettings, ISchoolSettings, SETTINGS_ID, DEFAULT_SETTINGS } from '../../models/SchoolSettings';
import { UpdateSettingsInput } from './settings.validation';

export async function getSettings(): Promise<ISchoolSettings | typeof DEFAULT_SETTINGS> {
  const settings = await SchoolSettings.findById(SETTINGS_ID);
  return settings ?? DEFAULT_SETTINGS;
}

/** Upsert against the fixed _id: the first save creates the singleton, every later save
 * overwrites it - there can never be a second settings document. */
export async function saveSettings(input: UpdateSettingsInput): Promise<ISchoolSettings> {
  const { expectedRevision, ...fields } = input;
  const filter = {
    _id: SETTINGS_ID,
    ...(expectedRevision !== undefined
      ? { $or: [{ revision: expectedRevision }, ...(expectedRevision === 0 ? [{ revision: { $exists: false } }] : [])] }
      : {}),
  };
  const saved = await SchoolSettings.findOneAndUpdate(
    filter,
    { $set: { ...fields, currency: input.currency.toUpperCase() }, $inc: { revision: 1 } },
    {
      new: true,
      upsert: expectedRevision === undefined || expectedRevision === 0,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).catch((error) => {
    if (error.code === 11000) throw ApiError.conflict('Settings changed; refresh before saving');
    throw error;
  });
  if (!saved) throw ApiError.conflict('Settings changed; refresh before saving');
  return saved;
}
