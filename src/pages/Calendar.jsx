
import { useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';

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

function CalendarPage({
  user,
  currentDate,
  selectedDate,
  events,
  isLoading,
  error,
  isAiOpen,
  aiPrompt,
  aiResult,
  aiError,
  isAiRunning,
  onMonthChange,
  onDayClick,
  onGoToToday,
  onLogout,
  onAiOpen,
  onAiClose,
  onAiPromptChange,
  onAiSubmit,
  onRefreshEvents,
}) {
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
            <button className="ghost" type="button" onClick={onGoToToday}>
              Jump to today
            </button>
            <div className="tag">Interoperable UI • Minimal setup</div>
          </div>
        </div>
        <div className="hero-side">
          <div className="auth-card">
            <div className="signed-in">
              <p className="label subtle">Signed in</p>
              <h3>{user.name}</h3>
              <p className="hint">{user.email}</p>
              <div className="user-actions">
                <Link to="/settings" className="ghost">Settings</Link>
                <button className="ghost full" type="button" onClick={onLogout}>
                  Log out
                </button>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat">
              <span className="label">This month</span>
              <strong>{scheduledCount}</strong>
              <span className="hint">moments scheduled</span>
            </div>
            <div className="stat">
              <span className="label">Session</span>
              <strong>Active</strong>
              <span className="hint">Signed in</span>
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
              <button type="button" onClick={() => onMonthChange(-1)} aria-label="Previous month">
                ‹
              </button>
              <button type="button" onClick={() => onMonthChange(1)} aria-label="Next month">
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
                  onClick={() => onDayClick(cell)}
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
              <button type="button" className="primary ghosty" onClick={onAiOpen}>
                Edit with AI
              </button>
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

          <div className={`ai-dialog ${isAiOpen ? 'open' : ''}`}>
            <div className="ai-header">
              <div>
                <p className="label subtle">AI calendar copilot</p>
                <p className="title">Describe edits or ask for adjustments</p>
              </div>
              <button type="button" className="ghost" onClick={onAiClose}>
                Close
              </button>
            </div>

            <form className="ai-form" onSubmit={onAiSubmit}>
              <textarea
                value={aiPrompt}
                onChange={(event) => onAiPromptChange(event.target.value)}
                placeholder="e.g. Move the design critique to 10:30 and add a prep session tomorrow."
                disabled={isAiRunning}
              />
              {aiError && <p className="auth-error">{aiError}</p>}
              <div className="ai-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => onAiPromptChange('')}
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
          </div>
        </section>
      </main>
    </div>
  );
}

export default CalendarPage;
