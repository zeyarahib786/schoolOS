import { createVehicleSchema, createRouteSchema } from '../../src/modules/transport/transport.validation';

describe('createVehicleSchema', () => {
  it('accepts a valid vehicle', () => {
    const result = createVehicleSchema.safeParse({
      body: { regNumber: 'DXB-A12345', capacity: 40, driverName: 'Ahmed Khan', driverPhone: '+971501112233' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-positive capacity', () => {
    const result = createVehicleSchema.safeParse({
      body: { regNumber: 'DXB-A12345', capacity: 0, driverName: 'Ahmed Khan', driverPhone: '+971501112233' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('createRouteSchema', () => {
  it('accepts a valid route with at least one stop', () => {
    const result = createRouteSchema.safeParse({
      body: { name: 'Route 1', vehicleId: '64b7f9c9a1b2c3d4e5f60789', stops: ['Al Barsha', 'Downtown'] },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects a route with zero stops', () => {
    const result = createRouteSchema.safeParse({
      body: { name: 'Route 1', vehicleId: '64b7f9c9a1b2c3d4e5f60789', stops: [] },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });
});
