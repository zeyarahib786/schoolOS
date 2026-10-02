import { useEffect, useState, useCallback } from 'react';
import { Kpi } from '../../components/ui/Kpi';
import { Chip } from '../../components/ui/Chip';
import { DataTable } from '../../components/ui/DataTable';
import * as inventoryApi from './inventory.api';
import type { InventoryItem } from './inventory.api';
import type { PurchaseOrder } from './inventory.api';
import { AddInventoryItemModal } from './AddInventoryItemModal';
import { useAuthStore } from '../../lib/store/authStore';
import { CreatePurchaseOrderModal } from './CreatePurchaseOrderModal';

export function InventoryPage(): JSX.Element {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showPO, setShowPO] = useState(false);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [updatingPO, setUpdatingPO] = useState<string | null>(null);
  const role = useAuthStore((state) => state.user?.role);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await inventoryApi.listItems(p);
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setOrders(await inventoryApi.listPurchaseOrders());
    } catch {
      setError('Could not load inventory - please try again');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  const lowStockCount = items.filter((i) => i.quantityOnHand <= i.reorderLevel).length;
  const totalValue = items.reduce((s, i) => s + i.quantityOnHand * i.unitCost, 0);
  const canManage = role === 'Administrator' || role === 'Principal' || role === 'Teacher' || role === 'Accountant';
  async function advancePO(order:PurchaseOrder){setUpdatingPO(order._id);setError(null);try{if(order.status==='Draft')await inventoryApi.sendPurchaseOrder(order._id);else if(order.status==='Sent')await inventoryApi.receivePurchaseOrder(order._id);await load(page);}catch{setError('Could not update purchase order. Its state may have changed.');}finally{setUpdatingPO(null)}}

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      {showAdd && <AddInventoryItemModal onClose={()=>setShowAdd(false)} onCreated={()=>load(page)} />}
      {showPO && <CreatePurchaseOrderModal items={items} onClose={()=>setShowPO(false)} onCreated={()=>load(page)} />}
      <div style={{ marginBottom: 18, display:'flex',justifyContent:'space-between',alignItems:'start' }}><div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Inventory</h1>
        <p style={{ fontSize: 12.5, color: '#64748B' }}>
          Stock levels and value - receiving a purchase order updates all its items atomically.
        </p>
        </div>{canManage&&<div style={{display:'flex',gap:8}}><button onClick={()=>setShowAdd(true)}>Add item</button><button onClick={()=>setShowPO(true)} style={{background:'#0E7C39',color:'#fff',border:0,borderRadius:8,padding:'8px 12px'}}>Create PO</button></div>}
      </div>
      <h2 style={{fontSize:16,marginTop:24}}>Purchase orders</h2>
      <DataTable<PurchaseOrder> keyField={(o)=>o._id} rows={orders} emptyLabel="No purchase orders." columns={[
        {header:'Reference',render:(o)=>o.refId},{header:'Supplier',render:(o)=>o.supplier},{header:'Lines',render:(o)=>String(o.lines.length),align:'right'},{header:'Status',render:(o)=><Chip label={o.status} tone={o.status==='Received'?'green':o.status==='Sent'?'amber':'gray'}/>},...(canManage?[{header:'Actions',render:(o:PurchaseOrder)=>o.status==='Received'||o.status==='Cancelled'?<span style={{color:'#64748B'}}>{o.status}</span>:<button disabled={updatingPO===o._id} onClick={()=>advancePO(o)}>{updatingPO===o._id?'Saving…':o.status==='Draft'?'Send':'Receive'}</button>}]:[])
      ]}/>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
        <Kpi label="Low stock (this page)" value={lowStockCount} accentColor="#B45309" />
        <Kpi label="Total value (this page)" value={`AED ${totalValue.toLocaleString()}`} accentColor="#0E7C39" />
      </div>

      {error && (
        <div role="alert" style={{ color: '#B42318', fontSize: 12.5, marginBottom: 12 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>Loading…</div>
      ) : (
        <DataTable<InventoryItem>
          keyField={(i) => i._id}
          rows={items}
          emptyLabel="No inventory items found."
          columns={[
            { header: 'Item', render: (i) => i.name },
            { header: 'SKU', render: (i) => i.sku },
            { header: 'Category', render: (i) => i.category },
            { header: 'On hand', render: (i) => String(i.quantityOnHand), align: 'right' },
            {
              header: 'Status',
              render: (i) => (
                <Chip
                  label={i.quantityOnHand <= i.reorderLevel ? 'Reorder' : 'OK'}
                  tone={i.quantityOnHand <= i.reorderLevel ? 'amber' : 'green'}
                />
              ),
            },
          ]}
        />
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 14,
          fontSize: 12.5,
          color: '#64748B',
        }}
      >
        <span>
          Page {page} of {Math.max(totalPages, 1)} · {total} total
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: '#fff',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: '1px solid #E2E8F0',
              background: '#fff',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
