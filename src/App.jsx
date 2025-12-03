import { useEffect, useMemo, useState } from 'react';

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

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
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
    };

    fetchEvents();
  }, []);

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

  const dayEvents = useMemo(
    () => events.filter((event) => event.date === selectedKey),
    [events, selectedKey],
  );

  const upcomingEvents = useMemo(() => {
    const nowKey = formatKey(today);
    return events
      .filter((event) => event.date >= nowKey)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
  }, [events]);

  const isToday = (date) => formatKey(date) === formatKey(today);

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
        <div className="stat-card">
            <div className="stat">
              <span className="label">This month</span>
              <strong>{isLoading ? '…' : events.length}</strong>
              <span className="hint">moments scheduled</span>
            </div>
          <div className="stat">
            <span className="label">Focus streak</span>
            <strong>7 days</strong>
            <span className="hint">kept up to date</span>
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
              const hasEvents = events.some((event) => event.date === key);

              return (
                <button
                  key={key}
                  type="button"
                  className={`day ${selectedKey === key ? 'selected' : ''} ${
                    isToday(cell) ? 'today' : ''
                  } ${hasEvents ? 'has-events' : ''}`}
                  onClick={() => handleDayClick(cell)}
                >
                  <span className="date-number">{cell.getDate()}</span>
                  {hasEvents && <span className="dot" />}
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
            <div className="pill">{dayEvents.length} items</div>
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
    </div>
  );
}

export default App;
