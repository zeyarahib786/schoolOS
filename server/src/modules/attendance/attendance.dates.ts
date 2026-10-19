import { DEFAULT_SETTINGS, SchoolSettings, SETTINGS_ID } from '../../models/SchoolSettings';

/** A school calendar day, stored as UTC midnight independently of server timezone. */
export function calendarDate(value: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export async function schoolToday(): Promise<string> {
  const settings = await SchoolSettings.findById(SETTINGS_ID).select('timezone');
  return calendarDate(new Date(), settings?.timezone || DEFAULT_SETTINGS.timezone);
}
