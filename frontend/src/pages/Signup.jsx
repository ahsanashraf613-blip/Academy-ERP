import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Full name is required');
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }
    if (formData.password.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setBusy(true);
    try {
      await api.post('/auth/signup', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      navigate('/login', { state: { message: 'Account created! Please sign in.' } });
    } catch (err) {
      setError(err.message || 'Unable to create account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBFAF7] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-3xl text-ink">Create Account</p>
          <p className="mt-1 text-sm text-slate-500">School Management &mdash; Admin Console</p>
        </div>

        <form onSubmit={submit} className="card px-6 py-6">
          <div className="mb-4">
            <label className="field-label" htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="field-input"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
            />
          </div>

          <div className="mb-4">
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="field-input"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@school.edu"
            />
          </div>

          <div className="mb-4">
            <label className="field-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="field-input"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min. 12 characters"
            />
            <p className="mt-1 text-xs text-slate-500">Must be at least 12 characters</p>
          </div>

          <div className="mb-5">
            <label className="field-label" htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className="field-input"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
            />
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-rose-500">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-slate-400">
          Your account will need admin approval to access the system.
        </p>
      </div>
    </div>
  );
}
