import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../App';
import './css/LeaderBoard.css';
import { formatTime } from './utils';

const sortByFastest = (cars) =>
  [...cars].sort((a, b) => {
    if (!a.fastestLap && !b.fastestLap) return 0;
    if (!a.fastestLap) return 1;
    if (!b.fastestLap) return -1;
    return a.fastestLap - b.fastestLap;
  });

const POS_COLOURS = ['lb-pos--gold', 'lb-pos--silver', 'lb-pos--bronze'];

const MODE_META = {
  Safe:   { label: 'Safe',   cls: 'lb-mode--safe',   textCls: 'lb-mode-text--safe' },
  Hazard: { label: 'Hazard', cls: 'lb-mode--hazard',  textCls: 'lb-mode-text--hazard' },
  Danger: { label: 'Danger', cls: 'lb-mode--danger',  textCls: 'lb-mode-text--danger' },
  Finish: { label: 'Finish', cls: 'lb-mode--finish',  textCls: 'lb-mode-text--finish' },
};

const LeaderBoard = () => {
  const socket = useContext(SocketContext);
  const [cars,      setCars]      = useState([]);
  const [raceInfo,  setRaceInfo]  = useState({ mode: 'Danger', sessionName: 'Awaiting session…' });
  const [countdown, setCountdown] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!socket) return;
    socket.emit('leaderboard-opened');
    setCars([]);

    const handleSessionSelected = (sessionId) => {
      setCars([]);
      socket.emit('request-session-data', sessionId);
    };

    const handleSessionData = (data) => {
      if (data?.session) {
        setRaceInfo(prev => ({ ...prev, sessionName: data.session.sessionName }));
        setCars(data.initialCars.map(car => ({
          ...car, currentTime: 0, lapTimes: [], fastestLap: null,
        })));
      }
    };

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

    socket.on('select-session',     handleSessionSelected);
    socket.on('session-data',       handleSessionData);
    socket.on('current-lap-times',  handleCurrentLapTimes);
    socket.on('race-mode-changed',  (mode) => setRaceInfo(prev => ({ ...prev, mode })));
    socket.on('countdown-update',   (t)    => setCountdown(t));
    socket.on('race-started', () =>
      setCars(prev => prev.map(car => ({ ...car, currentTime: 0, startTime: Date.now(), lapTimes: [] })))
    );
    socket.on('session-deleted', () => {
      setCars([]);
      setCountdown(0);
      setRaceInfo(prev => ({ ...prev, sessionName: 'Awaiting session…' }));
    });

    return () => {
      socket.off('select-session');
      socket.off('session-data');
      socket.off('current-lap-times');
      socket.off('race-mode-changed');
      socket.off('countdown-update');
      socket.off('race-started');
      socket.off('session-deleted');
    };
  }, [socket]);

  useEffect(() => { document.title = 'Leaderboard — RaceControl Live'; }, []);

  /* Track fullscreen state for button label */
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
    <div className={`lb-page ${modeMeta.cls}`}>

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
          <button className="lb-fs-btn" onClick={toggleFullScreen} title="Toggle fullscreen">
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