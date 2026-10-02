import { publishDocumentSchema } from '../../src/modules/documents/documents.validation';

const valid = {
  code: 'POL-001',
  title: 'Attendance Policy',
  category: 'Policy' as const,
  description: 'School-wide attendance rules.',
};

describe('publishDocumentSchema', () => {
  it('accepts a valid document', () => {
    expect(publishDocumentSchema.safeParse({ body: valid, params: {}, query: {} }).success).toBe(true);
  });

  it('accepts a lowercase code (normalized to uppercase downstream by the model)', () => {
    expect(
      publishDocumentSchema.safeParse({ body: { ...valid, code: 'pol-001' }, params: {}, query: {} }).success,
    ).toBe(true);
  });

  it('rejects a malformed code (no dash, wrong shape, spaces)', () => {
    for (const bad of ['POL001', 'P-1', 'POL 001', '001-POL']) {
      expect(publishDocumentSchema.safeParse({ body: { ...valid, code: bad }, params: {}, query: {} }).success).toBe(
        false,
      );
    }
  });

  it('rejects an invalid category', () => {
    expect(
      publishDocumentSchema.safeParse({ body: { ...valid, category: 'Memo' }, params: {}, query: {} }).success,
    ).toBe(false);
  });
});
