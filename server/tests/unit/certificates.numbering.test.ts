import { formatCertNumber, counterKey } from '../../src/modules/certificates/certificates.numbering';

describe('formatCertNumber', () => {
  it('formats each certificate type with its correct prefix', () => {
    expect(formatCertNumber('Bonafide', 2026, 1)).toBe('BF-2026-0001');
    expect(formatCertNumber('Transfer', 2026, 1)).toBe('TC-2026-0001');
    expect(formatCertNumber('Character', 2026, 1)).toBe('CC-2026-0001');
    expect(formatCertNumber('Study', 2026, 1)).toBe('SC-2026-0001');
  });

  it('pads the sequence number to 4 digits', () => {
    expect(formatCertNumber('Bonafide', 2026, 7)).toBe('BF-2026-0007');
    expect(formatCertNumber('Bonafide', 2026, 42)).toBe('BF-2026-0042');
    expect(formatCertNumber('Bonafide', 2026, 1234)).toBe('BF-2026-1234');
  });

  it('does not truncate a sequence number beyond 4 digits - it just gets longer, never wraps or loses digits', () => {
    expect(formatCertNumber('Bonafide', 2026, 12345)).toBe('BF-2026-12345');
  });

  it('falls back to a generic prefix for an unrecognized type rather than throwing', () => {
    expect(formatCertNumber('SomeNewType', 2026, 1)).toBe('CT-2026-0001');
  });
});

describe('counterKey', () => {
  it('combines type and year into a distinct key per combination', () => {
    expect(counterKey('Transfer', 2026)).toBe('Transfer-2026');
    expect(counterKey('Transfer', 2027)).not.toBe(counterKey('Transfer', 2026)); // different year = different counter, resets to 1
    expect(counterKey('Bonafide', 2026)).not.toBe(counterKey('Transfer', 2026)); // different type = different counter
  });
});
