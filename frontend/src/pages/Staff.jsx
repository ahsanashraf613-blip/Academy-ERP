import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import StatusStamp from '../components/StatusStamp';
import ConfirmDialog from '../components/ConfirmDialog';

const EMPTY = { employeeNo: '', firstName: '', lastName: '', roleTitle: '', department: '', email: '', phone: '' };

export default function Staff() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get('/staff');
      setRows(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`/staff/${editingId}`, form);
      } else {
        await api.post('/staff', form);
      }
      setOpen(false);
      setEditingId(null);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (staff) => {
    setEditingId(staff.id);
    setForm({
      employeeNo: staff.employee_no,
      firstName: staff.first_name,
      lastName: staff.last_name,
      roleTitle: staff.role_title,
      department: staff.department || '',
      email: staff.email || '',
      phone: staff.phone || '',
    });
    setOpen(true);
  };

  const deleteStaff = async (id) => {
    try {
      await api.del(`/staff/${id}`);
      load();
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl text-ink">Staff</p>
          <p className="text-sm text-slate-500">{rows.length} on record</p>
        </div>
        {canEdit && <button className="btn-primary" onClick={() => { setEditingId(null); setForm(EMPTY); setOpen(true); }}>+ Add staff member</button>}
      </header>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-mono">Emp. No.</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
              {canEdit && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canEdit ? 6 : 5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={canEdit ? 6 : 5} className="px-4 py-6 text-center text-slate-400">No staff records yet.</td></tr>
            ) : rows.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.employee_no}</td>
                <td className="px-4 py-3 text-ink">{s.first_name} {s.last_name}</td>
                <td className="px-4 py-3 text-slate-600">{s.role_title}</td>
                <td className="px-4 py-3 text-slate-600">{s.department || '—'}</td>
                <td className="px-4 py-3"><StatusStamp value={s.status} /></td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(s)} className="text-xs text-slate-500 hover:text-ink">Edit</button>
                      <button onClick={() => setDeleteConfirm(s)} className="text-xs text-slate-400 hover:text-rose-500">Delete</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editingId ? "Edit staff member" : "Add a staff member"} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">Employee No.</label><input required className="field-input" value={form.employeeNo} onChange={(e) => setForm({ ...form, employeeNo: e.target.value })} /></div>
              <div><label className="field-label">Role title</label><input required className="field-input" value={form.roleTitle} onChange={(e) => setForm({ ...form, roleTitle: e.target.value })} /></div>
              <div><label className="field-label">First name</label><input required className="field-input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
              <div><label className="field-label">Last name</label><input required className="field-input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
              <div><label className="field-label">Department</label><input className="field-input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              <div><label className="field-label">Email</label><input type="email" className="field-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><label className="field-label">Phone</label><input className="field-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            {error && <p role="alert" className="text-sm text-rose-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save staff member'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          title="Delete staff member"
          message={`Are you sure you want to delete ${deleteConfirm.first_name} ${deleteConfirm.last_name}? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={() => deleteStaff(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
