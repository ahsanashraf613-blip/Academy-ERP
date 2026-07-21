// --- SUPABASE INITIALIZATION ---
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace this
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace this
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- GLOBAL STATE ---
let db = {
    students: [], staff: [], inventory: [], ledger: [], 
    announcements: [], timetable: [], assignments: [], auditLog: []
};

let currentPortal = "admin";
let currentPage = "dashboard";

// --- HELPER FUNCTIONS ---
function fmt(amount) { return 'Rs. ' + amount.toLocaleString('en-PK'); }
function showToast(msg) {
    let t = document.getElementById('toastNotification');
    t.innerText = "✔️ " + msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}
async function logAction(action) {
    await supabase.from('audit_log').insert([{ time: new Date().toLocaleString(), user_role: currentPortal, action }]);
    await fetchAuditLog();
}
function openModal(title, html) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('erpModal').classList.add('active');
}
function closeModal() { document.getElementById('erpModal').classList.remove('active'); }
function exportCSV(filename, rows) {
    let csv = rows.map(r => r.join(',')).join('\n');
    let blob = new Blob([csv], { type: 'text/csv' });
    let url = window.URL.createObjectURL(blob);
    let a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    logAction(`Exported ${filename}`);
}

// --- SUPABASE DATA FETCHING ---
async function loadDB() {
    document.getElementById('appContent').innerHTML = '<p>Fetching data from Supabase...</p>';
    
    const { data: students } = await supabase.from('students').select('*');
    const { data: staff } = await supabase.from('staff').select('*');
    const { data: inventory } = await supabase.from('inventory').select('*');
    const { data: ledger } = await supabase.from('ledger').select('*');
    const { data: announcements } = await supabase.from('announcements').select('*');
    const { data: timetable } = await supabase.from('timetable').select('*');
    const { data: assignments } = await supabase.from('assignments').select('*');
    
    db.students = students || [];
    db.staff = staff || [];
    db.inventory = inventory || [];
    db.ledger = ledger || [];
    db.announcements = announcements || [];
    db.timetable = timetable || [];
    db.assignments = assignments || [];
    
    await fetchAuditLog();
    navigateTo(currentPage);
}

async function fetchAuditLog() {
    const { data } = await supabase.from('audit_log').select('*').order('id', { ascending: false });
    db.auditLog = data || [];
    if (currentPage === "audit") navigateTo('audit');
}

// --- MENU CONFIG & ROUTING ---
const menus = {
    admin: [
        { cat: "Main", items: [{ id: "dashboard", name: "Dashboard" }, { id: "announcements", name: "Announcements" }] },
        { cat: "Finance & Ops", items: [{ id: "finance", name: "Finance & Expenses" }, { id: "inventory", name: "Inventory" }] },
        { cat: "Academics & HR", items: [{ id: "students", name: "Student Info (SIS)" }, { id: "staff", name: "Staff & HR" }, { id: "academics", name: "Gradebook & LMS" }, { id: "timetable", name: "Timetable" }] },
        { cat: "System", items: [{ id: "audit", name: "Audit Trail" }] }
    ],
    teacher: [
        { cat: "Teaching", items: [{ id: "dashboard", name: "My Classes" }, { id: "timetable", name: "My Timetable" }, { id: "academics", name: "Gradebook & LMS" }] }
    ],
    parent: [
        { cat: "My Child", items: [{ id: "dashboard", name: "Overview & Notices" }, { id: "finance", name: "Fee Challans" }, { id: "academics", name: "Report Card" }, { id: "timetable", name: "Class Schedule" }] }
    ]
};

function switchPortal(portal) {
    currentPortal = portal;
    currentPage = "dashboard";
    document.getElementById('portalRoleText').innerText = portal.charAt(0).toUpperCase() + portal.slice(1) + " Portal";
    renderNav();
    navigateTo("dashboard");
}

function renderNav() {
    let navHtml = '';
    menus[currentPortal].forEach(cat => {
        navHtml += `<div class="nav-category">${cat.cat}</div>`;
        cat.items.forEach(item => {
            navHtml += `<div class="nav-item ${item.id === currentPage ? 'active' : ''}" onclick="navigateTo('${item.id}')">${item.name}</div>`;
        });
    });
    document.getElementById('navMenu').innerHTML = navHtml;
}

function navigateTo(pageId) {
    currentPage = pageId;
    renderNav();
    let content = document.getElementById('appContent');
    
    if (pageId === "dashboard") content.innerHTML = getDashboardHTML();
    else if (pageId === "finance") content.innerHTML = getFinanceHTML();
    else if (pageId === "inventory") content.innerHTML = getInventoryHTML();
    else if (pageId === "students") content.innerHTML = getStudentsHTML();
    else if (pageId === "staff") content.innerHTML = getStaffHTML();
    else if (pageId === "academics") content.innerHTML = getAcademicsHTML();
    else if (pageId === "timetable") content.innerHTML = getTimetableHTML();
    else if (pageId === "announcements") content.innerHTML = getAnnouncementsHTML();
    else if (pageId === "audit") content.innerHTML = getAuditHTML();
}

// --- HTML GENERATORS ---
function getDashboardHTML() {
    let totalIncome = db.ledger.filter(t => t.type === 'Income').reduce((a,b) => a+b.amount, 0);
    let totalExp = db.ledger.filter(t => t.type === 'Expense').reduce((a,b) => a+b.amount, 0);
    
    if (currentPortal === 'admin') return `
        <div class="grid-4">
            <div class="stat-card"><div class="label">Cash in Bank</div><div class="value" style="color:var(--success)">${fmt(totalIncome - totalExp)}</div></div>
            <div class="stat-card"><div class="label">Total Students</div><div class="value">${db.students.length}</div></div>
            <div class="stat-card"><div class="label">Total Staff</div><div class="value">${db.staff.length}</div></div>
        </div>
        <div class="panel"><div class="panel-header"><h3>Recent Announcements</h3></div><div class="panel-body">
            ${db.announcements.slice(0,3).map(a => `<div style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid var(--border);"><strong>${a.title}</strong><br><span style="font-size:0.85rem; color:var(--text-muted);">${a.date} - ${a.desc}</span></div>`).join('')}
        </div></div>
    `;
    if (currentPortal === 'parent') return `
        <div class="grid-4">
            <div class="stat-card"><div class="label">Child Name</div><div class="value" style="font-size:1.2rem;">Ali Raza</div></div>
            <div class="stat-card"><div class="label">Outstanding Fees</div><div class="value" style="color:var(--success)">Rs. 0</div></div>
        </div>
        <div class="panel"><div class="panel-header"><h3>School Announcements</h3></div><div class="panel-body">
            ${db.announcements.map(a => `<div style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid var(--border);"><strong>${a.title}</strong><br><span style="font-size:0.85rem; color:var(--text-muted);">${a.date} - ${a.desc}</span></div>`).join('')}
        </div></div>
    `;
    return '<p>Welcome to your portal.</p>';
}

function getFinanceHTML() {
    let totalIncome = db.ledger.filter(t => t.type === 'Income').reduce((a,b) => a+b.amount, 0);
    let totalExp = db.ledger.filter(t => t.type === 'Expense').reduce((a,b) => a+b.amount, 0);
    return `
        <div class="grid-4">
            <div class="stat-card"><div class="label">Total Income</div><div class="value" style="color:var(--success)">${fmt(totalIncome)}</div></div>
            <div class="stat-card"><div class="label">Total Expenses</div><div class="value" style="color:var(--danger)">${fmt(totalExp)}</div></div>
            <div class="stat-card"><div class="label">Net Balance</div><div class="value">${fmt(totalIncome - totalExp)}</div></div>
        </div>
        <div class="panel">
            <div class="panel-header"><h3>Finance Ledger</h3>
                <div>
                    <button class="btn btn-ghost btn-sm" onclick="exportCSV('Ledger.csv', [['Date','Description','Type','Amount'], ...db.ledger.map(t => [t.date, t.desc, t.type, t.amount])])">Export CSV</button>
                    ${currentPortal === 'admin' ? `<button class="btn btn-primary btn-sm" onclick="openExpenseModal()">Log Expense</button>` : ''}
                </div>
            </div>
            <table><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr></thead><tbody>
                ${db.ledger.map(t => `<tr><td>${t.date}</td><td>${t.desc}</td><td><span class="badge ${t.type==='Income'?'badge-success':'badge-danger'}">${t.type}</span></td><td style="font-weight:600;">${fmt(t.amount)}</td></tr>`).join('')}
            </tbody></table>
        </div>
    `;
}

function getInventoryHTML() {
    return `
        <div class="panel">
            <div class="panel-header"><h3>Inventory Management</h3><button class="btn btn-primary btn-sm" onclick="openInventoryModal()">Add Item</button></div>
            <div class="panel-body">
                <div class="search-bar"><input type="text" id="invSearch" placeholder="Search items..." onkeyup="renderInvTable()"></div>
                <table id="invTable"><thead><tr><th>Item</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                    ${db.inventory.map(i => `<tr><td>${i.item}</td><td>${i.stock}</td><td><span class="badge ${i.status==='In Stock'?'badge-success':'badge-danger'}">${i.status}</span></td><td><button class="btn btn-danger btn-sm" onclick="deleteItem('${i.id}')">Delete</button></td></tr>`).join('')}
                </tbody></table>
            </div>
        </div>
    `;
}
function renderInvTable() {
    let term = document.getElementById('invSearch').value.toLowerCase();
    let filtered = db.inventory.filter(i => i.item.toLowerCase().includes(term));
    document.querySelector('#invTable tbody').innerHTML = filtered.map(i => `<tr><td>${i.item}</td><td>${i.stock}</td><td><span class="badge ${i.status==='In Stock'?'badge-success':'badge-danger'}">${i.status}</span></td><td><button class="btn btn-danger btn-sm" onclick="deleteItem('${i.id}')">Delete</button></td></tr>`).join('');
}

function getStudentsHTML() {
    return `
        <div class="panel">
            <div class="panel-header"><h3>Student Information System</h3>
                <div>
                    <button class="btn btn-ghost btn-sm" onclick="exportCSV('Students.csv', [['ID','Name','Grade','Status'], ...db.students.map(s => [s.id, s.name, s.grade, s.status])])">Export CSV</button>
                    <button class="btn btn-primary btn-sm" onclick="openStudentModal()">Admit Student</button>
                </div>
            </div>
            <div class="panel-body">
                <div class="search-bar">
                    <input type="text" id="stuSearch" placeholder="Search by name or ID..." onkeyup="renderStuTable()">
                    <select id="stuGradeFilter" onchange="renderStuTable()"><option value="">All Grades</option><option>10-A</option><option>9-B</option><option>12-A</option></select>
                </div>
                <table id="stuTable"><thead><tr><th>ID</th><th>Name</th><th>Grade</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                    ${db.students.map(s => `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.grade}</td><td><span class="badge badge-success">${s.status}</span></td><td><button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}')">Delete</button></td></tr>`).join('')}
                </tbody></table>
            </div>
        </div>
    `;
}
function renderStuTable() {
    let term = document.getElementById('stuSearch').value.toLowerCase();
    let grade = document.getElementById('stuGradeFilter').value;
    let filtered = db.students.filter(s => (s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term)) && (grade === "" || s.grade === grade));
    document.querySelector('#stuTable tbody').innerHTML = filtered.map(s => `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.grade}</td><td><span class="badge badge-success">${s.status}</span></td><td><button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}')">Delete</button></td></tr>`).join('');
}

function getStaffHTML() {
    return `
        <div class="panel">
            <div class="panel-header"><h3>Staff & HR Management</h3><button class="btn btn-primary btn-sm" onclick="openStaffModal()">Onboard Staff</button></div>
            <table><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                ${db.staff.map(s => `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.role}</td><td><span class="badge badge-info">${s.status}</span></td><td><button class="btn btn-danger btn-sm" onclick="deleteStaff('${s.id}')">Delete</button></td></tr>`).join('')}
            </tbody></table>
        </div>
    `;
}

function getAcademicsHTML() {
    if (currentPortal === 'parent') {
        return `
            <div class="panel no-print"><div class="panel-header"><h3>Report Card Generator</h3><button class="btn btn-primary btn-sm" onclick="window.print()">Print Report Card</button></div></div>
            <div id="printArea" class="report-card">
                <h1>Academy ERP School</h1>
                <div class="student-info"><span><strong>Student:</strong> Ali Raza</span><span><strong>Grade:</strong> 10-A</span><span><strong>Term:</strong> Mid-Term 2023</span></div>
                <table><thead><tr><th>Subject</th><th>Marks Obtained</th><th>Total Marks</th><th>Grade</th></tr></thead><tbody>
                    <tr><td>Mathematics</td><td>85</td><td>100</td><td>A</td></tr>
                    <tr><td>Science</td><td>90</td><td>100</td><td>A+</td></tr>
                </tbody></table>
                <div class="remarks"><strong>Teacher Remarks:</strong> Excellent performance.</div>
            </div>
        `;
    }
    return `
        <div class="panel">
            <div class="panel-header"><h3>LMS / Assignments Board</h3>${currentPortal === 'teacher' ? `<button class="btn btn-primary btn-sm" onclick="openAssignmentModal()">Post Assignment</button>` : ''}</div>
            <div class="panel-body">
                ${db.assignments.map(a => `<div style="padding:12px; border:1px solid var(--border); border-radius:8px; margin-bottom:10px;"><strong>${a.title}</strong> (Due: ${a.due})<br><span style="font-size:0.85rem; color:var(--text-muted);">${a.desc}</span></div>`).join('')}
            </div>
        </div>
    `;
}

function getTimetableHTML() {
    return `
        <div class="panel">
            <div class="panel-header"><h3>Dynamic Timetable</h3>${currentPortal === 'admin' ? `<button class="btn btn-primary btn-sm" onclick="openTimetableModal()">Add Slot</button>` : ''}</div>
            <table><thead><tr><th>Day</th><th>Time</th><th>Class</th><th>Subject</th><th>Teacher</th>${currentPortal === 'admin' ? '<th>Action</th>' : ''}</tr></thead><tbody>
                ${db.timetable.map(t => `<tr><td>${t.day}</td><td>${t.time}</td><td>${t.class}</td><td>${t.subject}</td><td>${t.teacher}</td>${currentPortal === 'admin' ? `<td><button class="btn btn-danger btn-sm" onclick="deleteSlot('${t.id}')">Delete</button></td>` : ''}</tr>`).join('')}
            </tbody></table>
        </div>
    `;
}

function getAnnouncementsHTML() {
    return `
        <div class="panel">
            <div class="panel-header"><h3>Communication Center</h3><button class="btn btn-primary btn-sm" onclick="openAnnouncementModal()">Create Announcement</button></div>
            <div class="panel-body">
                ${db.announcements.map(a => `<div style="padding:12px; border:1px solid var(--border); border-radius:8px; margin-bottom:10px;"><strong>${a.title}</strong> <span style="font-size:0.8rem; color:var(--text-muted);">(${a.date})</span><br>${a.desc}</div>`).join('')}
            </div>
        </div>
    `;
}

function getAuditHTML() {
    return `
        <div class="panel">
            <div class="panel-header"><h3>System Audit Trail (Supabase)</h3></div>
            <table><thead><tr><th>Timestamp</th><th>User</th><th>Action</th></tr></thead><tbody>
                ${db.auditLog.map(log => `<tr><td style="font-family:monospace;">${log.time}</td><td><span class="badge badge-info">${log.user_role}</span></td><td>${log.action}</td></tr>`).join('')}
            </tbody></table>
        </div>
    `;
}

// --- MODAL & SUPABASE CRUD ACTIONS ---
function openExpenseModal() {
    openModal('Log New Expense', `
        <div class="form-group"><label>Description</label><input class="form-control" id="expDesc" placeholder="e.g., Electricity Bill"></div>
        <div class="form-group"><label>Amount (Rs.)</label><input type="number" class="form-control" id="expAmt"></div>
        <button class="btn btn-primary" style="width:100%" onclick="saveExpense()">Save Expense</button>
    `);
}
async function saveExpense() {
    let desc = document.getElementById('expDesc').value;
    let amt = parseFloat(document.getElementById('expAmt').value);
    if(!desc || !amt) return showToast("Fill all fields");
    await supabase.from('ledger').insert([{ id: Date.now(), date: new Date().toLocaleDateString(), desc, type: "Expense", amount: amt }]);
    await logAction(`Logged expense: ${desc} (${fmt(amt)})`);
    closeModal(); loadDB();
}

function openInventoryModal() {
    openModal('Add Inventory Item', `
        <div class="form-group"><label>Item Name</label><input class="form-control" id="invName"></div>
        <div class="form-group"><label>Stock Quantity</label><input type="number" class="form-control" id="invStock"></div>
        <button class="btn btn-primary" style="width:100%" onclick="saveInventory()">Save Item</button>
    `);
}
async function saveInventory() {
    let name = document.getElementById('invName').value;
    let stock = parseInt(document.getElementById('invStock').value);
    if(!name || stock < 0) return showToast("Invalid input");
    await supabase.from('inventory').insert([{ id: 'INV-'+Date.now(), item: name, stock, status: stock < 10 ? "Low Stock" : "In Stock" }]);
    await logAction(`Added inventory item: ${name}`);
    closeModal(); loadDB();
}
async function deleteItem(id) { 
    await supabase.from('inventory').delete().eq('id', id); 
    await logAction(`Deleted inventory item ID: ${id}`); 
    loadDB(); 
}

function openStudentModal() {
    openModal('Admit New Student', `
        <div class="form-group"><label>Student Name</label><input class="form-control" id="stuName"></div>
        <div class="form-group"><label>Grade</label><select class="form-control" id="stuGrade"><option>10-A</option><option>9-B</option><option>12-A</option></select></div>
        <button class="btn btn-primary" style="width:100%" onclick="saveStudent()">Admit</button>
    `);
}
async function saveStudent() {
    let name = document.getElementById('stuName').value;
    let grade = document.getElementById('stuGrade').value;
    if(!name) return showToast("Name required");
    await supabase.from('students').insert([{ id: 'STU-'+Date.now(), name, grade, paid: 0, total: 30000, attendance: "100%", status: "Active" }]);
    await logAction(`Admitted student: ${name}`);
    closeModal(); loadDB();
}
async function deleteStudent(id) { 
    await supabase.from('students').delete().eq('id', id); 
    await logAction(`Deleted student ID: ${id}`); 
    loadDB(); 
}

function openStaffModal() {
    openModal('Staff Onboarding', `
        <div class="form-group"><label>Staff Name</label><input class="form-control" id="stfName"></div>
        <div class="form-group"><label>Role</label><select class="form-control" id="stfRole"><option>Teacher</option><option>Admin</option><option>Accountant</option></select></div>
        <button class="btn btn-primary" style="width:100%" onclick="saveStaff()">Onboard</button>
    `);
}
async function saveStaff() {
    let name = document.getElementById('stfName').value;
    let role = document.getElementById('stfRole').value;
    if(!name) return showToast("Name required");
    await supabase.from('staff').insert([{ id: 'EMP-'+Date.now(), name, role, status: "Present", leavebalance: 15 }]);
    await logAction(`Onboarded staff: ${name}`);
    closeModal(); loadDB();
}
async function deleteStaff(id) { 
    await supabase.from('staff').delete().eq('id', id); 
    await logAction(`Deleted staff ID: ${id}`); 
    loadDB(); 
}

function openAssignmentModal() {
    openModal('Post Assignment', `
        <div class="form-group"><label>Title</label><input class="form-control" id="asgTitle"></div>
        <div class="form-group"><label>Description</label><textarea class="form-control" id="asgDesc"></textarea></div>
        <div class="form-group"><label>Due Date</label><input type="date" class="form-control" id="asgDue"></div>
        <button class="btn btn-primary" style="width:100%" onclick="saveAssignment()">Post</button>
    `);
}
async function saveAssignment() {
    let title = document.getElementById('asgTitle').value;
    await supabase.from('assignments').insert([{ id: Date.now(), title, desc: document.getElementById('asgDesc').value, due: document.getElementById('asgDue').value, grade: "10-A" }]);
    await logAction(`Posted assignment: ${title}`);
    closeModal(); loadDB();
}

function openTimetableModal() {
    openModal('Add Timetable Slot', `
        <div class="form-group"><label>Day</label><select class="form-control" id="ttDay"><option>Monday</option><option>Tuesday</option><option>Wednesday</option></select></div>
        <div class="form-group"><label>Time</label><input type="time" class="form-control" id="ttTime"></div>
        <div class="form-group"><label>Class</label><input class="form-control" id="ttClass" placeholder="10-A"></div>
        <div class="form-group"><label>Subject</label><input class="form-control" id="ttSubject" placeholder="Math"></div>
        <div class="form-group"><label>Teacher</label><input class="form-control" id="ttTeacher" placeholder="Mr. Bilal"></div>
        <button class="btn btn-primary" style="width:100%" onclick="saveTimetable()">Save Slot</button>
    `);
}
async function saveTimetable() {
    await supabase.from('timetable').insert([{ 
        id: Date.now(), 
        day: document.getElementById('ttDay').value, 
        time: document.getElementById('ttTime').value, 
        class: document.getElementById('ttClass').value, 
        subject: document.getElementById('ttSubject').value, 
        teacher: document.getElementById('ttTeacher').value 
    }]);
    await logAction(`Added timetable slot`);
    closeModal(); loadDB();
}
async function deleteSlot(id) { 
    await supabase.from('timetable').delete().eq('id', id); 
    await logAction(`Deleted timetable slot`); 
    loadDB(); 
}

function openAnnouncementModal() {
    openModal('Create Announcement', `
        <div class="form-group"><label>Title</label><input class="form-control" id="annTitle"></div>
        <div class="form-group"><label>Details</label><textarea class="form-control" id="annDesc"></textarea></div>
        <button class="btn btn-primary" style="width:100%" onclick="saveAnnouncement()">Publish</button>
    `);
}
async function saveAnnouncement() {
    let title = document.getElementById('annTitle').value;
    await supabase.from('announcements').insert([{ id: Date.now(), date: new Date().toLocaleDateString(), title, desc: document.getElementById('annDesc').value }]);
    await logAction(`Published announcement: ${title}`);
    closeModal(); loadDB();
}

// --- INIT ---
window.onload = loadDB;
