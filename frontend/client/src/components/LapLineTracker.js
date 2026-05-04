import React, { useState, useEffect, useContext, useRef } from 'react';
import { SocketContext } from '../App';
import './css/LapLineTracker.css';
import { formatTime, useDocumentTitle } from './utils';
import ThemeToggle from './ThemeToggle.js';

const LapLineTracker = () => {
  useDocumentTitle('Lap Line Tracker')
  const socket = useContext(SocketContext);
  const prevSessionRef                        = useRef(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [cars,            setCars]            = useState([]);
  const [isRaceActive,    setIsRaceActive]    = useState(false);
  const [lapTimers,       setLapTimers]       = useState({});
  const [flashCarId,      setFlashCarId]      = useState(null); // visual tap feedback
  const [isRaceFinished,  setIsRaceFinished]  = useState(false);
  const [raceTimer,       setRaceTimer]       = useState(null);
  const [countdown,       setCountdown]       = useState(null);
  const [now,             setNow]             = useState(Date.now());

  useEffect(() => {
    if (!isRaceActive) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [isRaceActive]);

  useEffect(() => {
    if (!socket) return;
    setCars([]);
    setIsRaceActive(false);

    socket.on('race-started', () => {
      setIsRaceActive(true);
      setIsRaceFinished(false);
      setLapTimers(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(id => {
          next[id] = { ...next[id], startTime: Date.now(), currentTime: 0 };
        });
        return next;
      });
    });

    socket.on('state-update', (state) => {
      setRaceTimer(state.raceTimer ?? null);

      const session = state.currentSelectSession ? state.raceSessions.find(s => s.id === state.currentSelectSession) : null;

      if (state.currentSelectSession !== prevSessionRef.current) {
        prevSessionRef.current = state.currentSelectSession;
        if (state.currentSelectSession) {
          const session = state.raceSessions.find(s => s.id === state.currentSelectSession);
          if (session) {
            setSelectedSession(session);
            const initialCars = session.drivers.map((driver, index) => {
              const stored = state.lapData[driver.id];
              return {
                id: driver.id,
                name: driver.name,
                carNumber: `${index + 1}`,
                lapTimes: stored?.lapTimes || [],
                currentLapStart: stored?.startTime || null,
                currentTime: stored?.currentTime || 0,
              };
            });
            setCars(initialCars);
            const initialTimers = {};
            initialCars.forEach(car => {
              initialTimers[car.id] = {
                startTime: car.currentLapStart || null,
                currentTime: car.currentTime || 0,
                lapTimes: car.lapTimes || []
              };
            });
            setLapTimers(initialTimers);
          }
        } else {
          setCars([]);
          setLapTimers({});
          setSelectedSession(null);
        }
      }

      if (session?.status === 'in-progress') {
        setIsRaceActive(true);
        setIsRaceFinished(false);
      } else if (session?.status === 'Finished') {
        setIsRaceActive(false);
        setIsRaceFinished(true);
        setLapTimers(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(id => {
            next[id] = { ...next[id], startTime: null, currentTime: 0 };
          });
          return next;
        });
      } else {
        setIsRaceActive(false);
        setIsRaceFinished(false);
      }
    });
    
    socket.emit('request-full-state');

    return () => {
      socket.off('race-started');
      socket.off('state-update');
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

  const handleLapComplete = (carId) => {
    if (!isRaceActive) return;
    const tapTime = Date.now();

    setFlashCarId(carId);
    setTimeout(() => setFlashCarId(null), 300);

    setLapTimers(prev => {
      const car = prev[carId] || { startTime: null, lapTimes: [] };
      const newLapTimes = car.startTime ? [...(car.lapTimes || []), tapTime - car.startTime] : (car.lapTimes || []);
      const updated = { startTime: tapTime, lapTimes: newLapTimes };
      const nextState = { ...prev, [carId]: updated };

      const updates = Object.entries(nextState).map(([id, t]) => ({
        id,
        startTime: t.startTime,
        lapTimes: t.lapTimes,
      }));
      socket.emit('current-lap-times', updates);
      return nextState;
    });
  };

  const getBestLap = (lapTimes) => {
    if (!lapTimes?.length) return null;
    return Math.min(...lapTimes);
  };

  return (
    <div className='app-screen'>
      
      <header className="llt-statusbar">
        <div className="llt-statusbar__session">
          <span className="rc-label">Session</span>
          <span className="llt-statusbar__name">
            {selectedSession?.sessionName ?? 'Awaiting selection…'}
          </span>
        </div>

        <div>
          {isRaceActive ? (
            <span className="rc-badge rc-badge--green">
              <span className="rc-live-dot" />
              Race active
            </span>
          ) : isRaceFinished ? (
            <span className="rc-badge rc-badge--blue">Finished</span>
          ) : (
            <span className="rc-badge rc-badge--amber">Standby</span>
          )}
        </div>

        <div className='llt-statusbar__right'>
          <div className="llt-statusbar__countdown">
            <span className="rc-label">Countdown</span>
            <span className={`llt-countdown ${countdown < 30000 && countdown > 0 ? 'llt-countdown--warning' : ''}`}>
              {formatTime(countdown)}
            </span>
          </div>
          <ThemeToggle/>
        </div>
        
      </header>
      
      {selectedSession && cars.length === 0 && (
        <div className="rc-notice rc-notice--amber rc-notice--lg">
          <p>No drivers assigned to this session. Ask the front desk to add drivers and refresh.</p>
        </div>
      )}
      <main className="llt-cars-grid">
        {cars.map((car) => {
          const timer    = lapTimers[car.id] ?? { currentTime: 0, lapTimes: [] };
          const lapCount = timer.lapTimes?.length ?? 0;
          const bestLap  = getBestLap(timer.lapTimes);
          const isFlash  = flashCarId === car.id;
          const currentTime = timer.startTime ? Math.max(0, now - timer.startTime) : 0;

          return (
            <button
              key={car.id}
              className={`llt-car-btn ${!isRaceActive ? 'llt-car-btn--disabled' : ''} ${isFlash ? 'llt-car-btn--flash' : ''}`}
              onClick={() => handleLapComplete(car.id)}
              disabled={!isRaceActive}
            >

              <div className="llt-car-number">
                <span className="llt-car-number__hash">#</span>
                {car.carNumber}
              </div>

              <div className="llt-driver-name">{car.name || '—'}</div>

              <div className="llt-current-time">
                {formatTime(currentTime)}
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
          <h2 className="rc-label">Recorded lap times</h2>
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