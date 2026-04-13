import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../App';
import './css/RaceFlags.css';

const FLAG_CONFIG = {
  Safe: {
    label:      'Safe',
    cls:        'rf-flag--safe',
    textCls:    'rf-flag-text--safe',
  },
  Hazard: {
    label:      'Hazard',
    cls:        'rf-flag--hazard',
    textCls:    'rf-flag-text--hazard',
  },
  Danger: {
    label:      'Danger',
    cls:        'rf-flag--danger',
    textCls:    'rf-flag-text--danger',
  },
  Finish: {
    cls:        'rf-flag--finish',
  },
};

const DEFAULT_FLAG = FLAG_CONFIG.Danger;

const RaceFlags = () => {
  const socket = useContext(SocketContext);
  const [raceMode,    setRaceMode]    = useState('Danger');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!socket) return;
    socket.on('race-mode-changed', (mode) => setRaceMode(mode));
    socket.on('full-state', (state) => setRaceMode(state.currentRaceMode));
    return () => {
      socket.off('race-mode-changed');
      socket.off('full-state');
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    
  }, [socket]);

  useEffect(() => { document.title = 'Flags — RaceControl Live'; }, []);

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

  const flag = FLAG_CONFIG[raceMode] ?? DEFAULT_FLAG;

  return (
    <div className={`rf-page ${flag.cls}`}>

      <button className="rf-fs-btn" onClick={toggleFullScreen} title="Toggle fullscreen">
        {isFullscreen ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        )}
      </button>

      <main className="rf-main" aria-live="assertive" aria-atomic="true">
        <span className={`rf-flag-text ${flag.textCls}`} aria-label={`Flag status: ${flag.label}`}>
          {flag.label}
        </span>
      </main>

    </div>
  );
};

export default RaceFlags;