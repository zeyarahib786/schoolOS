/** Pure formatting logic, no DB dependency - separated from the atomic sequence generation
 * itself (certificates.repository.ts) the same way exam grading separated pure computation from
 * data access. Given a type prefix, year, and an already-obtained sequence number, format the
 * final certificate number string. This half is what's actually unit-testable without a
 * database; the sequence number itself can only be verified for real uniqueness under
 * concurrency, which is what the integration test does instead. */
const TYPE_PREFIXES: Record<string, string> = {
  Bonafide: 'BF',
  Transfer: 'TC',
  Character: 'CC',
  Study: 'SC',
  ReportCard: 'RC',
  Provisional: 'PC',
};

export function formatCertNumber(type: string, year: number, seq: number): string {
  const prefix = TYPE_PREFIXES[type] ?? 'CT';
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

export function counterKey(type: string, year: number): string {
  return `${type}-${year}`;
}
