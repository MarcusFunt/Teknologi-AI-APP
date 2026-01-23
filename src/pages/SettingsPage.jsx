import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef, useState } from 'react';

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
function SettingsPage({
  user,
  isDarkMode,
  toggleDarkMode,
  authToken,
  diagnosticLoggingEnabled,
  onToggleDiagnosticLogging,
  isWfeMode,
}) {
  const [activeTab, setActiveTab] = useState('general');
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    frontend: true,
    backend: true,
    ai: true,
  });
  const lastLogIdRef = useRef(0);

  useEffect(() => {
    if (!diagnosticLoggingEnabled) {
      setActiveTab('general');
      setLogs([]);
      lastLogIdRef.current = 0;
    }
  }, [diagnosticLoggingEnabled]);

  useEffect(() => {
    if (!diagnosticLoggingEnabled || !authToken || isWfeMode) {
      return undefined;
    }

    let isMounted = true;

    const fetchLogs = async () => {
      try {
        const response = await fetch(`/api/logs?sinceId=${lastLogIdRef.current}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch logs');
        }

        const data = await response.json();
        if (!Array.isArray(data.logs)) {
          return;
        }

        if (!isMounted || data.logs.length === 0) {
          return;
        }

        setLogs((prev) => [...prev, ...data.logs]);
        lastLogIdRef.current = data.logs[data.logs.length - 1].id;
      } catch (error) {
        if (isMounted) {
          setLogs((prev) => prev);
        }
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [authToken, diagnosticLoggingEnabled, isWfeMode]);

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        if (log.source === 'frontend') {
          return filters.frontend;
        }
        if (log.source === 'backend') {
          return filters.backend;
        }
        if (log.source === 'ai') {
          return filters.ai;
        }
        return true;
      }),
    [filters, logs],
  );

  const handleFilterChange = (key) => (event) => {
    setFilters((prev) => ({ ...prev, [key]: event.target.checked }));
  };

  const handleExport = () => {
    const content = filteredLogs
      .map((log) => {
        const detail = log.detail ? `\n${log.detail}` : '';
        return `[${log.timestamp}] [${log.source.toUpperCase()}] ${log.message}${detail}`;
      })
      .join('\n\n');

    const blob = new Blob([content || 'No logs available.'], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'live-logs.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const showTabs = diagnosticLoggingEnabled;
  const showLiveLogs = showTabs && activeTab === 'logs';

  const generalContent = (
    <>
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
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">Compact layout</span>
            <span className="setting-description">
              Reduce spacing on dashboard cards and lists.
            </span>
          </div>
          <label className="toggle" htmlFor="compactLayoutToggle">
            <input id="compactLayoutToggle" type="checkbox" />
            <span className="toggle-pill" aria-hidden="true" />
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">Accent theme</span>
            <span className="setting-description">
              Choose a highlight color used across charts and action buttons.
            </span>
          </div>
          <select aria-label="Select accent theme">
            <option>Indigo</option>
            <option>Emerald</option>
            <option>Sunrise</option>
            <option>Slate</option>
          </select>
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
      <section className="settings-section">
        <h3>AI Assistant</h3>
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">Enable AI assistant</span>
            <span className="setting-description">
              Allow AI to suggest next steps, summaries, and smart reminders.
            </span>
          </div>
          <label className="toggle" htmlFor="aiAssistantToggle">
            <input id="aiAssistantToggle" type="checkbox" defaultChecked />
            <span className="toggle-pill" aria-hidden="true" />
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">Default AI model</span>
            <span className="setting-description">
              Select the model for planning, summaries, and automation drafts.
            </span>
          </div>
          <select aria-label="Select default AI model">
            <option>Balanced (recommended)</option>
            <option>Fast draft</option>
            <option>Deep analysis</option>
            <option>Local private model</option>
          </select>
        </div>
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">Creativity level</span>
            <span className="setting-description">
              Adjust how adventurous AI recommendations should be.
            </span>
          </div>
          <div className="setting-control">
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              defaultValue="3"
              aria-label="Creativity level"
            />
            <span className="setting-value">Balanced</span>
          </div>
        </div>
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">Auto-generate daily summaries</span>
            <span className="setting-description">
              Receive a recap each morning of priorities and schedule gaps.
            </span>
          </div>
          <select aria-label="Summary frequency">
            <option>Every morning at 8:00</option>
            <option>Weekdays only</option>
            <option>Weekly on Monday</option>
            <option>Off</option>
          </select>
        </div>
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">AI context sources</span>
            <span className="setting-description">
              Choose what the assistant can reference when building schedules.
            </span>
          </div>
          <div className="setting-stack">
            <label className="checkbox">
              <input type="checkbox" defaultChecked />
              Calendar history
            </label>
            <label className="checkbox">
              <input type="checkbox" defaultChecked />
              Task notes
            </label>
            <label className="checkbox">
              <input type="checkbox" />
              Shared team calendars
            </label>
          </div>
        </div>
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">Approval required</span>
            <span className="setting-description">
              Require confirmation before AI schedules or reschedules events.
            </span>
          </div>
          <label className="toggle" htmlFor="aiApprovalToggle">
            <input id="aiApprovalToggle" type="checkbox" defaultChecked />
            <span className="toggle-pill" aria-hidden="true" />
          </label>
        </div>
      </section>
      <section className="settings-section">
        <h3>Automation</h3>
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">Smart focus blocks</span>
            <span className="setting-description">
              Automatically reserve focus time after large meetings.
            </span>
          </div>
          <label className="toggle" htmlFor="focusBlocksToggle">
            <input id="focusBlocksToggle" type="checkbox" defaultChecked />
            <span className="toggle-pill" aria-hidden="true" />
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">Conflict resolution</span>
            <span className="setting-description">
              Choose how AI handles overlapping events.
            </span>
          </div>
          <select aria-label="Conflict resolution preference">
            <option>Suggest alternatives</option>
            <option>Auto-reschedule low priority</option>
            <option>Always ask me</option>
          </select>
        </div>
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">Reminder cadence</span>
            <span className="setting-description">
              Set how early the assistant nudges you before meetings.
            </span>
          </div>
          <select aria-label="Reminder cadence">
            <option>10 minutes before</option>
            <option>30 minutes before</option>
            <option>1 hour before</option>
            <option>Custom…</option>
          </select>
        </div>
      </section>
      <section className="settings-section">
        <h3>Privacy &amp; data</h3>
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">Data retention</span>
            <span className="setting-description">
              Control how long AI retains summaries and activity insights.
            </span>
          </div>
          <select aria-label="Data retention">
            <option>30 days</option>
            <option>90 days</option>
            <option>1 year</option>
            <option>Keep until deleted</option>
          </select>
        </div>
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">Usage analytics</span>
            <span className="setting-description">
              Share anonymous usage metrics to improve AI recommendations.
            </span>
          </div>
          <label className="toggle" htmlFor="analyticsToggle">
            <input id="analyticsToggle" type="checkbox" />
            <span className="toggle-pill" aria-hidden="true" />
          </label>
        </div>
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">Export AI data</span>
            <span className="setting-description">
              Download your AI-generated summaries and planning history.
            </span>
          </div>
          <button type="button" className="secondary-button">
            Download export
          </button>
        </div>
      </section>
      <section className="settings-section">
        <h3>Diagnostics</h3>
        <div className="setting-item">
          <div className="setting-details">
            <span className="setting-title">Enable diagnostic logging</span>
            <span className="setting-description">
              Capture frontend, backend, and AI traffic for troubleshooting.
            </span>
          </div>
          <label className="toggle" htmlFor="diagnosticLoggingToggle">
            <input
              id="diagnosticLoggingToggle"
              type="checkbox"
              checked={diagnosticLoggingEnabled}
              onChange={(event) => onToggleDiagnosticLogging(event.target.checked)}
              aria-label="Enable diagnostic logging"
            />
            <span className="toggle-pill" aria-hidden="true" />
          </label>
        </div>
      </section>
    </>
  );

  const renderLogDetail = (detail) => {
    if (!detail) {
      return null;
    }

    return <pre className="log-detail">{detail}</pre>;
  };

  const liveLogsContent = (
    <section className="settings-section">
      <h3>Live logs</h3>
      <div className="log-toolbar">
        <div className="log-filters">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={filters.frontend}
              onChange={handleFilterChange('frontend')}
            />
            Frontend
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={filters.backend}
              onChange={handleFilterChange('backend')}
            />
            Backend
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={filters.ai} onChange={handleFilterChange('ai')} />
            AI
          </label>
        </div>
        <button type="button" className="secondary-button" onClick={handleExport}>
          Export .txt
        </button>
      </div>
      {isWfeMode && (
        <p className="hint">Live logs are unavailable in WFE mode.</p>
      )}
      <div className="log-feed">
        {filteredLogs.length === 0 ? (
          <p className="hint">No logs yet. Generate activity to see entries here.</p>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="log-entry">
              <div className="log-meta">
                <span className={`log-source log-source-${log.source}`}>{log.source}</span>
                <span className="log-time">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="log-message">{log.message}</p>
              {renderLogDetail(log.detail)}
            </div>
          ))
        )}
      </div>
    </section>
  );

  return (
    <div className="settings-page">
      <h2>Settings</h2>
      {showTabs && (
        <div className="settings-tabs" role="tablist" aria-label="Settings tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'general'}
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'logs'}
            className={`settings-tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            Live Logs
          </button>
        </div>
      )}
      {!showLiveLogs && generalContent}
      {showLiveLogs && liveLogsContent}
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
  authToken: PropTypes.string,
  diagnosticLoggingEnabled: PropTypes.bool.isRequired,
  onToggleDiagnosticLogging: PropTypes.func.isRequired,
  isWfeMode: PropTypes.bool,
};
