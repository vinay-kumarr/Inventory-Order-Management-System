import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden="true">
        <span className="auth-bg__orb auth-bg__orb--1" />
        <span className="auth-bg__orb auth-bg__orb--2" />
        <span className="auth-bg__grid" />
      </div>
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <div className="auth-brand-text">
            <span className="auth-brand-eyebrow">Operations</span>
            <span className="auth-brand-name">Stockwell<span style={{ color: 'var(--accent)' }}>.</span></span>
          </div>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to keep the warehouse moving.</p>
        <form onSubmit={submit} noValidate>
          <div className="form-group">
            <label className="form-group__label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-group__label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button
            className="btn btn--primary btn--block"
            type="submit"
            disabled={busy}
            style={{ marginTop: 'var(--space-5)' }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-footer">
          Don't have an account? <Link to="/signup" className="auth-link">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
