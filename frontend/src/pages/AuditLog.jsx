import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

const ACTIONS = ['login_success', 'login_failed', 'logout', 'password_changed', 'create', 'update', 'delete'];
const ENTITIES = ['user', 'student', 'staff', 'attendance', 'grade', 'fee_invoice', 'timetable'];

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: 50, page: p });
      if (filterAction) params.append('action', filterAction);
      if (filterEntity) params.append('entity', filterEntity);
      const data = await api.get(`/audit?${params}`);
      setRows(data.data);
      setTotal(data.total);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterAction, filterEntity]);

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  const totalPages = Math.ceil(total / 50);

  return (
    <div>
      <header className="mb-6">
        <p className="font-display text-2xl text-ink">Audit Log</p>
        <p className="text-sm text-slate-500">All system actions and logins recorded with user, timestamp, and IP address.</p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 max-w-md">
        <div>
          <label className="field-label">Filter by action</label>
          <select
            className="field-input"
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Filter by entity</label>
          <select
            className="field-input"
            value={filterEntity}
            onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
          >
            <option value="">All entities</option>
            {ENTITIES.map((e) => (
              <option key={e} value={e}>{e.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No audit entries found.</td></tr>
            ) : rows.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600 text-xs font-mono">{formatDate(a.created_at)}</td>
                <td className="px-4 py-3 text-ink">{a.user_name || '—'}</td>
                <td className="px-4 py-3 text-slate-600 font-mono">{a.action}</td>
                <td className="px-4 py-3 text-slate-600">{a.entity}</td>
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">{a.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => load(page - 1)}
            disabled={page === 1}
            className="btn-secondary disabled:opacity-50 disabled:pointer-events-none"
          >
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => load(page + 1)}
            disabled={page === totalPages}
            className="btn-secondary disabled:opacity-50 disabled:pointer-events-none"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
