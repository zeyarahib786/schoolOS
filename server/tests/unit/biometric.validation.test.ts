import { createDeviceSchema } from '../../src/modules/biometric/biometric.validation';

describe('createDeviceSchema', () => {
  it('accepts a valid device', () => {
    expect(
      createDeviceSchema.safeParse({
        body: { name: 'Main Gate Scanner', location: 'Main Entrance' },
        params: {},
        query: {},
      }).success,
    ).toBe(true);
  });

  it('rejects a missing name', () => {
    expect(createDeviceSchema.safeParse({ body: { location: 'Main Entrance' }, params: {}, query: {} }).success).toBe(
      false,
    );
  });

  it('rejects a missing location', () => {
    expect(createDeviceSchema.safeParse({ body: { name: 'Main Gate Scanner' }, params: {}, query: {} }).success).toBe(
      false,
    );
  });
});
