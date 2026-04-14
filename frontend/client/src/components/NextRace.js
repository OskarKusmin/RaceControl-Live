import React, { useState, useEffect, useContext, useCallback } from "react";
import { SocketContext } from "../App";
import { RaceSessionContext } from "../contexts/RaceSessionContext";
import './css/NextRace.css';

const NextRace = () => {
  const socket = useContext(SocketContext);
  const { raceSessions } = useContext(RaceSessionContext);
  const [isRaceInProgress, setIsRaceInProgress] = useState(false);
  const [nextRace,    setNextRace]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchNextRace = useCallback(() => {
    const next = raceSessions.find(
      s => (s.status === 'upcoming' || s.status === 'confirmed') &&
            s.status !== 'in-progress'
    );
    setLoading(false);
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
  }, [raceSessions]);

  useEffect(() => {
    if (!socket) return;

    socket.on('select-session',    () => fetchNextRace());
    socket.on('race-started',      () => { setIsRaceInProgress(true);  fetchNextRace(); });
    socket.on('end-race-session',  () => { setIsRaceInProgress(false); fetchNextRace(); });
    socket.on('race-mode-changed', () => fetchNextRace());
    socket.on('full-state', (state) => {
      const occupied = state.raceSessions.some(
        s => s.status === 'in-progress' || s.status === 'Finished'
      );
      setIsRaceInProgress(occupied);
      fetchNextRace();
    })

    fetchNextRace();

    return () => {
      socket.off('select-session');
      socket.off('race-started');
      socket.off('race-mode-changed');
      socket.off('end-race-session');
    };
  }, [socket, fetchNextRace]);

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

  return (
    <div className={`nr-page ${paddockCall ? 'nr-page--paddock' : ''}`}>

      <div className="lp-grid-bg" aria-hidden="true" />

      <button className="nr-fs-btn" onClick={toggleFullScreen} title="Toggle fullscreen">
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

      <div className="nr-content">

        <header className="nr-header">
          <h1 className="nr-title">Next Race</h1>
        </header>

        {loading && (
          <div className="nr-state-block">
            <div className="nr-spinner" aria-label="Loading…" />
            <p className="nr-state-text">Loading session data…</p>
          </div>
        )}

        {paddockCall && (
          <div className="nr-paddock-banner" role="alert" aria-live="assertive">
            <svg className="nr-paddock-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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