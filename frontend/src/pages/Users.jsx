import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusStamp from '../components/StatusStamp';

const EMPTY_FORM = { name: '', email: '', role: 'teacher', password: '' };
const ROLES = ['admin', 'registrar', 'teacher', 'accountant'];

export default function Users() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get('/users');
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
    setTempPassword(null);
    try {
      const payload = { ...form };
      if (!payload.password && !editingId) {
        // Generate temporary password for new users
      }
      if (!payload.password) {
        delete payload.password;
      }

      let result;
      if (editingId) {
        result = await api.put(`/users/${editingId}`, payload);
      } else {
        result = await api.post('/users', payload);
        if (result.tempPassword) {
          setTempPassword(result.tempPassword);
        }
      }
      
      if (!editingId) {
        setOpen(false);
        setForm(EMPTY_FORM);
      }
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (user) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
    });
    setOpen(true);
  };

  const toggleStatus = async (id) => {
    try {
      await api.patch(`/users/${id}/toggle-status`);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl text-ink">Users</p>
          <p className="text-sm text-slate-500">Manage admin accounts and staff access.</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setTempPassword(null); setOpen(true); }}>
          + Create user
        </button>
      </header>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No users yet.</td></tr>
            ) : rows.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 text-ink">{u.name}</td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{u.email}</td>
                <td className="px-4 py-3 text-slate-600 capitalize">{u.role}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleStatus(u.id)}
                    className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-mono font-medium uppercase tracking-wide cursor-pointer transition-colors ${
                      u.is_active
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-slate-300 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {u.is_active ? 'active' : 'inactive'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(u)} className="text-xs text-slate-500 hover:text-ink">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editingId ? "Edit user" : "Create new user"} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="field-label">Full name</label>
              <input
                required
                className="field-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Email</label>
              <input
                required
                type="email"
                className="field-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Role</label>
              <select
                required
                className="field-input"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Password{editingId ? ' (leave empty to keep current)' : ' (12+ characters)'}</label>
              <input
                type="password"
                required={!editingId}
                className="field-input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete={editingId ? 'off' : 'new-password'}
              />
            </div>

            {error && <p role="alert" className="text-sm text-rose-500">{error}</p>}
            {tempPassword && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-900 font-medium mb-2">User created with temporary password:</p>
                <p className="text-sm font-mono text-blue-700 bg-white p-2 rounded border border-blue-200">{tempPassword}</p>
                <p className="text-xs text-blue-700 mt-2">Share this password securely with the user. They should change it on first login.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : editingId ? 'Update user' : 'Create user'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
