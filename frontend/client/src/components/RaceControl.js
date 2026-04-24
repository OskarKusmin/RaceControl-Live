import React, { useEffect, useState, useContext } from 'react';
import { SocketContext } from '../App';
import './css/RaceControl.css';
import { formatTime } from './utils';
import { useTheme } from './useTheme.js';

const FLAG_MODES = [
  { mode: 'Safe',   label: 'Safe',   variant: 'green',  desc: 'Green flag - Safe/Go' },
  { mode: 'Hazard', label: 'Hazard', variant: 'yellow', desc: 'Yellow flag - caution, no overtaking' },
  { mode: 'Danger', label: 'Danger', variant: 'red',    desc: 'Red flag - stop immediately' }
];

const MODE_BADGE = { Safe: 'green', Hazard:  'amber', Danger:  'red', Finish:  'blue' };

const RaceControl = () => {
  const socket = useContext(SocketContext);
  const [raceTimer,      setRaceTimer]      = useState(null);
  const [raceMode,       setRaceMode]       = useState('Danger');
  const [countdown,      setCountdown]      = useState(0);
  const [currentSession, setCurrentSession] = useState(null);
  const [isRaceActive,   setIsRaceActive]   = useState(false);
  const [isRaceFinished, setIsRaceFinished] = useState(false);
  const [error,          setError]          = useState('');
  const [isStarting,     setIsStarting]     = useState(false);
  const [theme,          toggleTheme]       = useTheme('rc-theme');

  useEffect(() => {
    if (!socket) return;

    socket.on('state-update', (state) => {
      setRaceMode(state.currentRaceMode);
      setRaceTimer(state.raceTimer ?? null);
      setIsStarting(!!state.startingCountdown);

      const session = state.currentSelectSession
          ? state.raceSessions.find(s => s.id === state.currentSelectSession)
          : state.raceSessions.find(s => s.status === 'in-progress')
          || state.raceSessions.find(s => s.status === 'upcoming' || s.status === 'confirmed');

      if (session) { 
        setCurrentSession(session);
        if (session.status === 'in-progress') {
          setIsRaceActive(true);
          setIsRaceFinished(false);
        } else if (session.status === 'Finished') {
          setIsRaceActive(false);
          setIsRaceFinished(true);
        } else {
          setIsRaceActive(false);
          setIsRaceFinished(false);
        }
      } else {
        setCurrentSession(null);
        setIsRaceActive(false);
        setIsRaceFinished(false);
      }

    });

    socket.on('race-started', () => {
      setIsStarting(false);
      setIsRaceActive(true);
      setIsRaceFinished(false);
    });

    socket.emit('request-full-state');

    return () => {
      socket.off('state-update');
      socket.off('race-started');
    };
  }, [socket]);

  useEffect(() => {
    if (!raceTimer) {
      setCountdown(0);
      return;
    }
    const tick = () => {
      const remaining = raceTimer.duration - (Date.now() - raceTimer.startTime);
      setCountdown(Math.max(0, remaining));
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [raceTimer]);

  useEffect(() => { document.title = 'Race Control — RaceControl Live'; }, []);

  const changeMode = (mode) => {
    setError('');
    socket.emit('change-mode', { mode });
  };

  const startRace = () => {
    if (!currentSession) { setError('No session selected.'); return; }
    setError('');
    socket.emit('start-race', { sessionId: currentSession.id }, (response) => {
      if (response.success) {
        setIsStarting(true);
      } else {
        setError(response.error || 'Failed to start race.');
      }
    });
  };

  const finishRace = () => {
    if (!currentSession) { setError('No session selected.'); return; }
    setError('');
    socket.emit('finish-race', { sessionId: currentSession.id }, (response) => {
      if (response.success) {
        setIsRaceActive(false);
        setIsRaceFinished(true);
      } else {
        setError(response.error || 'Failed to finish race.');
      }
    });
  };

  const endRaceSession = () => {
    if (!currentSession || !isRaceFinished) {
      setError('Race must be finished before ending the session.');
      return;
    }
    setError('');
    socket.emit('end-race-session', { sessionId: currentSession.id });
    setIsRaceFinished(false);
    setIsRaceActive(false);
  };

  const raceStatus = isRaceActive ? 'In Progress' : isRaceFinished ? 'Finished' : 'Not Started';
  const badgeVariant = MODE_BADGE[raceMode] ?? 'blue';

  return (
    <div className="rc-ctrl-page" data-theme={theme}>
      <button className="rc-btn rc-btn--ghost rc-btn--sm lp-theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? '🔆' : '🌗'}
      </button>
      <div className="grid-bg"/>

      <div className="rc-ctrl-content">

        <header className="rc-ctrl-header">
          <div>
            <h1>Race Control</h1>
            <p className="rc-label">Safety &amp; race management</p>
          </div>
          <div>
            <span className={`rc-badge rc-badge--${badgeVariant}`}>
              {isRaceActive && <span className="rc-live-dot" />}
              {raceMode}
            </span>
          </div>
        </header>

        <div className="rc-card rc-ctrl-timer-card">
          <span className="rc-label">Race countdown</span>
          <div className={`rc-ctrl-timer ${countdown < 30000 && countdown > 0 && isRaceActive ? 'rc-ctrl-timer--warning' : ''}`}>
            {formatTime(countdown)}
          </div>
        </div>

        {currentSession ? (
          <div className="rc-card rc-ctrl-session-card">
            <div className="rc-ctrl-session-row">
              <div>
                <p className="rc-label">Current session</p>
                <p className="rc-ctrl-session-name">{currentSession.sessionName}</p>
              </div>
              <div className="rc-ctrl-session-meta">
                <p className="rc-label">Status</p>
                <p className="rc-ctrl-session-status">{raceStatus}</p>
              </div>
              <div className="rc-ctrl-session-meta">
                <p className="rc-label">Drivers</p>
                <p className="rc-ctrl-session-status">{currentSession.drivers?.length ?? '—'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rc-ctrl-no-session">
            <p>No upcoming sessions. Add a session at the Front Desk.</p>
          </div>
        )}

        {error && (
          <p className="rc-ctrl-error">{error}</p>
        )}

        <div className="rc-card">
          <div className="rc-ctrl-lifecycle-row">
            {!isRaceActive && !isRaceFinished && !isStarting && (
              <button
                className="rc-btn rc-btn--success rc-btn--lg rc-ctrl-action-btn"
                onClick={startRace}
                disabled={!currentSession}
              >
                Start race
              </button>
            )}

            {isStarting && (
              <button
                className="rc-btn rc-btn--success rc-btn--lg rc-ctrl-action-btn"
                disabled
              >
                Starting...
              </button>
            )}
            
            {isRaceFinished && (
              <button
                className="rc-btn rc-btn--ghost rc-btn--lg rc-ctrl-action-btn"
                onClick={endRaceSession}
              >
                End session
              </button>
            )}
          </div>
        </div>

        {isRaceActive && (
          <div className="rc-card">
            <h2 className="rc-ctrl-section-title">FLAG CONTROLS</h2>
            <div className="rc-ctrl-flag-grid">
              {FLAG_MODES.map(({ mode, label, variant, desc }) => (
                <button
                  key={mode}
                  className={`rc-ctrl-flag-btn rc-ctrl-flag-btn--${variant} ${raceMode === mode ? 'rc-ctrl-flag-btn--active' : ''}`}
                  onClick={() => changeMode(mode)}
                  title={desc}
                >
                  <span className="rc-ctrl-flag-btn__swatch" />
                  <span className="rc-ctrl-flag-btn__label">{label}</span>
                  <span className="rc-ctrl-flag-btn__desc">{desc}</span>
                </button>
              ))}
              <button
                className="rc-ctrl-flag-btn rc-ctrl-flag-btn--chequered rc-ctrl-flag-btn--finish-action"
                onClick={finishRace}
                title="Chequered flag — end the race"
              >
                <span className="rc-ctrl-flag-btn__swatch" />
                <span className="rc-ctrl-flag-btn__label">Finish</span>
                <span className="rc-ctrl-flag-btn__desc">Chequered flag — end the race</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RaceControl;