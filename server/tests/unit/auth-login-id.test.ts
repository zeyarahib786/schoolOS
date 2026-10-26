import { recordLoginId, schoolLoginCode, studentLoginId } from '../../src/modules/auth/auth.login-id';
const previous = process.env.SCHOOL_LOGIN_CODE;
afterEach(() => {
  if (previous === undefined) delete process.env.SCHOOL_LOGIN_CODE;
  else process.env.SCHOOL_LOGIN_CODE = previous;
});
it('uses stable role-specific school references and case-insensitive canonical storage', () => {
  process.env.SCHOOL_LOGIN_CODE = 'ans';
  expect(recordLoginId('Student', 'ANS-1042')).toBe('ans-stu-1042');
  expect(recordLoginId('Staff', 'EMP-209')).toBe('ans-emp-209');
  expect(recordLoginId('Guardian', 'GRD-1001')).toBe('ans-grd-1001');
  expect(recordLoginId('Student', 'ANS-2026-001')).toBe('ans-stu-2026-001');
  expect(recordLoginId('Student', 'QA-LOGIN-01')).toBe('ans-stu-qa-login-01');
});
it('rejects invalid prefixes and references rather than generating ambiguous or colliding IDs', () => {
  process.env.SCHOOL_LOGIN_CODE = 'bad prefix';
  expect(() => schoolLoginCode()).toThrow('SCHOOL_LOGIN_CODE');
  process.env.SCHOOL_LOGIN_CODE = 'ANS';
  expect(() => recordLoginId('Student', '***')).toThrow('school reference');
});

it('scopes student rolls by class and intake year without admission timestamps', () => {
  process.env.SCHOOL_LOGIN_CODE = 'ANS';
  expect(studentLoginId('Grade 7 · F', '19', '2026-2027')).toBe('ans-stu-2026-7f-019');
  expect(studentLoginId('Grade 7 · A', '19', '2026-2027')).not.toBe(studentLoginId('Grade 7 · F', '19', '2026-2027'));
  expect(studentLoginId('Grade 7 · F', '19', '2027-2028')).not.toBe(studentLoginId('Grade 7 · F', '19', '2026-2027'));
  expect(() => studentLoginId('Grade 7 · F', '', '2026-2027')).toThrow('roll number');
});
