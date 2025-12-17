import PropTypes from 'prop-types';

/**
 * Settings page for the productivity application.
 *
 * This page allows users to adjust application preferences such as
 * enabling dark mode as well as viewing high‑level account details.  As
 * additional features are implemented server‑side they can be exposed
 * through this page without cluttering the main calendar view.  The
 * component receives the current theme state and a toggle callback via
 * props.  When dark mode is toggled the parent updates a class on
 * document.documentElement to drive the CSS variables defined in
 * index.css.
 */
function SettingsPage({ user, isDarkMode, toggleDarkMode }) {
  return (
    <div className="settings-page">
      <h2>Settings</h2>
      <section className="settings-section">
        <h3>Appearance</h3>
        <div className="setting-item">
          <label htmlFor="darkModeToggle">
            <span>Dark mode</span>
            <input
              id="darkModeToggle"
              type="checkbox"
              checked={isDarkMode}
              onChange={toggleDarkMode}
            />
          </label>
        </div>
      </section>
      <section className="settings-section">
        <h3>Account</h3>
        {user ? (
          <div className="account-details">
            <p>
              <strong>Name:</strong> {user.name}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
          </div>
        ) : (
          <p className="hint">You are not signed in.</p>
        )}
      </section>
    </div>
  );
}

export default SettingsPage;

SettingsPage.propTypes = {
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }),
  isDarkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired,
};