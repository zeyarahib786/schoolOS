import { issueCertificateSchema, listCertificatesSchema } from '../../src/modules/certificates/certificates.validation';

describe('issueCertificateSchema', () => {
  it('accepts a valid request', () => {
    const result = issueCertificateSchema.safeParse({
      body: { studentId: '64b7f9c9a1b2c3d4e5f60789', type: 'Transfer' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects a type outside the enum', () => {
    const result = issueCertificateSchema.safeParse({
      body: { studentId: '64b7f9c9a1b2c3d4e5f60789', type: 'Graduation' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed studentId', () => {
    const result = issueCertificateSchema.safeParse({
      body: { studentId: 'not-an-id', type: 'Transfer' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('listCertificatesSchema', () => {
  it('accepts a type filter', () => {
    expect(listCertificatesSchema.safeParse({ query: { type: 'Bonafide' }, body: {}, params: {} }).success).toBe(true);
  });
});
