import { canTransition, validTransitionsFrom } from '../../src/modules/helpdesk/ticket.state-machine';

describe('canTransition - exhaustive coverage of every status pair', () => {
  it('allows every valid transition in the documented graph', () => {
    expect(canTransition('Open', 'Assigned')).toBe(true);
    expect(canTransition('Assigned', 'Resolved')).toBe(true);
    expect(canTransition('Assigned', 'Open')).toBe(true);
    expect(canTransition('Resolved', 'Closed')).toBe(true);
    expect(canTransition('Resolved', 'Assigned')).toBe(true);
  });

  it('rejects skipping Assigned entirely (Open directly to Resolved)', () => {
    expect(canTransition('Open', 'Resolved')).toBe(false);
  });

  it('rejects skipping straight to Closed from Open or Assigned', () => {
    expect(canTransition('Open', 'Closed')).toBe(false);
    expect(canTransition('Assigned', 'Closed')).toBe(false);
  });

  it('Closed is a genuine terminal state - every transition OUT of Closed is rejected', () => {
    expect(canTransition('Closed', 'Open')).toBe(false);
    expect(canTransition('Closed', 'Assigned')).toBe(false);
    expect(canTransition('Closed', 'Resolved')).toBe(false);
  });

  it('rejects a "transition" to the same status - not a real transition', () => {
    expect(canTransition('Open', 'Open')).toBe(false);
    expect(canTransition('Assigned', 'Assigned')).toBe(false);
    expect(canTransition('Resolved', 'Resolved')).toBe(false);
    expect(canTransition('Closed', 'Closed')).toBe(false);
  });

  it('rejects moving backward from Resolved to Open directly (must go through Assigned)', () => {
    expect(canTransition('Resolved', 'Open')).toBe(false);
  });
});

describe('validTransitionsFrom', () => {
  it('returns the correct allowed-destination list for each status', () => {
    expect(validTransitionsFrom('Open')).toEqual(['Assigned']);
    expect(validTransitionsFrom('Assigned')).toEqual(['Resolved', 'Open']);
    expect(validTransitionsFrom('Resolved')).toEqual(['Closed', 'Assigned']);
    expect(validTransitionsFrom('Closed')).toEqual([]);
  });
});
