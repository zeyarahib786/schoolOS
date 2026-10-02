import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent' | 'Student', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string };
}

const validSurvey = {
  title: 'End of term feedback',
  description: 'A short poll.',
  questions: [{ questionText: 'How was this term?', options: ['Great', 'Okay', 'Poor'] }],
};

describe('Surveys API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/surveys');
    expect(res.status).toBe(401);
  });

  it('rejects survey creation by a Parent', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/surveys')
      .set('Authorization', `Bearer ${parent.token}`)
      .send(validSurvey);
    expect(res.status).toBe(403);
  });

  it('persists a scheduled survey and allows it to be activated', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-scheduled@alnoor.ae');
    const survey = await request(app)
      .post('/api/v1/surveys')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ ...validSurvey, scheduledAt: '2026-10-15' });
    expect(survey.status).toBe(201);
    expect(survey.body.data.status).toBe('Scheduled');
    expect(String(survey.body.data.scheduledAt)).toContain('2026-10-15');

    const activated = await request(app)
      .post(`/api/v1/surveys/${survey.body.data._id}/activate`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(activated.status).toBe(200);
    expect(activated.body.data.status).toBe('Active');
  });

  it('rejects responding to a survey still in Draft status', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const survey = await request(app)
      .post('/api/v1/surveys')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validSurvey);
    const parent = await registerAndLogin('Parent', 'parent2@alnoor.ae');
    const res = await request(app)
      .post(`/api/v1/surveys/${survey.body.data._id}/respond`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ answers: [{ questionIndex: 0, selectedOption: 'Great' }] });
    expect(res.status).toBe(403);
  });

  it('allows ANY authenticated role (including Parent and Student) to respond once activated', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const survey = await request(app)
      .post('/api/v1/surveys')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validSurvey);
    await request(app)
      .post(`/api/v1/surveys/${survey.body.data._id}/activate`)
      .set('Authorization', `Bearer ${teacher.token}`);
    const student = await registerAndLogin('Student', 'student1@alnoor.ae');
    const res = await request(app)
      .post(`/api/v1/surveys/${survey.body.data._id}/respond`)
      .set('Authorization', `Bearer ${student.token}`)
      .send({ answers: [{ questionIndex: 0, selectedOption: 'Okay' }] });
    expect(res.status).toBe(201);
  });

  it('rejects a SECOND response from the same respondent - one response per user, real DB-enforced', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const survey = await request(app)
      .post('/api/v1/surveys')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validSurvey);
    await request(app)
      .post(`/api/v1/surveys/${survey.body.data._id}/activate`)
      .set('Authorization', `Bearer ${teacher.token}`);
    const parent = await registerAndLogin('Parent', 'parent3@alnoor.ae');
    await request(app)
      .post(`/api/v1/surveys/${survey.body.data._id}/respond`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ answers: [{ questionIndex: 0, selectedOption: 'Great' }] });
    const res = await request(app)
      .post(`/api/v1/surveys/${survey.body.data._id}/respond`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ answers: [{ questionIndex: 0, selectedOption: 'Poor' }] });
    expect(res.status).toBe(409);
  });

  it('rejects an answer with a selectedOption that was never offered on the survey', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const survey = await request(app)
      .post('/api/v1/surveys')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validSurvey);
    await request(app)
      .post(`/api/v1/surveys/${survey.body.data._id}/activate`)
      .set('Authorization', `Bearer ${teacher.token}`);
    const parent = await registerAndLogin('Parent', 'parent4@alnoor.ae');
    const res = await request(app)
      .post(`/api/v1/surveys/${survey.body.data._id}/respond`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ answers: [{ questionIndex: 0, selectedOption: 'Amazing' }] });
    expect(res.status).toBe(400);
  });

  it('rejects responding to a CLOSED survey', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher5@alnoor.ae');
    const survey = await request(app)
      .post('/api/v1/surveys')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validSurvey);
    await request(app)
      .post(`/api/v1/surveys/${survey.body.data._id}/activate`)
      .set('Authorization', `Bearer ${teacher.token}`);
    await request(app)
      .post(`/api/v1/surveys/${survey.body.data._id}/close`)
      .set('Authorization', `Bearer ${teacher.token}`);
    const parent = await registerAndLogin('Parent', 'parent5@alnoor.ae');
    const res = await request(app)
      .post(`/api/v1/surveys/${survey.body.data._id}/respond`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ answers: [{ questionIndex: 0, selectedOption: 'Great' }] });
    expect(res.status).toBe(403);
  });

  it('THE AGGREGATION, PROVEN CORRECT: results tally exact vote counts per option across multiple real respondents', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher6@alnoor.ae');
    const survey = await request(app)
      .post('/api/v1/surveys')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validSurvey);
    const surveyId = survey.body.data._id;
    await request(app).post(`/api/v1/surveys/${surveyId}/activate`).set('Authorization', `Bearer ${teacher.token}`);

    const choices = ['Great', 'Great', 'Okay', 'Poor', 'Great'];
    for (let i = 0; i < choices.length; i++) {
      const respondent = await registerAndLogin('Parent', `parent-agg-${i}@alnoor.ae`);
      await request(app)
        .post(`/api/v1/surveys/${surveyId}/respond`)
        .set('Authorization', `Bearer ${respondent.token}`)
        .send({ answers: [{ questionIndex: 0, selectedOption: choices[i] }] });
    }

    const res = await request(app)
      .get(`/api/v1/surveys/${surveyId}/results`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.totalRespondents).toBe(5);
    const q0 = res.body.data.questions[0];
    expect(q0.options.find((o: { option: string }) => o.option === 'Great').count).toBe(3);
    expect(q0.options.find((o: { option: string }) => o.option === 'Okay').count).toBe(1);
    expect(q0.options.find((o: { option: string }) => o.option === 'Poor').count).toBe(1);
  });

  it('a question option with ZERO votes still appears in results with count 0, not omitted', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher7@alnoor.ae');
    const survey = await request(app)
      .post('/api/v1/surveys')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send(validSurvey);
    const surveyId = survey.body.data._id;
    await request(app).post(`/api/v1/surveys/${surveyId}/activate`).set('Authorization', `Bearer ${teacher.token}`);
    const parent = await registerAndLogin('Parent', 'parent-zero@alnoor.ae');
    await request(app)
      .post(`/api/v1/surveys/${surveyId}/respond`)
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ answers: [{ questionIndex: 0, selectedOption: 'Great' }] });

    const res = await request(app)
      .get(`/api/v1/surveys/${surveyId}/results`)
      .set('Authorization', `Bearer ${teacher.token}`);
    const poorOption = res.body.data.questions[0].options.find((o: { option: string }) => o.option === 'Poor');
    expect(poorOption).toBeDefined();
    expect(poorOption.count).toBe(0);
  });
});
