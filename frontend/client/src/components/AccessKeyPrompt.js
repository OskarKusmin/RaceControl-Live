import React, { useState, useContext, useEffect } from 'react';
import { SocketContext } from '../App';
import './css/AccessKeyPrompt.css';
import { useTheme } from './useTheme';

const ROLE_LABELS = {
  receptionist: 'Front Desk',
  observer:     'Lap Line Tracker',
  safety:       'Race Control',
};

const AccessKeyPrompt = ({ onAccessGranted, role }) => {
  const socket = useContext(SocketContext);
  const [accessKey, setAccessKey]   = useState('');
  const [error, setError]           = useState('');
  const [isLoading, setIsLoading]   = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [theme, toggleTheme] = useTheme('rc-theme');

  useEffect(() => {
    if (!socket) { setIsLoading(true); return; }
    setIsLoading(false);

    socket.on('key-validation-response', (response) => {
      setIsSubmitting(false);
      if (response.success) {
        onAccessGranted(role);
      } else {
        setError(response.message || 'Invalid access key. Please try again.');
      }
    });

    return () => { socket.off('key-validation-response'); };
  }, [socket, role, onAccessGranted]);

  const handleAccess = () => {
    if (!socket || !accessKey.trim()) return;
    setError('');
    setIsSubmitting(true);
    socket.emit('validate-key', { key: accessKey, role });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAccess();
  };

  const roleLabel = ROLE_LABELS[role] ?? role;

  if (isLoading) {
    return (
      <div className="screen">
        <div className="grid-bg" />
        <div className="akp-card">
          <div className="akp-spinner" />
          <p className="akp-connecting">Connecting to server…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" data-theme={theme}>
      <div className="grid-bg"/>

      <div className="akp-card">
        <div className="akp-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1>Staff Access</h1>

        <p>Enter the access key to continue to <strong>{roleLabel}</strong>.</p>

        <div className="akp-field">
          <input className="rc-input rc-input--mono akp-input"
            type="password"
            placeholder="••••••••"
            value={accessKey}
            onChange={(e) => { setAccessKey(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            autoFocus
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p className="akp-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}

        <button
          className="rc-btn rc-btn--danger akp-submit"
          onClick={handleAccess}
          disabled={isSubmitting || !accessKey.trim()}
        >
          {isSubmitting ? (
            <>
              <span className="akp-btn-spinner"/>
              Verifying…
            </>
          ) : 'Submit'}
        </button>

      </div>
    </div>
  );
};

export default AccessKeyPrompt;