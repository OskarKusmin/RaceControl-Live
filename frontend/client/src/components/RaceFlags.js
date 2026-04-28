import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../App';
import './css/RaceFlags.css';
import FullscreenToggle from './FullscreenToggle';
import { useDocumentTitle } from './utils';

const FLAG_CONFIG = {
  Safe:   { label: 'SAFE',   cls: 'rf-flag--safe',   textCls:    'rf-flag-text--safe'   },
  Hazard: { label: 'HAZARD', cls: 'rf-flag--hazard', textCls:    'rf-flag-text--hazard' },
  Danger: { label: 'DANGER', cls: 'rf-flag--danger', textCls:    'rf-flag-text--danger' },
  Finish: { cls: 'rf-flag--finish' }
};

const RaceFlags = () => {
  useDocumentTitle('Flags');
  const socket = useContext(SocketContext);
  const [raceMode,    setRaceMode]    = useState('Danger');
  
  useEffect(() => {
    if (!socket) return;
    socket.on('state-update', state => setRaceMode(state.currentRaceMode));
    socket.emit('request-full-state');
    return () => socket.off('state-update');
  }, [socket]);

  const flag = FLAG_CONFIG[raceMode] ?? FLAG_CONFIG.Danger;

  return (
    <div className={`${flag.cls}`}>
      <div className='corner-btn-wrapper'><FullscreenToggle/></div>
      <main className="rf-main" >
        <span className={`rf-flag-text ${flag.textCls}`}>{flag.label}</span>
      </main>
    </div>
  );
};

export default RaceFlags;