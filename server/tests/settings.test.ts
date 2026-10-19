import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Principal' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string };
}

const validSettings = {
  schoolName: 'Al Noor International School',
  academicYear: '2027-2028',
  timezone: 'Asia/Dubai',
  currency: 'aed',
  defaultAnnualLeave: 28,
  license: 'KHDA-TEST-001',
  principal: 'Dr. Salma Haddad',
  address: 'Al Barsha, Dubai',
  disabledModules: ['hostel', 'visitors'],
};

describe('Settings API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/settings');
    expect(res.status).toBe(401);
  });

  it('GET before any save returns honest defaults, not a 404 - a Parent can read them (open read)', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app).get('/api/v1/settings').set('Authorization', `Bearer ${parent.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.schoolName).toBeDefined();
    expect(res.body.data.academicYear).toMatch(/^\d{4}-\d{4}$/);
  });

  it('THE FIRST ADMINISTRATOR-ONLY GATE: even a PRINCIPAL gets 403 on update - the first module to exclude Principal from a write', async () => {
    const principal = await registerAndLogin('Principal', 'principal1@alnoor.ae');
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${principal.token}`)
      .send(validSettings);
    expect(res.status).toBe(403);
  });

  it('an Administrator updates settings; currency is normalized to uppercase', async () => {
    const admin = await registerAndLogin('Administrator', 'admin1@alnoor.ae');
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${admin.token}`)
      .send(validSettings);
    expect(res.status).toBe(200);
    expect(res.body.data.currency).toBe('AED');
    expect(res.body.data.academicYear).toBe('2027-2028');
    expect(res.body.data).toMatchObject({
      license: 'KHDA-TEST-001',
      principal: 'Dr. Salma Haddad',
      address: 'Al Barsha, Dubai',
    });
    expect(res.body.data.disabledModules).toEqual(['hostel', 'visitors']);
  });

  it('THE SINGLETON, PROVEN: two saves leave exactly ONE settings document with the LATEST values, and GET reflects it', async () => {
    const admin = await registerAndLogin('Administrator', 'admin2@alnoor.ae');
    await request(app).put('/api/v1/settings').set('Authorization', `Bearer ${admin.token}`).send(validSettings);
    await request(app).put('/api/v1/settings').set('Authorization', `Bearer ${admin.token}`).send({
      schoolName: validSettings.schoolName,
      academicYear: '2028-2029',
      timezone: validSettings.timezone,
      currency: validSettings.currency,
      defaultAnnualLeave: 25,
    });

    const { SchoolSettings } = await import('../src/models/SchoolSettings');
    expect(await SchoolSettings.countDocuments({})).toBe(1);

    const res = await request(app).get('/api/v1/settings').set('Authorization', `Bearer ${admin.token}`);
    expect(res.body.data.academicYear).toBe('2028-2029');
    expect(res.body.data.defaultAnnualLeave).toBe(25);
    expect(res.body.data.license).toBe('KHDA-TEST-001');
    expect(res.body.data.disabledModules).toEqual(['hostel', 'visitors']);
  });

  it('THE CROSS-MODULE AUDIT PROOF: a settings update genuinely lands in the audit log as a Warning naming the Settings module', async () => {
    const admin = await registerAndLogin('Administrator', 'admin3@alnoor.ae');
    await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...validSettings, academicYear: '2029-2030' });

    const audit = await request(app)
      .get('/api/v1/audit-log')
      .set('Authorization', `Bearer ${admin.token}`)
      .query({ module: 'Settings' });
    expect(audit.status).toBe(200);
    const entry = audit.body.data.find((e: { action: string }) => e.action.includes('2029-2030'));
    expect(entry).toBeDefined();
    expect(entry.severity).toBe('Warning');
    expect(entry.action).toContain('academicYear');
  });

  it('rejects an invalid payload with 400 (malformed academic year)', async () => {
    const admin = await registerAndLogin('Administrator', 'admin4@alnoor.ae');
    for (const changed of [
      { academicYear: 'next year' },
      { academicYear: '2027-2030' },
      { timezone: 'Not/A_Real_Zone' },
      { currency: 'ZZZ' },
    ]) {
      const res = await request(app)
        .put('/api/v1/settings')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ ...validSettings, ...changed });
      expect(res.status).toBe(400);
    }
  });

  it('rejects core modules and duplicate IDs in disabledModules', async () => {
    const admin = await registerAndLogin('Administrator', 'admin5@alnoor.ae');
    for (const disabledModules of [['students'], ['hostel', 'hostel']]) {
      const res = await request(app)
        .put('/api/v1/settings')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ ...validSettings, disabledModules });
      expect(res.status).toBe(400);
    }
  });

  it('does not let a currency change relabel existing invoices', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-currency@alnoor.ae');
    const student = await request(app).post('/api/v1/students').set('Authorization', `Bearer ${admin.token}`).send({
      refId: 'ANS-SET-1',
      name: 'Settings Test Student',
      grade: 'Grade 1 · A',
      gender: 'Female',
      roll: '1',
      guardianName: 'Parent',
      phone: '+971501234567',
    });
    expect(student.status).toBe(201);
    const invoice = await request(app).post('/api/v1/fees').set('Authorization', `Bearer ${admin.token}`).send({
      refId: 'INV-SET-1',
      studentId: student.body.data._id,
      term: 'Term 1',
      amount: 100,
      dueDate: '2027-12-01',
    });
    expect(invoice.status).toBe(201);
    const changed = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...validSettings, currency: 'USD' });
    expect(changed.status).toBe(409);
  });

  it('does not let a currency change relabel non-invoice financial records', async () => {
    const admin = await registerAndLogin('Administrator', 'admin-inventory-currency@alnoor.ae');
    const { InventoryItem } = await import('../src/models/InventoryItem');
    await InventoryItem.create({
      name: 'Test Stock',
      sku: 'SET-CUR-1',
      category: 'Supplies',
      quantityOnHand: 1,
      reorderLevel: 1,
      unitCost: 50,
    });
    const changed = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ ...validSettings, currency: 'USD' });
    expect(changed.status).toBe(409);
  });
});
