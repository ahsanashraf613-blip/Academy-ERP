import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const EMPTY = { studentId: '', subject: '', term: '', score: '', maxScore: 100, remarks: '' };

export default function Grades() {
  const { user } = useAuth();
  const canEdit = ['admin', 'teacher'].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [gradesRes, studentsRes] = await Promise.all([api.get('/grades'), api.get('/students?pageSize=100')]);
      setRows(gradesRes.data);
      setStudents(studentsRes.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const studentName = (id) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.first_name} ${s.last_name}` : id.slice(0, 8);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`/grades/${editingId}`, { ...form, score: Number(form.score), maxScore: Number(form.maxScore) });
      } else {
        await api.post('/grades', { ...form, score: Number(form.score), maxScore: Number(form.maxScore) });
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

  const openEdit = (grade) => {
    setEditingId(grade.id);
    setForm({
      studentId: grade.student_id,
      subject: grade.subject,
      term: grade.term,
      score: grade.score.toString(),
      maxScore: grade.max_score.toString(),
      remarks: grade.remarks || '',
    });
    setOpen(true);
  };

  return (
    <div>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl text-ink">Grades</p>
          <p className="text-sm text-slate-500">Exam and assessment scores.</p>
        </div>
        {canEdit && <button className="btn-primary" onClick={() => { setEditingId(null); setForm(EMPTY); setOpen(true); }}>+ Record score</button>}
      </header>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Term</th>
              <th className="px-4 py-3">Score</th>
              {canEdit && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canEdit ? 5 : 4} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={canEdit ? 5 : 4} className="px-4 py-6 text-center text-slate-400">No grades recorded yet.</td></tr>
            ) : rows.map((g) => (
              <tr key={g.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 text-ink">{studentName(g.student_id)}</td>
                <td className="px-4 py-3 text-slate-600">{g.subject}</td>
                <td className="px-4 py-3 text-slate-600">{g.term}</td>
                <td className="px-4 py-3 font-mono text-slate-700">{g.score} / {g.max_score}</td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(g)} className="text-xs text-slate-500 hover:text-ink">Edit</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={editingId ? "Edit score" : "Record a score"} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="field-label">Student</label>
              <select required disabled={!!editingId} className="field-input" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
                <option value="">Select a student…</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">Subject</label><input required className="field-input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
              <div><label className="field-label">Term</label><input required className="field-input" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} /></div>
              <div><label className="field-label">Score</label><input required type="number" step="0.1" className="field-input" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} /></div>
              <div><label className="field-label">Out of</label><input required type="number" step="0.1" className="field-input" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} /></div>
            </div>
            <div><label className="field-label">Remarks</label><input className="field-input" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
            {error && <p role="alert" className="text-sm text-rose-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save score'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
