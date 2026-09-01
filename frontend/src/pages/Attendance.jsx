import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import StatusStamp from '../components/StatusStamp';

const STATUSES = ['present', 'absent', 'late', 'excused'];

export default function Attendance() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [studentsRes, attendanceRes] = await Promise.all([
        api.get('/students?pageSize=100'),
        api.get(`/attendance?date=${date}`),
      ]);
      setStudents(studentsRes.data);
      const map = {};
      attendanceRes.data.forEach((r) => { map[r.student_id] = r.status; });
      setRecords(map);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [date]);

  const mark = async (studentId, status) => {
    setSavingId(studentId);
    try {
      await api.post('/attendance', { studentId, date, status });
      setRecords((prev) => ({ ...prev, [studentId]: status }));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl text-ink">Attendance</p>
          <p className="text-sm text-slate-500">Mark each student for the selected day.</p>
        </div>
        <input type="date" className="field-input w-44" value={date} onChange={(e) => setDate(e.target.value)} />
      </header>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3">Mark as</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
            ) : students.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 text-ink">{s.first_name} {s.last_name}</td>
                <td className="px-4 py-3 text-slate-600">{s.grade_level}{s.section ? `-${s.section}` : ''}</td>
                <td className="px-4 py-3">{records[s.id] ? <StatusStamp value={records[s.id]} /> : <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {STATUSES.map((status) => (
                      <button
                        key={status}
                        disabled={savingId === s.id}
                        onClick={() => mark(s.id, status)}
                        className={`rounded px-2 py-1 text-xs font-medium capitalize transition-colors ${
                          records[s.id] === status ? 'bg-ink text-white' : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
