import { findInvalidAnswers } from '../../src/modules/surveys/surveys.answer-check';
import { ISurveyQuestion } from '../../src/models/Survey';
import { ISurveyAnswer } from '../../src/models/SurveyResponse';

const questions: ISurveyQuestion[] = [
  { questionText: 'Favourite subject?', options: ['Mathematics', 'Science', 'Art'] },
  { questionText: 'Preferred meal time?', options: ['Morning', 'Afternoon'] },
];

describe('findInvalidAnswers', () => {
  it('returns an empty array when every answer is valid', () => {
    const answers: ISurveyAnswer[] = [
      { questionIndex: 0, selectedOption: 'Science' },
      { questionIndex: 1, selectedOption: 'Morning' },
    ];
    expect(findInvalidAnswers(questions, answers)).toEqual([]);
  });

  it('flags an answer whose questionIndex is out of range', () => {
    const answers: ISurveyAnswer[] = [{ questionIndex: 5, selectedOption: 'Science' }];
    expect(findInvalidAnswers(questions, answers)).toEqual(answers);
  });

  it('flags an answer whose selectedOption was never offered for that question', () => {
    const answers: ISurveyAnswer[] = [{ questionIndex: 0, selectedOption: 'History' }]; // not a real option
    expect(findInvalidAnswers(questions, answers)).toEqual(answers);
  });

  it('flags a valid-looking option that belongs to a DIFFERENT question, not the one it was submitted against', () => {
    // "Morning" is a real option, but only for question 1, not question 0
    const answers: ISurveyAnswer[] = [{ questionIndex: 0, selectedOption: 'Morning' }];
    expect(findInvalidAnswers(questions, answers)).toEqual(answers);
  });

  it('flags only the specific invalid answers within a mixed valid/invalid batch, not the whole batch', () => {
    const answers: ISurveyAnswer[] = [
      { questionIndex: 0, selectedOption: 'Science' }, // valid
      { questionIndex: 1, selectedOption: 'Evening' }, // invalid - not a real option
    ];
    const result = findInvalidAnswers(questions, answers);
    expect(result).toEqual([{ questionIndex: 1, selectedOption: 'Evening' }]);
  });
});
