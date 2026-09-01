import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 12) {
      setError('New password must be at least 12 characters.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setSuccess('Password updated successfully. Redirecting to login...');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <header className="mb-6">
        <p className="font-display text-2xl text-ink">Settings</p>
        <p className="text-sm text-slate-500">Manage your account and preferences.</p>
      </header>

      <div className="card max-w-2xl px-6 py-6">
        <div className="mb-6 pb-6 border-b border-slate-200">
          <p className="font-display text-lg text-ink mb-4">Account Information</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="field-label">Name</p>
              <p className="text-ink">{user?.name}</p>
            </div>
            <div>
              <p className="field-label">Email</p>
              <p className="text-ink">{user?.email}</p>
            </div>
            <div>
              <p className="field-label">Role</p>
              <p className="text-ink capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="font-display text-lg text-ink mb-4">Change Password</p>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
            <div>
              <label className="field-label" htmlFor="current">Current password</label>
              <input
                id="current"
                type="password"
                required
                className="field-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="new">New password (12+ characters)</label>
              <input
                id="new"
                type="password"
                required
                className="field-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="confirm">Confirm new password</label>
              <input
                id="confirm"
                type="password"
                required
                className="field-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && <p role="alert" className="text-sm text-rose-500">{error}</p>}
            {success && <p role="status" className="text-sm text-emerald-600">{success}</p>}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
