import PropTypes from 'prop-types';

/**
 * Full page login and registration screen.
 *
 * The original application embedded a small sign‑in card within the hero
 * section of the calendar page. To convert the app into a multi‑page
 * experience we expose authentication as its own dedicated route.  The
 * LoginPage component renders both the sign in and create account
 * forms based on the current authMode. It accepts callbacks and state
 * variables as props and delegates all business logic back up to
 * App.jsx.  This avoids duplicating state management across pages.
 */
function LoginPage({
  authMode,
  setAuthMode,
  authForm,
  handleAuthInput,
  handleAuthSubmit,
  authError,
  isAuthenticating,
}) {
  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">
          Sign in to access your calendar or create a new account to get started.
        </p>
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
      </div>
    </div>
  );
}

export default LoginPage;

LoginPage.propTypes = {
  authMode: PropTypes.string.isRequired,
  setAuthMode: PropTypes.func.isRequired,
  authForm: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    password: PropTypes.string,
  }).isRequired,
  handleAuthInput: PropTypes.func.isRequired,
  handleAuthSubmit: PropTypes.func.isRequired,
  authError: PropTypes.string,
  isAuthenticating: PropTypes.bool.isRequired,
};