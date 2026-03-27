import React, { useEffect, useState, useContext } from 'react';
import { SocketContext } from '../App';
import { RaceSessionContext } from "../contexts/RaceSessionContext";

const RaceControl = () => {
    const socket = useContext(SocketContext);
    const [raceMode, setRaceMode] = useState('Danger');
    const [countdown, setCountdown] = useState(0);
    const [currentSession, setCurrentSession] = useState('');
    const [isRaceActive, setIsRaceActive] = useState(false);
    const [isRaceFinished, setIsRaceFinished] = useState(false);
    const { raceSessions } = useContext(RaceSessionContext);

    useEffect(() => {
        if (raceSessions.length > 0 && !currentSession) {
            const firstAvailableSession = raceSessions.find(
                session => session.status === 'upcoming' || session.status === 'confirmed');
            
            if (firstAvailableSession) {
                setCurrentSession(firstAvailableSession)
                socket.emit('select-session', firstAvailableSession.id);
            }
        }
    }, [raceSessions, currentSession, socket]);

    useEffect(() => {
        if (!socket) return;

        const handleSessionsUpdate = (sessions) => {
            // Find current or next available session
            const currentOrNextSession = sessions.find(
                session => session.id === currentSession?.id || 
                          session.status === 'upcoming' || 
                          session.status === 'confirmed'
            );
            
            if (currentOrNextSession) {
                setCurrentSession(currentOrNextSession);
                if (!currentSession || currentOrNextSession.id !== currentSession.id) {
                    socket.emit('change-mode', { mode: 'Danger'});
                }
            } else {
                setCurrentSession(null);
                setIsRaceActive(false);
                setIsRaceFinished(false);
            }
        };
    
        const handleRaceModeChange = (mode) => {
            setRaceMode(mode);      
        };

        const handleCountdownUpdate = (timeInMs) => setCountdown(timeInMs);

        socket.on('fetch-sessions-response', handleSessionsUpdate);
        socket.on('race-mode-changed', handleRaceModeChange);
        socket.on('countdown-update', handleCountdownUpdate);

        socket.emit('fetch-sessions');

        return () => {
            socket.off('fetch-sessions-response', handleSessionsUpdate);
            socket.off('race-mode-changed', handleRaceModeChange);
            socket.off('countdown-update', handleCountdownUpdate);
        };
    }, [socket, currentSession]);

    useEffect(() => {
        document.title = "Race Control";
    }, []);

    const formatTime = (milliseconds) => {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        const ms = Math.floor((milliseconds % 1000) / 10); // Show only 2 digits for milliseconds
    
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    };
    
    // Changing the race modes
    const changeMode = (mode) => {
        socket.emit('change-mode', {mode});
    };

    // Function to start the race
    const startRace = () => {
        if (!currentSession) {
            alert('No race available');
            return;
        }

        socket.emit(
            'start-race',
            { sessionId: currentSession.id },
            (response) => {
                if (response.success) {
                    setCountdown(response.duration);
                    setIsRaceActive(true);
                    setIsRaceFinished(false);
                } else {
                    alert(response.error || 'Failed to start race.');
                }
            }
        );
    };

    // Function to finish the race
    const finishRace = () => {
        if (!currentSession) {
            alert('No race availalbve');
            return;
        }

        socket.emit('finish-race', { sessionId: currentSession.id }, (response) => {
            if (response.success) {
                setIsRaceActive(false);
                setIsRaceFinished(true);
            } else {
                alert(response.error || 'Failed to finish race.');
            }
        });
    };
    
    // Function to end the race session
    const endRaceSession = () => {
        if (!currentSession || !isRaceFinished) {
            alert('Cannot end session. Either no session is selected or the race hasn\'t been finished.');
            return;
        };

        socket.emit('end-race-session', { sessionId: currentSession.id });   
        setIsRaceFinished(false);
        setIsRaceActive(false);
        setCountdown(0);
    };
    const styles = {
        container: {
            textAlign: 'center',
            fontFamily: 'Arial, sans-serif',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px', 
        },
        timer: {
            fontSize: '40px',
            fontWeight: 'bold',
            border: '2px solid black',
            borderRadius: '15px',
            padding: '5px',
            width: '250px',
            backgroundColor: '#f7f7f7',
        },
        section: {
            border: '2px solid black',
            borderRadius: '15px',
            padding: '10px 15px',
            width: '80%', 
            maxWidth: '400px', 
            textAlign: 'center',
            backgroundColor: '#f9f9f9',
        },
        buttonGroup: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '15px',
        },
        rowGroup: {
            display: 'flex',
            justifyContent: 'space-evenly',
            gap: '10px',
            width: '100%',
        },
        flagButton: (backgroundColor, isCheckered) => ({
            position: 'relative',
            padding: '0',
            fontSize: '16px',
            fontWeight: 'bold',
            border: '2px solid black',
            borderRadius: '50%',
            width: '80px',
            height: '80px',
            backgroundColor: isCheckered ? 'white' : backgroundColor,
            backgroundImage: isCheckered
                ? `linear-gradient(45deg, #000 25%, transparent 25%),
                   linear-gradient(-45deg, #000 25%, transparent 25%),
                   linear-gradient(45deg, transparent 75%, #000 75%),
                   linear-gradient(-45deg, transparent 75%, #000 75%)`
                : 'none',
            backgroundSize: isCheckered ? '20px 20px' : 'none',
            backgroundPosition: isCheckered ? '0 0, 0 10px, 10px -10px, -10px 0px' : 'none',
            color: isCheckered ? 'black' : '#ffffff',
            cursor: 'pointer',
            overflow: 'hidden',
        }),
        finishButtonText: {
            position: 'absolute',
            top: '33%',
            left: '0',
            right: '0',
            height: '33%',
            backgroundColor: 'black',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
        },
        button: {
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 'bold',
            border: '2px solid black',
            borderRadius: '15px',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
        },
    };

    return (
        <div style={styles.container}>
            <h1 style={{ fontSize: '20px' }}>RACE CONTROL INTERFACE</h1>
            <div style={styles.timer}>{formatTime(countdown)}</div>
    
            {currentSession ? (
                <div style={styles.section}>
                    <h3>RACE INFO</h3>
                    <p>Current Race Mode: {raceMode}</p>
                    <p>Current Session: {currentSession.sessionName}</p>
                    <p>Status: {isRaceActive ? 'In Progress' : isRaceFinished ? 'Finished' : 'Not Started'}</p>
                </div>
            ) : (
                <div style={{
                    ...styles.section,
                    backgroundColor: '#fff3cd',
                    border: '2px solid #ffeeba',
                    color: '#856404'
                }}>
                    <p style={{ margin: '10px 0' }}>No upcoming races</p>
                </div>
            )}
    
            <div style={styles.section}>
                <h3>RACE CONTROLS</h3>
                <div style={styles.buttonGroup}>
                    <div style={styles.rowGroup}>
                        {!isRaceActive && !isRaceFinished && (
                            <button
                                onClick={startRace}
                                style={styles.button}
                            >
                                Start Race
                            </button>
                        )}
                        {isRaceFinished && (
                            <button
                                onClick={endRaceSession}
                                style={styles.button}
                            >
                                End Race
                            </button>
                        )}
                    </div>
                    <div style={styles.rowGroup}>
                        {isRaceActive && (
                            <>
                                <button
                                    onClick={() => changeMode('Safe')}
                                    style={styles.flagButton('green', false)}
                                >
                                    Safe
                                </button>
                                <button
                                    onClick={() => changeMode('Danger')}
                                    style={styles.flagButton('red', false)}
                                >
                                    Danger
                                </button>
                            </>
                        )}
                    </div>
                    <div style={styles.rowGroup}>
                        {isRaceActive && (
                            <>
                                <button
                                    onClick={() => changeMode('Hazard')}
                                    style={styles.flagButton('#ffbf00', false)}
                                >
                                    Hazard
                                </button>
                                {!isRaceFinished && (
                                    <button
                                        onClick={finishRace}
                                        style={styles.flagButton('white', true)}
                                    >
                                        <div style={styles.finishButtonText}>Finish</div>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RaceControl;