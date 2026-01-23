import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { wfeEvents, wfeUser } from './wfeFixtures.js';

const isWfeMode =
  import.meta.env.VITE_WFE_MODE === 'true' || import.meta.env.VITE_WFE_MODE === '1';

const typeBadges = {
  meeting: { label: 'Meeting', tone: 'primary' },
  milestone: { label: 'Milestone', tone: 'amber' },
  social: { label: 'Social', tone: 'pink' },
  planning: { label: 'Planning', tone: 'teal' },
  demo: { label: 'Demo', tone: 'violet' },
  wellness: { label: 'Wellness', tone: 'green' },
};

const today = new Date();

const formatKey = (date) => date.toISOString().slice(0, 10);

const getMonthLabel = (date) =>
  date.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function App() {
  const [currentDate, setCurrentDate] = useState(() => {
    const base = new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState(() => (isWfeMode ? wfeEvents : []));
  const [isLoading, setIsLoading] = useState(!isWfeMode);
  const [error, setError] = useState('');
  const [user, setUser] = useState(() => (isWfeMode ? wfeUser : null));
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authToken, setAuthToken] = useState(() =>
    isWfeMode ? 'wfe-mode-token' : localStorage.getItem('authToken') || '',
  );
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(!isWfeMode);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [diagnosticLoggingEnabled, setDiagnosticLoggingEnabled] = useState(false);
  const [manualMode, setManualMode] = useState('add');
  const [manualError, setManualError] = useState('');
  const [manualForm, setManualForm] = useState({
    title: '',
    time: '',
    type: 'meeting',
    description: '',
  });

  // Track which page is currently selected.  The calendar view is the
  // default page after authentication.  Users can switch between
  // "calendar" and "settings" via the navigation bar.
  const [page, setPage] = useState('calendar');

  // Persisted dark mode preference.  Read from localStorage on
  // initialisation and update the root class whenever the value
  // changes.  This drives the CSS variable switching defined in
  // index.css (html.light vs html.dark).
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    return stored === null ? true : stored === 'true';
  });
  const consoleBackup = useRef(null);

  const sendFrontendLog = useCallback(
    (level, args) => {
      if (!diagnosticLoggingEnabled || !authToken || isWfeMode) {
        return;
      }

      const serializeArg = (arg) => {
        if (typeof arg === 'string') {
          return arg;
        }
        try {
          return JSON.stringify(arg, null, 2);
        } catch (error) {
          return `Unserializable value: ${error.message}`;
        }
      };

      const message = args.map(serializeArg).join(' ');

      fetch('/api/logs/frontend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          level,
          message,
          detail: args.map(serializeArg).join('\n'),
        }),
      }).catch(() => {});
    },
    [authToken, diagnosticLoggingEnabled],
  );

  useEffect(() => {
    if (!diagnosticLoggingEnabled || isWfeMode) {
      if (consoleBackup.current) {
        Object.assign(console, consoleBackup.current);
        consoleBackup.current = null;
      }
      return undefined;
    }

    if (!consoleBackup.current) {
      consoleBackup.current = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      };
    }

    const wrap = (level) => (...args) => {
      consoleBackup.current[level](...args);
      sendFrontendLog(level, args);
    };

    console.log = wrap('log');
    console.info = wrap('info');
    console.warn = wrap('warn');
    console.error = wrap('error');
    console.debug = wrap('debug');

    return () => {
      if (consoleBackup.current) {
        Object.assign(console, consoleBackup.current);
        consoleBackup.current = null;
      }
    };
  }, [diagnosticLoggingEnabled, sendFrontendLog]);

  useEffect(() => {
    if (isWfeMode) {
      setIsAuthenticating(false);
      return;
    }

    const bootstrapAuth = async () => {
      if (!authToken) {
        setIsAuthenticating(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (!response.ok) {
          throw new Error('Session invalid');
        }

        const data = await response.json();
        setUser(data.user);
        setAuthError('');
      } catch (fetchError) {
        console.error(fetchError);
        localStorage.removeItem('authToken');
        setAuthToken('');
        setUser(null);
        setAuthError('Your session expired. Please sign in again.');
      } finally {
        setIsAuthenticating(false);
      }
    };

    bootstrapAuth();
  }, [authToken]);

  // Apply the dark or light class to the html element whenever
  // isDarkMode changes.  Persist preference to localStorage so the
  // setting survives page reloads.
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  const refreshEvents = useCallback(async () => {
    if (isWfeMode) {
      setEvents(wfeEvents);
      setIsLoading(false);
      setError('');
      return;
    }

    if (isAuthenticating) {
      return;
    }

    if (!authToken || !user) {
      setIsLoading(false);
      setEvents([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/events', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      setEvents(data.events || []);
      setError('');
    } catch (fetchError) {
      setError('Unable to load events from the server.');
      console.error(fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, user, isAuthenticating]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < startOffset; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [currentDate]);

  const selectedKey = useMemo(() => formatKey(selectedDate), [selectedDate]);

  const selectedDateLabel = useMemo(
    () =>
      selectedDate.toLocaleDateString('default', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    [selectedDate],
  );

  const getDayEvents = useCallback(
    (dayKey) => events.filter((event) => event.date === dayKey),
    [events],
  );

  const dayEvents = useMemo(() => getDayEvents(selectedKey), [getDayEvents, selectedKey]);

  const upcomingEvents = useMemo(() => {
    const nowKey = formatKey(today);
    return events
      .filter((event) => event.date >= nowKey)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
  }, [events]);

  const isToday = (date) => formatKey(date) === formatKey(today);
  const isAuthenticated = Boolean(user);

  const changeMonth = (offset) => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const handleDayClick = (date) => {
    if (!date) return;
    setSelectedDate(date);
  };

  const handleAuthInput = (field, value) => {
    setAuthForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');

    if (isWfeMode) {
      setUser(wfeUser);
      setAuthToken('wfe-mode-token');
      setAuthForm({ name: '', email: '', password: '' });
      setError('');
      return;
    }

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = {
      email: authForm.email,
      password: authForm.password,
    };

    if (authMode === 'register') {
      payload.name = authForm.name || authForm.email;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to authenticate');
      }

      localStorage.setItem('authToken', data.token);
      setAuthToken(data.token);
      setUser(data.user);
      setAuthForm({ name: '', email: '', password: '' });
      setAuthError('');
      setError('');
    } catch (authIssue) {
      setAuthError(authIssue.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuthToken('');
    setUser(null);
    setEvents([]);
    setError('');
    setAiResult(null);
    setAiPrompt('');
    setActiveModal(null);
  };

  /**
   * Toggle between light and dark mode.  This updates both the
   * component state and the root class via the useEffect above.
   */
  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const openAiModal = (mode) => {
    if (!isAuthenticated) {
      setAuthError('Sign in to use AI editing.');
      return;
    }

    setAiError('');
    setActiveModal(`${mode}-ai`);
  };

  const openManualModal = (mode) => {
    setManualMode(mode);
    setManualError('');
    if (mode === 'edit' && dayEvents.length > 0) {
      const [firstEvent] = dayEvents;
      setManualForm({
        title: firstEvent.title,
        time: firstEvent.time,
        type: firstEvent.type,
        description: firstEvent.description || '',
      });
    } else {
      setManualForm({ title: '', time: '', type: 'meeting', description: '' });
    }

    setActiveModal(`${mode}-manual`);
  };

  const closeModal = () => {
    setActiveModal(null);
    setAiError('');
    setManualError('');
    setAiResult(null);
  };

  const handleAiSubmit = async (event) => {
    event.preventDefault();
    if (!aiPrompt.trim() || !isAuthenticated) {
      return;
    }

    if (isWfeMode) {
      setAiError('AI editing is disabled in WFE mode.');
      setIsAiRunning(false);
      return;
    }

    setIsAiRunning(true);
    setAiError('');

    try {
      const response = await fetch('/api/ai/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ prompt: aiPrompt, focusDate: selectedKey }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'AI request failed');
      }

      setAiResult(data);
      setAiPrompt('');
      await refreshEvents();
    } catch (aiIssue) {
      setAiError(aiIssue.message);
    } finally {
      setIsAiRunning(false);
    }
  };

  const handleManualSubmit = (event) => {
    event.preventDefault();

    if (!manualForm.title.trim() || !manualForm.time.trim()) {
      setManualError('Title and time are required.');
      return;
    }

    const newEntry = {
      ...manualForm,
      date: selectedKey,
    };

    setEvents((previous) => {
      if (manualMode === 'edit') {
        let updated = false;
        const mapped = previous.map((existing) => {
          if (existing.date === selectedKey && !updated) {
            updated = true;
            return { ...existing, ...newEntry };
          }
          return existing;
        });
        return updated ? mapped : [...mapped, newEntry];
      }

      return [...previous, newEntry];
    });

    setManualForm({ title: '', time: '', type: 'meeting', description: '' });
    setManualError('');
    closeModal();
  };

  return (
    <>
      {!isAuthenticated ? (
        <LoginPage
          authMode={authMode}
          setAuthMode={setAuthMode}
          authForm={authForm}
          handleAuthInput={handleAuthInput}
          handleAuthSubmit={handleAuthSubmit}
          authError={authError}
          isAuthenticating={isAuthenticating}
        />
      ) : (
        <div className="app-container">
          {/* Navigation bar displayed on authenticated pages */}
          <header className="nav-bar">
            <div className="nav-links">
              <button
                type="button"
                className={`nav-link ${page === 'calendar' ? 'active' : ''}`}
                onClick={() => setPage('calendar')}
              >
                Calendar
              </button>
              <button
                type="button"
                className={`nav-link ${page === 'settings' ? 'active' : ''}`}
                onClick={() => setPage('settings')}
              >
                Settings
              </button>
            </div>
            <div className="nav-links">
              <span className="label subtle">{user.name}</span>
              <button type="button" className="ghost" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </header>
          {page === 'calendar' && (
            <>
              <main className="layout">
                <section className="panel calendar-panel">
                  <div className="panel-header">
                    <div>
                      <p className="label subtle">Month overview</p>
                      <h2>{getMonthLabel(currentDate)}</h2>
                    </div>
                    <div className="controls">
                      <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
                        ‹
                      </button>
                      <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
                        ›
                      </button>
                    </div>
                  </div>
                  <div className="weekday-row">
                    {weekdayLabels.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className="calendar-grid">
                    {calendarCells.map((cell, index) => {
                      if (!cell) {
                        return <div key={`empty-${index}`} className="empty" />;
                      }
                      const key = formatKey(cell);
                      const dayEvents = getDayEvents(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`day ${selectedKey === key ? 'selected' : ''} ${
                            isToday(cell) ? 'today' : ''
                          } ${dayEvents.length > 0 ? 'has-events' : ''}`}
                          onClick={() => handleDayClick(cell)}
                        >
                          <span className="date-number">{cell.getDate()}</span>
                          {dayEvents.length > 0 && <span className="dot" />}
                        </button>
                      );
                    })}
                  </div>
                </section>
                <section className="panel detail-panel">
                  <div className="panel-header detail-header">
                    <div className="detail-header__text">
                      <p className="label subtle">Details</p>
                      <h3>{selectedDateLabel}</h3>
                    </div>
                    <div className="panel-actions detail-header__meta">
                      <div className="pill">{dayEvents.length} items</div>
                      <p className="hint">Tap a day to update the agenda.</p>
                    </div>
                  </div>
                  <div className="action-card">
                    <div className="action-card__content">
                      <div className="action-card__header">
                        <p className="label subtle">Add entry</p>
                        <p className="title">Capture plans quickly</p>
                      </div>
                      <p className="hint">Entries will be attached to {selectedDateLabel}.</p>
                    </div>
                    <div className="action-card__actions">
                      <div className="action-grid">
                        <button type="button" className="primary" onClick={() => openAiModal('add')}>
                          Add with AI
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => openManualModal('add')}
                        >
                          Add manually
                        </button>
                      </div>
                      {selectedDate && (
                        <div className="action-grid secondary">
                          <button
                            type="button"
                            className="primary ghosty"
                            onClick={() => openAiModal('edit')}
                          >
                            Edit with AI
                          </button>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => openManualModal('edit')}
                          >
                            Edit manually
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {error ? (
                    <div className="empty-state">
                      <div className="accent" />
                      <p className="title">Could not load events</p>
                      <p className="hint">Check the API server and database connection.</p>
                    </div>
                  ) : isLoading ? (
                    <div className="empty-state">
                      <div className="accent" />
                      <p className="title">Loading events…</p>
                      <p className="hint">Fetching the latest schedule from PostgreSQL.</p>
                    </div>
                  ) : dayEvents.length === 0 ? (
                    <div className="empty-state">
                      <div className="accent" />
                      <p className="title">No events scheduled</p>
                      <p className="hint">Tap any date to see what is coming up.</p>
                    </div>
                  ) : (
                    <ul className="events">
                      {dayEvents.map((event) => {
                        const badge = typeBadges[event.type];
                        return (
                          <li key={`${event.date}-${event.title}`} className="event">
                            <div>
                              <p className="title">{event.title}</p>
                              <p className="hint">{event.time}</p>
                            </div>
                            {badge && <span className={`badge ${badge.tone}`}>{badge.label}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <div className="subsection">
                    <div className="subhead">
                      <p className="label subtle">Upcoming highlights</p>
                      <div className="pill neutral">Auto-sorted</div>
                    </div>
                    <ul className="timeline">
                      {upcomingEvents.length === 0 && !isLoading && (
                        <li className="timeline-item">
                          <div>
                            <p className="title">No upcoming events</p>
                            <p className="hint">Plan your next milestone to see it here.</p>
                          </div>
                        </li>
                      )}
                      {upcomingEvents.map((event) => {
                        const badge = typeBadges[event.type];
                        return (
                          <li key={`${event.date}-${event.title}`} className="timeline-item">
                            <div className="time">
                              {new Date(event.date).toLocaleDateString('default', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                            <div>
                              <p className="title">{event.title}</p>
                              <p className="hint">{event.time}</p>
                            </div>
                            {badge && <span className={`badge muted ${badge.tone}`}>{badge.label}</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </section>
              </main>
            </>
          )}
          {page === 'settings' && (
            <SettingsPage
              user={user}
              isDarkMode={isDarkMode}
              toggleDarkMode={toggleDarkMode}
              authToken={authToken}
              diagnosticLoggingEnabled={diagnosticLoggingEnabled}
              onToggleDiagnosticLogging={setDiagnosticLoggingEnabled}
              isWfeMode={isWfeMode}
            />
          )}
          {activeModal && (
            <div className="modal-overlay" role="dialog" aria-modal="true">
              <div className="modal">
                {(() => {
                  const isAiModal = activeModal.includes('ai');
                  const isEditMode = activeModal.startsWith('edit');
                  const heading = `${isEditMode ? 'Edit' : 'Add'} ${
                    isAiModal ? 'with AI' : 'manually'
                  }`;

                  return (
                    <>
                      <div className="modal-header">
                        <div>
                          <p className="label subtle">{isAiModal ? 'AI assistant' : 'Manual entry'}</p>
                          <h3>{heading}</h3>
                          <p className="hint">Focused on {selectedDateLabel}</p>
                        </div>
                        <button type="button" className="ghost" onClick={closeModal}>
                          Close
                        </button>
                      </div>
                      {isAiModal ? (
                        <>
                          <form className="ai-form" onSubmit={handleAiSubmit}>
                            <textarea
                              value={aiPrompt}
                              onChange={(event) => setAiPrompt(event.target.value)}
                              placeholder={
                                isEditMode
                                  ? 'e.g. Move today\'s standup to 2 PM and shorten the design review.'
                                  : 'e.g. Add a planning session tomorrow at 3 PM and a prep block before it.'
                              }
                              disabled={isAiRunning}
                            />
                            {aiError && <p className="auth-error">{aiError}</p>}
                            <div className="ai-actions">
                              <button
                                type="button"
                                className="ghost"
                                onClick={() => setAiPrompt('')}
                                disabled={isAiRunning}
                              >
                                Clear
                              </button>
                              <button className="primary" type="submit" disabled={isAiRunning}>
                                {isAiRunning ? 'Thinking…' : 'Send to AI'}
                              </button>
                            </div>
                          </form>
                          {aiResult?.plan && (
                            <div className="ai-result">
                              <p className="label subtle">AI plan</p>
                              <p className="title">{aiResult.plan.summary}</p>
                              <ul className="ai-ops">
                                {aiResult.plan.operations?.map((operation, index) => (
                                  <li key={`${operation.action}-${operation.id || index}`}>
                                    <strong>{operation.action}</strong>
                                    <span>
                                      {[operation.title, operation.date, operation.time, operation.type]
                                        .filter(Boolean)
                                        .join(' • ')}
                                      {operation.id ? ` (id ${operation.id})` : ''}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {aiResult?.patchResult?.results && (
                            <div className="ai-result">
                              <p className="label subtle">Applied changes</p>
                              <ul className="ai-ops compact">
                                {aiResult.patchResult.results.map((result, index) => (
                                  <li key={`${result.status}-${index}`}>
                                    <strong>{result.status}</strong>
                                    <span>{result.reason || result.event?.title || 'Operation handled'}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <form className="manual-form" onSubmit={handleManualSubmit}>
                          <label>
                            <span className="label subtle">Title</span>
                            <input
                              type="text"
                              value={manualForm.title}
                              onChange={(event) =>
                                setManualForm((previous) => ({ ...previous, title: event.target.value }))
                              }
                              placeholder="What are you planning?"
                            />
                          </label>
                          <label>
                            <span className="label subtle">Time</span>
                            <input
                              type="text"
                              value={manualForm.time}
                              onChange={(event) =>
                                setManualForm((previous) => ({ ...previous, time: event.target.value }))
                              }
                              placeholder="e.g. 10:00 AM - 11:00 AM"
                            />
                          </label>
                          <label>
                            <span className="label subtle">Type</span>
                            <select
                              value={manualForm.type}
                              onChange={(event) =>
                                setManualForm((previous) => ({ ...previous, type: event.target.value }))
                              }
                            >
                              <option value="meeting">Meeting</option>
                              <option value="milestone">Milestone</option>
                              <option value="social">Social</option>
                              <option value="planning">Planning</option>
                              <option value="demo">Demo</option>
                              <option value="wellness">Wellness</option>
                            </select>
                          </label>
                          <label>
                            <span className="label subtle">Notes (optional)</span>
                            <textarea
                              value={manualForm.description}
                              onChange={(event) =>
                                setManualForm((previous) => ({
                                  ...previous,
                                  description: event.target.value,
                                }))
                              }
                              placeholder="Add context or agenda details"
                              rows={3}
                            />
                          </label>
                          {manualMode === 'edit' && (
                            <p className="hint">
                              Updates will apply to the first entry on {selectedDateLabel}. If that date is empty,
                              a new entry will be created.
                            </p>
                          )}
                          {manualError && <p className="auth-error">{manualError}</p>}
                          <div className="ai-actions">
                            <button type="button" className="ghost" onClick={closeModal}>
                              Cancel
                            </button>
                            <button className="primary" type="submit">
                              {manualMode === 'edit' ? 'Save changes' : 'Add entry'}
                            </button>
                          </div>
                        </form>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default App;
