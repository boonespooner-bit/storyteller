import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { auth as authApi } from '../utils/api.js';

const GOOGLE_CLIENT_ID = '506008787157-7orl3tnloggv7nfrki480273q3dd6pnb.apps.googleusercontent.com';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState('signin'); // signin, register, forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login, register, googleSignIn, isAuthenticated } = useAuth();
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Initialize Google Sign-In
    const initGoogle = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
      } else {
        setTimeout(initGoogle, 500);
      }
    };
    initGoogle();
  }, []);

  const handleGoogleResponse = async (response) => {
    try {
      setError('');
      await googleSignIn(response.credential);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    }
  };

  const handleGoogleClick = () => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback: use redirect
          const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: window.location.origin + '/auth',
            response_type: 'id_token',
            scope: 'openid email profile',
            nonce: Math.random().toString(36).substring(2),
          });
          window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
        }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      if (mode === 'forgot') {
        await authApi.forgotPassword(email);
        setMessage('If an account with that email exists, a password reset link has been sent.');
        setSubmitting(false);
        return;
      }

      if (mode === 'register') {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <h1 className="auth-logo">Story Braid</h1>
      <p className="auth-subtitle">Story Braid weaves together your stories to create long form books and stories.</p>

      {mode !== 'forgot' && (
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
            onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); setError(''); setMessage(''); }}
          >
            Create Account
          </button>
        </div>
      )}

      {mode === 'forgot' && (
        <div style={{ marginBottom: 20 }}>
          <button
            className="btn btn-ghost"
            onClick={() => { setMode('signin'); setError(''); setMessage(''); }}
            style={{ padding: '8px 0' }}
          >
            &larr; Back to Sign In
          </button>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginTop: 8 }}>
            Reset Password
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>
      )}

      {/* Google Sign-In */}
      {mode !== 'forgot' && (
        <>
          <button className="google-btn" onClick={handleGoogleClick} ref={googleBtnRef}>
            <GoogleIcon />
            Continue with Google
          </button>
          <div className="auth-divider">or</div>
        </>
      )}

      {error && <div className="auth-error">{error}</div>}
      {message && (
        <div style={{
          background: 'rgba(76, 175, 80, 0.1)',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          color: 'var(--success)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          marginBottom: 16,
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            className="form-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        {mode !== 'forgot' && (
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        )}

        <button
          className="btn btn-primary btn-full"
          type="submit"
          disabled={submitting}
          style={{ marginTop: 8 }}
        >
          {submitting
            ? 'Please wait...'
            : mode === 'forgot'
            ? 'Send Reset Link'
            : mode === 'register'
            ? 'Create Account'
            : 'Sign In'}
        </button>
      </form>

      {mode === 'signin' && (
        <div className="auth-footer">
          <span
            className="auth-link"
            onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
          >
            Forgot password?
          </span>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          Skip for now
        </button>
      </div>
    </div>
  );
}
