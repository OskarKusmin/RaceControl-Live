import React, { useEffect, useState, useContext } from "react";
import { SocketContext } from "../App";
import './css/FrontDesk.css';
import { useTheme } from './useTheme.js';

const FrontDesk = () => {
  const socket = useContext(SocketContext);
  const [raceSessions, setRaceSessions] = useState([]);
  const [newSessionName, setNewSessionName] = useState("");
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [sessionError, setSessionError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [theme, toggleTheme] = useTheme('rc-theme-fd');

  useEffect(() => {
    if (!socket) return;

    socket.on('state-update', (state) => {
      const updatedSessions = state.raceSessions
          .filter(s => s.status !== 'in-progress' && s.status !== 'Finished')
          .map((session) => ({
            ...session,
            drivers: session.drivers.concat(
              Array.from({ length: 8 - session.drivers.length }).map(() => ({
                id: Date.now() + Math.random(),
                name: "",
              }))
            ),
        }));
      setRaceSessions(updatedSessions);
    });

    socket.emit('request-full-state');

    return () => {
      socket.off("state-update");
    };
  }, [socket]);

  useEffect(() => { document.title = "Front Desk — RaceControl Live"; }, []);

  const addRaceSession = () => {
    if (!newSessionName.trim()) {
      setSessionError("Please enter a session name.");
      return;
    }
    setSessionError("");
    socket.emit('add-session', { sessionName: newSessionName }, (response) => {
      if (response.success) {
        setNewSessionName("");
      } else {
        setSessionError(response.error || 'Failed to add session.');
      }
    });
  };

  const deleteRaceSession = (sessionId) => {
    socket.emit('delete-session', { sessionId }, (response) => {
      if (!response.success) {
        alert(response.error || "Failed to delete session");
      }
    });
  };

  const confirmSession = (sessionId) => {
    const session = raceSessions.find((s) => s.id === sessionId);
    const drivers = session.drivers.map((d) => d.name.trim()).filter(Boolean);
    const unique = [...new Set(drivers.map(n => n.toLowerCase()))];
    if (drivers.length !== unique.length) {
      setConfirmError("Driver names must be unique within a session.");
      return;
    }
    setConfirmError("");
    socket.emit("confirm-session", { sessionId, drivers }, (response) => {
      if (response.success) {
        setEditingSessionId(null);
      } else {
        setConfirmError(response.error || "Failed to confirm session.");
      }
    });
  };

  const handleDriverEdit = (sessionId, driverIndex, newName) => {
    setRaceSessions(prev =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              drivers: session.drivers.map((driver, i) =>
                i === driverIndex ? { ...driver, name: newName } : driver
              ),
            }
          : session
      )
    );
  };

  const startEditing = (sessionId) => {
    setConfirmError("");
    setEditingSessionId(sessionId);
  };

  const cancelEditing = () => {
    setConfirmError("");
    setEditingSessionId(null);
  };

  const handleAddKeyDown = (e) => {
    if (e.key === 'Enter') addRaceSession();
  };

  return (
    <div className="fd-page" data-theme={theme}>
      <button className="rc-btn rc-btn--ghost rc-btn--sm lp-theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? '🔆' : '🌗'}
      </button>
      <div className="lp-grid-bg" aria-hidden="true" />

      <div className="fd-content">

        <header className="fd-header">
          <div className="fd-header__titles">
            <h1 className="fd-title">Front Desk</h1>
            <p className="rc-label">Session &amp; driver management</p>
          </div>
        </header>

        <section className="rc-card fd-add-panel" aria-label="Add new race session">
          <h2 className="fd-section-title">New Race Session</h2>
          <div className="fd-add-row">
            <div className="rc-form-group fd-add-field">
              <label htmlFor="fd-session-name" className="rc-form-label">Session name</label>
              <input
                id="fd-session-name"
                className="rc-input"
                type="text"
                value={newSessionName}
                onChange={(e) => { setNewSessionName(e.target.value); setSessionError(""); }}
                onKeyDown={handleAddKeyDown}
                placeholder="e.g. Junior Sprint — Heat 1"
                autoComplete="off"
              />
            </div>
            <button
              className="rc-btn rc-btn--primary fd-add-btn"
              onClick={addRaceSession}
              disabled={!newSessionName.trim()}
            >
              Add session
            </button>
          </div>
          {sessionError && (
            <p className="fd-inline-error" role="alert">{sessionError}</p>
          )}
        </section>

        <section aria-label="Race sessions">
          <div className="fd-sessions-header">
            <h2 className="fd-section-title">Race Sessions</h2>
            <span className="rc-label">{raceSessions.length} queued</span>
          </div>

          {raceSessions.length === 0 ? (
            <div className="fd-empty">
              <p>No sessions queued. Add one above to get started.</p>
            </div>
          ) : (
            <div className="fd-session-list">
              {raceSessions.map((session) => {
                const isEditing = editingSessionId === session.id;
                const filledCount = session.drivers.filter(d => d.name.trim()).length;

                return (
                  <div
                    key={session.id}
                    className={`fd-session-card ${isEditing ? 'fd-session-card--editing' : ''}`}
                  >
                    <div className="fd-session-card__header">
                      <div>
                        <h3 className="fd-session-name">{session.sessionName}</h3>
                        <span className="rc-label">
                          {filledCount} / 8 drivers assigned
                        </span>
                      </div>
                      <div className="fd-session-card__actions">
                        {isEditing ? (
                          <>
                            <button
                              className="rc-btn rc-btn--success rc-btn--sm"
                              onClick={() => confirmSession(session.id)}
                            >
                              Confirm
                            </button>
                            <button
                              className="rc-btn rc-btn--ghost rc-btn--sm"
                              onClick={cancelEditing}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="rc-btn rc-btn--ghost rc-btn--sm"
                            onClick={() => startEditing(session.id)}
                          >
                            Edit
                          </button>
                        )}
                        <button
                          className="rc-btn rc-btn--danger rc-btn--sm"
                          onClick={() => deleteRaceSession(session.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {isEditing && confirmError && (
                      <p className="fd-inline-error" role="alert">{confirmError}</p>
                    )}

                    <div className="fd-driver-grid">
                      {session.drivers.map((driver, index) => (
                        <div key={driver.id || index} className="fd-driver-row">
                          <span className="rc-car-num">{index + 1}</span>
                          <input
                            className={`rc-input fd-driver-input ${!isEditing ? 'fd-driver-input--readonly' : ''}`}
                            type="text"
                            value={driver.name || ""}
                            disabled={!isEditing}
                            onChange={(e) => handleDriverEdit(session.id, index, e.target.value)}
                            placeholder={`Driver ${index + 1}`}
                            aria-label={`Car ${index + 1} driver name`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default FrontDesk;