import { ApiError } from '../../utils/ApiError';
export function schoolLoginCode() {
  const code = (process.env.SCHOOL_LOGIN_CODE || 'SCH').trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9]{1,11}$/.test(code))
    throw new ApiError(
      503,
      'LOGIN_CODE_INVALID',
      'Configure SCHOOL_LOGIN_CODE using 2–12 letters or digits, starting with a letter',
    );
  return code;
}
export function recordLoginId(kind: 'Student' | 'Staff' | 'Guardian', reference: string) {
  const code = schoolLoginCode();
  const parts = reference
    .trim()
    .toUpperCase()
    .split(/[-_\s]+/);
  if (parts.length > 1 && [code, 'STU', 'STD', 'EMP', 'GRD'].includes(parts[0])) parts.shift();
  const number = parts.join('-');
  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(number) || number.length > 60)
    throw ApiError.badRequest('The school reference must contain Latin letters or digits for a readable login ID');
  return `${code}-${kind === 'Student' ? 'STU' : kind === 'Staff' ? 'EMP' : 'GRD'}-${number}`.toLowerCase();
}

/** Roll numbers are unique only within a class and intake year. Issued IDs never change. */
export function studentLoginId(grade: string, roll: string, academicYear: string) {
  const year = academicYear.match(/^(\d{4})-\d{4}$/)?.[1];
  const classroom = grade.trim().toUpperCase().replace(/^(GRADE|CLASS)\s*/i, '').replace(/[^A-Z0-9]/g, '');
  const number = roll.trim().toUpperCase();
  if (!year || !classroom || classroom.length > 30 || !/^[A-Z0-9]{1,20}$/.test(number))
    throw ApiError.badRequest('Set a valid academic year, class/section and roll number before generating a student login');
  return `${schoolLoginCode()}-STU-${year}-${classroom}-${number.padStart(3, '0')}`.toLowerCase();
}
