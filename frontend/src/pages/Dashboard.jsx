import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, staff: 0, invoicesOutstanding: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [students, staff, fees] = await Promise.all([
          api.get('/students?pageSize=1'),
          api.get('/staff'),
          api.get('/fees'),
        ]);
        const outstanding = (fees.data || []).filter((f) => f.status !== 'paid').length;
        setStats({ students: students.total, staff: staff.data.length, invoicesOutstanding: outstanding });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { code: '01', label: 'Enrolled students', value: stats.students },
    { code: '02', label: 'Staff on record', value: stats.staff },
    { code: '05', label: 'Invoices outstanding', value: stats.invoicesOutstanding },
  ];

  return (
    <div>
      <header className="mb-6">
        <p className="font-display text-2xl text-ink">Good to see you, {user?.name?.split(' ')[0]}.</p>
        <p className="text-sm text-slate-500">Here is the current state of the register.</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.code} className="card tab-index px-5 py-4">
            <p className="font-mono text-[11px] text-slate-400">{c.code}</p>
            <p className="mt-1 font-display text-3xl text-ink">{loading ? '—' : c.value}</p>
            <p className="text-sm text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="card mt-6 px-5 py-5">
        <p className="font-display text-lg text-ink">Quick reference</p>
        <p className="mt-1 text-sm text-slate-500">
          Use the register on the left to manage students, staff, attendance, grades, fees, and the
          timetable. Every write action here is attributed to your account and recorded in the audit log.
        </p>
      </div>
    </div>
  );
}
