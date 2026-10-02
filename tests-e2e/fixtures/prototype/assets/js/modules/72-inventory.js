/* ---- Inventory ---- */
M.inventory=()=>{const tab=getSubTab('inv-v','stock');const totalItems=INVENTORY.reduce((a,i)=>a+i.stock,0);const totalValue=INVENTORY.reduce((a,i)=>a+i.stock*i.unitCost,0);
 const lowCount=INVENTORY.filter(i=>i.stock<i.min).length;const openPOs=PURCHASE_ORDERS.filter(p=>p.status!=='Received'&&p.status!=='Cancelled').length;
 return `
  <div class="page-head"><div class="ph-l"><h2>Inventory</h2><p>Assets, lab and IT stock, purchase orders and reorder alerts.</p></div>
  <div class="ph-r"><button class="btn" onclick="raisePOForm()">${ic('expense',16)} Raise PO</button><button class="btn primary" onclick="formDrawer('Add inventory item','Asset / stock',[{label:'Item name',key:'item_name',req:true},{label:'SKU',key:'sku',ph:'auto-generated if blank',half:true},{label:'Category',key:'category',opts:['IT','Academic','Facilities','Activities'],half:true},{label:'Quantity in stock',key:'quantity_in_stock',type:'number',half:true},{label:'Reorder minimum',key:'reorder_minimum',type:'number',half:true},{label:'Unit cost (AED)',key:'unit_cost',type:'number',half:true},{label:'Supplier',key:'supplier',half:true},{label:'Storage location',key:'location'}],'Add item','','addInventory')">${ic('plus',16)} Add item</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('inv','#17A24A','Asset items',totalItems.toLocaleString(),null,"setSubTab('inv-v','stock')")}${kpi('reports','#2563EB','Total value',aed(totalValue),null)}
    ${kpi('expense','#E11D2A','Low stock',String(lowCount),lowCount?{dir:'down',v:'reorder',note:''}:null,"setSubTab('inv-v','stock')")}${kpi('fees','#0E7C39','Open POs',String(openPOs),null,"setSubTab('inv-v','po')")}</div>
  ${subTabs('inv-v',[['stock','Stock levels','inv'],['po','Purchase orders','expense']])}
  ${tab==='po'?invPOView():invStockView()}`};
function invStockView(){return `<div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Stock levels</h3></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>SKU</th><th>Item</th><th>Category</th><th>Location</th><th class="right">In stock</th><th class="right">Min</th><th class="right">Value</th><th>Status</th></tr></thead><tbody>
  ${INVENTORY.map(it=>{const low=it.stock<it.min;const near=it.stock<it.min*1.15;return `<tr style="cursor:pointer" onclick="openDrawer(inventoryDetail('${it.item.replace(/'/g,"\'")}'))"><td class="muted num">${it.sku}</td><td style="font-weight:600;color:var(--slate-900)">${it.item}</td><td>${it.cat}</td><td class="muted">${it.location}</td><td class="right num">${it.stock}</td><td class="right num">${it.min}</td><td class="right num">${aed(it.stock*it.unitCost)}</td>
    <td>${low?chip('Reorder','red'):near?chip('Low','amber'):chip('In stock','green')}</td></tr>`}).join('')}
  </tbody></table></div></div>`}
function invPOView(){return `<div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Purchase orders</h3><span class="muted" style="font-size:12px">${PURCHASE_ORDERS.length} total</span></div>
  ${PURCHASE_ORDERS.length?`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>PO #</th><th>Supplier</th><th>Items</th><th>Expected</th><th class="right">Total</th><th>Status</th></tr></thead><tbody>
  ${PURCHASE_ORDERS.map(po=>`<tr style="cursor:pointer" onclick="openDrawer(poDetail('${po.id}'))"><td style="font-weight:600;color:var(--slate-900)">${po.id}</td><td>${po.supplier}</td><td class="muted">${po.items.length} line item(s)</td><td class="num">${po.expected}</td><td class="right num">${aed(po.items.reduce((a,i)=>a+i.qty*i.unitCost,0))}</td><td>${chip(po.status,po.status==='Received'?'green':po.status==='Sent'?'blue':po.status==='Cancelled'?'gray':'amber')}</td></tr>`).join('')}
  </tbody></table></div>`:`<div class="empty"><div class="ei">${ic('expense',26)}</div><h3>No purchase orders yet</h3><p>Raise a PO from a low-stock item or the button above.</p></div>`}
  </div>`}

