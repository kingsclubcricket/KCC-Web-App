const seedBookings = [
  {id:'BID001',date:'2026-09-26',slot:'07:00',team:'Krishna XI',captain:'Krishna',phone:'9000999489',advance:2000,balance:5500,total:7500,status:'Confirmed',notes:'Paid'},
  {id:'BID002',date:'2026-09-26',slot:'10:30',team:'Vilasagar XI',captain:'Vilas',phone:'9553589470',advance:2000,balance:4000,total:6000,status:'Confirmed',notes:''},
  {id:'BID003',date:'2026-09-26',slot:'14:00',team:'Manikanta XI',captain:'Manikanta',phone:'9848055957',advance:2000,balance:4500,total:6000,status:'Confirmed',notes:''},
  {id:'BID004',date:'2026-09-27',slot:'07:00',team:'Naresh XI',captain:'Naresh',phone:'7702503407',advance:2000,balance:5500,total:7500,status:'Confirmed',notes:'Paid'},
  {id:'BID005',date:'2026-09-27',slot:'10:30',team:'Siddi XI',captain:'Siddi',phone:'8970921455',advance:2000,balance:4500,total:6000,status:'Confirmed',notes:''},
  {id:'BID006',date:'2026-09-27',slot:'14:00',team:'Raja XI',captain:'Raja',phone:'8886578442',advance:2000,balance:4500,total:6500,status:'Confirmed',notes:'Partial'},
  {id:'BID007',date:'2026-10-02',slot:'07:00',team:'Vilasagar XI',captain:'Vilasagar',phone:'9553589470',advance:2000,balance:4500,total:6500,status:'Confirmed',notes:''},
  {id:'BID008',date:'2026-10-02',slot:'10:30',team:'Siddi XI',captain:'Siddi',phone:'8970921455',advance:2000,balance:3500,total:5500,status:'Pending',notes:'Balance pending'},
  {id:'BID009',date:'2026-10-02',slot:'14:00',team:'Ramesh XI',captain:'Ramesh',phone:'',advance:2000,balance:4000,total:6000,status:'Pending',notes:'Phone needed'},
  {id:'BID010',date:'2026-10-03',slot:'07:00',team:'Chaitanya XI',captain:'Chaitanya',phone:'9618861239',advance:2000,balance:5500,total:7500,status:'Confirmed',notes:''},
  {id:'BID011',date:'2026-10-03',slot:'14:00',team:'Karthik XI',captain:'Karthik',phone:'',advance:0,balance:6000,total:6000,status:'Pending',notes:'Advance due'},
  {id:'BID012',date:'2026-10-04',slot:'07:00',team:'Nani XI',captain:'Nani',phone:'8970921455',advance:2000,balance:5500,total:7500,status:'Confirmed',notes:''}
];
const seedExpenses = [
  {id:'EXP-103',date:'2026-09-28',item:'Ground staff wages',category:'Ground care',amount:13000,status:'Paid'},
  {id:'EXP-104',date:'2026-09-28',item:'Water delivery',category:'Utilities',amount:1200,status:'Paid'},
  {id:'EXP-105',date:'2026-09-29',item:'Pitch preparation',category:'Ground care',amount:2050,status:'Paid'},
  {id:'EXP-106',date:'2026-09-30',item:'Floodlight electrician',category:'Maintenance',amount:1550,status:'Pending'},
  {id:'EXP-107',date:'2026-09-30',item:'Cricket balls',category:'Equipment',amount:8000,status:'Paid'}
];

const store = {
  bookings: JSON.parse(localStorage.getItem('kcc-bookings') || 'null') || seedBookings,
  blocked: JSON.parse(localStorage.getItem('kcc-blocked') || 'null') || [{date:'2026-10-01',slot:'14:00',reason:'Pitch rolling'}],
  clients: [], expenses: seedExpenses,
  invoices: [
    {id:'INV-2026-041',client:'Vilasagar XI',date:'2026-09-26',amount:6000,status:'Paid'},
    {id:'INV-2026-042',client:'Manikanta XI',date:'2026-09-26',amount:6000,status:'Paid'},
    {id:'INV-2026-043',client:'Raja XI',date:'2026-09-27',amount:6500,status:'Partial'},
    {id:'INV-2026-044',client:'Siddi XI',date:'2026-10-02',amount:5500,status:'Due'}
  ]
};
store.clients = [...new Map(store.bookings.map(b => [b.captain, {id:`CL-${b.id.slice(-3)}`,name:b.captain,team:b.team,phone:b.phone,email:'',bookings:store.bookings.filter(x=>x.captain===b.captain).length,status:b.phone?'Active':'Needs info'}])).values()];

const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const money = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n);
const shortDate = d => new Date(`${d}T12:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
const initials = s => s.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
const statusClass = s => s.toLowerCase().replace(/\s+/g,'-');
const save = () => { localStorage.setItem('kcc-bookings',JSON.stringify(store.bookings)); localStorage.setItem('kcc-blocked',JSON.stringify(store.blocked)); };
const toast = msg => { const el=$('#toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2400); };

function showApp() { $('#login-screen').classList.add('hidden'); $('#app-shell').classList.remove('hidden'); renderAll(); }
$('#login-form').addEventListener('submit', e => { e.preventDefault(); const email=$('#email').value.trim(); const pw=$('#password').value; if(email==='kccground@gmail.com' && pw==='KCC@2026'){ sessionStorage.setItem('kcc-auth','1'); showApp(); } else toast('Use the prototype credentials shown in the form.'); });
$('#toggle-password').onclick = () => { const p=$('#password'); p.type=p.type==='password'?'text':'password'; $('#toggle-password').textContent=p.type==='password'?'Show':'Hide'; };
$('#logout').onclick = () => { sessionStorage.removeItem('kcc-auth'); location.reload(); };
$('#menu-toggle').onclick = () => document.body.classList.toggle('menu-open');

$$('.nav-item').forEach(btn => btn.onclick = () => switchView(btn.dataset.view));
function switchView(view){ $$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===view)); $$('.view').forEach(x=>x.classList.toggle('active',x.id===`view-${view}`)); document.body.classList.remove('menu-open'); window.scrollTo({top:0,behavior:'smooth'}); }

const pageHeader = (eyebrow,title,subtitle,actions='') => `<div class="page-header"><div><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${subtitle}</p></div><div class="header-actions">${actions}</div></div>`;
const metric = (label,value,foot,icon,accent='') => `<article class="metric-card" ${accent?`style="--accent:${accent};--accent-soft:${accent}18"`:''}><div class="metric-card-top"><span>${label}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-foot">${foot}</div></article>`;

function renderAll(){
  $('#nav-booking-count').textContent=store.bookings.length;
  renderDashboard(); renderBookings(); renderClients(); renderPayments(); renderInvoices(); renderMaintenance(); renderOnboarding();
  bindDynamicActions();
}

function renderDashboard(){
  const october=store.bookings.filter(b=>b.date.startsWith('2026-10'));
  const income=october.reduce((s,b)=>s+b.total,0), advances=october.reduce((s,b)=>s+b.advance,0), expenses=store.expenses.reduce((s,e)=>s+e.amount,0), due=october.reduce((s,b)=>s+Math.max(0,b.total-b.advance),0);
  const upcoming=[...store.bookings].filter(b=>b.date>='2026-09-30').sort((a,b)=>(a.date+a.slot).localeCompare(b.date+b.slot)).slice(0,5);
  const months=['May','Jun','Jul','Aug','Sep','Oct']; const inc=[62,74,83,91,78,100], exp=[44,53,49,66,58,61];
  $('#view-dashboard').innerHTML = pageHeader('GROUND OPERATIONS','Good afternoon, Saurav','Here is what is happening at Kings Club Cricket Ground.','<button class="secondary-button" data-action="block-date">＋ Block date</button><button class="primary-button" data-action="add-booking">＋ New booking</button>')+
  `<div class="metric-grid">${metric('OCTOBER COLLECTIONS',money(income),'Includes confirmed and pending bookings','₹','#b71f24')}${metric('ADVANCES RECEIVED',money(advances),'<b>↑ 8.4%</b> from last month','↗','#24704a')}${metric('OUTSTANDING BALANCE',money(due),'Across upcoming bookings','◷','#d48b1d')}${metric('MONTHLY EXPENSES',money(expenses),'5 tracked expense entries','⌁','#5c5147')}</div>
  <div class="dashboard-grid"><article class="panel"><div class="panel-header"><div><h2>Cash flow overview</h2><p>Collections compared with operating expenses</p></div><button class="panel-link">LAST 6 MONTHS⌄</button></div><div class="chart-wrap">${months.map((m,i)=>`<div class="bar-group"><i class="bar income" style="height:${inc[i]}%"></i><i class="bar" style="height:${exp[i]}%"></i><label>${m}</label></div>`).join('')}</div><div class="chart-legend"><span><i></i>Collections</span><span><i></i>Expenses</span></div></article>
  <article class="panel"><div class="panel-header"><div><h2>Upcoming schedule</h2><p>Next five ground slots</p></div><button class="panel-link" data-nav="bookings">VIEW ALL</button></div><div class="schedule-list">${upcoming.map(b=>`<div class="schedule-item"><div class="schedule-time"><strong>${b.slot}</strong><br>${new Date(b.date+'T12:00:00').toLocaleDateString('en-IN',{month:'short',day:'numeric'})}</div><div class="schedule-detail"><strong>${b.team}</strong><span>${b.captain} · ${b.phone||'Phone missing'}</span></div><span class="status ${statusClass(b.status)}">${b.status}</span></div>`).join('')}</div></article></div>
  <div class="lower-grid"><article class="panel"><div class="panel-header"><div><h2>Recent activity</h2><p>Latest updates across the workspace</p></div></div><div class="activity-list"><div class="activity-item"><span class="activity-dot">₹</span><div><strong>Payment recorded from Krishna XI</strong><span>Booking BID001 · Full payment</span></div><time>24 min</time></div><div class="activity-item"><span class="activity-dot">✓</span><div><strong>New booking confirmed for Chaitanya XI</strong><span>Oct 3 · Morning slot</span></div><time>1 hr</time></div><div class="activity-item"><span class="activity-dot">◇</span><div><strong>Floodlight repair added</strong><span>Assigned to ground team</span></div><time>3 hrs</time></div><div class="activity-item"><span class="activity-dot">▤</span><div><strong>Invoice INV-2026-044 created</strong><span>Siddi XI · ${money(5500)}</span></div><time>Yesterday</time></div></div></article>
  <article class="panel"><div class="panel-header"><div><h2>Quick actions</h2><p>Common admin tasks</p></div></div><div class="quick-actions"><button class="quick-action" data-action="add-booking"><span>＋</span>New booking</button><button class="quick-action" data-action="add-client"><span>♙</span>Add client</button><button class="quick-action" data-nav="payments"><span>₹</span>Record payment</button><button class="quick-action" data-nav="invoices"><span>▤</span>Create invoice</button></div></article></div>`;
}

function renderBookings(filter=''){
  const rows=store.bookings.filter(b=>Object.values(b).join(' ').toLowerCase().includes(filter.toLowerCase()));
  const days=['2026-09-28','2026-09-29','2026-09-30','2026-10-01','2026-10-02','2026-10-03','2026-10-04'];
  $('#view-bookings').innerHTML=pageHeader('SCHEDULE','Bookings','Manage playing slots, client details, and blocked dates.','<button class="secondary-button" data-action="block-date">＋ Block date</button><button class="primary-button" data-action="add-booking">＋ New booking</button>')+
  `<div class="calendar-strip">${days.map(d=>{const bs=store.bookings.filter(b=>b.date===d), blocked=store.blocked.filter(b=>b.date===d);return `<div class="day-card ${d==='2026-09-30'?'today':''}"><h3>${new Date(d+'T12:00:00').toLocaleDateString('en-US',{weekday:'short'})}<span>${new Date(d+'T12:00:00').getDate()}</span></h3>${['07:00','10:30','14:00'].map(s=>{const b=bs.find(x=>x.slot===s), bl=blocked.find(x=>x.slot===s);return `<span class="slot-dot ${bl?'blocked':b?'':'open'}">${s} · ${bl?'Blocked':b?b.team:'Open'}</span>`}).join('')}</div>`}).join('')}</div>
  <div class="toolbar"><div class="toolbar-left"><input class="table-search" id="booking-search" placeholder="Search booking, team, captain…" value="${filter}"><select><option>All statuses</option><option>Confirmed</option><option>Pending</option></select></div><button class="secondary-button">⇩ Export</button></div>
  <div class="table-wrap"><table><thead><tr><th>Booking</th><th>Date & slot</th><th>Client</th><th>Advance</th><th>Balance</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(b=>`<tr><td><strong>${b.id}</strong><br><small>${b.team}</small></td><td>${shortDate(b.date)}<br><small>${b.slot}</small></td><td><div class="client-cell"><span class="mini-avatar">${initials(b.captain)}</span><div><strong>${b.captain}</strong><small>${b.phone||'Phone missing'}</small></div></div></td><td class="amount">${money(b.advance)}</td><td class="amount ${b.balance?'due':''}">${money(b.balance)}</td><td><span class="status ${statusClass(b.status)}">${b.status}</span></td><td><div class="row-actions"><button class="row-button" data-edit-booking="${b.id}" title="Edit">✎</button><button class="row-button" data-delete-booking="${b.id}" title="Delete">×</button></div></td></tr>`).join('')}</tbody></table>${rows.length?'':'<div class="empty-state">No bookings match your search.</div>'}</div>`;
  $('#booking-search').oninput=e=>renderBookings(e.target.value);
}

function renderClients(){
  $('#view-clients').innerHTML=pageHeader('CRM','Clients','Keep captain, team, and contact information in one place.','<button class="primary-button" data-action="add-client">＋ Add client</button>')+`<div class="toolbar"><div class="toolbar-left"><input class="table-search" placeholder="Search clients…"><select><option>All clients</option><option>Active</option><option>Needs info</option></select></div></div><div class="table-wrap"><table><thead><tr><th>Client</th><th>Team</th><th>Phone</th><th>Total bookings</th><th>Profile status</th><th></th></tr></thead><tbody>${store.clients.map(c=>`<tr><td><div class="client-cell"><span class="mini-avatar">${initials(c.name)}</span><div><strong>${c.name}</strong><small>${c.id}</small></div></div></td><td>${c.team}</td><td>${c.phone||'—'}</td><td>${c.bookings}</td><td><span class="status ${c.status==='Active'?'complete':'pending'}">${c.status}</span></td><td><button class="row-button" data-action="add-client">✎</button></td></tr>`).join('')}</tbody></table></div>`;
}

function renderPayments(){
  const receipts=store.bookings.map(b=>({id:`PAY-${b.id.slice(-3)}`,date:b.date,client:b.team,method:'UPI',amount:b.advance,status:b.advance?'Paid':'Due'}));
  $('#view-payments').innerHTML=pageHeader('FINANCE','Payments','Track advances, balances, receipts, and ground expenses.','<button class="secondary-button">＋ Add expense</button><button class="primary-button" data-action="record-payment">＋ Record payment</button>')+`<div class="metric-grid">${metric('TOTAL ADVANCES',money(receipts.reduce((s,p)=>s+p.amount,0)),'From current booking records','₹')}${metric('BALANCE DUE',money(store.bookings.reduce((s,b)=>s+b.balance,0)),'Collect before each match','◷','#b71f24')}${metric('EXPENSES',money(store.expenses.reduce((s,e)=>s+e.amount,0)),'Ground and equipment costs','⌁','#5c5147')}${metric('NET POSITION',money(receipts.reduce((s,p)=>s+p.amount,0)-store.expenses.reduce((s,e)=>s+e.amount,0)),'Advance cash less expenses','↗','#24704a')}</div><div class="table-wrap"><table><thead><tr><th>Receipt</th><th>Date</th><th>Client / team</th><th>Method</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${receipts.map(p=>`<tr><td><strong>${p.id}</strong></td><td>${shortDate(p.date)}</td><td>${p.client}</td><td>${p.method}</td><td class="amount">${money(p.amount)}</td><td><span class="status ${statusClass(p.status)}">${p.status}</span></td><td><button class="row-button">⋯</button></td></tr>`).join('')}</tbody></table></div>`;
}

function renderInvoices(){
  $('#view-invoices').innerHTML=pageHeader('BILLING','Invoices','Create and track client invoices against confirmed bookings.','<button class="primary-button" data-action="new-invoice">＋ Create invoice</button>')+`<div class="metric-grid">${metric('INVOICED',money(store.invoices.reduce((s,i)=>s+i.amount,0)),'Across current invoices','▤')}${metric('PAID',money(store.invoices.filter(i=>i.status==='Paid').reduce((s,i)=>s+i.amount,0)),'Settled invoices','✓','#24704a')}${metric('PARTIAL',money(store.invoices.filter(i=>i.status==='Partial').reduce((s,i)=>s+i.amount,0)),'Payment follow-up needed','◷','#d48b1d')}${metric('DUE',money(store.invoices.filter(i=>i.status==='Due').reduce((s,i)=>s+i.amount,0)),'Open invoice balance','!','#b71f24')}</div><div class="table-wrap"><table><thead><tr><th>Invoice</th><th>Issued</th><th>Client</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead><tbody>${store.invoices.map(i=>`<tr><td><strong>${i.id}</strong></td><td>${shortDate(i.date)}</td><td>${i.client}</td><td class="amount">${money(i.amount)}</td><td><span class="status ${statusClass(i.status)}">${i.status}</span></td><td><div class="row-actions"><button class="row-button" title="Preview">⌕</button><button class="row-button" title="Download">⇩</button></div></td></tr>`).join('')}</tbody></table></div>`;
}

function renderMaintenance(){
  $('#view-maintenance').innerHTML=pageHeader('GROUND CARE','Maintenance','Plan repairs, supplies, pitch work, and recurring upkeep.','<button class="primary-button">＋ Add task</button>')+`<div class="kanban"><section class="kanban-col"><div class="kanban-title"><span>TO DO</span><span>3</span></div><article class="task-card"><span class="status urgent">Urgent</span><strong>Repair north floodlight</strong><p>Light 3 is flickering during evening use.</p><div class="task-meta"><span>Electrical</span><span>Sep 30</span></div></article><article class="task-card"><span class="status pending">Medium</span><strong>Order match balls</strong><p>Replenish stock before weekend games.</p><div class="task-meta"><span>Equipment</span><span>Oct 1</span></div></article><article class="task-card"><span class="status confirmed">Routine</span><strong>Refill drinking water</strong><p>Schedule two tanker deliveries.</p><div class="task-meta"><span>Utilities</span><span>Oct 2</span></div></article></section><section class="kanban-col"><div class="kanban-title"><span>IN PROGRESS</span><span>2</span></div><article class="task-card"><span class="status pending">Medium</span><strong>Second pitch preparation</strong><p>Rolling and crease marking underway.</p><div class="task-meta"><span>Naresh</span><span>Today</span></div></article><article class="task-card"><span class="status confirmed">Routine</span><strong>Boundary rope check</strong><p>Replace worn clips on the east side.</p><div class="task-meta"><span>Ground team</span><span>Today</span></div></article></section><section class="kanban-col"><div class="kanban-title"><span>COMPLETED</span><span>2</span></div><article class="task-card"><span class="status complete">Complete</span><strong>Camera system check</strong><p>CCTV and recording equipment tested.</p><div class="task-meta"><span>Naresh</span><span>Sep 28</span></div></article><article class="task-card"><span class="status complete">Complete</span><strong>Wi-Fi renewal</strong><p>Monthly ground connection renewed.</p><div class="task-meta"><span>Admin</span><span>Sep 27</span></div></article></section></div>`;
}

function renderOnboarding(){
  $('#view-onboarding').innerHTML=pageHeader('CLIENT SETUP','Onboarding','A consistent checklist for every new captain and team.','<button class="primary-button" data-action="add-client">＋ Start onboarding</button>')+`<div class="dashboard-grid"><article class="panel"><div class="panel-header"><div><h2>New client checklist</h2><p>Vilasagar XI · 4 of 6 steps complete</p></div><span class="status pending">In progress</span></div><div class="steps"><div class="step done"><span class="step-number">✓</span><div><strong>Contact details</strong><small>Captain name and phone verified</small></div><button class="row-button">✎</button></div><div class="step done"><span class="step-number">✓</span><div><strong>Team profile</strong><small>Team name and preferred slots recorded</small></div><button class="row-button">✎</button></div><div class="step done"><span class="step-number">✓</span><div><strong>Ground rules shared</strong><small>Client acknowledged usage guidelines</small></div><button class="row-button">⌕</button></div><div class="step done"><span class="step-number">✓</span><div><strong>Advance received</strong><small>${money(2000)} received by UPI</small></div><button class="row-button">⌕</button></div><div class="step"><span class="step-number">5</span><div><strong>Invoice details</strong><small>Billing email or GST details required</small></div><button class="primary-button">Add</button></div><div class="step"><span class="step-number">6</span><div><strong>First booking confirmed</strong><small>Select an open date and slot</small></div><button class="primary-button" data-action="add-booking">Book</button></div></div></article><article class="panel"><div class="panel-header"><div><h2>Onboarding pipeline</h2><p>Client setup progress</p></div></div><div class="activity-list"><div class="activity-item"><span class="mini-avatar">VI</span><div><strong>Vilasagar XI</strong><span>4 of 6 complete</span></div><span class="status pending">67%</span></div><div class="activity-item"><span class="mini-avatar">RA</span><div><strong>Ramesh XI</strong><span>2 of 6 complete</span></div><span class="status overdue">33%</span></div><div class="activity-item"><span class="mini-avatar">CH</span><div><strong>Chaitanya XI</strong><span>6 of 6 complete</span></div><span class="status complete">Done</span></div></div></article></div>`;
}

function openModal(html){ $('#modal-content').innerHTML=html; $('#modal').classList.remove('hidden'); $('#modal').setAttribute('aria-hidden','false'); }
function closeModal(){ $('#modal').classList.add('hidden'); $('#modal').setAttribute('aria-hidden','true'); }
$$('[data-close-modal]').forEach(x=>x.onclick=closeModal);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal(); if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();$('#global-search').focus();}});

function bookingModal(existing){
  const b=existing||{id:`BID${String(store.bookings.length+1).padStart(3,'0')}`,date:'2026-10-04',slot:'10:30',team:'',captain:'',phone:'',advance:2000,balance:4000,total:6000,status:'Pending',notes:''};
  openModal(`<span class="eyebrow">${existing?'UPDATE':'NEW'} BOOKING</span><h2 id="modal-title">${existing?'Edit booking':'Add a ground booking'}</h2><p class="modal-subtitle">Assign a date and slot, then capture client and payment details.</p><form id="booking-form"><div class="form-grid"><label>Booking ID<input name="id" value="${b.id}" readonly></label><label>Date<input name="date" type="date" value="${b.date}" required></label><label>Slot<select name="slot"><option ${b.slot==='07:00'?'selected':''}>07:00</option><option ${b.slot==='10:30'?'selected':''}>10:30</option><option ${b.slot==='14:00'?'selected':''}>14:00</option></select></label><label>Status<select name="status"><option>Confirmed</option><option ${b.status==='Pending'?'selected':''}>Pending</option><option ${b.status==='Cancelled'?'selected':''}>Cancelled</option></select></label><label>Team name<input name="team" value="${b.team}" required></label><label>Captain name<input name="captain" value="${b.captain}" required></label><label>Phone<input name="phone" value="${b.phone}" inputmode="numeric"></label><label>Total amount<input name="total" type="number" value="${b.total}" required></label><label>Advance<input name="advance" type="number" value="${b.advance}" required></label><label>Balance<input name="balance" type="number" value="${b.balance}" required></label><label class="full">Notes<textarea name="notes" rows="3">${b.notes}</textarea></label></div><div class="modal-actions"><button type="button" class="secondary-button" data-close-now>Cancel</button><button class="primary-button" type="submit">${existing?'Save changes':'Create booking'}</button></div></form>`);
  $('[data-close-now]').onclick=closeModal;
  $('#booking-form').onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));['advance','balance','total'].forEach(k=>data[k]=Number(data[k]));const idx=store.bookings.findIndex(x=>x.id===data.id); if(idx>=0)store.bookings[idx]=data;else store.bookings.push(data);save();closeModal();renderAll();switchView('bookings');toast(existing?'Booking updated.':'Booking created.');};
}

function blockDateModal(){ openModal(`<span class="eyebrow">SCHEDULE CONTROL</span><h2 id="modal-title">Block a date or slot</h2><p class="modal-subtitle">Use this for pitch maintenance, tournaments, weather closures, or private events.</p><form id="block-form"><div class="form-grid"><label>Date<input name="date" type="date" value="2026-10-05" required></label><label>Slot<select name="slot"><option>07:00</option><option>10:30</option><option>14:00</option><option value="All day">All day</option></select></label><label class="full">Reason<input name="reason" placeholder="Example: Pitch maintenance" required></label></div><div class="modal-actions"><button type="button" class="secondary-button" data-close-now>Cancel</button><button class="primary-button" type="submit">Block schedule</button></div></form>`); $('[data-close-now]').onclick=closeModal; $('#block-form').onsubmit=e=>{e.preventDefault();store.blocked.push(Object.fromEntries(new FormData(e.target)));save();closeModal();renderAll();switchView('bookings');toast('The schedule has been blocked.');}; }

function clientModal(){ openModal(`<span class="eyebrow">CLIENT CRM</span><h2 id="modal-title">Add a new client</h2><p class="modal-subtitle">Create the captain profile now. Booking and billing can follow.</p><form id="client-form"><div class="form-grid"><label>Captain name<input name="name" required></label><label>Team name<input name="team" required></label><label>Phone<input name="phone" inputmode="numeric"></label><label>Gmail address<input name="email" type="email" placeholder="captain@gmail.com"></label><label class="full">Notes<textarea name="notes" rows="3"></textarea></label></div><div class="modal-actions"><button type="button" class="secondary-button" data-close-now>Cancel</button><button class="primary-button" type="submit">Add client</button></div></form>`); $('[data-close-now]').onclick=closeModal; $('#client-form').onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));store.clients.unshift({id:`CL-${String(store.clients.length+1).padStart(3,'0')}`,bookings:0,status:d.phone?'Active':'Needs info',...d});closeModal();renderClients();switchView('clients');toast('Client profile added.');}; }

function bindDynamicActions(){
  $$('[data-nav]').forEach(el => el.onclick = () => switchView(el.dataset.nav));
  $$('[data-action]').forEach(el => el.onclick = () => {
    const action=el.dataset.action;
    if(action==='add-booking') bookingModal();
    if(action==='block-date') blockDateModal();
    if(action==='add-client') clientModal();
    if(action==='record-payment') toast('Payment form is ready for the next prototype pass.');
    if(action==='new-invoice') toast('Invoice builder is ready for the next prototype pass.');
  });
  $$('[data-edit-booking]').forEach(el => el.onclick = () => bookingModal(store.bookings.find(b=>b.id===el.dataset.editBooking)));
  $$('[data-delete-booking]').forEach(el => el.onclick = () => {
    const id=el.dataset.deleteBooking;
    if(confirm(`Remove booking ${id}?`)){ store.bookings=store.bookings.filter(b=>b.id!==id); save(); renderAll(); switchView('bookings'); toast('Booking removed.'); }
  });
}

$('#global-search').addEventListener('input',e=>{ if(e.target.value.length>1){switchView('bookings');renderBookings(e.target.value);} });
if(sessionStorage.getItem('kcc-auth')==='1') showApp();
