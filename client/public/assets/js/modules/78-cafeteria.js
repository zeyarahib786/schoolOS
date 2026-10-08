/* ---- Cafeteria (Catering & Nutrition) ---- */
M.cafeteria=()=>{const tab=getSubTab('cafe-v','overview');const subs=MEALPLANS.reduce((a,b)=>a+b.subs,0);
 const revToday=CAFEITEMS.reduce((a,i)=>a+i.price*i.sold,0);
 return `<div class="page-head"><div class="ph-l"><h2>Cafeteria</h2><p>Menus, meal plans, cashless wallets, allergy care and kitchen stock — ${subs.toLocaleString('en-AE')} active subscriptions.</p></div>
 <div class="ph-r"><button class="btn" onclick="setSubTab('cafe-v','menu')">${ic('cal',16)} Weekly menu</button><button class="btn primary" onclick="topUpForm()">${ic('plus',16)} Top up wallet</button></div></div>
 <div class="grid cols-4" style="margin-bottom:18px">
   ${kpi('cafeteria','#17A24A','Subscriptions',subs.toLocaleString('en-AE'),null)}${kpi('fees','#2563EB','Revenue · today',aed(revToday),{dir:'up',v:'live',note:''})}
   ${kpi('health','#E2920C','Allergy plans',String(CAFEALG.length),null)}${kpi('reports','#0E7C39','Meals served · today','1,240',null)}</div>
 ${subTabs('cafe-v',[['overview','Overview','cafeteria'],['menu','Weekly menu','cal'],['plans','Meal plans','reports'],['wallets','Wallets','fees'],['allergy','Allergies','health'],['stock','Kitchen stock','inv']])}
 ${tab==='menu'?cafeMenu():tab==='plans'?cafePlans():tab==='wallets'?cafeWallets():tab==='allergy'?cafeAllergy():tab==='stock'?cafeStock():cafeOverview()}`};

function cafeOverview(){const today=MENU[0];const lowBal=WALLETS.filter(w=>w.bal<20).length;const lowStock=CAFESTOCK.filter(s=>s.stock<s.min).length;const float=WALLETS.reduce((a,w)=>a+w.bal,0);
 return `<div class="grid cols-2" style="margin-bottom:18px">
  <div class="card pad"><div class="sec-head" style="margin-bottom:8px"><h3 style="font-size:15px">Today's menu · ${today ? today.day : 'Not configured'}</h3><span class="badge b-green"><span class="bd"></span>Live</span></div>
   ${today ? [['Breakfast',today.b],['Lunch',today.l],['Snack',today.s]].map(([lbl,m])=>`<div class="flex ac jb" style="padding:10px 0;border-bottom:1px solid var(--line-soft)"><div style="min-width:0"><div style="font-size:11px;color:var(--slate-500);font-weight:700;text-transform:uppercase;letter-spacing:.04em">${lbl}</div><div style="font-size:13.5px;color:var(--slate-900);font-weight:600;margin-top:2px">${m.item}</div><div class="muted" style="font-size:11.5px;margin-top:2px">${m.cal} kcal${m.alg.length?' · '+m.alg.join(', '):''}</div></div><span class="badge b-${m.veg?'green':'amber'}"><span class="bd"></span>${m.veg?'Veg':'Non-veg'}</span></div>`).join('') : '<p class="muted">No menu configured. Add meals in the Weekly menu tab.</p>'}</div>
  <div class="card pad"><div class="sec-head" style="margin-bottom:8px"><h3 style="font-size:15px">Top sellers today</h3></div>
   ${CAFEITEMS.slice().sort((a,b)=>b.sold-a.sold).map(i=>{const pct=Math.round(i.sold/210*100);return `<div style="padding:8px 0"><div class="flex ac jb" style="margin-bottom:5px"><span style="font-size:13px;color:var(--slate-800);font-weight:600">${i.item}</span><span class="num muted" style="font-size:12px">${i.sold} sold · ${aed(i.price)}</span></div>${cbar(pct,'green')}</div>`}).join('')}</div>
  </div>
  <div class="grid cols-4" style="margin-bottom:18px">${miniStat('Wallet float',aed(float),'blue')}${miniStat('Low balances',String(lowBal),lowBal?'amber':'green')}${miniStat('Low stock items',String(lowStock),lowStock?'red':'green')}${miniStat('Avg. spend / day',aed(19),'green')}</div>
  <div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Recent transactions</h3></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Item</th><th>Method</th><th>Time</th><th class="right">Amount</th></tr></thead><tbody>
  ${CAFETXN.map(t=>`<tr><td>${cellUser(t.name,'')}</td><td>${t.item}</td><td class="muted">${t.method}</td><td class="num muted">${t.time}</td><td class="right num" style="font-weight:700;color:${t.amt<0?'var(--slate-800)':'var(--brand-deep)'}">${t.amt<0?'−':'+'}${aed(Math.abs(t.amt))}</td></tr>`).join('')}
  </tbody></table></div></div>`}

function cafeMenu(){return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Weekly menu</h3><button class="btn sm primary" onclick="menuForm()">${ic('plus',14)} Add menu item</button></div>
 <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Day</th><th>Breakfast</th><th>Lunch</th><th>Snack</th></tr></thead><tbody>
 ${MENU.map(d=>`<tr><td style="font-weight:700;color:var(--slate-900);vertical-align:top">${d.day}</td>${[d.b,d.l,d.s].map(m=>`<td style="vertical-align:top"><div style="font-size:12.5px;color:var(--slate-800);font-weight:600">${m.item}</div><div class="flex ac" style="gap:6px;margin-top:4px;flex-wrap:wrap"><span class="badge b-${m.veg?'green':'amber'}" style="font-size:9.5px"><span class="bd"></span>${m.veg?'Veg':'Non-veg'}</span><span class="muted num" style="font-size:11px">${m.cal} kcal</span>${m.alg.length?`<span class="muted" style="font-size:10.5px">· ${m.alg.join(', ')}</span>`:''}</div></td>`).join('')}</tr>`).join('')}
 </tbody></table></div>
 <div class="muted" style="font-size:11.5px;margin-top:12px">All items halal-certified. Allergen tags shown per dish; allergy-safe trays are prepared separately in a nut-free zone.</div></div>`}

function cafePlans(){const subs=MEALPLANS.reduce((a,b)=>a+b.subs,0);return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Meal plans</h3><button class="btn sm primary" onclick="planForm()">${ic('plus',14)} Add plan</button></div>
 <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Plan</th><th>Meals included</th><th class="right">Termly price</th><th class="right">Subscribers</th><th style="width:180px">Share</th></tr></thead><tbody>
 ${MEALPLANS.map(m=>{const pct=Math.round(m.subs/subs*100)||0;return `<tr><td style="font-weight:600;color:var(--slate-900)">${m.plan}</td><td class="muted" style="font-size:12px">${m.meals}</td><td class="right num">${aed(m.price)}</td><td class="right num">${m.subs}</td><td><div class="flex ac" style="gap:10px">${cbar(pct,m.c)}<span class="num" style="font-size:12px;font-weight:600;color:var(--slate-700);min-width:34px">${pct}%</span></div></td></tr>`}).join('')}
 </tbody></table></div>
 <div class="grid cols-3" style="margin-top:16px">${miniStat('Total subscribers',subs.toLocaleString('en-AE'),'blue')}${miniStat('Plans offered',String(MEALPLANS.length),'green')}${miniStat('Avg. plan price',aed(Math.round(MEALPLANS.reduce((a,m)=>a+m.price,0)/MEALPLANS.length)),'amber')}</div></div>`}

function cafeWallets(){const f=getFilter('cafe-wal','All');const list=WALLETS.filter(w=>f==='All'||(f==='Low balance'&&w.bal<20));
 return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Student wallets</h3><div class="flex ac" style="gap:10px">${segBtns('cafe-wal',['All','Low balance'],'All')}<button class="btn sm primary" onclick="topUpForm()">${ic('plus',14)} Top up</button></div></div>
 <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Grade</th><th>Plan</th><th>Last top-up</th><th class="right">Balance</th><th></th></tr></thead><tbody>
 ${list.map(w=>`<tr style="cursor:pointer" onclick="openDrawer(walletDetail('${w.id}'))"><td>${cellUser(w.name,w.id)}</td><td>${w.grade}</td><td class="muted" style="font-size:12px">${w.plan}</td><td class="num muted">${w.last}</td><td class="right num" style="font-weight:700;color:${w.bal<20?'var(--red)':'var(--brand-deep)'}">${aed(w.bal)}</td><td class="right" onclick="event.stopPropagation()">${w.bal<20?`<button class="btn sm primary" onclick="topUpForm('${w.name}')">Top up</button>`:''}</td></tr>`).join('')}
 </tbody></table></div></div>`}

function cafeAllergy(){return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Allergy &amp; dietary care plans</h3><button class="btn sm primary" onclick="allergyForm()">${ic('plus',14)} Add plan</button></div>
 <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Grade</th><th>Allergens</th><th>Severity</th><th>Care plan</th></tr></thead><tbody>
 ${CAFEALG.map(a=>{const sc=a.sev==='Severe'?'red':a.sev==='Moderate'?'amber':'gray';return `<tr><td>${cellUser(a.name,'')}</td><td>${a.grade}</td><td style="font-weight:600;color:var(--slate-800)">${a.allergens}</td><td>${chip(a.sev,sc)}</td><td class="muted" style="font-size:12px">${a.plan}</td></tr>`}).join('')}
 </tbody></table></div>
 <div class="muted" style="font-size:11.5px;margin-top:12px">Severe allergies are flagged at the point-of-sale terminal — cashiers see an alert before serving. EpiPens are stored in the clinic and cafeteria office.</div></div>`}

function cafeStock(){return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Kitchen stock</h3><div class="flex ac" style="gap:10px"><button class="btn sm" onclick="toast('Purchase order raised')">${ic('expense',14)} Raise PO</button><button class="btn sm primary" onclick="stockForm()">${ic('plus',14)} Add item</button></div></div>
 <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Item</th><th>Category</th><th>Vendor</th><th class="right">In stock</th><th class="right">Min</th><th>Status</th></tr></thead><tbody>
 ${CAFESTOCK.map(s=>{const low=s.stock<s.min;const near=s.stock<s.min*1.15;return `<tr><td style="font-weight:600;color:var(--slate-900)">${s.item}</td><td>${s.cat}</td><td class="muted">${s.vendor}</td><td class="right num">${s.stock} ${s.unit}</td><td class="right num muted">${s.min} ${s.unit}</td><td>${low?chip('Reorder','red'):near?chip('Low','amber'):chip('In stock','green')}</td></tr>`}).join('')}
 </tbody></table></div></div>`}

function walletDetail(id){const w=WALLETS.find(x=>x.id===id);const tx=CAFETXN.filter(t=>t.name===w.name);
 return detailDrawer({title:w.name,sub:w.id+' · '+w.grade,color:w.bal<20?'#E11D2A':'#17A24A',
  stats:[['Balance',aed(w.bal),w.bal<20?'red':'green'],['Plan',w.plan.split(' · ')[0],'blue'],['Last top-up',w.last,'amber'],['Status',w.bal<20?'Low':'Healthy',w.bal<20?'red':'green']],
  sections:[{h:'Recent activity',html:tx.length?`<div class="card pad" style="box-shadow:none">${tx.map(t=>`<div class="flex ac jb" style="padding:7px 0"><span style="font-size:12.5px;color:var(--slate-700)">${t.item}</span><span class="num" style="font-weight:600;color:${t.amt<0?'var(--slate-800)':'var(--brand-deep)'}">${t.amt<0?'−':'+'}${aed(Math.abs(t.amt))}</span></div>`).join('')}</div>`:'<div class="muted" style="font-size:13px">No recent transactions.</div>'}],
  footer:[['Sell meal (POS)',"posSell('"+w.name.replace(/'/g,"\\'")+"')"],['Top up wallet','topUpForm(\''+w.name.replace(/'/g,'')+'\')',true]]})}
window.posSell=function(name){const alg=CAFEALG.find(a=>a.name===name);const w=WALLETS.find(x=>x.name===name);
 if(alg){toast('Allergy alert: '+alg.allergens+' ('+alg.sev+') - confirm meal matches "'+alg.plan+'" before serving');logAudit('POS allergy alert shown - '+name+' - '+alg.allergens,'Cafeteria');return}
 if(!w||w.bal<15){toast('Insufficient balance - top up required before sale');return}
 w.bal-=15;w.last='Today';CAFETXN.unshift({name,item:'Lunch meal',amt:-15,type:'Purchase',time:'Just now'});logAudit('POS sale - '+name+' - AED 15','Cafeteria');closeDrawer();render();toast('Meal sold - '+name+' - AED 15 deducted, no allergy conflicts')};

function topUpForm(name){formDrawer('Top up wallet','Cafeteria cashless wallet',[{label:'Student name',key:'name',req:true,opts:WALLETS.map(w=>w.name),val:name||''},{label:'Amount (AED)',key:'amount',type:'number',ph:'e.g. 100'},{label:'Method',key:'method',opts:['Card','Bank transfer','Online portal','Cash']}],'Top up','','topUpWallet')}
window.topUpWallet=function(v){const name=(v.name||'').trim();if(!name){toast('Student name is required');return false}const amt=parseInt(v.amount||0,10)||0;const w=WALLETS.find(x=>x.name===name);if(w){w.bal+=amt;w.last='Today'}CAFETXN.unshift({name,item:'Wallet top-up',amt:amt,type:'Top-up',time:'Now',method:v.method||'Card'});closeDrawer();render();toast('Wallet topped up · '+aed(amt)+' for '+name);return false};
function menuForm(){formDrawer('Add menu item','Weekly menu',[{label:'Day',key:'day',half:true,opts:['Sunday','Monday','Tuesday','Wednesday','Thursday']},{label:'Meal',key:'meal',half:true,opts:['Breakfast','Lunch','Snack']},{label:'Dish name',key:'item',req:true},{label:'Calories',key:'cal',type:'number',half:true},{label:'Vegetarian',key:'veg',half:true,opts:['Yes','No']},{label:'Allergens',key:'alg',ph:'e.g. Gluten, Dairy'}],'Add to menu','','addMenu')}
window.addMenu=function(v){const item=(v.item||'').trim();if(!item){toast('Dish name is required');return false}const day=MENU.find(d=>d.day===(v.day||'Sunday'))||MENU[0];const slot=v.meal==='Lunch'?'l':v.meal==='Snack'?'s':'b';day[slot]={item,cal:parseInt(v.cal||0,10)||0,veg:(v.veg||'Yes')==='Yes',alg:(v.alg||'').split(',').map(x=>x.trim()).filter(Boolean)};closeDrawer();render();toast('Menu updated · '+item);return false};
function planForm(){formDrawer('Add meal plan','Cafeteria subscription',[{label:'Plan name',key:'plan',req:true},{label:'Meals included',key:'meals',ph:'e.g. Lunch · Snack'},{label:'Termly price (AED)',key:'price',type:'number'}],'Add plan','','addPlan')}
window.addPlan=function(v){const plan=(v.plan||'').trim();if(!plan){toast('Plan name is required');return false}MEALPLANS.push({plan,price:parseInt(v.price||0,10)||0,subs:0,meals:v.meals||'Lunch',c:'blue'});closeDrawer();render();toast('Meal plan added · '+plan);return false};
function allergyForm(){formDrawer('Add allergy plan','Dietary care',[{label:'Student name',key:'name',req:true,opts:STUDENTS.map(s=>s.name+' - '+s.grade)},{label:'Severity',key:'sev',half:true,opts:['Severe','Moderate','Mild']},{label:'Allergens',key:'allergens',req:true},{label:'Care plan',key:'plan',area:true}],'Save plan','','addAllergy')}
window.addAllergy=function(v){const pick=(v.name||'').trim();if(!pick){toast('Student name is required');return false}
 const name=pick.split(' - ')[0].trim();const st=STUDENTS.find(s=>s.name===name);const grade=st?st.grade:'—';
 CAFEALG.unshift({name,grade,allergens:v.allergens||'—',sev:v.sev||'Moderate',plan:v.plan||'—'});closeDrawer();render();toast('Allergy plan added · '+name);return false};
function stockForm(){formDrawer('Add stock item','Kitchen inventory',[{label:'Item',key:'item',req:true},{label:'Category',key:'cat',half:true,opts:['Grains','Protein','Produce','Dairy','Pantry','Bakery']},{label:'Unit',key:'unit',half:true,opts:['kg','L','packs','units']},{label:'In stock',key:'stock',type:'number',half:true},{label:'Reorder min',key:'min',type:'number',half:true},{label:'Vendor',key:'vendor'}],'Add item','','addCafeStock')}
window.addCafeStock=function(v){const item=(v.item||'').trim();if(!item){toast('Item name is required');return false}CAFESTOCK.push({item,cat:v.cat||'Pantry',stock:parseInt(v.stock||0,10)||0,min:parseInt(v.min||0,10)||0,unit:v.unit||'kg',vendor:v.vendor||'—'});closeDrawer();render();toast('Stock item added · '+item);return false};


