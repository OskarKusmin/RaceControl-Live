import React, { useEffect, useState, useContext, useRef } from 'react';
import { SocketContext } from '../App';
import './css/RaceCountdown.css';
import countSound from './sounds/count.mp3';
import goSound from './sounds/go.mp3';

const formatCountdown = (ms) => {
  const total   = Math.floor(ms / 1000);
  const hours   = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const getUrgency = (ms) => {
  if (ms <= 0)      return 'finished';
  if (ms <= 30000)  return 'critical';   // under 30 s — red
  if (ms <= 60000)  return 'warning';    // under 60 s — amber
  return 'normal';
};

const RaceCountdown = () => {
  const socket = useContext(SocketContext);
  const [countdown,   setCountdown]     = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [startCount, setStartCount]     = useState(null);
  const countRef                        = useRef(new Audio(countSound));
  const goRef                           = useRef(new Audio(goSound));

  useEffect(() => {
    if (!socket) return;
    socket.on('countdown-update', (t) => setCountdown(t));
    
    socket.on('full-state', (state) => setCountdown(state.countdown));
    
    socket.on('race-starting', ({ count }) => {
      setStartCount(count);
      countRef.current.currentTime = 0;
      countRef.current.play().catch(() => {});
    });

    socket.on('race-started', () => {
      setStartCount(null);
      goRef.current.currentTime = 0;
      goRef.current.play().catch(() => {});
    });

    return () => {
      socket.off('countdown-update');
      socket.off('full-state');
      socket.off('race-starting');
      socket.off('race-started');
    } 

  }, [socket]);

  useEffect(() => { document.title = 'Countdown — RaceControl Live'; }, []);

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

  const urgency = getUrgency(countdown);

  return (
    <div className={`rcd-page rcd-page--${urgency}`}>

      <div className="lp-grid-bg" aria-hidden="true" />

      <button className="rcd-fs-btn" onClick={toggleFullScreen} title="Toggle fullscreen">
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

      <main className="rcd-main" aria-live="polite" aria-label="Race countdown">
        {startCount !== null ? (
          <>
            <p className='rcd-label rc-label'>Race starting in</p>
            <div className='rcd-time rcd-time--starting' aria-atomic='true'>
              {startCount}
            </div>
          </>
        ) : (
          <>
            <p className='rcd-label rc-label'>Time remaining</p>
            <div className={`rcd-time rcd-time--${urgency}`} aria-atomic='true'>
              {urgency === 'finished' ? 'Time up' : formatCountdown(countdown)}
            </div>
          </>
        )}
        <div className={`rcd-strip rcd-strip--${startCount !== null ? 'starting' : urgency}`} aria-hidden="true" />
      </main>

    </div>
  );
};

export default RaceCountdown;