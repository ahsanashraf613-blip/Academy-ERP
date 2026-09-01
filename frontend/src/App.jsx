import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Staff from './pages/Staff';
import Attendance from './pages/Attendance';
import Grades from './pages/Grades';
import Fees from './pages/Fees';
import Timetable from './pages/Timetable';
import Settings from './pages/Settings';
import Users from './pages/Users';
import AuditLog from './pages/AuditLog';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

function AdminLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="min-h-screen flex-1 bg-[#FBFAF7] px-8 py-8">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/students" element={<Students />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/grades" element={<Grades />} />
                <Route path="/fees" element={<Fees />} />
                <Route path="/timetable" element={<Timetable />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/users" element={<Users />} />
                <Route path="/audit" element={<AuditLog />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
