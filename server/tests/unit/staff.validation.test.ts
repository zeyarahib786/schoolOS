import { createStaffSchema, listStaffSchema, staffIdParamSchema } from '../../src/modules/staff/staff.validation';

const validStaffBody = {
  refId: 'EMP-209',
  name: 'Rohan Mehta',
  designation: 'Mathematics Teacher',
  department: 'Mathematics',
  type: 'Teaching' as const,
  email: 'rohan.mehta@alnoor.ae',
  phone: '+971502223344',
  joinedDate: '2020-08-15',
};

describe('createStaffSchema', () => {
  it('accepts a valid staff payload', () => {
    const result = createStaffSchema.safeParse({ body: validStaffBody, params: {}, query: {} });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = createStaffSchema.safeParse({
      body: { ...validStaffBody, email: 'not-an-email' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid joinedDate string', () => {
    const result = createStaffSchema.safeParse({
      body: { ...validStaffBody, joinedDate: 'not-a-date' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects a type value outside the Teaching/Non-Teaching enum', () => {
    const result = createStaffSchema.safeParse({
      body: { ...validStaffBody, type: 'Contractor' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing designation', () => {
    const { designation, ...rest } = validStaffBody;
    void designation;
    const result = createStaffSchema.safeParse({ body: rest, params: {}, query: {} });
    expect(result.success).toBe(false);
  });
});

describe('listStaffSchema', () => {
  it('defaults page/limit and accepts department/type/status filters together', () => {
    const result = listStaffSchema.safeParse({
      query: { department: 'Science', type: 'Teaching', status: 'Active' },
      body: {},
      params: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query.page).toBe(1);
      expect(result.data.query.department).toBe('Science');
    }
  });

  it('rejects an invalid type filter value', () => {
    const result = listStaffSchema.safeParse({ query: { type: 'Volunteer' }, body: {}, params: {} });
    expect(result.success).toBe(false);
  });
});

describe('staffIdParamSchema', () => {
  it('accepts a well-formed ObjectId', () => {
    const result = staffIdParamSchema.safeParse({ params: { id: '64b7f9c9a1b2c3d4e5f60789' }, body: {}, query: {} });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed id', () => {
    const result = staffIdParamSchema.safeParse({ params: { id: 'nope' }, body: {}, query: {} });
    expect(result.success).toBe(false);
  });
});
