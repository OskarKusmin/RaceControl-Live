import React, { useState, useEffect, useContext, useRef } from "react";
import { SocketContext } from "../App";
import './css/NextRace.css';
import chimeSound from './sounds/chime.mp3';
import { useTheme } from './useTheme.js';

const NextRace = () => {
  const socket = useContext(SocketContext);
  const [isRaceInProgress, setIsRaceInProgress] = useState(false);
  const [nextRace,         setNextRace]         = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [isFullscreen,     setIsFullscreen]     = useState(false);
  const [theme,            toggleTheme]         = useTheme('rc-theme-nr');
  const chimeRef                                = useRef(new Audio(chimeSound));

  useEffect(() => {
    if (!socket) return;

    socket.on('state-update', (state) => {
      const occupied = state.raceSessions.some(
        s => s.status === 'in-progress' || s.status === 'Finished'
      );
      setIsRaceInProgress(occupied);
      setLoading(false);

      const next = state.raceSessions.find(
        s => s.status === 'upcoming' || s.status === 'confirmed'
      );

      if (next) {
        setNextRace({
          sessionName: next.sessionName,
          drivers: next.drivers
            .filter(d => d.name?.trim())
            .map((driver, index) => ({
              ...driver,
              carNumber: index + 1,
            })),
        });
      } else {
        setNextRace(null);
      }
    });

    socket.emit('request-full-state');

    return () => {
      socket.off('state-update');
    };
  }, [socket]);

  useEffect(() => { document.title = 'Next Race — RaceControl Live'; }, []);

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

  const paddockCall = nextRace !== null && !isRaceInProgress;

  useEffect(() => {
    if (paddockCall) {
      chimeRef.current.currentTime = 0;
      chimeRef.current.play().catch(() => {});
    }
  }, [paddockCall]);

  return (
    <div className={`nr-page ${paddockCall ? 'nr-page--paddock' : ''}`} data-theme={theme}>

      <div className="grid-bg"/>

      <div className="nr-btn__right">
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

      <button className="rc-btn rc-btn--ghost rc-btn--sm" onClick={toggleTheme}>
        {theme === 'dark' ? '🔆' : '🌗'}
      </button>
      </div>
      

      <div className="nr-content">

        <header className="nr-header">
          <h1 className="nr-title">Next Race</h1>
        </header>

        {loading && (
          <div className="nr-state-block">
            <div className="nr-spinner"/>
            <p className="nr-state-text">Loading session data…</p>
          </div>
        )}

        {paddockCall && (
          <div className="nr-paddock-banner" role="alert">
            <svg className="nr-paddock-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <p className="nr-paddock-text">Proceed to paddock</p>
            <p className="nr-paddock-sub">Drivers for this session — please make your way to the starting area now</p>
          </div>
        )}

        {!loading && !nextRace && !paddockCall && (
          <div className="nr-state-block">
            <p className="nr-state-text">No upcoming race sessions scheduled.</p>
          </div>
        )}

        {!loading && nextRace && (
          <div className="nr-card">

            <div className="nr-card__header">
              <h2 className="nr-session-name">{nextRace.sessionName}</h2>
              <span className="rc-badge rc-badge--blue">
                {nextRace.drivers.length} {nextRace.drivers.length === 1 ? 'driver' : 'drivers'}
              </span>
            </div>

            {nextRace.drivers.length === 0 ? (
              <p className="nr-no-drivers">Drivers not yet assigned. Check back shortly.</p>
            ) : (
              <ul className="nr-driver-list" role="list">
                {nextRace.drivers.map((driver) => (
                  <li key={driver.id} className="nr-driver-row" role="listitem">
                    <span className="nr-car-badge">
                      <span className="nr-car-badge__hash">#</span>
                      {driver.carNumber}
                    </span>
                    <span className="nr-driver-name">{driver.name}</span>
                  </li>
                ))}
              </ul>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default NextRace;