import { z } from 'zod';

const moduleId = z.enum([
  'admissions',
  'crm',
  'attendance',
  'exams',
  'curriculum',
  'lms',
  'behaviour',
  'health',
  'cafeteria',
  'certificates',
  'fees',
  'payroll',
  'expenses',
  'library',
  'transport',
  'hostel',
  'inventory',
  'biometric',
  'visitors',
  'comm',
  'calendar',
  'reports',
  'aiinsights',
  'alumni',
  'facilities',
  'helpdesk',
  'surveys',
  'audit',
]);
const supportedCurrency = z.enum([
  'AED',
  'USD',
  'EUR',
  'GBP',
  'SAR',
  'QAR',
  'INR',
  'PKR',
  'SGD',
  'MYR',
  'PHP',
  'ZAR',
  'NGN',
  'KES',
  'EGP',
  'AUD',
  'CAD',
  'BRL',
]);
const validTimeZone = (value: string) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export const updateSettingsSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    expectedRevision: z.number().int().min(0).optional(),
    schoolName: z.string().trim().min(2).max(160),
    academicYear: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{4}$/, 'academicYear must look like 2026-2027')
      .refine(
        (value) => Number(value.slice(5)) === Number(value.slice(0, 4)) + 1,
        'Academic year must span consecutive years',
      ),
    timezone: z.string().trim().min(1).max(60).refine(validTimeZone, 'Use a valid IANA time zone'),
    currency: z.string().trim().toUpperCase().pipe(supportedCurrency),
    defaultAnnualLeave: z.number().int().min(0).max(365),
    license: z.string().trim().max(120).optional(),
    principal: z.string().trim().max(160).optional(),
    address: z.string().trim().max(500).optional(),
    disabledModules: z
      .array(moduleId)
      .max(28)
      .refine((ids) => new Set(ids).size === ids.length, 'Duplicate module')
      .optional(),
  }),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>['body'];
