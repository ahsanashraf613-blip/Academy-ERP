import React from 'react';

const STYLES = {
  active: 'border-moss-500 text-moss-500',
  present: 'border-moss-500 text-moss-500',
  paid: 'border-moss-500 text-moss-500',
  late: 'border-amber-500 text-amber-500',
  partial: 'border-amber-500 text-amber-500',
  unpaid: 'border-amber-500 text-amber-500',
  pending: 'border-amber-500 text-amber-500',
  on_leave: 'border-amber-500 text-amber-500',
  excused: 'border-slate-400 text-slate-500',
  inactive: 'border-slate-400 text-slate-500',
  absent: 'border-rose-500 text-rose-500',
  overdue: 'border-rose-500 text-rose-500',
  withdrawn: 'border-rose-500 text-rose-500',
};

export default function StatusStamp({ value }) {
  const key = String(value || '').toLowerCase();
  const cls = STYLES[key] || 'border-slate-400 text-slate-500';
  return <span className={`stamp ${cls}`}>{key.replace('_', ' ')}</span>;
}
