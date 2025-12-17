
import { Link } from 'react-router-dom';

function SettingsPage({ user, onLogout }) {
  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Account</h1>
          <p className="lede">Manage your account and preferences.</p>
        </div>
        <div className="hero-side">
          <div className="auth-card">
            <div className="signed-in">
              <p className="label subtle">Signed in</p>
              <h3>{user.name}</h3>
              <p className="hint">{user.email}</p>
              <div className="user-actions">
                <Link to="/" className="ghost">Calendar</Link>
                <button className="ghost full" type="button" onClick={onLogout}>
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="label subtle">Preferences</p>
              <h2>Theme</h2>
            </div>
          </div>
          <div className="empty-state">
            <div className="accent" />
            <p className="title">Theme customization is not yet available.</p>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="label subtle">Data</p>
              <h2>Export</h2>
            </div>
          </div>
          <div className="empty-state">
            <div className="accent" />
            <p className="title">Data export is not yet available.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default SettingsPage;
