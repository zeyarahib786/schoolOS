import { createIncidentSchema } from '../../src/modules/behaviour/behaviour.validation';

const valid = {
  studentId: '64b7f9c9a1b2c3d4e5f60789',
  category: 'Disruption',
  description: 'Interrupted class repeatedly.',
};

describe('createIncidentSchema', () => {
  it('accepts a valid incident and defaults severity to Minor', () => {
    const result = createIncidentSchema.safeParse({ body: valid, params: {}, query: {} });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body.severity).toBe('Minor');
  });

  it('rejects an invalid severity value', () => {
    expect(
      createIncidentSchema.safeParse({ body: { ...valid, severity: 'Extreme' }, params: {}, query: {} }).success,
    ).toBe(false);
  });

  it('rejects a missing description', () => {
    const { description, ...rest } = valid;
    void description;
    expect(createIncidentSchema.safeParse({ body: rest, params: {}, query: {} }).success).toBe(false);
  });
});
