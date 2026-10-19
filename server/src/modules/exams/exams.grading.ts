import { IExamScore } from '../../models/ExamResult';

export interface GradeScaleEntry {
  minPercent: number;
  grade: string;
}

/** Default product grade scale. Exported so it can later be replaced by a configurable
 * per-exam scale without changing the computation logic. */
export const DEFAULT_GRADE_SCALE: GradeScaleEntry[] = [
  { minPercent: 85, grade: 'A+' },
  { minPercent: 70, grade: 'A' },
  { minPercent: 60, grade: 'B' },
  { minPercent: 50, grade: 'C' },
  { minPercent: 0, grade: 'D' },
];

/**
 * Pure computation, no DB - the average and grade for one student's result are ALWAYS derived
 * from `scores` at read time, never stored, so correcting a single mark can never leave a stale
 * average or grade behind. Rank and grade are computed rather than stored.
 */
export function computeRawAveragePercent(scores: IExamScore[], maxMarks: number): number {
  if (!scores.length || maxMarks <= 0) return 0;
  return (scores.reduce((sum, score) => sum + score.marks, 0) / (scores.length * maxMarks)) * 100;
}
export function computeAveragePercent(scores: IExamScore[], maxMarks: number): number {
  return Math.round(computeRawAveragePercent(scores, maxMarks) * 10) / 10;
}

export function computeGrade(averagePercent: number, scale: GradeScaleEntry[] = DEFAULT_GRADE_SCALE): string {
  const sorted = [...scale].sort((a, b) => b.minPercent - a.minPercent);
  for (const entry of sorted) {
    if (averagePercent >= entry.minPercent) return entry.grade;
  }
  return sorted[sorted.length - 1]?.grade ?? 'D';
}

export function isPassing(averagePercent: number, passMarkPercent: number): boolean {
  return averagePercent >= passMarkPercent;
}
