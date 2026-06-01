import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const validate = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!EMAIL_RE.test(email.trim())) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 8) errs.password = 'Use at least 8 characters';
    if (password !== confirm) errs.confirm = 'Passwords do not match';
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setBusy(true);
    try {
      await register(fullName.trim(), email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Could not create account');
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
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">Start managing inventory in less than a minute.</p>
        <form onSubmit={submit} noValidate>
          <div className="form-group">
            <label className="form-group__label" htmlFor="su-name">Full name</label>
            <input
              id="su-name"
              className={`input ${errors.fullName ? 'input--error' : ''}`}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Amelia Hart"
              autoComplete="name"
              autoFocus
            />
            {errors.fullName && <div className="form-group__error">{errors.fullName}</div>}
          </div>
          <div className="form-group">
            <label className="form-group__label" htmlFor="su-email">Email</label>
            <input
              id="su-email"
              type="email"
              className={`input ${errors.email ? 'input--error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
            {errors.email && <div className="form-group__error">{errors.email}</div>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-group__label" htmlFor="su-password">Password</label>
              <input
                id="su-password"
                type="password"
                className={`input ${errors.password ? 'input--error' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              {errors.password && <div className="form-group__error">{errors.password}</div>}
            </div>
            <div className="form-group">
              <label className="form-group__label" htmlFor="su-confirm">Confirm password</label>
              <input
                id="su-confirm"
                type="password"
                className={`input ${errors.confirm ? 'input--error' : ''}`}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
              {errors.confirm && <div className="form-group__error">{errors.confirm}</div>}
            </div>
          </div>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button
            className="btn btn--primary btn--block"
            type="submit"
            disabled={busy}
            style={{ marginTop: 'var(--space-5)' }}
          >
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
