import { SchoolSettings, ISchoolSettings, SETTINGS_ID, DEFAULT_SETTINGS } from '../../models/SchoolSettings';
import { UpdateSettingsInput } from './settings.validation';

export async function getSettings(): Promise<ISchoolSettings | typeof DEFAULT_SETTINGS> {
  const settings = await SchoolSettings.findById(SETTINGS_ID);
  return settings ?? DEFAULT_SETTINGS;
}

/** Upsert against the fixed _id: the first save creates the singleton, every later save
 * overwrites it - there can never be a second settings document. */
export function saveSettings(input: UpdateSettingsInput): Promise<ISchoolSettings> {
  return SchoolSettings.findByIdAndUpdate(
    SETTINGS_ID,
    { ...input, currency: input.currency.toUpperCase() },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}
