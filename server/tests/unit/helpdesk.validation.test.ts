import { raiseTicketSchema, transitionTicketSchema } from '../../src/modules/helpdesk/helpdesk.validation';

const validTicket = {
  category: 'IT',
  subject: 'Projector not working in Room 12',
  description: 'The projector in Room 12 will not turn on.',
};

describe('raiseTicketSchema', () => {
  it('accepts a valid ticket and defaults priority to Medium', () => {
    const result = raiseTicketSchema.safeParse({ body: validTicket, params: {}, query: {} });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body.priority).toBe('Medium');
  });

  it('rejects a subject shorter than 2 characters', () => {
    expect(raiseTicketSchema.safeParse({ body: { ...validTicket, subject: 'X' }, params: {}, query: {} }).success).toBe(
      false,
    );
  });

  it('rejects an invalid priority value', () => {
    expect(
      raiseTicketSchema.safeParse({ body: { ...validTicket, priority: 'Critical' }, params: {}, query: {} }).success,
    ).toBe(false);
  });
});

describe('transitionTicketSchema', () => {
  it('accepts a valid status transition request', () => {
    const result = transitionTicketSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { status: 'Assigned', assignedTo: '64b7f9c9a1b2c3d4e5f60790' },
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects a status value outside the enum', () => {
    const result = transitionTicketSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { status: 'InProgress' },
      query: {},
    });
    expect(result.success).toBe(false);
  });
});
