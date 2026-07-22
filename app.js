// --- SUPABASE INITIALIZATION ---
const SUPABASE_URL = 'https://zzdndookrgbxzkhuazgd.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6ZG5kb29rcmdieHpraHVhemdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NzMyMzEsImV4cCI6MjEwMDE0OTIzMX0.TLfTQ2-gw2gxr8_Nf6zuHPSMOYyH4fBmKDD0bjWBBn0';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- GLOBAL STATE ---
let db = {
    students: [], staff: [], inventory: [], ledger: [], 
    announcements: [], timetable: [], assignments: [], auditLog: [], attendance: [], grades: []
};

let currentPortal = "admin";
let currentPage = "dashboard";
let attendanceType = "student"; 
let financeFilter = "All";

// --- HELPER FUNCTIONS ---
function fmt(amount) { return 'Rs. ' + amount.toLocaleString('en-PK'); }

function showToast(msg, isError = false) {
    let t = document.getElementById('toastNotification');
    t.innerText = (isError ? "⚠️ " : "✔️ ") + msg;
    t.style.background = isError ? "#dc2626" : "#111827";
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 4000);
}

async function logAction(action) {
    try {
        await supabaseClient.from('audit_log').insert([{ time: new Date().toLocaleString(), user_role: currentPortal, action }]);
        await fetchAuditLog();
    } catch (e) { console.error("Audit log error:", e.message); }
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

// --- UI FEATURES: DARK MODE, QUICK ACTIONS, GLOBAL SEARCH ---
function toggleDarkMode() {
    let body = document.body;
    let btn = document.getElementById('darkModeBtn');
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        btn.innerText = '🌙';
    } else {
        body.setAttribute('data-theme', 'dark');
        btn.innerText = '☀️';
    }
}

function handleQuickAction(action) {
    if (!action) return;
    if (action === 'addStudent') openStudentModal();
    else if (action === 'addStaff') openStaffModal();
    else if (action === 'addIncome') openTransactionModal('Income');
    else if (action === 'addExpense') openTransactionModal('Expense');
    else if (action === 'addAnnouncement') openAnnouncementModal();
    document.getElementById('quickActionSelect').value = '';
}

function handleGlobalSearch() {
    let term = document.getElementById('globalSearch').value.toLowerCase();
    let dropdown = document.getElementById('searchResults');
    if (term.length < 2) { dropdown.classList.remove('active'); return; }
    
    let results = [];
    db.students.forEach(s => { if (s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term)) results.push({ text: `${s.name} (${s.grade})`, cat: "Student", action: `navigateTo('students')` }); });
    db.staff.forEach(s => { if (s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term)) results.push({ text: `${s.name} (${s.role})`, cat: "Staff", action: `navigateTo('staff')` }); });
    db.ledger.forEach(t => { if (t.desc.toLowerCase().includes(term)) results.push({ text: `${t.desc} - ${fmt(t.amount)}`, cat: "Finance", action: `navigateTo('finance')` }); });

    if (results.length === 0) {
        dropdown.innerHTML = '<div class="search-item">No results found</div>';
    } else {
        dropdown.innerHTML = results.slice(0, 8).map(r => `<div class="search-item" onclick="${r.action}; document.getElementById('globalSearch').value=''; this.parentElement.classList.remove('active');"><span class="search-cat">${r.cat}</span><br>${r.text}</div>`).join('');
    }
    dropdown.classList.add('active');
}

// --- AUTHENTICATION (MOCK) ---
function login() {
    currentPortal = document.getElementById('loginRole').value;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    document.getElementById('portalRoleText').innerText = currentPortal.charAt(0).toUpperCase() + currentPortal.slice(1) + " Portal";
    document.getElementById('userAvatar').innerText = currentPortal.charAt(0).toUpperCase();
    renderNav();
    navigateTo("dashboard");
}

function logout() {
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginRole').value = 'admin';
}

// --- SUPABASE DATA FETCHING ---
async function loadDB() {
    if (document.getElementById('mainApp').style.display === 'flex') {
        document.getElementById('appContent').innerHTML = '<p>Connecting to Supabase database...</p>';
    }
    try {
        const { data: students, error: e1 } = await supabaseClient.from('students').select('*'); if (e1) throw e1;
        const { data: staff, error: e2 } = await supabaseClient.from('staff').select('*'); if (e2) throw e2;
        const { data: inventory, error: e3 } = await supabaseClient.from('inventory').select('*'); if (e3) throw e3;
        const { data: ledger, error: e4 } = await supabaseClient.from('ledger').select('*'); if (e4) throw e4;
        const { data: announcements, error: e5 } = await supabaseClient.from('announcements').select('*'); if (e5) throw e5;
        const { data: timetable, error: e6 } = await supabaseClient.from('timetable').select('*'); if (e6) throw e6;
        const { data: assignments, error: e7 } = await supabaseClient.from('assignments').select('*'); if (e7) throw e7;
        const { data: attendance, error: e8 } = await supabaseClient.from('attendance_log').select('*'); if (e8) throw e8;
        const { data: grades, error: e9 } = await supabaseClient.from('grades').select('*'); if (e9) throw e9;

        db.students = students || []; db.staff = staff || []; db.inventory = inventory || [];
        db.ledger = ledger || []; db.announcements = announcements || []; db.timetable = timetable || [];
        db.assignments = assignments || []; db.attendance = attendance || []; db.grades = grades || [];
        
        await fetchAuditLog();
        if (document.getElementById('mainApp').style.display === 'flex') navigateTo(currentPage);
    } catch (error) {
        document.getElementById('appContent').innerHTML = `
            <div class="panel" style="border-color: var(--danger);">
                <div class="panel-header"><h3 style="color: var(--danger);">⚠️ Database Connection Failed</h3></div>
                <div class="panel-body"><pre style="background: #f3f4f6; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-family: monospace;">${error.message}</pre></div>
            </div>`;
        console.error("Supabase Error:", error);
    }
}

async function fetchAuditLog() {
    try {
        const { data } = await supabaseClient.from('audit_log').select('*').order('id', { ascending: false });
        db.auditLog = data || [];
        if (currentPage === "audit") navigateTo('audit');
        if (currentPage === "dashboard") navigateTo('dashboard');
    } catch (e) { console.error("Fetch audit log error:", e.message); }
}

// --- MENU CONFIG & ROUTING ---
const menus = {
    admin: [
        { cat: "Main", items: [{ id: "dashboard", name: "Dashboard" }, { id: "announcements", name: "Announcements" }] },
        { cat: "Finance & Ops", items: [{ id: "finance", name: "Finance & Expenses" }, { id: "payroll", name: "Payroll & Salary" }, { id: "inventory", name: "Inventory" }] },
        { cat: "Academics & HR", items: [{ id: "students", name: "Student Info (SIS)" }, { id: "staff", name: "Staff & HR" }, { id: "attendance", name: "Attendance" }, { id: "academics", name: "Gradebook & LMS" }, { id: "timetable", name: "Timetable" }] },
        { cat: "System", items: [{ id: "audit", name: "Audit Trail" }] }
    ],
    teacher: [
        { cat: "Teaching", items: [{ id: "dashboard", name: "My Classes" }, { id: "timetable", name: "My Timetable" }, { id: "attendance", name: "Take Attendance" }, { id: "academics", name: "Gradebook & LMS" }] }
    ],
    parent: [
        { cat: "My Child", items: [{ id: "dashboard", name: "Overview & Notices" }, { id: "finance", name: "Fee Challans" }, { id: "attendance", name: "My Child Attendance" }, { id: "academics", name: "Report Card" }, { id: "timetable", name: "Class Schedule" }] }
    ]
};

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
    currentPage = pageId; renderNav();
    let content = document.getElementById('appContent');
    if (pageId === "dashboard") content.innerHTML = getDashboardHTML();
    else if (pageId === "finance") { content.innerHTML = getFinanceHTML(); renderFinanceTable(); }
    else if (pageId === "payroll") content.innerHTML = getPayrollHTML();
    else if (pageId === "inventory") content.innerHTML = getInventoryHTML();
    else if (pageId === "students") content.innerHTML = getStudentsHTML();
    else if (pageId === "staff") content.innerHTML = getStaffHTML();
    else if (pageId === "attendance") content.innerHTML = getAttendanceHTML();
    else if (pageId === "academics") content.innerHTML = getAcademicsHTML();
    else if (pageId === "timetable") { content.innerHTML = getTimetableHTML(); renderTimetableTable(); }
    else if (pageId === "announcements") content.innerHTML = getAnnouncementsHTML();
    else if (pageId === "audit") content.innerHTML = getAuditHTML();
}

// --- HTML GENERATORS ---
function getDashboardHTML() {
    let totalIncome = db.ledger.filter(t => t.type === 'Income').reduce((a,b) => a+b.amount, 0);
    let totalExp = db.ledger.filter(t => t.type === 'Expense').reduce((a,b) => a+b.amount, 0);
    let maxVal = Math.max(totalIncome, totalExp, 1);
    let pendingFees = db.students.reduce((a,s) => a + (s.total - s.paid), 0);
    
    if (currentPortal === 'admin') return `
        <div class="grid-4">
            <div class="stat-card"><div class="label">Cash in Bank</div><div class="value" style="color:var(--success)">${fmt(totalIncome - totalExp)}</div></div>
            <div class="stat-card"><div class="label">Total Students</div><div class="value">${db.students.length}</div></div>
            <div class="stat-card"><div class="label">Total Staff</div><div class="value">${db.staff.length}</div></div>
            <div class="stat-card"><div class="label">Pending Fees</div><div class="value" style="color:var(--danger)">${fmt(pendingFees)}</div></div>
        </div>
        <div class="panel">
            <div class="panel-header"><h3>Income vs Expenses</h3></div>
            <div class="panel-body">
                <div class="chart-container">
                    <div class="chart-bar-col">
                        <div class="chart-bar" style="height: ${(totalIncome / maxVal) * 100}%; background: var(--success);">
                            <span class="chart-bar-value">${fmt(totalIncome)}</span>
                        </div>
                        <span class="chart-bar-label">Total Income</span>
                    </div>
                    <div class="chart-bar-col">
                        <div class="chart-bar" style="height: ${(totalExp / maxVal) * 100}%; background: var(--danger);">
                            <span class="chart-bar-value">${fmt(totalExp)}</span>
                        </div>
                        <span class="chart-bar-label">Total Expenses</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="grid-2">
            <div class="panel"><div class="panel-header"><h3>Recent Announcements</h3></div><div class="panel-body">
                ${db.announcements.slice(0,3).map(a => `<div style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid var(--border);"><strong>${a.title}</strong><br><span style="font-size:0.85rem; color:var(--text-muted);">${a.date} - ${a.desc}</span></div>`).join('') || '<p>No announcements yet.</p>'}
            </div></div>
            <div class="panel"><div class="panel-header"><h3>Recent System Activity</h3></div><div class="panel-body">
                ${db.auditLog.slice(0,5).map(log => `<div style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid var(--border);"><span style="font-size:0.8rem; color:var(--text-muted);">${log.time}</span><br><strong>${log.user_role}:</strong> ${log.action}</div>`).join('') || '<p>No activity yet.</p>'}
            </div></div>
        </div>
    `;
    if (currentPortal === 'parent') {
        let child = db.students.find(s => s.name === "Ali Raza") || db.students[0];
        let outstanding = child ? (child.total - child.paid) : 0;
        return `
            <div class="grid-4">
                <div class="stat-card"><div class="label">Child Name</div><div class="value" style="font-size:1.2rem;">${child ? child.name : 'N/A'}</div></div>
                <div class="stat-card"><div class="label">Outstanding Fees</div><div class="value" style="color:${outstanding > 0 ? 'var(--danger)' : 'var(--success)'}">${fmt(outstanding)}</div></div>
            </div>
            <div class="panel"><div class="panel-header"><h3>School Announcements</h3></div><div class="panel-body">
                ${db.announcements.map(a => `<div style="margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid var(--border);"><strong>${a.title}</strong><br><span style="font-size:0.85rem; color:var(--text-muted);">${a.date} - ${a.desc}</span></div>`).join('') || '<p>No announcements yet.</p>'}
            </div></div>
        `;
    }
    return '<p>Welcome to your portal.</p>';
}

function getFinanceHTML() {
    let totalIncome = db.ledger.filter(t => t.type === 'Income').reduce((a,b) => a+b.amount, 0);
    let totalExp = db.ledger.filter(t => t.type === 'Expense').reduce((a,b) => a+b.amount, 0);
    let isAdmin = currentPortal === 'admin';
    return `
        <div class="grid-4">
            <div class="stat-card"><div class="label">Total Income</div><div class="value" style="color:var(--success)">${fmt(totalIncome)}</div></div>
            <div class="stat-card"><div class="label">Total Expenses</div><div class="value" style="color:var(--danger)">${fmt(totalExp)}</div></div>
            <div class="stat-card"><div class="label">Net Balance</div><div class="value">${fmt(totalIncome - totalExp)}</div></div>
        </div>
        <div class="panel">
            <div class="panel-header"><h3>Finance Ledger</h3>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-ghost btn-sm" onclick="exportCSV('Ledger.csv', [['Date','Description','Type','Amount'], ...db.ledger.map(t => [t.date, t.desc, t.type, t.amount])])">Export CSV</button>
                    ${isAdmin ? `<button class="btn btn-success btn-sm" onclick="openTransactionModal('Income')">Log Income</button><button class="btn btn-danger btn-sm" onclick="openTransactionModal('Expense')">Log Expense</button>` : ''}
                </div>
            </div>
            <div class="panel-body">
                <div class="filter-tabs">
                    <div class="filter-tab ${financeFilter==='All'?'active':''}" onclick="filterFinance('All')">All Transactions</div>
                    <div class="filter-tab ${financeFilter==='Income'?'active':''}" onclick="filterFinance('Income')">Income Only</div>
                    <div class="filter-tab ${financeFilter==='Expense'?'active':''}" onclick="filterFinance('Expense')">Expenses Only</div>
                </div>
                <div class="table-wrapper"><table><thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th>${isAdmin ? '<th>Actions</th>' : ''}</tr></thead><tbody id="financeTbody"></tbody></table></div>
            </div>
        </div>
    `;
}

function filterFinance(type) { financeFilter = type; renderFinanceTable(); }
function renderFinanceTable() {
    let tbody = document.getElementById('financeTbody'); if(!tbody) return;
    let isAdmin = currentPortal === 'admin';
    let filtered = db.ledger.filter(t => financeFilter === 'All' || t.type === financeFilter);
    tbody.innerHTML = filtered.map(t => `<tr><td>${t.date}</td><td>${t.desc}</td><td><span class="badge ${t.type==='Income'?'badge-success':'badge-danger'}">${t.type}</span></td><td style="font-weight:600;">${fmt(t.amount)}</td>${isAdmin ? `<td><button class="btn btn-ghost btn-sm" onclick="openTransactionEditModal('${t.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteTransaction('${t.id}')">Delete</button></td>` : ''}</tr>`).join('') || `<tr><td colspan="${isAdmin ? '5' : '4'}" style="text-align:center;">No transactions found.</td></tr>`;
}

function getPayrollHTML() {
    let totalGross = db.staff.reduce((a,b) => a + (b.salary || 0), 0);
    let totalDeductions = db.staff.length * 2000; 
    let totalNet = totalGross - totalDeductions;
    return `
        <div class="grid-4">
            <div class="stat-card"><div class="label">Total Staff</div><div class="value">${db.staff.length}</div></div>
            <div class="stat-card"><div class="label">Gross Payroll</div><div class="value">${fmt(totalGross)}</div></div>
            <div class="stat-card"><div class="label">Tax Deductions</div><div class="value" style="color:var(--danger)">${fmt(totalDeductions)}</div></div>
            <div class="stat-card"><div class="label">Net Payable</div><div class="value" style="color:var(--success)">${fmt(totalNet)}</div></div>
        </div>
        <div class="panel">
            <div class="panel-header"><h3>Salary Disbursement - ${new Date().toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}</h3>
                <button class="btn btn-success btn-sm" onclick="runPayroll(${totalNet})">Run Payroll & Post to Ledger</button>
            </div>
            <div class="table-wrapper"><table><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Base Salary</th><th>Tax Deducted</th><th>Net Salary</th><th>Status</th></tr></thead><tbody>
                ${db.staff.map(s => { let net = (s.salary || 0) - 2000; return `<tr><td>${s.id}</td><td style="font-weight:600;">${s.name}</td><td>${s.role}</td><td>${fmt(s.salary || 0)}</td><td style="color:var(--danger)">- ${fmt(2000)}</td><td style="font-weight:600;">${fmt(net)}</td><td><span class="badge badge-warning">Pending</span></td></tr>`; }).join('') || '<tr><td colspan="7" style="text-align:center;">No staff members found.</td></tr>'}
            </tbody></table></div>
        </div>
    `;
}

async function runPayroll(amount) {
    if (amount <= 0) return showToast("No salary to disburse.", true);
    if(!confirm(`Confirm disbursing ${fmt(amount)} for payroll? This will be logged as an expense.`)) return;
    try {
        const { error } = await supabaseClient.from('ledger').insert([{ id: Date.now(), date: new Date().toLocaleDateString(), desc: `Monthly Payroll - ${new Date().toLocaleDateString('en-PK', { month: 'long' })}`, type: "Expense", amount: amount }]);
        if (error) throw error;
        await logAction(`Ran payroll for ${db.staff.length} staff. Total: ${fmt(amount)}`);
        await loadDB(); navigateTo('payroll'); showToast("Payroll processed and logged successfully!");
    } catch (err) { showToast("Error: " + err.message, true); }
}

function getInventoryHTML() {
    return `
        <div class="panel">
            <div class="panel-header"><h3>Inventory Management</h3><button class="btn btn-primary btn-sm" onclick="openInventoryModal()">Add Item</button></div>
            <div class="panel-body">
                <div class="search-bar"><input type="text" id="invSearch" placeholder="Search items..." onkeyup="renderInvTable()"></div>
                <div class="table-wrapper"><table id="invTable"><thead><tr><th>Item</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                    ${db.inventory.map(i => `<tr><td>${i.item}</td><td>${i.stock}</td><td><span class="badge ${i.status==='In Stock'?'badge-success':'badge-danger'}">${i.status}</span></td><td><button class="btn btn-ghost btn-sm" onclick="openInventoryEditModal('${i.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteItem('${i.id}')">Delete</button></td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;">No inventory items found.</td></tr>'}
                </tbody></table></div>
            </div>
        </div>
    `;
}
function renderInvTable() {
    let term = document.getElementById('invSearch').value.toLowerCase();
    let filtered = db.inventory.filter(i => i.item.toLowerCase().includes(term));
    document.querySelector('#invTable tbody').innerHTML = filtered.map(i => `<tr><td>${i.item}</td><td>${i.stock}</td><td><span class="badge ${i.status==='In Stock'?'badge-success':'badge-danger'}">${i.status}</span></td><td><button class="btn btn-ghost btn-sm" onclick="openInventoryEditModal('${i.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteItem('${i.id}')">Delete</button></td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;">No items match your search.</td></tr>';
}

function getStudentsHTML() {
    let uniqueGrades = [...new Set(db.students.map(s => s.grade))];
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
                    <select id="stuGradeFilter" onchange="renderStuTable()"><option value="">All Grades</option>${uniqueGrades.map(g => `<option value="${g}">${g}</option>`).join('')}</select>
                </div>
                <div class="table-wrapper"><table id="stuTable"><thead><tr><th>ID</th><th>Name</th><th>Grade</th><th>Fee Status</th><th>Actions</th></tr></thead><tbody>
                    ${db.students.map(s => { let bal = s.total - s.paid; return `<tr><td>${s.id}</td><td style="font-weight:600;">${s.name}</td><td>${s.grade}</td><td style="color:${bal>0?'var(--danger)':'var(--success)'}; font-weight:600;">${fmt(bal)}</td><td><button class="btn btn-success btn-sm" onclick="openFeeModal('${s.id}')">Collect Fee</button> <button class="btn btn-ghost btn-sm" onclick="openStudentEditModal('${s.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}')">Delete</button></td></tr>`; }).join('') || '<tr><td colspan="5" style="text-align:center;">No students admitted yet.</td></tr>'}
                </tbody></table></div>
            </div>
        </div>
    `;
}
function renderStuTable() {
    let term = document.getElementById('stuSearch').value.toLowerCase();
    let grade = document.getElementById('stuGradeFilter').value;
    let filtered = db.students.filter(s => (s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term)) && (grade === "" || s.grade === grade));
    document.querySelector('#stuTable tbody').innerHTML = filtered.map(s => { let bal = s.total - s.paid; return `<tr><td>${s.id}</td><td style="font-weight:600;">${s.name}</td><td>${s.grade}</td><td style="color:${bal>0?'var(--danger)':'var(--success)'}; font-weight:600;">${fmt(bal)}</td><td><button class="btn btn-success btn-sm" onclick="openFeeModal('${s.id}')">Collect Fee</button> <button class="btn btn-ghost btn-sm" onclick="openStudentEditModal('${s.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}')">Delete</button></td></tr>`; }).join('') || '<tr><td colspan="5" style="text-align:center;">No students match your search.</td></tr>';
}

function getStaffHTML() {
    return `
        <div class="panel">
            <div class="panel-header"><h3>Staff & HR Management</h3><button class="btn btn-primary btn-sm" onclick="openStaffModal()">Onboard Staff</button></div>
            <div class="table-wrapper"><table><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Salary</th><th>Status</th><th>Actions</th></tr></thead><tbody>
                ${db.staff.map(s => `<tr><td>${s.id}</td><td style="font-weight:600;">${s.name}</td><td>${s.role}</td><td>${fmt(s.salary || 0)}</td><td><span class="badge badge-info">${s.status}</span></td><td><button class="btn btn-ghost btn-sm" onclick="openStaffEditModal('${s.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteStaff('${s.id}')">Delete</button></td></tr>`).join('') || '<tr><td colspan="6" style="text-align:center;">No staff members found.</td></tr>'}
            </tbody></table></div>
        </div>
    `;
}

function getAttendanceHTML() {
    if (currentPortal === 'parent') {
        let child = db.students.find(s => s.name === "Ali Raza") || db.students[0];
        let childAttendance = child ? db.attendance.filter(a => a.person_id === child.id) : [];
        return `
            <div class="panel"><div class="panel-header"><h3>${child ? child.name : 'Child'}'s Attendance History</h3></div>
            <div class="table-wrapper"><table><thead><tr><th>Date</th><th>Status</th></tr></thead><tbody>
                ${childAttendance.map(a => `<tr><td>${a.date}</td><td><span class="badge ${a.status==='Present'?'badge-success':a.status==='Late'?'badge-warning':'badge-danger'}">${a.status}</span></td></tr>`).join('') || '<tr><td colspan="2" style="text-align:center;">No attendance recorded yet.</td></tr>'}
            </tbody></table></div></div>
        `;
    }
    let todayISO = new Date().toLocaleDateString('en-CA');
    let list = attendanceType === 'student' ? db.students : db.staff;
    let alreadyMarked = db.attendance.filter(a => a.date === todayISO && a.person_type === attendanceType);
    return `
        <div class="panel"><div class="panel-header"><h3>Mark Daily Attendance</h3>
            <div style="display: flex; gap: 10px;">
                <button class="btn ${attendanceType === 'student' ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="switchAttendanceType('student')">Students</button>
                <button class="btn ${attendanceType === 'staff' ? 'btn-primary' : 'btn-ghost'} btn-sm" onclick="switchAttendanceType('staff')">Staff</button>
            </div></div>
            <div class="panel-body">
                <div style="display:flex; justify-content:space-between; margin-bottom: 16px; align-items:center;">
                    <p><strong>Date:</strong> ${new Date().toLocaleDateString()} | <strong>Total ${attendanceType}s:</strong> ${list.length} | <strong>Already Marked Today:</strong> ${alreadyMarked.length}</p>
                    <button class="btn btn-ghost btn-sm" onclick="markAllPresent()">Mark All Present</button>
                </div>
                <div class="table-wrapper"><table id="attTable"><thead><tr><th>Name</th><th>ID</th><th>Mark Status</th></tr></thead><tbody>
                    ${list.map(p => { let record = alreadyMarked.find(a => a.person_id === p.id); let currentStatus = record ? record.status : 'Present'; return `<tr><td style="font-weight:600;">${p.name}</td><td>${p.id}</td><td><select class="form-control" id="att_${p.id}" style="width: 150px;" ${record ? 'disabled' : ''}><option value="Present" ${currentStatus === 'Present' ? 'selected' : ''}>Present</option><option value="Absent" ${currentStatus === 'Absent' ? 'selected' : ''}>Absent</option><option value="Late" ${currentStatus === 'Late' ? 'selected' : ''}>Late</option></select></td></tr>`; }).join('') || `<tr><td colspan="3" style="text-align:center;">No ${attendanceType}s found.</td></tr>`}
                </tbody></table></div>
                ${list.length > 0 ? `<button class="btn btn-success" style="margin-top: 16px;" onclick="saveAttendance()">Save Today's Attendance</button>` : ''}
            </div>
        </div>
        <div class="panel"><div class="panel-header"><h3>Attendance History (Recent)</h3></div>
            <div class="table-wrapper"><table><thead><tr><th>Date</th><th>Name</th><th>Type</th><th>Status</th></tr></thead><tbody>
                ${db.attendance.slice().reverse().slice(0, 15).map(a => `<tr><td>${a.date}</td><td>${a.person_name}</td><td>${a.person_type}</td><td><span class="badge ${a.status==='Present'?'badge-success':a.status==='Late'?'badge-warning':'badge-danger'}">${a.status}</span></td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;">No history yet.</td></tr>'}
            </tbody></table></div></div>
    `;
}
function switchAttendanceType(type) { attendanceType = type; navigateTo('attendance'); }
function markAllPresent() {
    document.querySelectorAll('[id^="att_"]').forEach(sel => { if(!sel.disabled) sel.value = 'Present'; });
    showToast("Marked all as Present!");
}

async function saveAttendance() {
    let todayISO = new Date().toLocaleDateString('en-CA');
    let list = attendanceType === 'student' ? db.students : db.staff;
    let recordsToInsert = [];
    for (let p of list) { let selectEl = document.getElementById(`att_${p.id}`); if (selectEl && !selectEl.disabled) { recordsToInsert.push({ id: Date.now() + Math.floor(Math.random() * 1000), date: todayISO, person_id: p.id, person_name: p.name, person_type: attendanceType, status: selectEl.value }); } }
    if (recordsToInsert.length === 0) return showToast("No new attendance to save.", true);
    try {
        const { error } = await supabaseClient.from('attendance_log').insert(recordsToInsert);
        if (error) throw error;
        await logAction(`Marked attendance for ${recordsToInsert.length} ${attendanceType}s.`);
        await loadDB(); navigateTo('attendance'); showToast("Attendance saved successfully!");
    } catch (err) { showToast("Error: " + err.message, true); }
}

function getAcademicsHTML() {
    if (currentPortal === 'parent') {
        let child = db.students.find(s => s.name === "Ali Raza") || db.students[0];
        let childGrades = child ? db.grades.filter(g => g.student_id === child.id) : [];
        return `
            <div class="panel no-print"><div class="panel-header"><h3>Report Card Generator</h3><button class="btn btn-primary btn-sm" onclick="window.print()">Print Report Card</button></div></div>
            <div id="printArea" class="report-card">
                <h1>Academy ERP School</h1>
                <div class="student-info"><span><strong>Student:</strong> ${child ? child.name : 'N/A'}</span><span><strong>Grade:</strong> ${child ? child.grade : 'N/A'}</span><span><strong>Term:</strong> Mid-Term 2023</span></div>
                <table><thead><tr><th>Subject</th><th>Marks Obtained</th><th>Total Marks</th><th>Grade</th></tr></thead><tbody>
                    ${childGrades.map(g => `<tr><td>${g.subject}</td><td>${g.marks}</td><td>100</td><td>${g.marks >= 90 ? 'A+' : g.marks >= 80 ? 'A' : g.marks >= 70 ? 'B' : 'C'}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;">No grades uploaded yet.</td></tr>'}
                </tbody></table>
                <div class="remarks"><strong>Teacher Remarks:</strong> ${childGrades.length > 0 ? 'Good performance, keep it up!' : 'Pending compilation.'}</div>
            </div>
        `;
    }
    let canEdit = (currentPortal === 'teacher' || currentPortal === 'admin');
    return `
        <div class="panel"><div class="panel-header"><h3>Gradebook Management</h3>${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openGradeModal()">Add Grade</button>` : ''}</div>
            <div class="table-wrapper"><table><thead><tr><th>Student Name</th><th>Subject</th><th>Marks</th>${canEdit ? '<th>Actions</th>' : ''}</tr></thead><tbody>
                ${db.grades.map(g => `<tr><td>${g.student_name}</td><td>${g.subject}</td><td style="font-weight:600;">${g.marks}/100</td>${canEdit ? `<td><button class="btn btn-ghost btn-sm" onclick="openGradeEditModal('${g.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteGrade('${g.id}')">Delete</button></td>` : ''}</tr>`).join('') || `<tr><td colspan="${canEdit ? 4 : 3}" style="text-align:center;">No grades uploaded yet.</td></tr>`}
            </tbody></table></div></div>
        <div class="panel"><div class="panel-header"><h3>LMS / Assignments Board</h3>${canEdit ? `<button class="btn btn-primary btn-sm" onclick="openAssignmentModal()">Post Assignment</button>` : ''}</div>
            <div class="panel-body">${db.assignments.map(a => `<div style="padding:12px; border:1px solid var(--border); border-radius:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;"><div><strong>${a.title}</strong> (Due: ${a.due})<br><span style="font-size:0.85rem; color:var(--text-muted);">${a.desc}</span></div>${canEdit ? `<div><button class="btn btn-ghost btn-sm" onclick="openAssignmentEditModal('${a.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteAssignment('${a.id}')">Delete</button></div>` : ''}</div>`).join('') || '<p>No assignments posted yet.</p>'}</div>
        </div>
    `;
}

function getTimetableHTML() {
    let uniqueClasses = [...new Set(db.timetable.map(t => t.class))].sort();
    let isAdmin = currentPortal === 'admin';
    return `
        <div class="panel"><div class="panel-header"><h3>Dynamic Timetable</h3>${isAdmin ? `<button class="btn btn-primary btn-sm" onclick="openTimetableModal()">Add Slot</button>` : ''}</div>
            <div class="panel-body"><div class="search-bar"><label style="font-weight: 600; align-self: center;">Filter by Class:</label><select id="ttClassFilter" onchange="renderTimetableTable()"><option value="">All Classes</option>${uniqueClasses.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
                <div class="table-wrapper"><table id="ttTable"><thead><tr><th>Day</th><th>Time</th><th>Class</th><th>Subject</th><th>Teacher</th>${isAdmin ? '<th>Actions</th>' : ''}</tr></thead><tbody id="ttTableBody"></tbody></table></div>
            </div>
        </div>
    `;
}
function renderTimetableTable() {
    let selectedClass = document.getElementById('ttClassFilter') ? document.getElementById('ttClassFilter').value : "";
    let filtered = selectedClass ? db.timetable.filter(t => t.class === selectedClass) : db.timetable;
    let isAdmin = currentPortal === 'admin';
    let sortDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    filtered.sort((a, b) => { let dayDiff = sortDays.indexOf(a.day) - sortDays.indexOf(b.day); if (dayDiff !== 0) return dayDiff; return a.time.localeCompare(b.time); });
    let tbody = document.getElementById('ttTableBody'); if (!tbody) return; 
    tbody.innerHTML = filtered.map(t => `<tr><td>${t.day}</td><td>${t.time}</td><td>${t.class}</td><td>${t.subject}</td><td>${t.teacher}</td>${isAdmin ? `<td><button class="btn btn-ghost btn-sm" onclick="openTimetableEditModal('${t.id}')">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteSlot('${t.id}')">Delete</button></td>` : ''}</tr>`).join('') || `<tr><td colspan="${isAdmin ? 6 : 5}" style="text-align:center;">No timetable slots found for this class.</td></tr>`;
}

function getAnnouncementsHTML() {
