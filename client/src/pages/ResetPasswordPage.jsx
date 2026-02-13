import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth as authApi } from '../utils/api.js';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <h1 className="auth-logo">The Storyteller</h1>
        <div style={{
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          color: 'var(--success)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          marginBottom: 16,
        }}>
          Password reset successfully!
        </div>
        <button className="btn btn-primary btn-full" onClick={() => navigate('/auth')}>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1 className="auth-logo">The Storyteller</h1>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginBottom: 16 }}>
        Set New Password
      </h2>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">New Password</label>
          <input
            className="form-input"
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <input
            className="form-input"
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <button
          className="btn btn-primary btn-full"
          type="submit"
          disabled={submitting}
          style={{ marginTop: 8 }}
        >
          {submitting ? 'Please wait...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}
