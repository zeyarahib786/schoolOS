import { z } from 'zod';

/** Mirrors server/src/modules/students/student.validation.ts's createStudentSchema exactly.
 * Client-side validation is a UX layer (fail fast, no round trip for an obvious mistake) - the
 * server-side schema remains the actual security boundary and is never trusted to be bypassed
 * by this duplicate; if the two schemas drift, the server's is authoritative. */
export const studentFormSchema = z.object({
  refId: z.string().trim().min(1, 'Reference ID is required').max(30, 'Reference ID is too long'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
  grade: z.string().trim().min(1, 'Grade is required').max(60),
  gender: z.enum(['Male', 'Female'], { errorMap: () => ({ message: 'Select a gender' }) }),
  roll: z.string().trim().min(1, 'Roll number is required').max(20),
  guardianName: z.string().trim().min(2, "Guardian's name is required").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{7,20}$/, 'Enter a valid phone number'),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

/** Runs the schema and returns a flat field->message map the form can render inline, instead
 * of a raw ZodError - keeps the component free of Zod-specific error-shape knowledge. */
export function validateStudentForm(
  values: unknown,
): { valid: true; data: StudentFormValues } | { valid: false; errors: Record<string, string> } {
  const result = studentFormSchema.safeParse(values);
  if (result.success) return { valid: true, data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!errors[key]) errors[key] = issue.message;
  }
  return { valid: false, errors };
}
