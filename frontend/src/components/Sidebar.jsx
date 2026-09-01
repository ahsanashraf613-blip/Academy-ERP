import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to: '/', label: 'Overview', code: '00' },
  { to: '/students', label: 'Students', code: '01' },
  { to: '/staff', label: 'Staff', code: '02' },
  { to: '/attendance', label: 'Attendance', code: '03' },
  { to: '/grades', label: 'Grades', code: '04' },
  { to: '/fees', label: 'Fees', code: '05' },
  { to: '/timetable', label: 'Timetable', code: '06' },
];

const ADMIN_NAV = [
  { to: '/users', label: 'Users', code: '10' },
  { to: '/audit', label: 'Audit Log', code: '11' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-60 flex-col justify-between border-r border-slate-800 bg-ink text-slate-200">
      <div>
        <div className="border-b border-slate-800 px-5 py-5">
          <p className="font-display text-lg leading-tight text-white">Registrar</p>
          <p className="text-[11px] uppercase tracking-widest text-slate-500">Admin Console</p>
        </div>
        <nav className="px-2 py-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`
              }
            >
              <span className="font-mono text-[11px] text-slate-500">{item.code}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {user?.role === 'admin' && (
          <>
            <div className="px-3 py-2 text-[11px] font-mono text-slate-600 uppercase tracking-widest">Admin</div>
            <nav className="px-2 py-3">
              {ADMIN_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
                      isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`
                  }
                >
                  <span className="font-mono text-[11px] text-slate-500">{item.code}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </>
        )}
      </div>

      <div className="border-t border-slate-800 px-5 py-4">
        <p className="truncate text-sm text-slate-200">{user?.name}</p>
        <p className="truncate font-mono text-[11px] text-slate-500">{user?.role}</p>
        <div className="mt-3 flex gap-2">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `text-xs font-medium transition-colors ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-white'
              }`
            }
          >
            Settings
          </NavLink>
          <button onClick={logout} className="text-xs font-medium text-slate-400 hover:text-white">
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
