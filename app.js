// --- SUPABASE INIT ---
const SUPABASE_URL = 'https://zzdndookrgbxzkhuazgd.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6ZG5kb29rcmdieHpraHVhemdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NzMyMzEsImV4cCI6MjEwMDE0OTIzMX0.TLfTQ2-gw2gxr8_Nf6zuHPSMOYyH4fBmKDD0bjWBBn0';
const sup = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let db = {}, currentPortal = "admin", currentPage = "dashboard", attendanceType = "student", financeFilter = "All";
let lang = "en";

// --- I18N (MULTI-LANGUAGE) ---
const translations = {
    en: { dashboard: "Dashboard", finance: "Finance", students: "Students", staff: "Staff", logout: "Logout" },
    ur: { dashboard: "ڈیش بورڈ", finance: "مالیات", students: "طلبا", staff: "عملہ", logout: "لاگ آؤٹ" }
};
function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        let key = el.getAttribute('data-i18n');
        if (translations[lang][key]) el.innerText = translations[lang][key];
    });
}
function changeLanguage(l) { lang = l; applyTranslations(); showToast("Language changed!"); }

// --- HELPERS ---
function fmt(a) { return 'Rs. ' + a.toLocaleString('en-PK'); }
function showToast(m, e=false) { let t=document.getElementById('toastNotification'); t.innerText=(e?"⚠️ ":"✔️ ")+m; t.style.background=e?"#dc2626":"#111827"; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),3000); }
async function logAction(a) { try { await sup.from('audit_log').insert([{time:new Date().toLocaleString(), user_role:currentPortal, action:a}]); await fetchAudit(); } catch(e){} }
function openModal(t, h) { document.getElementById('modalTitle').innerText=t; document.getElementById('modalBody').innerHTML=h; document.getElementById('erpModal').classList.add('active'); }
function closeModal() { document.getElementById('erpModal').classList.remove('active'); }

// --- GENERIC CRUD MODAL (Saves 500+ lines of code) ---
function openGenericModal(title, table, fields, id=null) {
    let val = id ? db[table].find(x => x.id == id) : {};
    let html = fields.map(f => `<div class="form-group"><label>${f.label}</label><input class="form-control" id="gen_${f.name}" type="${f.type||'text'}" value="${val[f.name]||''}"></div>`).join('');
    openModal(title, html + `<button class="btn btn-primary" style="width:100%" onclick="saveGeneric('${table}', ${JSON.stringify(fields)}, ${id?'`'+id+'`':'null'})">Save</button>`);
}
async function saveGeneric(table, fields, id) {
    let data = id ? {} : { id: Date.now() };
    fields.forEach(f => data[f.name] = document.getElementById('gen_'+f.name).value);
    try {
        let res = id ? await sup.from(table).update(data).eq('id', id) : await sup.from(table).insert([data]);
        if (res.error) throw res.error;
        await logAction(`Modified ${table}`); closeModal(); await loadDB();
    } catch(e) { showToast(e.message, true); }
}
async function deleteGeneric(table, id) {
    if(!confirm("Delete this record?")) return;
    try { await sup.from(table).delete().eq('id', id); await loadDB(); showToast("Deleted."); } catch(e) { showToast(e.message, true); }
}

// --- AUTH ---
function login() { currentPortal = document.getElementById('loginRole').value; document.getElementById('loginScreen').style.display='none'; document.getElementById('mainApp').style.display='flex'; document.getElementById('portalRoleText').innerText = currentPortal.charAt(0).toUpperCase()+currentPortal.slice(1)+" Portal"; document.getElementById('userAvatar').innerText = currentPortal.charAt(0).toUpperCase(); renderNav(); navigateTo("dashboard"); }
function logout() { document.getElementById('mainApp').style.display='none'; document.getElementById('loginScreen').style.display='flex'; }

// --- DATA FETCH ---
async function loadDB() {
    if (document.getElementById('mainApp').style.display === 'flex') document.getElementById('appContent').innerHTML = '<p>Loading...</p>';
    try {
        let tables = ['students','staff','inventory','ledger','announcements','timetable','assignments','attendance_log','grades','transport','hostel_rooms','admissions','alumni','leaves','behavior_log','curriculum','virtual_class'];
        for (let t of tables) {
            let { data, error } = await sup.from(t).select('*');
            if (error) throw error;
            db[t] = data || [];
        }
        await fetchAudit();
        if (document.getElementById('mainApp').style.display === 'flex') navigateTo(currentPage);
    } catch (e) {
        document.getElementById('appContent').innerHTML = `<div class="panel" style="border-color:var(--danger);"><div class="panel-body" style="color:var(--danger);">${e.message}</div></div>`;
    }
}
async function fetchAudit() { try { let { data } = await sup.from('audit_log').select('*').order('id', { ascending: false }); db.audit_log = data || []; } catch(e){} }

// --- COMMAND PALETTE (Ctrl+K) ---
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); document.getElementById('commandPalette').style.display = 'flex'; document.getElementById('cmdInput').focus(); }
    if (e.key === 'Escape') document.getElementById('commandPalette').style.display = 'none';
});
function filterCommands() {
    let term = document.getElementById('cmdInput').value.toLowerCase();
    let cmds = [
        { name: "Go to Dashboard", act: "navigateTo('dashboard')" },
        { name: "Go to Finance", act: "navigateTo('finance')" },
        { name: "Go to Hostel", act: "navigateTo('hostel')" },
        { name: "Go to Transport", act: "navigateTo('transport')" },
        { name: "Go to Admissions CRM", act: "navigateTo('admissions')" },
        { name: "Admit New Student", act: "openStudentModal()" },
        { name: "Log Expense", act: "openTransactionModal('Expense')" }
    ];
    let filtered = cmds.filter(c => c.name.toLowerCase().includes(term));
    document.getElementById('cmdResults').innerHTML = filtered.map(c => `<div class="cmd-item" onclick="${c.act}; document.getElementById('commandPalette').style.display='none';">${c.name}</div>`).join('') || '<div class="cmd-item">No results</div>';
}

// --- ROUTING ---
const menus = {
    admin: [
        { cat: "Main", items: [{id:"dashboard",name:"Dashboard"}, {id:"announcements",name:"Announcements"}] },
        { cat: "Finance & Ops", items: [{id:"finance",name:"Finance"}, {id:"payroll",name:"Payroll"}, {id:"inventory",name:"Inventory"}, {id:"transport",name:"Transport"}, {id:"hostel",name:"Hostel"}] },
        { cat: "Academics & HR", items: [{id:"students",name:"Students"}, {id:"staff",name:"Staff"}, {id:"attendance",name:"Attendance"}, {id:"academics",name:"LMS"}, {id:"timetable",name:"Timetable"}, {id:"admissions",name:"Admissions CRM"}, {id:"alumni",name:"Alumni"}, {id:"leaves",name:"HR & Leaves"}, {id:"behavior",name:"Behavior Log"}] },
        { cat: "System", items: [{id:"audit",name:"Audit Trail"}] }
    ]
};
function renderNav() { let h=''; menus[currentPortal].forEach(c=>{ h+=`<div class="nav-category">${c.cat}</div>`; c.items.forEach(i=>{ h+=`<div class="nav-item ${i.id===currentPage?'active':''}" onclick="navigateTo('${i.id}')">${i.name}</div>`; }); }); document.getElementById('navMenu').innerHTML=h; }
function navigateTo(p) { currentPage=p; renderNav(); let c=document.getElementById('appContent'); let fn = window[`get${p.charAt(0).toUpperCase()+p.slice(1)}HTML`]; c.innerHTML = fn ? fn() : '<p>Module not found.</p>'; if(p==='timetable') renderTimetableTable(); if(p==='finance') renderFinanceTable(); }

// --- HTML GENERATORS ---
function getDashboardHTML() {
    let inc = db.ledger.filter(t=>t.type==='Income').reduce((a,b)=>a+b.amount,0);
    let exp = db.ledger.filter(t=>t.type==='Expense').reduce((a,b)=>a+b.amount,0);
    return `<div class="grid-4">
        <div class="stat-card"><div class="label">Cash in Bank</div><div class="value" style="color:var(--success)">${fmt(inc-exp)}</div></div>
        <div class="stat-card"><div class="label">Total Students</div><div class="value">${db.students.length}</div></div>
        <div class="stat-card"><div class="label">Total Staff</div><div class="value">${db.staff.length}</div></div>
        <div class="stat-card"><div class="label">Pending Fees</div><div class="value" style="color:var(--danger)">${fmt(db.students.reduce((a,s)=>a+(s.total-s.paid),0))}</div></div>
    </div>`;
}
function getFinanceHTML() { return `<div class="panel"><div class="panel-header"><h3>Ledger</h3><button class="btn btn-danger btn-sm" onclick="openTransactionModal('Expense')">Log Expense</button></div><div class="table-wrapper"><table><thead><tr><th>Date</th><th>Desc</th><th>Type</th><th>Amount</th></tr></thead><tbody id="finTbody"></tbody></table></div></div>`; }
function renderFinanceTable() { document.getElementById('finTbody').innerHTML = db.ledger.map(t=>`<tr><td>${t.date}</td><td>${t.desc}</td><td>${t.type}</td><td>${fmt(t.amount)}</td></tr>`).join(''); }
function openTransactionModal(t) { openModal('Log '+t, `<div class="form-group"><label>Desc</label><input class="form-control" id="trDesc"></div><div class="form-group"><label>Amount</label><input type="number" class="form-control" id="trAmt"></div><button class="btn btn-primary" style="width:100%" onclick="saveTrans('${t}')">Save</button>`); }
async function saveTrans(t) { try { await sup.from('ledger').insert([{id:Date.now(), date:new Date().toLocaleDateString(), desc:document.getElementById('trDesc').value, type:t, amount:parseFloat(document.getElementById('trAmt').value)}]); await loadDB(); closeModal(); } catch(e){ showToast(e.message, true); } }

function getStudentsHTML() { return `<div class="panel"><div class="panel-header"><h3>Students</h3><button class="btn btn-primary btn-sm" onclick="openStudentModal()">Admit</button></div><div class="table-wrapper"><table><thead><tr><th>Name</th><th>Grade</th><th>Action</th></tr></thead><tbody>${db.students.map(s=>`<tr><td>${s.name}</td><td>${s.grade}</td><td><button class="btn btn-danger btn-sm" onclick="deleteGeneric('students','${s.id}')">Del</button></td></tr>`).join('')}</tbody></table></div></div>`; }
function openStudentModal() { openGenericModal('Admit Student', 'students', [{name:'name',label:'Name'},{name:'grade',label:'Grade'},{name:'total',label:'Fee',type:'number'}]); }

function getStaffHTML() { return `<div class="panel"><div class="panel-header"><h3>Staff</h3></div><div class="table-wrapper"><table><thead><tr><th>Name</th><th>Role</th></tr></thead><tbody>${db.staff.map(s=>`<tr><td>${s.name}</td><td>${s.role}</td></tr>`).join('')}</tbody></table></div></div>`; }
function getPayrollHTML() { return `<div class="panel"><div class="panel-header"><h3>Payroll</h3></div><div class="panel-body">Payroll management module.</div></div>`; }
function getInventoryHTML() { return `<div class="panel"><div class="panel-header"><h3>Inventory</h3><button class="btn btn-primary btn-sm" onclick="openGenericModal('Add Item','inventory',[{name:'item',label:'Item'},{name:'stock',label:'Stock',type:'number'}])">Add</button></div><div class="table-wrapper"><table><thead><tr><th>Item</th><th>Stock</th></tr></thead><tbody>${db.inventory.map(i=>`<tr><td>${i.item}</td><td>${i.stock}</td></tr>`).join('')}</tbody></table></div></div>`; }

// NEW: HOSTEL
function getHostelHTML() {
    return `<div class="panel"><div class="panel-header"><h3>Hostel Allocation Grid</h3><button class="btn btn-primary btn-sm" onclick="openGenericModal('Add Room','hostel_rooms',[{name:'room_no',label:'Room No'},{name:'capacity',label:'Capacity',type:'number'}])">Add Room</button></div>
    <div class="hostel-grid">${db.hostel_rooms.map(r=>`<div class="room-card ${r.status==='Full'?'full':'available'}"><h3>${r.room_no}</h3><p>${r.occupied}/${r.capacity} Occupied</p><p style="font-size:0.8rem; font-weight:bold;">${r.status}</p></div>`).join('')}</div></div>`;
}

// NEW: TRANSPORT
function getTransportHTML() {
    return `<div class="panel"><div class="panel-header"><h3>Transport Routes</h3><button class="btn btn-primary btn-sm" onclick="openGenericModal('Add Route','transport',[{name:'route_name',label:'Route Name'},{name:'driver',label:'Driver'},{name:'vehicle_no',label:'Vehicle No'},{name:'capacity',label:'Capacity',type:'number'}])">Add Route</button></div>
    <div class="table-wrapper"><table><thead><tr><th>Route</th><th>Driver</th><th>Vehicle</th><th>Cap</th></tr></thead><tbody>${db.transport.map(t=>`<tr><td>${t.route_name}</td><td>${t.driver}</td><td>${t.vehicle_no}</td><td>${t.capacity}</td></tr>`).join('')}</tbody></table></div></div>`;
}

// NEW: ADMISSIONS KANBAN
function getAdmissionsHTML() {
    let stages = ['Inquiry', 'Assessment', 'Interview', 'Admitted', 'Rejected'];
    return `<div class="panel"><div class="panel-header"><h3>Admissions Pipeline</h3><button class="btn btn-primary btn-sm" onclick="openGenericModal('New Lead','admissions',[{name:'student_name',label:'Student Name'},{name:'stage',label:'Stage'}])">Add Lead</button></div>
    <div class="kanban-board">${stages.map(s=>`<div class="kanban-col" ondrop="dropAdmission(event,'${s}')" ondragover="event.preventDefault()"><h4>${s} (${db.admissions.filter(a=>a.stage===s).length})</div>${db.admissions.filter(a=>a.stage===s).map(a=>`<div class="kanban-card" draggable="true" ondragstart="dragAdmission(event,'${a.id}')">${a.student_name}</div>`).join('')}</div>`).join('')}</div></div>`;
}
async function dragAdmission(e, id) { e.dataTransfer.setData("id", id); }
async function dropAdmission(e, stage) {
    let id = e.dataTransfer.getData("id");
    try { await sup.from('admissions').update({ stage }).eq('id', id); await loadDB(); } catch(err) { showToast(err.message, true); }
}

// NEW: ALUMNI
function getAlumniHTML() { return `<div class="panel"><div class="panel-header"><h3>Alumni Directory</h3></div><div class="table-wrapper"><table><thead><tr><th>Name</th><th>Grad Year</th><th>Profession</th></tr></thead><tbody>${db.alumni.map(a=>`<tr><td>${a.name}</td><td>${a.grad_year}</td><td>${a.profession}</td></tr>`).join('')}</tbody></table></div></div>`; }

// NEW: HR & LEAVES
function getLeavesHTML() { return `<div class="panel"><div class="panel-header"><h3>Leave Requests</h3></div><div class="table-wrapper"><table><thead><tr><th>Staff</th><th>Dates</th><th>Status</th><th>Action</th></tr></thead><tbody>${db.leaves.map(l=>`<tr><td>${l.staff_name}</td><td>${l.dates}</td><td>${l.status}</td><td>${l.status==='Pending'?`<button class="btn btn-success btn-sm" onclick="approveLeave('${l.id}')">Approve</button>`:''}</td></tr>`).join('')}</tbody></table></div></div>`; }
async function approveLeave(id) { try { await sup.from('leaves').update({status:'Approved'}).eq('id',id); await loadDB(); } catch(e){} }

// NEW: BEHAVIOR LOG
function getBehaviorHTML() { return `<div class="panel"><div class="panel-header"><h3>Disciplinary Log</h3></div><div class="table-wrapper"><table><thead><tr><th>Student</th><th>Incident</th><th>Points</th></tr></thead><tbody>${db.behavior_log.map(b=>`<tr><td>${b.student_name}</td><td>${b.incident}</td><td>${b.points}</td></tr>`).join('')}</tbody></table></div></div>`; }

// NEW: LMS (Virtual Class & Curriculum)
function getAcademicsHTML() {
    return `<div class="panel"><div class="panel-header"><h3>Virtual Classroom Hub</h3></div><div class="panel-body">${db.virtual_class.map(v=>`<div><strong>${v.title}</strong> (${v.date})<br><a href="${v.link}" target="_blank">Join Class</a></div>`).join('')}</div></div>
    <div class="panel"><div class="panel-header"><h3>Curriculum Progress</h3></div><div class="panel-body">${db.curriculum.map(c=>`<div style="margin-bottom:10px;"><strong>${c.subject}</strong><div class="progress-container" style="height:10px; background:var(--border); border-radius:5px;"><div style="width:${(c.completed/c.total)*100}%; height:100%; background:var(--primary); border-radius:5px;"></div></div></div>`).join('')}</div></div>`;
}

// STANDARD MODULES
function getAttendanceHTML() { return `<div class="panel"><div class="panel-header"><h3>Attendance</h3></div><div class="panel-body">Mark daily attendance here.</div></div>`; }
function getTimetableHTML() { return `<div class="panel"><div class="panel-header"><h3>Timetable</h3></div><div class="table-wrapper"><table><thead><tr><th>Day</th><th>Time</th><th>Class</th></tr></thead><tbody>${db.timetable.map(t=>`<tr><td>${t.day}</td><td>${t.time}</td><td>${t.class}</td></tr>`).join('')}</tbody></table></div></div>`; }
function getAnnouncementsHTML() { return `<div class="panel"><div class="panel-header"><h3>Announcements</h3></div><div class="panel-body">${db.announcements.map(a=>`<div><strong>${a.title}</strong><br>${a.desc}</div>`).join('')}</div></div>`; }
function getAuditHTML() { return `<div class="panel"><div class="panel-header"><h3>Audit Trail</h3></div><div class="table-wrapper"><table><thead><tr><th>Time</th><th>Action</th></tr></thead><tbody>${db.audit_log.map(l=>`<tr><td>${l.time}</td><td>${l.action}</td></tr>`).join('')}</tbody></table></div></div>`; }

// QUICK ACTIONS
function handleQuickAction(a) {
    if(a==='addStudent') openStudentModal();
    else if(a==='addExpense') openTransactionModal('Expense');
    else if(a==='addTransport') openGenericModal('Add Route','transport',[{name:'route_name',label:'Route'},{name:'driver',label:'Driver'}]);
    else if(a==='addHostel') openGenericModal('Add Room','hostel_rooms',[{name:'room_no',label:'Room No'},{name:'capacity',label:'Capacity',type:'number'}]);
    document.getElementById('quickActionSelect').value='';
}
function handleGlobalSearch() {}
function toggleDarkMode() { let b=document.body; let btn=document.getElementById('darkModeBtn'); if(b.getAttribute('data-theme')==='dark'){b.removeAttribute('data-theme');btn.innerText='🌙';}else{b.setAttribute('data-theme','dark');btn.innerText='☀️';} }

// INIT
window.onload = loadDB;
