import {
  createStudentSchema,
  listStudentsSchema,
  studentIdParamSchema,
} from '../../src/modules/students/student.validation';

const validStudentBody = {
  refId: 'ANS-1042',
  name: 'Fatima Al Hashimi',
  grade: 'Grade 10 · A',
  gender: 'Female' as const,
  roll: '12',
  guardianName: 'Khalid Al Hashimi',
  phone: '+971501234567',
};

describe('createStudentSchema', () => {
  it('accepts a valid student payload', () => {
    const result = createStudentSchema.safeParse({ body: validStudentBody, params: {}, query: {} });
    expect(result.success).toBe(true);
  });

  it('rejects a missing required field (name)', () => {
    const { name, ...withoutName } = validStudentBody;
    void name;
    const result = createStudentSchema.safeParse({ body: withoutName, params: {}, query: {} });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid phone number format', () => {
    const result = createStudentSchema.safeParse({
      body: { ...validStudentBody, phone: 'call-me-maybe' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects a refId longer than 30 characters', () => {
    const result = createStudentSchema.safeParse({
      body: { ...validStudentBody, refId: 'X'.repeat(31) },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid gender enum value', () => {
    const result = createStudentSchema.safeParse({
      body: { ...validStudentBody, gender: 'Other' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('accepts the existing full intake fields and coerces date of birth', () => {
    const result = createStudentSchema.safeParse({
      body: {
        ...validStudentBody,
        dateOfBirth: '2012-04-12',
        nationality: 'UAE',
        guardianRelationship: 'Father',
        guardianEmail: 'guardian@example.com',
        emergencyContact: '+971501112222',
        preferredLanguage: 'English',
        address: 'Dubai',
        previousSchool: 'Previous School',
        previousGrade: 'Grade 8',
        languages: 'English, Arabic',
        bloodGroup: 'O+',
        allergies: 'None known',
        medicalNotes: 'None',
        transportRequirement: 'Two-way',
      },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body.dateOfBirth).toBeInstanceOf(Date);
  });

  it('rejects future birth dates and malformed guardian contacts', () => {
    const result = createStudentSchema.safeParse({
      body: { ...validStudentBody, dateOfBirth: '2999-01-01', guardianEmail: 'invalid', emergencyContact: 'abc' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('listStudentsSchema', () => {
  it('defaults page to 1 and limit to 20 when omitted', () => {
    const result = listStudentsSchema.safeParse({ query: {}, body: {}, params: {} });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query.page).toBe(1);
      expect(result.data.query.limit).toBe(20);
    }
  });

  it('caps limit at 100 (rejects anything above)', () => {
    const result = listStudentsSchema.safeParse({ query: { limit: '500' }, body: {}, params: {} });
    expect(result.success).toBe(false);
  });

  it('coerces string query params to numbers', () => {
    const result = listStudentsSchema.safeParse({ query: { page: '3', limit: '10' }, body: {}, params: {} });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query.page).toBe(3);
      expect(typeof result.data.query.page).toBe('number');
    }
  });
});

describe('studentIdParamSchema', () => {
  it('accepts a well-formed 24-char hex ObjectId', () => {
    const result = studentIdParamSchema.safeParse({ params: { id: '64b7f9c9a1b2c3d4e5f60789' }, body: {}, query: {} });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed id (prevents a Mongoose CastError reaching the DB layer)', () => {
    const result = studentIdParamSchema.safeParse({ params: { id: 'not-a-valid-id' }, body: {}, query: {} });
    expect(result.success).toBe(false);
  });
});
