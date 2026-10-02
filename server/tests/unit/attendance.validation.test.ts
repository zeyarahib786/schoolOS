import { markAttendanceSchema, listAttendanceSchema } from '../../src/modules/attendance/attendance.validation';

const validEntry = { studentId: '64b7f9c9a1b2c3d4e5f60789', status: 'Present' as const };

describe('markAttendanceSchema', () => {
  it('accepts a valid bulk-mark payload', () => {
    const result = markAttendanceSchema.safeParse({
      body: { date: '2026-06-14', session: 'AM', entries: [validEntry] },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty entries array (at least one student required)', () => {
    const result = markAttendanceSchema.safeParse({
      body: { date: '2026-06-14', session: 'AM', entries: [] },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 200 entries in a single request', () => {
    const entries = Array.from({ length: 201 }, () => validEntry);
    const result = markAttendanceSchema.safeParse({
      body: { date: '2026-06-14', session: 'AM', entries },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid session value', () => {
    const result = markAttendanceSchema.safeParse({
      body: { date: '2026-06-14', session: 'Evening', entries: [validEntry] },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects an entry with a malformed studentId', () => {
    const result = markAttendanceSchema.safeParse({
      body: { date: '2026-06-14', session: 'AM', entries: [{ studentId: 'not-an-id', status: 'Present' }] },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid status value', () => {
    const result = markAttendanceSchema.safeParse({
      body: { date: '2026-06-14', session: 'AM', entries: [{ studentId: validEntry.studentId, status: 'Sick' }] },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid date string', () => {
    const result = markAttendanceSchema.safeParse({
      body: { date: 'not-a-date', session: 'AM', entries: [validEntry] },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('listAttendanceSchema', () => {
  it('accepts a date range and status filter together', () => {
    const result = listAttendanceSchema.safeParse({
      query: { dateFrom: '2026-06-01', dateTo: '2026-06-30', status: 'Absent' },
      body: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed dateFrom', () => {
    const result = listAttendanceSchema.safeParse({ query: { dateFrom: 'nope' }, body: {}, params: {} });
    expect(result.success).toBe(false);
  });
});
