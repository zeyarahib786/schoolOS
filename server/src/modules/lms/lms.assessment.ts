import { z } from 'zod';
import { ApiError } from '../../utils/ApiError';

export const assessmentQuestion = z.object({
  id: z.string().regex(/^q[1-9][0-9]?$/),
  type: z.enum(['MCQ', 'ShortAnswer']),
  prompt: z.string().trim().min(1).max(1000),
  options: z.array(z.string().trim().min(1).max(300)).max(6),
  answer: z.string().trim().min(1).max(1000),
  marks: z.number().int().min(1).max(100),
  rubric: z.string().trim().min(1).max(1000),
});
export const assessmentSchema = z
  .array(assessmentQuestion)
  .max(30)
  .superRefine((questions, ctx) => {
    if (new Set(questions.map((q) => q.id)).size !== questions.length)
      ctx.addIssue({ code: 'custom', message: 'Question identifiers must be unique' });
    for (const q of questions) {
      if (
        q.type === 'MCQ' &&
        (q.options.length < 2 || new Set(q.options).size !== q.options.length || !q.options.includes(q.answer))
      )
        ctx.addIssue({ code: 'custom', message: 'MCQ requires distinct options and an exact matching answer' });
      if (q.type === 'ShortAnswer' && q.options.length)
        ctx.addIssue({ code: 'custom', message: 'Short answers cannot have options' });
    }
  });
export type AssessmentQuestion = z.infer<typeof assessmentQuestion>;
export function validateAssessment(questions: AssessmentQuestion[], maxScore: number) {
  if (questions.length && questions.reduce((n, q) => n + q.marks, 0) !== maxScore)
    throw ApiError.badRequest('Question marks must equal the maximum score');
}
export function assessAnswers(questions: AssessmentQuestion[], answers: Array<{ questionId: string; value: string }>) {
  if (answers.length !== questions.length || new Set(answers.map((a) => a.questionId)).size !== answers.length)
    throw ApiError.badRequest('Answer every question once');
  let objectiveScore = 0;
  const content = questions
    .map((q) => {
      const response = answers.find((a) => a.questionId === q.id);
      if (!response || !response.value.trim() || (q.type === 'MCQ' && !q.options.includes(response.value)))
        throw ApiError.badRequest('A question response is missing or invalid');
      if (q.type === 'MCQ' && response.value === q.answer) objectiveScore += q.marks;
      return `${q.id}: ${response.value}`;
    })
    .join('\n');
  return { content, objectiveScore, fullyObjective: questions.every((q) => q.type === 'MCQ') };
}
