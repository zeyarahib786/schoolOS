import { z } from 'zod';

export const listStudentsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(120).optional(),
    grade: z.string().trim().max(60).optional(),
    status: z.enum(['Active', 'Inactive', 'Alumni']).optional(),
  }),
  params: z.object({}).optional(),
});

export const studentIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid student id') }),
});

export const studentDocumentParamSchema = z.object({
  body: z.any(),
  params: z.object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid student id'), key: z.enum(['id', 'birth', 'photo']) }),
  query: z.object({}),
});

export const createStudentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({}).optional(),
  body: z.object({
    refId: z.string().trim().min(1).max(30),
    name: z.string().trim().min(2).max(120),
    grade: z.string().trim().min(1).max(60),
    gender: z.enum(['Male', 'Female']),
    roll: z.string().trim().min(1).max(20),
    guardianName: z.string().trim().min(2).max(120),
    guardianUserId: z
      .string()
      .regex(/^[a-f0-9]{24}$/i, 'Invalid guardian user id')
      .optional(),
    studentUserId: z
      .string()
      .regex(/^[a-f0-9]{24}$/i, 'Invalid student user id')
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ]{7,20}$/, 'Invalid phone number'),
    dateOfBirth: z.coerce.date().max(new Date(), 'Date of birth cannot be in the future').optional(),
    nationality: z.string().trim().max(80).optional(),
    guardianRelationship: z.enum(['Father', 'Mother', 'Guardian', 'Other']).optional(),
    guardianEmail: z.string().trim().email().max(254).optional(),
    emergencyContact: z.string().trim().regex(/^\+?[0-9 ]{7,20}$/, 'Invalid emergency contact').optional(),
    preferredLanguage: z.string().trim().max(60).optional(),
    address: z.string().trim().max(500).optional(),
    previousSchool: z.string().trim().max(160).optional(),
    previousGrade: z.string().trim().max(60).optional(),
    languages: z.string().trim().max(200).optional(),
    bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown']).optional(),
    allergies: z.string().trim().max(500).optional(),
    medicalNotes: z.string().trim().max(1000).optional(),
    transportRequirement: z.enum(['No', 'One-way', 'Two-way']).optional(),
    feeStatus: z.enum(['Paid', 'Pending', 'Overdue']).optional(),
    attendancePct: z.number().min(0).max(100).optional(),
    gpa: z.number().min(0).max(4).optional(),
    status: z.enum(['Active', 'Inactive', 'Alumni']).optional(),
  }),
});

export const updateStudentSchema = z.object({
  query: z.object({}).optional(),
  params: z.object({ id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid student id') }),
  body: createStudentSchema.shape.body.partial(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>['body'];
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>['body'];
export type ListStudentsQuery = z.infer<typeof listStudentsSchema>['query'];
