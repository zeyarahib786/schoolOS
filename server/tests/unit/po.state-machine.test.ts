import { canTransitionPO } from '../../src/modules/inventory/po.state-machine';

describe('canTransitionPO', () => {
  it('allows Draft -> Sent', () => {
    expect(canTransitionPO('Draft', 'Sent')).toBe(true);
  });

  it('allows Sent -> Received', () => {
    expect(canTransitionPO('Sent', 'Received')).toBe(true);
  });

  it('allows cancellation before a PO is received', () => {
    expect(canTransitionPO('Draft', 'Cancelled')).toBe(true);
    expect(canTransitionPO('Sent', 'Cancelled')).toBe(true);
  });

  it('rejects skipping Sent entirely (Draft directly to Received)', () => {
    expect(canTransitionPO('Draft', 'Received')).toBe(false);
  });

  it('Received is a genuine terminal state - no transition out of it is ever allowed, unlike Helpdesk tickets which can reopen', () => {
    expect(canTransitionPO('Received', 'Draft')).toBe(false);
    expect(canTransitionPO('Received', 'Sent')).toBe(false);
    expect(canTransitionPO('Received', 'Cancelled')).toBe(false);
  });

  it('Cancelled is terminal', () => {
    expect(canTransitionPO('Cancelled', 'Draft')).toBe(false);
    expect(canTransitionPO('Cancelled', 'Sent')).toBe(false);
    expect(canTransitionPO('Cancelled', 'Received')).toBe(false);
  });

  it('rejects a "transition" to the same status', () => {
    expect(canTransitionPO('Draft', 'Draft')).toBe(false);
    expect(canTransitionPO('Sent', 'Sent')).toBe(false);
    expect(canTransitionPO('Received', 'Received')).toBe(false);
  });

  it('rejects moving backward from Sent to Draft', () => {
    expect(canTransitionPO('Sent', 'Draft')).toBe(false);
  });
});
