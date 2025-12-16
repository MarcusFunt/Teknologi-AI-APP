import { useCallback, useEffect, useMemo, useState } from 'react';

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
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken') || '');
  const [authError, setAuthError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');
  const [isAiRunning, setIsAiRunning] = useState(false);

  useEffect(() => {
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

  const refreshEvents = useCallback(async () => {
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
  const scheduledCount = isAuthenticated ? (isLoading ? '…' : events.length) : '—';

  const changeMonth = (offset) => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
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
    setIsAiOpen(false);
    setAiResult(null);
    setAiPrompt('');
  };

  const openAiEditor = () => {
    if (!isAuthenticated) {
      setAuthError('Sign in to use AI editing.');
      return;
    }

    setIsAiOpen(true);
    setAiError('');
  };

  const closeAiEditor = () => {
    setIsAiOpen(false);
    setAiError('');
  };

  const handleAiSubmit = async (event) => {
    event.preventDefault();
    if (!aiPrompt.trim() || !isAuthenticated) {
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

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Productivity Toolkit</p>
          <h1>Modern calendar</h1>
          <p className="lede">
            Navigate your schedule with a calm, focused view. Quickly scan the month, see what is
            coming next, and keep the important days highlighted.
          </p>
          <div className="hero-actions">
            <button className="ghost" type="button" onClick={goToToday}>
              Jump to today
            </button>
            <div className="tag">Interoperable UI • Minimal setup</div>
          </div>
        </div>
        <div className="hero-side">
          <div className="auth-card">
            {isAuthenticated ? (
              <div className="signed-in">
                <p className="label subtle">Signed in</p>
                <h3>{user.name}</h3>
                <p className="hint">{user.email}</p>
                <button className="ghost full" type="button" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
          <div className="stat-card">
            <div className="stat">
              <span className="label">This month</span>
              <strong>{scheduledCount}</strong>
              <span className="hint">moments scheduled</span>
            </div>
            <div className="stat">
              <span className="label">Session</span>
              <strong>{isAuthenticated ? 'Active' : 'Guest'}</strong>
              <span className="hint">
                {isAuthenticating ? 'Checking…' : isAuthenticated ? 'Signed in' : 'Create an account'}
              </span>
            </div>
          </div>
        </div>
      </header>

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
          <div className="panel-header">
            <div>
              <p className="label subtle">Details</p>
              <h3>
                {selectedDate.toLocaleDateString('default', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
            </div>
            <div className="panel-actions">
              <div className="pill">{dayEvents.length} items</div>
              <button type="button" className="primary ghosty" onClick={openAiEditor}>
                Edit with AI
              </button>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="empty-state">
              <div className="accent" />
              <p className="title">Sign in to view events</p>
              <p className="hint">Create an account or log in to sync your calendar.</p>
            </div>
          ) : error ? (
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
              {(!isAuthenticated || upcomingEvents.length === 0) && !isLoading && (
                <li className="timeline-item">
                  <div>
                    <p className="title">{isAuthenticated ? 'No upcoming events' : 'Sign in to sync'}</p>
                    <p className="hint">
                      {isAuthenticated
                        ? 'Plan your next milestone to see it here.'
                        : 'Authentication keeps your dates private.'}
                    </p>
                  </div>
                </li>
              )}
              {isAuthenticated &&
                upcomingEvents.map((event) => {
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

          <div className={`ai-dialog ${isAiOpen ? 'open' : ''}`}>
            <div className="ai-header">
              <div>
                <p className="label subtle">AI calendar copilot</p>
                <p className="title">Describe edits or ask for adjustments</p>
              </div>
              <button type="button" className="ghost" onClick={closeAiEditor}>
                Close
              </button>
            </div>

            <form className="ai-form" onSubmit={handleAiSubmit}>
              <textarea
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                placeholder={
                  isAuthenticated
                    ? 'e.g. Move the design critique to 10:30 and add a prep session tomorrow.'
                    : 'Sign in to ask the assistant to edit your calendar.'
                }
                disabled={!isAuthenticated || isAiRunning}
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
                <button className="primary" type="submit" disabled={!isAuthenticated || isAiRunning}>
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
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
