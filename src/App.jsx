
import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import CalendarPage from './pages/Calendar';
import SettingsPage from './pages/Settings';

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

  const handleLogin = async (email, password) => {
    setAuthError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to authenticate');
      }

      localStorage.setItem('authToken', data.token);
      setAuthToken(data.token);
      setUser(data.user);
      setAuthError('');
      setError('');
    } catch (authIssue) {
      setAuthError(authIssue.message);
    }
  };

  const handleRegister = async (name, email, password) => {
    setAuthError('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Unable to authenticate');
      }

      localStorage.setItem('authToken', data.token);
      setAuthToken(data.token);
      setUser(data.user);
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
    setIsAiOpen(true);
    setAiError('');
  };

  const closeAiEditor = () => {
    setIsAiOpen(false);
    setAiError('');
  };

  const handleAiSubmit = async (event) => {
    event.preventDefault();
    if (!aiPrompt.trim()) {
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
        body: JSON.stringify({ prompt: aiPrompt, focusDate: selectedDate.toISOString().slice(0, 10) }),
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

  const PrivateRoute = ({ children }) => {
    if (isAuthenticating) {
      return <div>Loading...</div>;
    }
    return user ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/" />
            ) : (
              <LoginPage
                onLogin={handleLogin}
                onRegister={handleRegister}
                isAuthenticating={isAuthenticating}
                authError={authError}
              />
            )
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <CalendarPage
                user={user}
                currentDate={currentDate}
                selectedDate={selectedDate}
                events={events}
                isLoading={isLoading}
                error={error}
                isAiOpen={isAiOpen}
                aiPrompt={aiPrompt}
                aiResult={aiResult}
                aiError={aiError}
                isAiRunning={isAiRunning}
                onMonthChange={changeMonth}
                onDayClick={handleDayClick}
                onGoToToday={goToToday}
                onLogout={handleLogout}
                onAiOpen={openAiEditor}
                onAiClose={closeAiEditor}
                onAiPromptChange={setAiPrompt}
                onAiSubmit={handleAiSubmit}
                onRefreshEvents={refreshEvents}
              />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <SettingsPage user={user} onLogout={handleLogout} />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
