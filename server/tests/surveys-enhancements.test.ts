import request from 'supertest';
import { createApp } from '../src/app';
import { SurveyResponse } from '../src/models/SurveyResponse';
const app = createApp();
async function fixture() {
  const auth = async (role: string, email: string) =>
    (
      await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Fictional ' + role, email, password: 'LocalFixture123!', role })
    ).body.data;
  const admin = await auth('Administrator', 'office@example.invalid'),
    parent = await auth('Parent', 'parent@example.invalid'),
    student = await auth('Student', 'student@example.invalid');
  const create = async (audience = 'All') =>
    (
      await request(app)
        .post('/api/v1/surveys')
        .set('Authorization', 'Bearer ' + admin.accessToken)
        .send({
          title: 'QA school survey',
          description: 'Fictional feedback purpose',
          audience,
          questions: [
            { questionText: 'QA question 1', options: ['Yes', 'No'] },
            { questionText: 'QA question 2', options: ['Good', 'Improve'] },
          ],
        })
    ).body.data;
  const survey = await create();
  const activate = async (id: string) =>
    request(app)
      .post('/api/v1/surveys/' + id + '/activate')
      .set('Authorization', 'Bearer ' + admin.accessToken);
  const answer = {
    answers: [
      { questionIndex: 0, selectedOption: 'Yes' },
      { questionIndex: 1, selectedOption: 'Good' },
    ],
  };
  return { admin, parent, student, create, survey, activate, answer };
}
describe('Scoped surveys and complete atomic responses', () => {
  it('hides drafts and other audiences, rejects unauthorized responses and results', async () => {
    const f = await fixture();
    let list = await request(app)
      .get('/api/v1/surveys')
      .set('Authorization', 'Bearer ' + f.parent.accessToken);
    expect(list.body.data).toEqual([]);
    const staff = await f.create('Staff');
    await f.activate(staff._id);
    const parents = await f.create('Parents');
    await f.activate(parents._id);
    list = await request(app)
      .get('/api/v1/surveys')
      .set('Authorization', 'Bearer ' + f.parent.accessToken);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]._id).toBe(parents._id);
    expect(
      (
        await request(app)
          .post('/api/v1/surveys/' + staff._id + '/respond')
          .set('Authorization', 'Bearer ' + f.parent.accessToken)
          .send(f.answer)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get('/api/v1/surveys/' + parents._id + '/results')
          .set('Authorization', 'Bearer ' + f.parent.accessToken)
      ).status,
    ).toBe(403);
  });
  it('requires every question exactly once and records own response state', async () => {
    const f = await fixture();
    await f.activate(f.survey._id);
    const path = '/api/v1/surveys/' + f.survey._id + '/respond';
    for (const answers of [
      [{ questionIndex: 0, selectedOption: 'Yes' }],
      [
        { questionIndex: 0, selectedOption: 'Yes' },
        { questionIndex: 0, selectedOption: 'No' },
      ],
    ])
      expect(
        (
          await request(app)
            .post(path)
            .set('Authorization', 'Bearer ' + f.parent.accessToken)
            .send({ answers })
        ).status,
      ).toBe(400);
    expect(
      (
        await request(app)
          .post(path)
          .set('Authorization', 'Bearer ' + f.parent.accessToken)
          .send(f.answer)
      ).status,
    ).toBe(201);
    const list = await request(app)
      .get('/api/v1/surveys')
      .set('Authorization', 'Bearer ' + f.parent.accessToken);
    expect(list.body.meta.pagination.page).toBe(1);
    expect(list.body.data[0].hasResponded).toBe(true);
  });
  it('prevents duplicate concurrent submissions and does not reopen closed surveys', async () => {
    const f = await fixture();
    await f.activate(f.survey._id);
    const respond = () =>
      request(app)
        .post('/api/v1/surveys/' + f.survey._id + '/respond')
        .set('Authorization', 'Bearer ' + f.parent.accessToken)
        .send(f.answer);
    const results = await Promise.all([respond(), respond()]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await SurveyResponse.countDocuments()).toBe(1);
    expect(
      (
        await request(app)
          .post('/api/v1/surveys/' + f.survey._id + '/close')
          .set('Authorization', 'Bearer ' + f.admin.accessToken)
      ).status,
    ).toBe(200);
    expect((await f.activate(f.survey._id)).status).toBe(409);
    expect(
      (
        await request(app)
          .post('/api/v1/surveys/' + f.survey._id + '/respond')
          .set('Authorization', 'Bearer ' + f.student.accessToken)
          .send(f.answer)
      ).status,
    ).toBe(403);
  });
  it('close racing with response leaves either a committed response before close or no response', async () => {
    const f = await fixture();
    await f.activate(f.survey._id);
    const [response, closed] = await Promise.all([
      request(app)
        .post('/api/v1/surveys/' + f.survey._id + '/respond')
        .set('Authorization', 'Bearer ' + f.parent.accessToken)
        .send(f.answer),
      request(app)
        .post('/api/v1/surveys/' + f.survey._id + '/close')
        .set('Authorization', 'Bearer ' + f.admin.accessToken),
    ]);
    expect(closed.status).toBe(200);
    expect([201, 403, 409]).toContain(response.status);
    expect(await SurveyResponse.countDocuments()).toBe(response.status === 201 ? 1 : 0);
  });
});
