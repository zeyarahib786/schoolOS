import { ISurveyQuestion } from '../../models/Survey';
import { ISurveyAnswer } from '../../models/SurveyResponse';

/**
 * Pure validation, no DB dependency: confirms every submitted answer references a question index
 * that actually exists on the survey, and a selectedOption that's actually one of that question's
 * real options - preventing a respondent from submitting an answer to "question 47" on a
 * 3-question survey, or selecting an option that was never offered. Kept separate from the
 * Zod schema (which only validates SHAPE - numbers and strings - not that the numbers/strings
 * correspond to real survey content) and separate from the DB write, the same pure/impure split
 * used throughout this build.
 */
export function findInvalidAnswers(questions: ISurveyQuestion[], answers: ISurveyAnswer[]): ISurveyAnswer[] {
  return answers.filter((answer) => {
    const question = questions[answer.questionIndex];
    if (!question) return true; // questionIndex out of range
    return !question.options.includes(answer.selectedOption);
  });
}
