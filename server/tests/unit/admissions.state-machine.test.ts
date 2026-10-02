import { canTransitionApplication } from '../../src/modules/admissions/admissions.state-machine';

describe('canTransitionApplication', () => {
  it('walks the full forward pipeline: Applied -> Shortlisted -> Interviewed -> Accepted -> Enrolled', () => {
    expect(canTransitionApplication('Applied', 'Shortlisted')).toBe(true);
    expect(canTransitionApplication('Shortlisted', 'Interviewed')).toBe(true);
    expect(canTransitionApplication('Interviewed', 'Accepted')).toBe(true);
    expect(canTransitionApplication('Accepted', 'Enrolled')).toBe(true);
  });

  it('THE BRANCH: Rejected is reachable from Applied, Shortlisted, AND Interviewed - the first multi-source target state in this codebase', () => {
    expect(canTransitionApplication('Applied', 'Rejected')).toBe(true);
    expect(canTransitionApplication('Shortlisted', 'Rejected')).toBe(true);
    expect(canTransitionApplication('Interviewed', 'Rejected')).toBe(true);
  });

  it('an Accepted application can NOT be rejected - acceptance is a commitment; only Enrolled remains', () => {
    expect(canTransitionApplication('Accepted', 'Rejected')).toBe(false);
  });

  it('rejects skipping pipeline stages (Applied straight to Accepted or Interviewed)', () => {
    expect(canTransitionApplication('Applied', 'Accepted')).toBe(false);
    expect(canTransitionApplication('Applied', 'Interviewed')).toBe(false);
    expect(canTransitionApplication('Shortlisted', 'Accepted')).toBe(false);
  });

  it('Enrolled and Rejected are genuine terminal states - no transition out of either', () => {
    for (const target of ['Applied', 'Shortlisted', 'Interviewed', 'Accepted', 'Enrolled', 'Rejected'] as const) {
      if (target !== 'Enrolled') expect(canTransitionApplication('Enrolled', target)).toBe(false);
      if (target !== 'Rejected') expect(canTransitionApplication('Rejected', target)).toBe(false);
    }
  });

  it('Enrolled is only reachable from Accepted, nowhere else', () => {
    expect(canTransitionApplication('Applied', 'Enrolled')).toBe(false);
    expect(canTransitionApplication('Shortlisted', 'Enrolled')).toBe(false);
    expect(canTransitionApplication('Interviewed', 'Enrolled')).toBe(false);
  });

  it('rejects a "transition" to the same status', () => {
    expect(canTransitionApplication('Applied', 'Applied')).toBe(false);
  });
});
