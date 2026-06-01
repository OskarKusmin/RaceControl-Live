import React, { useEffect, useState, useContext, useRef } from 'react';
import { SocketContext } from '../App';
import './css/RaceCountdown.css';
import countSound from './sounds/count.mp3';
import goSound from './sounds/go.mp3';
import FullscreenToggle from './FullscreenToggle';
import { formatTime, useDocumentTitle } from './utils';

const getUrgency = (ms) => {
  if (ms <= 0)      return 'finished';
  if (ms <= 30000)  return 'critical';
  if (ms <= 60000)  return 'warning';
  return 'normal';
};

const RaceCountdown = () => {
  useDocumentTitle('Countdown')
  const socket = useContext(SocketContext);
  const [countdown,    setCountdown]    = useState(0);
  const [startCount,   setStartCount]   = useState(null);
  const [raceTimer,    setRaceTimer]    = useState(null);
  const countRef                        = useRef(new Audio(countSound));
  const goRef                           = useRef(new Audio(goSound));

  useEffect(() => {
    if (!socket) return;
    socket.on('state-update', state => setRaceTimer(state.raceTimer ?? null));    

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

    socket.emit('request-full-state');

    return () => {
      socket.off('state-update');
      socket.off('race-starting');
      socket.off('race-started');
    } 

  }, [socket]);

  useEffect(() => {
    if (!raceTimer) {
      setCountdown(0);
      return;
    }

    const tick = () => {
      const remaining = raceTimer.duration - (Date.now() - raceTimer.startTime);
      setCountdown(Math.max(0, remaining));
    }

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [raceTimer]);

  const urgency = getUrgency(countdown);

  return (
    <div className='screen'>

      <div className="grid-bg" />

      <div className='corner-btn-wrapper'>
        <FullscreenToggle />
      </div>

      <main className="rcd-main">
        {startCount !== null ? (
          <>
            <p className='rcd-label rc-label'>Race starting in</p>
            <div className='rcd-time rcd-time--starting'>
              {startCount}
            </div>
          </>
        ) : (
          <>
            <p className='rcd-label rc-label'>Time remaining</p>
            <div className={`rcd-time rcd-time--${urgency}`}>
              {urgency === 'finished' ? 'Time up' : formatTime(countdown)}
            </div>
          </>
        )}
        <div className={`rcd-strip rcd-strip--${startCount !== null ? 'starting' : urgency}`} />
      </main>

    </div>
  );
};

export default RaceCountdown;