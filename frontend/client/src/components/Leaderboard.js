import React, { useState, useEffect, useContext, useRef } from 'react';
import { SocketContext } from '../App';
import './css/LeaderBoard.css';
import { formatTime } from './utils';
import { useTheme } from './useTheme.js'

const sortByFastest = (cars) =>
  [...cars].sort((a, b) => {
    if (!a.fastestLap && !b.fastestLap) return 0;
    if (!a.fastestLap) return 1;
    if (!b.fastestLap) return -1;
    return a.fastestLap - b.fastestLap;
  });

const POS_COLOURS = ['lb-pos--gold', 'lb-pos--silver', 'lb-pos--bronze'];

const MODE_META = {
  Safe:   { label: 'Safe',   cls: 'lb-mode--safe',    textCls: 'lb-mode-text--safe' },
  Hazard: { label: 'Hazard', cls: 'lb-mode--hazard',  textCls: 'lb-mode-text--hazard' },
  Danger: { label: 'Danger', cls: 'lb-mode--danger',  textCls: 'lb-mode-text--danger' },
  Finish: { label: 'Finish', cls: 'lb-mode--finish',  textCls: 'lb-mode-text--finish' },
};

const LeaderBoard = () => {
  const socket =       useContext(SocketContext);
  const [cars,         setCars]         = useState([]);
  const [raceInfo,     setRaceInfo]     = useState({ mode: 'Danger', sessionName: 'Awaiting session…' });
  const [raceTimer,    setRaceTimer]    = useState(null);
  const [countdown,    setCountdown]    = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const prevSessionRef                  = useRef(null);
  const [theme,        toggleTheme]     = useTheme('rc-theme');

  useEffect(() => {
    if (!socket) return;
    setCars([]);

    const handleCurrentLapTimes = (incoming) => {
      if (!Array.isArray(incoming)) return;
      setCars(prev => prev.map(car => {
        const u = incoming.find(c => c.id === String(car.id));
        if (!u) return car;
        return {
          ...car,
          currentTime: u.currentTime || 0,
          startTime:   u.startTime,
          lapTimes:    u.lapTimes || [],
          fastestLap:  u.lapTimes?.length ? Math.min(...u.lapTimes) : null,
        };
      }));
    };

    socket.on('current-lap-times',  handleCurrentLapTimes);
    socket.on('race-started', () =>
      setCars(prev => prev.map(car => ({ ...car, currentTime: 0, startTime: Date.now(), lapTimes: [] })))
    );

    socket.on('state-update', (state) => {
      setRaceInfo(prev => ({ ...prev, mode: state.currentRaceMode }));
      setRaceTimer(state.raceTimer ?? null);
      
      if (state.currentSelectSession && state.currentSelectSession !== prevSessionRef.current) {
        prevSessionRef.current = state.currentSelectSession;
        const session = state.raceSessions.find(s => s.id === state.currentSelectSession);
        if (session) {
          setRaceInfo(prev => ({ ...prev, sessionName: session.sessionName }));
          setCars(session.drivers.map((driver, index) => {
            const stored = state.lapData[driver.id];
            return {
              id: driver.id,
              name: driver.name,
              carNumber: `${index + 1}`,
              currentTime: stored?.currentTime || 0,
              lapTimes: stored?.lapTimes || [],
              fastestLap: stored?.lapTimes?.length ? Math.min(...stored.lapTimes) : null
            }
          }));
        }
      };

      if (!state.currentSelectSession) {
        prevSessionRef.current = null;
        setCars([]);
        setRaceInfo(prev => ({ ...prev, sessionName: 'Awaiting session…' }));
      }

    });

    socket.emit('request-full-state');

    return () => {
      socket.off('current-lap-times');
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

  useEffect(() => { document.title = 'Leaderboard — RaceControl Live'; }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  };

  const sorted     = sortByFastest(cars);
  const modeMeta   = MODE_META[raceInfo.mode] ?? MODE_META.Danger;
  const globalBest = cars.reduce((best, car) => {
    if (!car.fastestLap) return best;
    return best === null || car.fastestLap < best ? car.fastestLap : best;
  }, null);

  return (
    <div className={`lb-page ${modeMeta.cls}`} data-theme={theme}>

      <header className="lb-topbar">

        <div className="lb-topbar__left">
          <span className="lb-wordmark">RaceControl <span className="lb-wordmark--live">Live</span></span>
          <span className="lb-session-name">{raceInfo.sessionName}</span>
        </div>

        <div className="lb-topbar__center">
          <div className={`lb-mode-pill ${modeMeta.cls}`}>
            <span className={`lb-mode-pill__text ${modeMeta.textCls}`}>
              {modeMeta.label}
            </span>
          </div>
        </div>

        <div className="lb-topbar__right">
          <div className="lb-countdown-block">
            <span className="lb-countdown-label">Time remaining</span>
            <span className={`lb-countdown ${countdown < 30000 && countdown > 0 ? 'lb-countdown--warning' : ''}`}>
              {formatTime(countdown)}
            </span>
          </div>
          <button className="rc-btn rc-btn--ghost rc-btn--sm" onClick={toggleTheme}>
            {theme === 'dark' ? '🔆' : '🌗'} 
          </button>
          <button className="rc-fs-btn" onClick={toggleFullScreen} title="Toggle fullscreen">
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            )}
          </button>
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
                <th className="lb-th lb-th--pos">Pos</th>
                <th className="lb-th lb-th--car">Car</th>
                <th className="lb-th lb-th--driver">Driver</th>
                <th className="lb-th lb-th--laps">Laps</th>
                <th className="lb-th lb-th--current">Current lap</th>
                <th className="lb-th lb-th--fastest">Fastest lap</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((car, index) => {
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
        <span className={`lb-mode-banner__text ${modeMeta.textCls}`}>
          {modeMeta.label}
        </span>
      </footer>
      
    </div>
  );
};

export default LeaderBoard;