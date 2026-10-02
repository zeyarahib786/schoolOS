/** Pure inclusive day count: a leave from Monday to Monday is 1 day, Monday to Wednesday is 3.
 * Computed on calendar dates (time-of-day stripped via UTC date components) so a request sent
 * at 23:59 doesn't count differently from one sent at 00:01. Returns 0 for an inverted range -
 * the validation layer rejects that case with a clear message before this is ever stored. */
export function inclusiveLeaveDays(fromDate: Date, toDate: Date): number {
  const from = Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate());
  const to = Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), toDate.getUTCDate());
  if (to < from) return 0;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((to - from) / MS_PER_DAY) + 1;
}
