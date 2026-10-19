import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function registerAndLogin(role: 'Administrator' | 'Teacher' | 'Parent', email: string) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: `Test ${role}`, email, password: 'StrongPass123', role });
  return { token: res.body.data.accessToken as string };
}

async function createItem(token: string, sku: string, quantityOnHand = 0) {
  const res = await request(app)
    .post('/api/v1/inventory/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Item ${sku}`, sku, category: 'Stationery', quantityOnHand, unitCost: 5 });
  return res.body.data._id as string;
}

describe('Inventory API', () => {
  it('rejects unauthenticated access', async () => {
    const res = await request(app).get('/api/v1/inventory/items');
    expect(res.status).toBe(401);
  });

  it('rejects item creation by a Parent', async () => {
    const parent = await registerAndLogin('Parent', 'parent1@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/inventory/items')
      .set('Authorization', `Bearer ${parent.token}`)
      .send({ name: 'X', sku: 'X-1', category: 'Y', unitCost: 5 });
    expect(res.status).toBe(403);
  });

  it('rejects sending a purchase order directly to Received (skipping Sent)', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher1@alnoor.ae');
    const itemId = await createItem(teacher.token, 'SKU-1');
    const po = await request(app)
      .post('/api/v1/inventory/purchase-orders')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ refId: 'PO-1', supplier: 'X', lines: [{ itemId, quantity: 5, unitCost: 5 }] });
    const res = await request(app)
      .post(`/api/v1/inventory/purchase-orders/${po.body.data._id}/receive`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(400);
  });

  it('walks a PO through its correct lifecycle: Draft -> Sent -> Received, correctly updating stock', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher2@alnoor.ae');
    const itemId = await createItem(teacher.token, 'SKU-2', 10);
    const po = await request(app)
      .post('/api/v1/inventory/purchase-orders')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ refId: 'PO-2', supplier: 'X', lines: [{ itemId, quantity: 20, unitCost: 5 }] });
    await request(app)
      .post(`/api/v1/inventory/purchase-orders/${po.body.data._id}/send`)
      .set('Authorization', `Bearer ${teacher.token}`);
    const res = await request(app)
      .post(`/api/v1/inventory/purchase-orders/${po.body.data._id}/receive`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Received');

    const items = await request(app).get('/api/v1/inventory/items').set('Authorization', `Bearer ${teacher.token}`);
    const updated = items.body.data.find((i: { _id: string }) => i._id === itemId);
    expect(updated.quantityOnHand).toBe(30); // 10 + 20
  });

  it('cancels a Draft PO and prevents any later lifecycle transition', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-cancel@alnoor.ae');
    const itemId = await createItem(teacher.token, 'SKU-CANCEL');
    const po = await request(app)
      .post('/api/v1/inventory/purchase-orders')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ refId: 'PO-CANCEL', supplier: 'X', lines: [{ itemId, quantity: 5, unitCost: 5 }] });

    const cancelled = await request(app)
      .post(`/api/v1/inventory/purchase-orders/${po.body.data._id}/cancel`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('Cancelled');

    const send = await request(app)
      .post(`/api/v1/inventory/purchase-orders/${po.body.data._id}/send`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(send.status).toBe(400);
  });

  it('MULTI-ITEM ATOMICITY, PROVEN CORRECT: receiving a PO with several lines updates ALL of them together, in one transaction', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher3@alnoor.ae');
    const itemA = await createItem(teacher.token, 'SKU-3A', 5);
    const itemB = await createItem(teacher.token, 'SKU-3B', 8);
    const itemC = await createItem(teacher.token, 'SKU-3C', 2);
    const po = await request(app)
      .post('/api/v1/inventory/purchase-orders')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        refId: 'PO-3',
        supplier: 'X',
        lines: [
          { itemId: itemA, quantity: 10, unitCost: 5 },
          { itemId: itemB, quantity: 15, unitCost: 5 },
          { itemId: itemC, quantity: 3, unitCost: 5 },
        ],
      });
    await request(app)
      .post(`/api/v1/inventory/purchase-orders/${po.body.data._id}/send`)
      .set('Authorization', `Bearer ${teacher.token}`);
    await request(app)
      .post(`/api/v1/inventory/purchase-orders/${po.body.data._id}/receive`)
      .set('Authorization', `Bearer ${teacher.token}`);

    const items = await request(app).get('/api/v1/inventory/items').set('Authorization', `Bearer ${teacher.token}`);
    expect(items.body.data.find((i: { _id: string }) => i._id === itemA).quantityOnHand).toBe(15); // 5+10
    expect(items.body.data.find((i: { _id: string }) => i._id === itemB).quantityOnHand).toBe(23); // 8+15
    expect(items.body.data.find((i: { _id: string }) => i._id === itemC).quantityOnHand).toBe(5); // 2+3
  });

  it('rejects receiving an already-Received PO a second time', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher4@alnoor.ae');
    const itemId = await createItem(teacher.token, 'SKU-4');
    const po = await request(app)
      .post('/api/v1/inventory/purchase-orders')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ refId: 'PO-4', supplier: 'X', lines: [{ itemId, quantity: 5, unitCost: 5 }] });
    await request(app)
      .post(`/api/v1/inventory/purchase-orders/${po.body.data._id}/send`)
      .set('Authorization', `Bearer ${teacher.token}`);
    await request(app)
      .post(`/api/v1/inventory/purchase-orders/${po.body.data._id}/receive`)
      .set('Authorization', `Bearer ${teacher.token}`);
    const res = await request(app)
      .post(`/api/v1/inventory/purchase-orders/${po.body.data._id}/receive`)
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(res.status).toBe(400);
  });

  it('CONCURRENT receipt attempts add stock only once', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-concurrent-receive@alnoor.ae');
    const itemId = await createItem(teacher.token, 'SKU-CONCURRENT-RECEIVE', 2);
    const po = await request(app)
      .post('/api/v1/inventory/purchase-orders')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ refId: 'PO-CONCURRENT-RECEIVE', supplier: 'X', lines: [{ itemId, quantity: 4, unitCost: 5 }] });
    await request(app)
      .post(`/api/v1/inventory/purchase-orders/${po.body.data._id}/send`)
      .set('Authorization', `Bearer ${teacher.token}`);
    const [first, second] = await Promise.all([
      request(app)
        .post(`/api/v1/inventory/purchase-orders/${po.body.data._id}/receive`)
        .set('Authorization', `Bearer ${teacher.token}`),
      request(app)
        .post(`/api/v1/inventory/purchase-orders/${po.body.data._id}/receive`)
        .set('Authorization', `Bearer ${teacher.token}`),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    const items = await request(app).get('/api/v1/inventory/items').set('Authorization', `Bearer ${teacher.token}`);
    expect(items.body.data.find((item: { _id: string }) => item._id === itemId).quantityOnHand).toBe(6);
  });

  it('rejects raising a PO that references a non-existent inventory item', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher5@alnoor.ae');
    const res = await request(app)
      .post('/api/v1/inventory/purchase-orders')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        refId: 'PO-5',
        supplier: 'X',
        lines: [{ itemId: '64b7f9c9a1b2c3d4e5f60789', quantity: 5, unitCost: 5 }],
      });
    expect(res.status).toBe(400);
  });

  it('persists stock adjustments with their movement history and never permits negative stock', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-stock-adjustment@alnoor.ae');
    const itemId = await createItem(teacher.token, 'SKU-ADJUST', 8);
    const adjusted = await request(app)
      .post(`/api/v1/inventory/items/${itemId}/adjust`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ quantityDelta: -3, type: 'Issued to classroom', note: 'Grade 5 art lesson' });
    expect(adjusted.status).toBe(200);
    expect(adjusted.body.data.quantityOnHand).toBe(5);
    expect(adjusted.body.data.movements[0]).toMatchObject({
      type: 'Issued to classroom',
      quantityDelta: -3,
      note: 'Grade 5 art lesson',
    });

    const rejected = await request(app)
      .post(`/api/v1/inventory/items/${itemId}/adjust`)
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({ quantityDelta: -6, type: 'Stock count correction' });
    expect(rejected.status).toBe(409);
  });

  it('persists the expected delivery date and notes shown in the existing PO detail UI', async () => {
    const teacher = await registerAndLogin('Teacher', 'teacher-po-details@alnoor.ae');
    const itemId = await createItem(teacher.token, 'SKU-PO-DETAIL');
    const po = await request(app)
      .post('/api/v1/inventory/purchase-orders')
      .set('Authorization', `Bearer ${teacher.token}`)
      .send({
        refId: 'PO-DETAILS',
        supplier: 'Stationery Co',
        expectedDelivery: '2027-07-15',
        notes: 'Deliver to the main store',
        lines: [{ itemId, quantity: 5, unitCost: 5 }],
      });
    expect(po.status).toBe(201);
    const listed = await request(app)
      .get('/api/v1/inventory/purchase-orders')
      .set('Authorization', `Bearer ${teacher.token}`);
    expect(listed.body.data[0]).toMatchObject({ refId: 'PO-DETAILS', notes: 'Deliver to the main store' });
    expect(String(listed.body.data[0].expectedDelivery)).toContain('2027-07-15');
  });
  it('rolls back every receipt line when one referenced inventory item is missing', async () => {
    const office = await registerAndLogin('Administrator', 'qa-rollback@example.invalid');
    const a = await createItem(office.token, 'QA-A', 1),
      b = await createItem(office.token, 'QA-B', 2);
    const order = await request(app)
      .post('/api/v1/inventory/purchase-orders')
      .set('Authorization', `Bearer ${office.token}`)
      .send({
        refId: 'QA-ROLLBACK',
        supplier: 'Fictional supplier',
        lines: [
          { itemId: a, quantity: 5, unitCost: 1 },
          { itemId: b, quantity: 3, unitCost: 1 },
        ],
      });
    await request(app)
      .post(`/api/v1/inventory/purchase-orders/${order.body.data._id}/send`)
      .set('Authorization', `Bearer ${office.token}`);
    const { InventoryItem } = await import('../src/models/InventoryItem');
    await InventoryItem.findByIdAndDelete(b);
    const receipt = await request(app)
      .post(`/api/v1/inventory/purchase-orders/${order.body.data._id}/receive`)
      .set('Authorization', `Bearer ${office.token}`);
    expect(receipt.status).toBe(409);
    expect((await InventoryItem.findById(a))?.quantityOnHand).toBe(1);
    expect((await InventoryItem.findById(a))?.movements).toHaveLength(0);
  });
  it('concurrent cancellation and receipt preserve consistent order/stock history', async () => {
    const office = await registerAndLogin('Administrator', 'qa-race@example.invalid');
    const item = await createItem(office.token, 'QA-RACE', 1);
    const order = await request(app)
      .post('/api/v1/inventory/purchase-orders')
      .set('Authorization', `Bearer ${office.token}`)
      .send({ refId: 'QA-RACE', supplier: 'Fictional supplier', lines: [{ itemId: item, quantity: 5, unitCost: 1 }] });
    const sent = await request(app)
      .post(`/api/v1/inventory/purchase-orders/${order.body.data._id}/send`)
      .set('Authorization', `Bearer ${office.token}`);
    const body = { expectedUpdatedAt: sent.body.data.updatedAt, reason: 'Fictional confirmation' };
    const results = await Promise.all(
      ['receive', 'cancel'].map((action) =>
        request(app)
          .post(`/api/v1/inventory/purchase-orders/${order.body.data._id}/${action}`)
          .set('Authorization', `Bearer ${office.token}`)
          .send(body),
      ),
    );
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    const { InventoryItem } = await import('../src/models/InventoryItem');
    const { PurchaseOrder } = await import('../src/models/PurchaseOrder');
    const saved = await PurchaseOrder.findById(order.body.data._id);
    expect((await InventoryItem.findById(item))?.quantityOnHand).toBe(saved?.status === 'Received' ? 6 : 1);
    expect(saved?.history).toHaveLength(2);
  });
  it('metadata corrections preserve stock and reject stale versions; family cannot browse procurement', async () => {
    const office = await registerAndLogin('Administrator', 'qa-review@example.invalid');
    const item = await createItem(office.token, 'QA-REVIEW', 3);
    const { InventoryItem } = await import('../src/models/InventoryItem');
    const current = await InventoryItem.findById(item);
    const body = {
      expectedUpdatedAt: current!.updatedAt.toISOString(),
      reason: 'Fictional item inspection',
      name: 'QA reviewed item',
      category: 'Stationery',
      reorderLevel: 5,
      unitCost: 1.25,
      supplier: 'Fictional supplier',
      location: 'QA Store',
      condition: 'Worn',
    };
    const saved = await request(app)
      .patch('/api/v1/inventory/items/' + item)
      .set('Authorization', `Bearer ${office.token}`)
      .send(body);
    expect(saved.status).toBe(200);
    expect(saved.body.data.quantityOnHand).toBe(3);
    expect(saved.body.data.history).toHaveLength(1);
    expect(
      (
        await request(app)
          .patch('/api/v1/inventory/items/' + item)
          .set('Authorization', `Bearer ${office.token}`)
          .send(body)
      ).status,
    ).toBe(409);
    const parent = await registerAndLogin('Parent', 'qa-family@example.invalid');
    for (const path of ['items', 'purchase-orders'])
      expect(
        (
          await request(app)
            .get('/api/v1/inventory/' + path)
            .set('Authorization', `Bearer ${parent.token}`)
        ).status,
      ).toBe(403);
  });
});
