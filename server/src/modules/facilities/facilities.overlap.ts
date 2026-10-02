/**
 * Pure time-range overlap check - "HH:MM" strings compare correctly as plain strings since
 * they're zero-padded and 24h, so no Date parsing is needed for this half of the logic. Two
 * ranges [aStart, aEnd) and [bStart, bEnd) overlap if aStart < bEnd AND bStart < aEnd - the
 * standard half-open-interval overlap test (touching endpoints, e.g. one booking ending exactly
 * when another starts, do NOT count as overlapping).
 */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function isValidTimeRange(startTime: string, endTime: string): boolean {
  return startTime < endTime;
}
