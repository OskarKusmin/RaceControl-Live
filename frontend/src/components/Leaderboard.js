import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../App.js';
import './css/LeaderBoard.css';
import { buildCarsFromState, formatTime, useDocumentTitle } from './utils.js';
import FullscreenToggle from './FullscreenToggle.js';
import ThemeToggle from './ThemeToggle.js';

const POS_COLOURS = ['lb-pos--gold', 'lb-pos--silver', 'lb-pos--bronze'];

const MODE_META = {
  Safe:   { label: 'SAFE',   cls: 'lb-mode--safe'   },
  Hazard: { label: 'HAZARD', cls: 'lb-mode--hazard' },
  Danger: { label: 'DANGER', cls: 'lb-mode--danger' },
  Finish: { label: 'FINISH', cls: 'lb-mode--finish' },
};

const LeaderBoard = () => {
  useDocumentTitle('Leaderboard');
  const socket =       useContext(SocketContext);
  const [cars,         setCars]         = useState([]);
  const [raceInfo,     setRaceInfo]     = useState({ mode: 'Danger', sessionName: 'Awaiting session…' });
  const [raceTimer,    setRaceTimer]    = useState(null);
  const [countdown,    setCountdown]    = useState(0);
  const [now, setNow] = useState(Date.now());
  const [isRaceActive, setIsRaceActive] = useState(false);
  
  useEffect(() => {
    if (!isRaceActive) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [isRaceActive]);

  useEffect(() => {
    if (!socket) return;
    setCars([]);

    socket.on('state-update', (state) => {
      setRaceInfo(prev => ({ ...prev, mode: state.currentRaceMode }));
      setRaceTimer(state.raceTimer ?? null);
      const session = state.currentSelectSession ? state.raceSessions.find(s => s.id === state.currentSelectSession) : null;
      setIsRaceActive(session?.status === 'in-progress');
      
      if (session) {
        setRaceInfo(prev => ({ ...prev, sessionName: session.sessionName }));
        setCars(buildCarsFromState(session, state.lapData));
      } else {
        setRaceInfo(prev => ({ ...prev, sessionName: 'Awaiting session…' }));
      }
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

  const sortedCars = [...cars]
  .map(car => ({
    ...car,
    currentTime: car.startTime ? Math.max(0, now - car.startTime) : (car.frozenTime ?? 0),
    fastestLap:  car.lapTimes?.length ? Math.min(...car.lapTimes) : null,
    lapCount:    car.lapTimes?.length ?? 0,
    totalTime:   car.lapTimes?.reduce((sum, t) => sum + t, 0) ?? 0,
  }))
  .sort((a, b) => {
    if (b.lapCount !== a.lapCount) return b.lapCount - a.lapCount;
    if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
    return 0;
  });

  const modeMeta   = MODE_META[raceInfo.mode] ?? MODE_META.Danger;
  const globalBest = sortedCars.reduce((best, car) => {
    if (!car.fastestLap) return best;
    return best === null || car.fastestLap < best ? car.fastestLap : best;
  }, null);

  return (
    <div className={`lb-page app-screen ${modeMeta.cls}`}>

      <header className="lb-topbar">

        <div className="lb-topbar__left">
          <span className="lb-wordmark">RaceControl <span className="lb-wordmark--live">Live</span></span>
          <span className="lb-session-name">{raceInfo.sessionName}</span>
        </div>

        <div>
          <div className={`lb-mode-pill ${modeMeta.cls}`}>
            <span className='lb-mode-pill__text'>
              {modeMeta.label}
            </span>
          </div>
        </div>

        <div className="lb-topbar__right">
          <div className="lb-countdown-block">
            <span className="lb-countdown-label">TIME REMAINING</span>
            <span className={`lb-countdown ${countdown < 30000 && countdown > 0 ? 'lb-countdown--warning' : ''}`}>
              {formatTime(countdown)}
            </span>
          </div>
          <ThemeToggle/>
          <FullscreenToggle />
        </div>

      </header>

      <main className="lb-main">
        {cars.length === 0 ? (
          <div className="lb-empty">
            <p>Awaiting race data…</p>
          </div>
        ) : (
          <table className="lb-table">
            <thead>
              <tr className="lb-table__head-row">
                <th className="lb-th lb-th--pos">POS</th>
                <th className="lb-th lb-th--car">CAR</th>
                <th className="lb-th lb-th--driver">DRIVER</th>
                <th className="lb-th lb-th--laps">LAPS</th>
                <th className="lb-th lb-th--current">CURRENT LAP</th>
                <th className="lb-th lb-th--fastest">FASTEST LAP</th>
              </tr>
            </thead>
            <tbody>
              {sortedCars.map((car, index) => {
                const isLeader      = index === 0;
                const isOverallBest = car.fastestLap !== null && car.fastestLap === globalBest;
                const posClass      = POS_COLOURS[index] ?? '';

                return (
                  <tr
                    key={car.id}
                    className={`lb-row ${isLeader ? 'lb-row--leader' : ''}`}
                  >
                    <td className="lb-td lb-td--pos">
                      <span className={`lb-pos ${posClass}`}>{index + 1}</span>
                    </td>
                    <td className="lb-td lb-td--car">
                      <span className="lb-car-num">{car.carNumber}</span>
                    </td>
                    <td className="lb-td lb-td--driver">
                      {car.name || '—'}
                    </td>
                    <td className="lb-td lb-td--laps">
                      {car.lapTimes?.length ?? 0}
                    </td>
                    <td className="lb-td lb-td--current">
                      <span className="lb-time">
                        {car.currentTime ? formatTime(car.currentTime) : '00:00.00'}
                      </span>
                    </td>
                    <td className="lb-td lb-td--fastest">
                      <span className={`lb-time lb-time--fastest ${isOverallBest ? 'lb-time--overall-best' : ''}`}>
                        {car.fastestLap ? formatTime(car.fastestLap) : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </main>

      <footer className={`lb-mode-banner ${modeMeta.cls}`}>
        <span className={`lb-mode-banner__text`}>
          {modeMeta.label}
        </span>
      </footer>
      
    </div>
  );
};

export default LeaderBoard;