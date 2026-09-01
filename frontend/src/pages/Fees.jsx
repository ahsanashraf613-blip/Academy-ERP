import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import StatusStamp from '../components/StatusStamp';

const EMPTY_INVOICE = { studentId: '', term: '', amountDue: '', dueDate: '' };

export default function Fees() {
  const { user } = useAuth();
  const canEdit = ['admin', 'accountant'].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_INVOICE);
  const [payAmount, setPayAmount] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [feesRes, studentsRes] = await Promise.all([api.get('/fees'), api.get('/students?pageSize=100')]);
      setRows(feesRes.data);
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
      await api.post('/fees', { ...form, amountDue: Number(form.amountDue) });
      setOpen(false);
      setForm(EMPTY_INVOICE);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const recordPayment = async (invoiceId) => {
    const amount = Number(payAmount[invoiceId]);
    if (!amount || amount <= 0) return;
    await api.post(`/fees/${invoiceId}/payments`, { amount });
    setPayAmount((p) => ({ ...p, [invoiceId]: '' }));
    load();
  };

  return (
    <div>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl text-ink">Fees</p>
          <p className="text-sm text-slate-500">Invoices and payments.</p>
        </div>
        {canEdit && <button className="btn-primary" onClick={() => setOpen(true)}>+ New invoice</button>}
      </header>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Term</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Status</th>
              {canEdit && <th className="px-4 py-3">Record payment</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No invoices yet.</td></tr>
            ) : rows.map((f) => (
              <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 text-ink">{studentName(f.student_id)}</td>
                <td className="px-4 py-3 text-slate-600">{f.term}</td>
                <td className="px-4 py-3 font-mono text-slate-700">{f.amount_due.toFixed(2)}</td>
                <td className="px-4 py-3 font-mono text-slate-700">{f.amount_paid.toFixed(2)}</td>
                <td className="px-4 py-3"><StatusStamp value={f.status} /></td>
                {canEdit && (
                  <td className="px-4 py-3">
                    {f.status !== 'paid' && (
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          placeholder="Amount"
                          className="field-input w-24 py-1"
                          value={payAmount[f.id] || ''}
                          onChange={(e) => setPayAmount((p) => ({ ...p, [f.id]: e.target.value }))}
                        />
                        <button className="btn-secondary py-1" onClick={() => recordPayment(f.id)}>Add</button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title="Create an invoice" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="field-label">Student</label>
              <select required className="field-input" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
                <option value="">Select a student…</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">Term</label><input required className="field-input" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} /></div>
              <div><label className="field-label">Amount due</label><input required type="number" step="0.01" className="field-input" value={form.amountDue} onChange={(e) => setForm({ ...form, amountDue: e.target.value })} /></div>
              <div><label className="field-label">Due date</label><input type="date" className="field-input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            </div>
            {error && <p role="alert" className="text-sm text-rose-500">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Create invoice'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
