import { createRoomSchema } from '../../src/modules/hostel/hostel.validation';

describe('createRoomSchema', () => {
  it('accepts a valid room', () => {
    expect(
      createRoomSchema.safeParse({ body: { roomNumber: '101', block: 'A', capacity: 4 }, params: {}, query: {} })
        .success,
    ).toBe(true);
  });

  it('rejects a non-positive capacity', () => {
    expect(
      createRoomSchema.safeParse({ body: { roomNumber: '101', block: 'A', capacity: 0 }, params: {}, query: {} })
        .success,
    ).toBe(false);
  });
});
