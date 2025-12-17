
import { useState } from 'react';

function LoginPage({ onLogin, onRegister, isAuthenticating, authError }) {
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });

  const handleAuthInput = (field, value) => {
    setAuthForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    if (authMode === 'login') {
      await onLogin(authForm.email, authForm.password);
    } else {
      await onRegister(authForm.name, authForm.email, authForm.password);
    }
  };

  return (
    <div className="login-page">
      <div className="auth-card">
        <div className="auth-toggle">
          <button
            type="button"
            className={authMode === 'login' ? 'active' : ''}
            onClick={() => setAuthMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={authMode === 'register' ? 'active' : ''}
            onClick={() => setAuthMode('register')}
          >
            Create account
          </button>
        </div>
        <form className="auth-form" onSubmit={handleAuthSubmit}>
          {authMode === 'register' && (
            <label htmlFor="name">
              <span>Name</span>
              <input
                id="name"
                type="text"
                value={authForm.name}
                onChange={(event) => handleAuthInput('name', event.target.value)}
                autoComplete="name"
              />
            </label>
          )}
          <label htmlFor="email">
            <span>Email</span>
            <input
              id="email"
              type="email"
              required
              value={authForm.email}
              onChange={(event) => handleAuthInput('email', event.target.value)}
              autoComplete="email"
            />
          </label>
          <label htmlFor="password">
            <span>Password</span>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={authForm.password}
              onChange={(event) => handleAuthInput('password', event.target.value)}
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          {authError && <p className="auth-error">{authError}</p>}
          <button className="primary" type="submit" disabled={isAuthenticating}>
            {authMode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="hint">Securely access your saved schedule across devices.</p>
      </div>
    </div>
  );
}

export default LoginPage;
