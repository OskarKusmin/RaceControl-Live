import React, { useEffect, useState, useContext } from "react";
import { SocketContext } from "../App";
import { RaceSessionContext } from "../contexts/RaceSessionContext";

const FrontDesk = () => {
  const socket = useContext(SocketContext);
  const { raceSessions, setRaceSessions } = useContext(RaceSessionContext);
  const [newSessionName, setNewSessionName] = useState(""); // Stores the name of a new session to be added
  const [editingSessionId, setEditingSessionId] = useState(null); // Tracks the session being edited

  // Fetch race sessions from the backend when the component mounts
  useEffect(() => {
    if (!socket) return; 

    const handleSessionsUpdate = (sessions) => {
      // Filter out in-progress and finished sessions and update with 8 drivers
      const updatedSessions = sessions
        .filter(session => session.status !== 'in-progress' && session.status !== 'Finished')
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
    }
      
    socket.emit("fetch-sessions"); // Request sessions from the backend

    socket.on("fetch-sessions-response", handleSessionsUpdate);
    socket.on("session-added", () => socket.emit("fetch-sessions"));
    socket.on("session-deleted", () => socket.emit("fetch-sessions"));
    socket.on("session-updated", () => socket.emit("fetch-sessions"));
      
    return () => {
      socket.off("fetch-sessions-response"); 
      socket.off("session-added");
      socket.off("session-deleted");
      socket.off("session-updated");
    };
    
  }, [socket, setRaceSessions]);

  useEffect(() => {
    document.title = "Front Desk";
  }, []);

  // Add a new race session
  const addRaceSession = () => {
    if (!newSessionName.trim()) {
      alert('Please enter a session name');
      return;
    }

    socket.emit('add-session', { sessionName: newSessionName}, (response) => {
      if (response.success) {
        setNewSessionName("") //clearing input field
        // No need to fetch sessions as server will emit them
      } else {
        alert(response.error || 'Failed to add session.')
      }
    });
  };

  // Delete a race session
  const deleteRaceSession = (sessionId) => {
    socket.emit('delete-session', { sessionId }, (response) => {
      if (!response.success) {
        alert(response.error || "Failed to delete session");
      }
    });
  };

  // Confirm and save edits to a session's drivers
  const confirmSession = (sessionId) => {
    const session = raceSessions.find((s) => s.id === sessionId); // Find the session
    const drivers = session.drivers
      .map((driver) => driver.name.trim())
      .filter((name) => name); // Get non-empty driver names

    // Ensure driver names are unique
    const lowerCaseDrivers = drivers.map((name) => name.toLowerCase());
    const uniqueDrivers = [...new Set(lowerCaseDrivers)];
    if (drivers.length !== uniqueDrivers.length) {
      alert("Driver names must be unique");
      return;
    }

    socket.emit("confirm-session", { sessionId, drivers }, (response) => {
      if (response.success) {
        setEditingSessionId(null); // Exit editing mode
      } else {
        alert(response.error || "Failed to confirm session.");
      }
    });
  };

  // Handle edits to individual driver names
  const handleDriverEdit = (sessionId, driverIndex, newName) => {
    setRaceSessions(prevSessions => 
      prevSessions.map((session) => 
        session.id === sessionId
      ? {
        ...session,
        drivers: session.drivers.map((driver,index) =>
          index === driverIndex
            ? { ...driver, name: newName }
            : driver
          ),
        }
      : session
    ));
  };

  const styles = {
    container: {
      textAlign: "center",
      fontFamily: "Arial, sans-serif",
      padding: "20px",
    },
    section: {
      border: "2px solid black",
      borderRadius: "15px",
      padding: "20px",
      margin: "10px auto",
      width: "90%", 
      maxWidth: "400px", 
      textAlign: "center",
      backgroundColor: "#f9f9f9",
      boxSizing: "border-box",
    },
    session: {
      border: "2px solid black",
      borderRadius: "15px",
      padding: "20px",
      margin: "10px auto",
      width: "90%", 
      maxWidth: "400px", 
      backgroundColor: "#f7f7f7",
      textAlign: "center", 
      boxSizing: "border-box",
    },
    input: {
      padding: "10px",
      fontSize: "16px",
      borderRadius: "5px",
      border: "1px solid black",
      marginBottom: "10px",
      width: "calc(100% - 22px)", 
      boxSizing: "border-box",
    },
    button: {
      padding: "10px",
      fontSize: "16px",
      fontWeight: "bold",
      border: "2px solid black",
      borderRadius: "5px",
      backgroundColor: "#ffffff",
      cursor: "pointer",
      transition: "background-color 0.3s ease, transform 0.2s ease",
      width: "100%", 
      boxSizing: "border-box",
    },
    buttonGroup: {
      display: "flex",
      justifyContent: "center",
      gap: "10px",
    },
    driverInput: {
      padding: "8px",
      fontSize: "14px",
      marginBottom: "10px",
      borderRadius: "5px",
      border: "1px solid black",
      display: "block",
      width: "calc(100% - 22px)", 
      boxSizing: "border-box",
    },
  };
  
  return (
    <div style={styles.container}>
      <h1>FRONT DESK INTERFACE</h1>
      <div style={styles.section}>
        <h3>Add New Race Session</h3>
        <input
          type="text"
          value={newSessionName}
          onChange={(e) => setNewSessionName(e.target.value)}
          placeholder="Enter session name"
          style={styles.input}
        />
        <button onClick={addRaceSession} style={styles.button}>
          Add Session
        </button>
      </div>
      <h3>RACE SESSIONS</h3>
      <div>
        {raceSessions.map((session) => (
          <div key={session.id} style={styles.session}>
            <h4>Session: {session.sessionName}</h4>
            <div>
              {session.drivers.map((driver, index) => (
                <input
                  key={driver.id || index}
                  type="text"
                  value={driver.name || ""}
                  disabled={editingSessionId !== session.id}
                  onChange={(e) =>
                    handleDriverEdit(session.id, index, e.target.value)
                  }
                  placeholder={`Driver ${index + 1}`}
                  style={styles.driverInput}
                />
              ))}
            </div>
            <div style={styles.buttonGroup}>
              {editingSessionId === session.id ? (
                <>
                  <button
                    onClick={() => confirmSession(session.id)}
                    style={styles.button}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setEditingSessionId(null)}
                    style={styles.button}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditingSessionId(session.id)}
                  style={styles.button}
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => deleteRaceSession(session.id)}
                style={styles.button}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


export default FrontDesk;
