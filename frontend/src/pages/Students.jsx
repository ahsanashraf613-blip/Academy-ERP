import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import StatusStamp from '../components/StatusStamp';
import ConfirmDialog from '../components/ConfirmDialog';

const EMPTY_FORM = {
  admissionNo: '', firstName: '', lastName: '', gradeLevel: '', section: '',
  guardianName: '', guardianPhone: '', guardianEmail: '', address: '',
};

export default function Students() {
  const { user } = useAuth();
  const canEdit = ['admin', 'registrar'].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = async (q = search) => {
    setLoading(true);
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : '';
      const data = await api.get(`/students${params}`);
      setRows(data.data);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(''); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`/students/${editingId}`, form);
      } else {
        await api.post('/students', form);
      }
      setModalOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (student) => {
    setEditingId(student.id);
    setForm({
      admissionNo: student.admission_no,
      firstName: student.first_name,
      lastName: student.last_name,
      gradeLevel: student.grade_level,
      section: student.section || '',
      guardianName: student.guardian_name || '',
      guardianPhone: student.guardian_phone || '',
      guardianEmail: student.guardian_email || '',
      address: student.address || '',
    });
    setModalOpen(true);
  };

  const deleteStudent = async (id) => {
    try {
      await api.del(`/students/${id}`);
      load();
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl text-ink">Students</p>
          <p className="text-sm text-slate-500">{total} on record</p>
        </div>
        {canEdit && (
          <button className="btn-primary" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setModalOpen(true); }}>
            + Enroll student
          </button>
        )}
      </header>

      <div className="mb-4">
        <input
          className="field-input max-w-xs"
          placeholder="Search by name or admission no."
          value={search}
          onChange={(e) => { setSearch(e.target.value); load(e.target.value); }}
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-mono">Adm. No.</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Guardian</th>
              <th className="px-4 py-3">Status</th>
              {canEdit && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canEdit ? 6 : 5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={canEdit ? 6 : 5} className="px-4 py-6 text-center text-slate-400">No students found.</td></tr>
            ) : (
              rows.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.admission_no}</td>
                  <td className="px-4 py-3 text-ink">{s.first_name} {s.last_name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.grade_level}{s.section ? `-${s.section}` : ''}</td>
                  <td className="px-4 py-3 text-slate-600">{s.guardian_name || '—'}</td>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal title={editingId ? "Edit student" : "Enroll a new student"} onClose={() => setModalOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Admission No.</label>
                <input required className="field-input" value={form.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Grade level</label>
                <input required className="field-input" value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} />
              </div>
              <div>
                <label className="field-label">First name</label>
                <input required className="field-input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Last name</label>
                <input required className="field-input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Section</label>
                <input className="field-input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Guardian name</label>
                <input className="field-input" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Guardian phone</label>
                <input className="field-input" value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Guardian email</label>
                <input type="email" className="field-input" value={form.guardianEmail} onChange={(e) => setForm({ ...form, guardianEmail: e.target.value })} />
              </div>
            </div>

            {error && <p role="alert" className="text-sm text-rose-500">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save student'}</button>
            </div>
          </form>
        </Modal>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          title="Delete student"
          message={`Are you sure you want to delete ${deleteConfirm.first_name} ${deleteConfirm.last_name}? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={() => deleteStudent(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
