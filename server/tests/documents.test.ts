import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string };
}

const validDoc = {
  code: 'POL-001',
  title: 'Attendance Policy',
  category: 'Policy',
  description: 'School-wide attendance rules.',
};

describe('Documents API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/documents');
    expect(res.status).toBe(401);
  });

  it('a Parent can READ documents (open read) but cannot publish', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const read = await request(app).get('/api/v1/documents').set('Authorization', `Bearer ${parent.token}`);
    expect(read.status).toBe(200);
    const publish = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${parent.token}`)
      .send(validDoc);
    expect(publish.status).toBe(403);
  });

  it('the first publish of a code creates version 1, current', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(validDoc);
    expect(res.status).toBe(201);
    expect(res.body.data.version).toBe(1);
    expect(res.body.data.isCurrent).toBe(true);
  });

  it('a lowercase code is normalized: publishing pol-002 then querying POL-002 finds it', async () => {
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...validDoc, code: 'pol-002' });
    const res = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ code: 'POL-002' });
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].code).toBe('POL-002');
  });

  it('THE VERSION CHAIN, PROVEN: re-publishing a code supersedes v1 and creates v2; default list shows ONLY the current version; includeSuperseded shows the full history', async () => {
    const admin = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...validDoc, code: 'POL-003' });
    const second = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...validDoc, code: 'POL-003', description: 'Updated rules.' });
    expect(second.status).toBe(201);
    expect(second.body.data.version).toBe(2);

    const currentOnly = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ code: 'POL-003' });
    expect(currentOnly.body.data.length).toBe(1);
    expect(currentOnly.body.data[0].version).toBe(2);
    expect(currentOnly.body.data[0].isCurrent).toBe(true);

    const explicitFalse = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ code: 'POL-003', includeSuperseded: false });
    expect(explicitFalse.body.data.length).toBe(1);
    expect(explicitFalse.body.data[0].version).toBe(2);

    const fullHistory = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ code: 'POL-003', includeSuperseded: true });
    expect(fullHistory.body.data.length).toBe(2);
    const v1 = fullHistory.body.data.find((d: { version: number }) => d.version === 1);
    expect(v1.isCurrent).toBe(false);

    const audit = await request(app)
      .get('/api/v1/audit-log?module=Documents')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(audit.status).toBe(200);
    expect(audit.body.data.some((entry: { action: string }) => entry.action === 'Published document POL-003 v2')).toBe(
      true,
    );
  });

  it('version numbers keep incrementing across many republishes (v3 after two supersessions)', async () => {
    const admin = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    for (let i = 0; i < 2; i += 1) {
      await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ ...validDoc, code: 'POL-004' });
    }
    const third = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...validDoc, code: 'POL-004' });
    expect(third.body.data.version).toBe(3);
  });

  it('THE PARTIAL-INDEX RACE, PROVEN: two concurrent publishes of the same code - at most one 201 lands per version slot, never TWO current versions', async () => {
    const admin = await registerAndLogin('Administrator', 'admin5@alnoor.ae');
    await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...validDoc, code: 'POL-005' });

    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ ...validDoc, code: 'POL-005', description: 'A' }),
      request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ ...validDoc, code: 'POL-005', description: 'B' }),
    ]);

    // whatever the interleaving, the DB-enforced invariant is what matters: exactly ONE current
    const statuses = [resA.status, resB.status].sort();
    expect([201, 409]).toContain(statuses[1]);
    const current = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ code: 'POL-005' });
    expect(current.body.data.length).toBe(1);
    expect(current.body.data[0].isCurrent).toBe(true);
  });

  it('filters by category', async () => {
    const admin = await registerAndLogin('Administrator', 'admin6@alnoor.ae');
    await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...validDoc, code: 'FRM-001', category: 'Form', title: 'Absence form' });
    const res = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ category: 'Form' });
    expect(res.body.data.every((d: { category: string }) => d.category === 'Form')).toBe(true);
  });

  it('publishes and downloads a PDF, preserving the previous version file', async () => {
    const admin = await registerAndLogin('Administrator', 'pdf-admin@alnoor.ae');
    const headers = {
      'X-Document-Code': 'POL-010',
      'X-Document-Title': 'Safety policy',
      'X-Document-Category': 'Policy',
      'X-Document-Description': 'Approved school safety policy.',
      'X-File-Name': 'Safety%20policy.pdf',
    };
    const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
    const first = await request(app)
      .post('/api/v1/documents/file')
      .set('Authorization', `Bearer ${admin.token}`)
      .set(headers)
      .set('Content-Type', 'application/pdf')
      .send(pdf);
    expect(first.status).toBe(201);
    expect(first.body.data.version).toBe(1);
    expect(first.body.data.filename).toBe('Safety policy.pdf');
    const download = await request(app)
      .get(`/api/v1/documents/${first.body.data._id}/file`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(download.status).toBe(200);
    expect(download.headers['content-type']).toMatch(/application\/pdf/);
    expect(download.headers['content-disposition']).toContain('Safety%20policy.pdf');
    expect(download.body.equals(pdf)).toBe(true);
    const parent = await registerAndLogin('Parent', 'pdf-reader@alnoor.ae');
    const familyDownload = await request(app)
      .get(`/api/v1/documents/${first.body.data._id}/file`)
      .set('Authorization', `Bearer ${parent.token}`);
    expect(familyDownload.status).toBe(200);
    expect(familyDownload.body.equals(pdf)).toBe(true);
    const unauthenticated = await request(app).get(`/api/v1/documents/${first.body.data._id}/file`);
    expect(unauthenticated.status).toBe(401);

    const second = await request(app)
      .post('/api/v1/documents/file')
      .set('Authorization', `Bearer ${admin.token}`)
      .set(headers)
      .set('Content-Type', 'application/pdf')
      .send(pdf);
    expect(second.status).toBe(201);
    expect(second.body.data.version).toBe(2);
    const oldFile = await request(app)
      .get(`/api/v1/documents/${first.body.data._id}/file`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(oldFile.status).toBe(200);
  });

  it('blocks unauthorised PDF publish and rejects non-PDF content', async () => {
    const parent = await registerAndLogin('Parent', 'pdf-parent@alnoor.ae');
    const admin = await registerAndLogin('Administrator', 'pdf-admin2@alnoor.ae');
    const headers = {
      'X-Document-Code': 'POL-011',
      'X-Document-Title': 'Safety policy',
      'X-Document-Category': 'Policy',
      'X-Document-Description': 'Approved school safety policy.',
      'X-File-Name': 'safety.pdf',
    };
    const nonPdf = Buffer.from('Not actually a PDF');
    const forbidden = await request(app)
      .post('/api/v1/documents/file')
      .set('Authorization', `Bearer ${parent.token}`)
      .set(headers)
      .set('Content-Type', 'application/pdf')
      .send(nonPdf);
    expect(forbidden.status).toBe(403);
    const invalid = await request(app)
      .post('/api/v1/documents/file')
      .set('Authorization', `Bearer ${admin.token}`)
      .set(headers)
      .set('Content-Type', 'application/pdf')
      .send(nonPdf);
    expect(invalid.status).toBe(400);
    const list = await request(app).get('/api/v1/documents?code=POL-011').set('Authorization', `Bearer ${admin.token}`);
    expect(list.body.data).toHaveLength(0);
  });

  it('returns 404 for a metadata-only record with no PDF', async () => {
    const admin = await registerAndLogin('Administrator', 'paper-admin@alnoor.ae');
    const record = await request(app)
      .post('/api/v1/documents')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...validDoc, code: 'POL-012' });
    expect(record.status).toBe(201);
    const download = await request(app)
      .get(`/api/v1/documents/${record.body.data._id}/file`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(download.status).toBe(404);
  });
  it('version-aware concurrent republication leaves one current and a complete version chain', async () => {
    const admin = await registerAndLogin('Administrator', 'qa-doc-versions@example.invalid');
    const create = (body: object) =>
      request(app).post('/api/v1/documents').set('Authorization', `Bearer ${admin.token}`).send(body);
    expect((await create({ ...validDoc, expectedVersion: 0 })).status).toBe(201);
    const results = await Promise.all(
      ['A', 'B'].map((description) =>
        create({ ...validDoc, description, expectedVersion: 1, publicationReason: 'QA reviewed publication' }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    const { SchoolDocument } = await import('../src/models/SchoolDocument');
    expect(await SchoolDocument.countDocuments({ code: validDoc.code })).toBe(2);
    expect(await SchoolDocument.countDocuments({ code: validDoc.code, isCurrent: true })).toBe(1);
    expect((await SchoolDocument.findOne({ isCurrent: true }))?.publicationReason).toBe('QA reviewed publication');
    const search = await request(app)
      .get('/api/v1/documents?q=Attendance')
      .set('Authorization', `Bearer ${admin.token}`);
    expect(search.body.data).toHaveLength(1);
    const literal = await request(app).get('/api/v1/documents?q=%5B').set('Authorization', `Bearer ${admin.token}`);
    expect(literal.status).toBe(200);
    expect(literal.body.data).toEqual([]);
  });
});
