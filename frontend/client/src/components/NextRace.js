import React, { useState, useEffect, useContext, useRef } from "react";
import { SocketContext } from "../App";
import './css/NextRace.css';
import chimeSound from './sounds/chime.mp3';
import FullscreenToggle from "./FullscreenToggle.js";
import ThemeToggle from "./ThemeToggle.js";

const NextRace = () => {
  const socket = useContext(SocketContext);
  const [isRaceInProgress, setIsRaceInProgress] = useState(false);
  const [nextRace,         setNextRace]         = useState(null);
  const [loading,          setLoading]          = useState(true);
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

  const paddockCall = nextRace !== null && !isRaceInProgress;

  useEffect(() => {
    if (paddockCall) {
      chimeRef.current.currentTime = 0;
      chimeRef.current.play().catch(() => {});
    }
  }, [paddockCall]);

  return (
    <div className='screen'>

      <div className="grid-bg"/>

      <div className="corner-btn-wrapper">
        <ThemeToggle/>
        <FullscreenToggle />
      </div>
      

      <div className="nr-content">

        <header className="nr-header">
          <h1 className="nr-title">Next Race</h1>
        </header>

        {loading && (
          <div className="nr-state-block">
            <div className="spinner"/>
            <p className="nr-state-text">Loading session data…</p>
          </div>
        )}

        {paddockCall && (
          <div className="nr-paddock-banner">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <p className="nr-paddock-text">Proceed to paddock</p>
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
              <ul>
                {nextRace.drivers.map((driver) => (
                  <li key={driver.id} className="nr-driver-row">
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