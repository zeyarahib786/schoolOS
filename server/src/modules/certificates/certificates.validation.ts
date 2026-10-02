import { z } from 'zod';

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');

export const listCertificatesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    studentId: objectId.optional(),
    type: z.enum(['Bonafide', 'Transfer', 'Character', 'Study', 'ReportCard', 'Provisional']).optional(),
    status: z.enum(['Pending', 'Issued', 'Rejected']).optional(),
  }),
});

export const issueCertificateSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    studentId: objectId,
    type: z.enum(['Bonafide', 'Transfer', 'Character', 'Study', 'ReportCard', 'Provisional']),
    purpose: z.string().trim().max(300).optional(),
    status: z.enum(['Pending', 'Issued']).default('Issued'),
  }),
});

export const certificateDecisionSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ decision: z.enum(['Issued', 'Rejected']) }),
  query: z.object({}).optional(),
});

export type ListCertificatesQuery = z.infer<typeof listCertificatesSchema>['query'];
export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>['body'];
