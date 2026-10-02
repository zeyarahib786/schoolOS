import { createItemSchema, createPOSchema } from '../../src/modules/inventory/inventory.validation';

describe('createItemSchema', () => {
  it('accepts a valid item', () => {
    const result = createItemSchema.safeParse({
      body: { name: 'Whiteboard markers', sku: 'STA-001', category: 'Stationery', unitCost: 5.5 },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects a negative unitCost', () => {
    const result = createItemSchema.safeParse({
      body: { name: 'X', sku: 'X-1', category: 'Y', unitCost: -1 },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('defaults quantityOnHand and reorderLevel when omitted', () => {
    const result = createItemSchema.safeParse({
      body: { name: 'X', sku: 'X-1', category: 'Y', unitCost: 5 },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.quantityOnHand).toBe(0);
      expect(result.data.body.reorderLevel).toBe(10);
    }
  });
});

describe('createPOSchema', () => {
  it('accepts a valid PO with multiple lines', () => {
    const result = createPOSchema.safeParse({
      body: {
        refId: 'PO-1001',
        supplier: 'Office Supplies Co',
        lines: [{ itemId: '64b7f9c9a1b2c3d4e5f60789', quantity: 10, unitCost: 5 }],
      },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects a PO with zero line items', () => {
    const result = createPOSchema.safeParse({
      body: { refId: 'PO-1001', supplier: 'X', lines: [] },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-positive quantity in a line item', () => {
    const result = createPOSchema.safeParse({
      body: {
        refId: 'PO-1001',
        supplier: 'X',
        lines: [{ itemId: '64b7f9c9a1b2c3d4e5f60789', quantity: 0, unitCost: 5 }],
      },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });
});
