import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EMPTY = { gradeLevel: '', section: '', dayOfWeek: 'Mon', period: '', subject: '', staffId: '' };

export default function Timetable() {
  const { user } = useAuth();
  const canEdit = ['admin', 'registrar'].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [ttRes, staffRes] = await Promise.all([api.get('/timetable'), api.get('/staff')]);
      setRows(ttRes.data);
      setStaff(staffRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const staffName = (id) => {
    const s = staff.find((x) => x.id === id);
    return s ? `${s.first_name} ${s.last_name}` : '—';
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/timetable', { ...form, staffId: form.staffId || undefined });
      setOpen(false);
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await api.del(`/timetable/${id}`);
    load();
  };

  return (
    <div>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl text-ink">Timetable</p>
          <p className="text-sm text-slate-500">Weekly class schedule.</p>
        </div>
        {canEdit && <button className="btn-primary" onClick={() => setOpen(true)}>+ Add period</button>}
      </header>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Day</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Teacher</th>
              {canEdit && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No periods scheduled yet.</td></tr>
            ) : rows.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 text-ink">{t.day_of_week}</td>
                <td className="px-4 py-3 font-mono text-slate-600">{t.period}</td>
                <td className="px-4 py-3 text-slate-600">{t.grade_level}{t.section ? `-${t.section}` : ''}</td>
                <td className="px-4 py-3 text-slate-700">{t.subject}</td>
                <td className="px-4 py-3 text-slate-600">{staffName(t.staff_id)}</td>
                {canEdit && (
                  <td className="px-4 py-3">
                    <button onClick={() => remove(t.id)} className="text-xs text-slate-400 hover:text-rose-500">Remove</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title="Add a scheduled period" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Day</label>
                <select className="field-input" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
                  {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div><label className="field-label">Period</label><input required placeholder="e.g. 1st, 09:00" className="field-input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
              <div><label className="field-label">Grade level</label><input required className="field-input" value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} /></div>
              <div><label className="field-label">Section</label><input className="field-input" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} /></div>
              <div className="col-span-2"><label className="field-label">Subject</label><input required className="field-input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
              <div className="col-span-2">
                <label className="field-label">Teacher</label>
                <select className="field-input" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
                  <option value="">Unassigned</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              </div>
            </div>
            {error && <p role="alert" className="text-sm text-rose-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save period'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
