import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../App';
import './css/LapLineTracker.css';
import { formatTime, useDocumentTitle, buildCarsFromState } from './utils';
import ThemeToggle from './ThemeToggle.js';

const LapLineTracker = () => {
  useDocumentTitle('Lap Line Tracker')
  const socket = useContext(SocketContext);
  const [selectedSession, setSelectedSession] = useState(null);
  const [cars,            setCars]            = useState([]);
  const [isRaceActive,    setIsRaceActive]    = useState(false);
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

    socket.on('state-update', (state) => {
      setRaceTimer(state.raceTimer ?? null);

      const session = state.currentSelectSession ? state.raceSessions.find(s => s.id === state.currentSelectSession) : null;

      if (session?.status === 'in-progress') {
        setIsRaceActive(true);
        setIsRaceFinished(false);
      } else if (session?.status === 'Finished') {
        setIsRaceActive(false);
        setIsRaceFinished(true);
      } else {
        setIsRaceActive(false);
        setIsRaceFinished(false);
      }

      setSelectedSession(session);
      setCars(buildCarsFromState(session, state.lapData));
    });
    
    socket.emit('request-full-state');

    return () => {
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
    setFlashCarId(carId);
    setTimeout(() => setFlashCarId(null), 300);
    socket.emit('lap-completed', { carId });
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
          const lapCount = car.lapTimes?.length ?? 0;
          const bestLap  = getBestLap(car.lapTimes);
          const isFlash  = flashCarId === car.id;
          const currentTime = car.startTime ? Math.max(0, now - car.frozenTime) : 0;

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

      {cars.some(car => (car.lapTimes?.length ?? 0) > 0) && (
        <section className="llt-history">
          <h2 className="rc-label">Recorded lap times</h2>
          <div className="llt-history-grid">
            {cars.map((car) => {
              const laps = car.lapTimes ?? [];
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