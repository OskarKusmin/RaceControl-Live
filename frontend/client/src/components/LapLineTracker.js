import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../App';
import './css/LapLineTracker.css';
import { formatTime } from './utils';

const LapLineTracker = () => {
  const socket = useContext(SocketContext);
  const [selectedSession, setSelectedSession] = useState(null);
  const [cars, setCars]                       = useState([]);
  const [isRaceActive, setIsRaceActive]       = useState(false);
  const [countdown, setCountdown]             = useState(0);
  const [lapTimers, setLapTimers]             = useState({});
  const [flashCarId, setFlashCarId]           = useState(null); // visual tap feedback

  useEffect(() => {
    if (!socket) return;
    setCars([]);
    setIsRaceActive(false);

    const handleSessionSelected = (sessionId) => {
      setSelectedSession(sessionId);
      setCars([]);
      setIsRaceActive(false);
      setLapTimers({});
      socket.emit('request-session-data', sessionId);
    };

    const handleSessionData = (data) => {
      if (data?.session) {
        setSelectedSession(data.session);
        setCars(data.initialCars);
        const initialTimers = {};
        data.initialCars.forEach(car => {
          initialTimers[car.id] = { startTime: null, currentTime: 0, lapTimes: [] };
        });
        setLapTimers(initialTimers);
      }
    };

    const handleRaceStart = () => {
      setIsRaceActive(true);
      setLapTimers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          next[id] = { ...next[id], startTime: Date.now(), currentTime: 0 };
        });
        return next;
      });
    };

    const handleRaceModeChange = (mode) => {
      if (mode === 'Finish') {
        setIsRaceActive(false);
        setLapTimers(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(id => {
            next[id] = { ...next[id], startTime: null, currentTime: 0 };
          });
          return next;
        });
      }
    };

    const handleEndSession = () => {
      setCars([]);
      setIsRaceActive(false);
      setLapTimers({});
      setSelectedSession(null);
      setCountdown(0);
      socket.emit('lap-line-tracker-opened');
    };

    socket.on('select-session',    handleSessionSelected);
    socket.on('session-data',      handleSessionData);
    socket.on('race-started',      handleRaceStart);
    socket.on('race-mode-changed', handleRaceModeChange);
    socket.on('countdown-update',  (t) => setCountdown(t));
    socket.on('end-race-session',  handleEndSession);
    socket.on('full-state', (state) => {
      setCountdown(state.countdown);
      if (state.currentSelectSession) {
        socket.emit('request-session-data', state.currentSelectSession);
      }
    });

    return () => {
      socket.off('select-session');
      socket.off('session-data');
      socket.off('race-started');
      socket.off('race-mode-changed');
      socket.off('countdown-update');
      socket.off('end-race-session');
      socket.off('full-state');
    };
  }, [socket]);

  useEffect(() => {
    if (!isRaceActive) return;
    const id = setInterval(() => {
      setLapTimers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(carId => {
          if (next[carId].startTime) {
            next[carId] = { ...next[carId], currentTime: Date.now() - next[carId].startTime };
          }
        });
        const updates = Object.keys(next).map(carId => ({
          id: carId,
          currentTime: next[carId].currentTime,
          startTime:   next[carId].startTime,
          lapTimes:    next[carId].lapTimes,
        }));
        socket.emit('current-lap-times', updates);
        return next;
      });
    }, 10);
    return () => clearInterval(id);
  }, [isRaceActive, socket]);

  useEffect(() => {
    if (!socket) return;
    const handleLapTimesUpdate = (incoming) => {
      if (!Array.isArray(incoming)) return;
      setLapTimers(prev => {
        const next = { ...prev };
        incoming.forEach(u => {
          if (next[u.id]) {
            next[u.id] = { ...next[u.id], currentTime: u.currentTime, lapTimes: u.lapTimes };
          }
        });
        return next;
      });
    };
    socket.on('current-lap-times', handleLapTimesUpdate);
    return () => socket.off('current-lap-times', handleLapTimesUpdate);
  }, [socket]);

  useEffect(() => { document.title = 'Lap Line Tracker — RaceControl Live'; }, []);

  const handleLapComplete = (carId) => {
    if (!isRaceActive) return;
    const now = Date.now();

    setFlashCarId(carId);
    setTimeout(() => setFlashCarId(null), 300);

    setLapTimers(prev => {
      const car = prev[carId] || { startTime: null, currentTime: 0, lapTimes: [] };
      const newLapTimes = [...(car.lapTimes || [])];
      if (car.startTime) newLapTimes.push(now - car.startTime);

      return {
        ...prev,
        [carId]: { startTime: now, currentTime: 0, lapTimes: newLapTimes },
      };
    });
  };

  const getBestLap = (lapTimes) => {
    if (!lapTimes?.length) return null;
    return Math.min(...lapTimes);
  };

  return (
    <div className="llt-page">

      <header className="llt-statusbar">
        <div className="llt-statusbar__session">
          <span className="rc-label">Session</span>
          <span className="llt-statusbar__name">
            {selectedSession?.sessionName ?? 'Awaiting selection…'}
          </span>
        </div>

        <div className="llt-statusbar__center">
          {isRaceActive ? (
            <span className="rc-badge rc-badge--green">
              <span className="rc-live-dot" />
              Race active
            </span>
          ) : (
            <span className="rc-badge rc-badge--amber">Standby</span>
          )}
        </div>

        <div className="llt-statusbar__countdown">
          <span className="rc-label">Countdown</span>
          <span className={`llt-countdown ${countdown < 30000 && countdown > 0 ? 'llt-countdown--warning' : ''}`}>
            {formatTime(countdown)}
          </span>
        </div>
      </header>

      {selectedSession && cars.length === 0 && (
        <div className="llt-no-drivers">
          <p>No drivers assigned to this session. Ask the front desk to add drivers and refresh.</p>
        </div>
      )}

      <main className="llt-cars-grid">
        {cars.map((car) => {
          const timer    = lapTimers[car.id] ?? { currentTime: 0, lapTimes: [] };
          const lapCount = timer.lapTimes?.length ?? 0;
          const bestLap  = getBestLap(timer.lapTimes);
          const isFlash  = flashCarId === car.id;

          return (
            <button
              key={car.id}
              className={`llt-car-btn ${!isRaceActive ? 'llt-car-btn--disabled' : ''} ${isFlash ? 'llt-car-btn--flash' : ''}`}
              onClick={() => handleLapComplete(car.id)}
              disabled={!isRaceActive}
              aria-label={`Record lap for car ${car.carNumber}, driver ${car.name}`}
            >

              <div className="llt-car-number">
                <span className="llt-car-number__hash">#</span>
                {car.carNumber}
              </div>

              <div className="llt-driver-name">{car.name || '—'}</div>

              <div className="llt-current-time">
                {formatTime(timer.currentTime ?? 0)}
              </div>

              <div className="llt-car-footer">
                <span className="llt-lap-count">
                  {lapCount} {lapCount === 1 ? 'lap' : 'laps'}
                </span>
                {bestLap !== null && (
                  <span className="llt-best-lap">
                    Best {formatTime(bestLap)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </main>

      {cars.some(car => (lapTimers[car.id]?.lapTimes?.length ?? 0) > 0) && (
        <section className="llt-history">
          <h2 className="llt-history__title">Recorded lap times</h2>
          <div className="llt-history-grid">
            {cars.map((car) => {
              const laps = lapTimers[car.id]?.lapTimes ?? [];
              if (!laps.length) return null;
              const best = Math.min(...laps);
              return (
                <div key={car.id} className="llt-history-card">
                  <div className="llt-history-card__header">
                    <span className="rc-car-num">{car.carNumber}</span>
                    <span className="llt-history-card__name">{car.name || '—'}</span>
                  </div>
                  <div className="llt-history-laps">
                    {laps.map((t, i) => (
                      <div
                        key={i}
                        className={`llt-history-lap ${t === best ? 'llt-history-lap--best' : ''}`}
                      >
                        <span className="llt-history-lap__num">Lap {i + 1}</span>
                        <span className="llt-history-lap__time rc-timing">
                          {formatTime(t)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default LapLineTracker;