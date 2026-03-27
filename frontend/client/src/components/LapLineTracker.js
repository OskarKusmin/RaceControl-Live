import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../App';

const LapLineTracker = () => {
    const socket = useContext(SocketContext);
    const [selectedSession, setSelectedSession] = useState(null);
    const [cars, setCars] = useState([]); // Array of cars with their lap times
    const [isRaceActive, setIsRaceActive] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [lapTimers, setLapTimers] = useState({});

    useEffect(() => {
        if (!socket) return;
        socket.emit('lap-line-tracker-opened');// This event is needed so this client is updated upon opening.
        setCars([]);
        setIsRaceActive(false);
        // Changed this const a bit(jürgen)
        const handleSessionSelected = (sessionId) => {
            setSelectedSession(sessionId);
            setCars([]);
            setIsRaceActive(false);
            setLapTimers({});
            socket.emit('request-session-data', sessionId);
        };

        const handleSessionData = (data) => {
            if (data && data.session) {
                setSelectedSession(data.session);
                setCars(data.initialCars);
                const initialTimers = {};
                data.initialCars.forEach(car => {
                    initialTimers[car.id] = {
                        startTime: null,
                        currentTime: 0,
                        lapTimes: []
                    };
                });
                setLapTimers(initialTimers);
            }
        };

        const handleRaceStart = () => {
            setIsRaceActive(true);
            // initialising start times cars
            setLapTimers(prev => {
                const newTimers = { ...prev };
                Object.keys(newTimers).forEach(carId => {
                    newTimers[carId] = {
                        ...newTimers[carId],
                        startTime: Date.now(),
                        currentTime: 0
                    };
                });
                return newTimers;
            });
        };

        const handleRaceModeChange = (mode) => {
            if (mode === 'Finish') {
                setIsRaceActive(false);
                setLapTimers(prev => {
                    const newTimers = { ...prev };
                    Object.keys(newTimers).forEach(carId => {
                        newTimers[carId] = {
                            ...newTimers[carId],
                            startTime: null,
                            currentTime: 0
                        };
                    });
                    return newTimers;
                });
            }
        };

        const handleCountdownUpdate = (time) => {
            setCountdown(time);
        };
        
        socket.on('select-session', handleSessionSelected);
        socket.on('session-data', handleSessionData);
        socket.on('race-started', handleRaceStart);
        socket.on('race-mode-changed', handleRaceModeChange);
        socket.on('countdown-update', handleCountdownUpdate);
        socket.on('end-race-session', () => {
            setCars([]);
            setIsRaceActive(false);
            setLapTimers({});
            setSelectedSession(null);
            setCountdown(0);
            socket.emit('lap-line-tracker-opened');
        });
        
        return () => {
            socket.off('select-session');
            socket.off('session-data');
            socket.off('race-started');
            socket.off('race-mode-changed');
            socket.off('countdown-update');
            socket.off('end-race-session');
        };
    }, [socket]);

    useEffect(() => {
        let intervalId;
        if (isRaceActive) {
            intervalId = setInterval(() => {
                setLapTimers(prev => {
                    const newTimers = { ...prev };
                    Object.keys(newTimers).forEach(carId => {
                        if (newTimers[carId].startTime) {
                            newTimers[carId].currentTime = Date.now() - newTimers[carId].startTime;
                        }
                    });

                    const updates = Object.keys(newTimers).map(carId => ({
                        id: carId,
                        currentTime: newTimers[carId].currentTime,
                        startTime: newTimers[carId].startTime,
                        lapTimes: newTimers[carId].lapTimes
                    }));
                    socket.emit('current-lap-times', updates);

                    return newTimers;
                });
            }, 10);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isRaceActive, socket]);

    useEffect(() => {
        if (!socket) return;

        const handleLapTimesUpdate = (incoming) => {
            if (!Array.isArray(incoming)) return;

            setLapTimers(prev => {
                const newTimers = { ...prev };
                incoming.forEach(update => {
                    if (newTimers[update.id]) {
                        newTimers[update.id] = {
                            ...newTimers[update.id],
                            currentTime: update.currentTime,
                            lapTimes: update.lapTimes
                        };
                    }
                });
                return newTimers;
            });
        };

        socket.on('current-lap-times', handleLapTimesUpdate);

        return () => {
            socket.off('current-lap-times', handleLapTimesUpdate);
        }
    }, [socket]);

    useEffect(() => {
        document.title = "Lap Line Tracker";
      }, []);

    const handleLapComplete = (carId) => {
        if (!isRaceActive) return;
        const currentTime = Date.now();

        setLapTimers(prev => {
            const car = prev[carId] || { startTime: null, currentTime: 0, lapTimes: [] };
            let newLapTimes = [...(car.lapTimes || [])];
            
            if (car.startTime) {
                const lapTime = currentTime - car.startTime;
                newLapTimes.push(lapTime);
            }

            // Emitting recorded lap times to teh backend
            socket.emit('record-completed-lap', [{
                id: carId,
                currentTime: 0,
                lapTimes: newLapTimes,
                startTime: currentTime
            }]);

            return {
                ...prev,
                [carId]: {
                    startTime: currentTime,
                    currentTime: 0,
                    lapTimes: newLapTimes
                }
            };
        });
    };

    const formatTime = (milliseconds) => {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        const ms = Math.floor((milliseconds % 1000) / 10);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    };

    return (
        <div style={styles.lapLineTracker}>
            <h2>Race Session: {selectedSession?.sessionName || 'No Session Selected'}</h2>
            <h3>Race Countdown: {formatTime(countdown)}</h3>
            
            {selectedSession && cars.length === 0 && (
                <div style={{
                    padding: '20px',
                    margin: '20px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeeba',
                    borderRadius: '4px',
                    color: '#856404'
                }}>
                    <p>This race has no drivers. Refresh this interface once the receptionist has added drivers.</p>
                </div>
            )}
            
            <div style={styles.carsGrid}>
                {cars.map((car) => (
                    <div key={car.id} style={styles.carButtonContainer}>
                        <button
                            onClick={() => handleLapComplete(car.id)}
                            disabled={!isRaceActive}
                            style={{
                                ...styles.carButton,
                                ...(isRaceActive ? {} : styles.carButtonDisabled)
                            }}
                        >
                            <div style={{
                                ...styles.carButtonDiv, 
                                fontSize: '2em', 
                                fontWeight: 'bold',
                                backgroundColor: '#007bff',
                                color: 'white',
                                padding: '5px',
                                borderRadius: '4px',
                                marginBottom: '10px'
                            }}>Car #{car.carNumber}</div>
                            <div style={styles.carButtonDiv}>Driver: {car.name}</div>
                            <div style={styles.carButtonDiv}>Current Lap: {formatTime(lapTimers[car.id]?.currentTime || 0)}</div>
                            <div style={styles.carButtonDiv}>Laps: {lapTimers[car.id]?.lapTimes.length || 0}</div>
                        </button>
                    </div>
                ))}
            </div>

            <div style={styles.lapTimesSection}>
                <h3>Recorded Lap Times</h3>
                <div style={styles.lapTimesGrid}>
                    {cars.map((car) => (
                        <div key={car.id} style={styles.carLapTimes}>
                            <h4 style={styles.carLapTimesH4}>Car {car.carNumber} - {car.name}</h4>
                            <div style={styles.lapTimesList}>
                                {lapTimers[car.id]?.lapTimes.map((time, index) => (
                                    <div key={index} style={{
                                        ...styles.lapTimeEntry,
                                        ...(index % 2 === 1 ? styles.lapTimeEntryEven : {})
                                    }}>
                                        <span>Lap {index + 1}:</span>
                                        <span>{formatTime(time)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const styles = {
    lapLineTracker: {
        padding: '20px',
        textAlign: 'center'
    },
    carsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        padding: '20px'
    },
    carButtonContainer: {
        display: 'flex',
        justifyContent: 'center'
    },
    carButton: {
        width: '100%',
        padding: '20px',
        border: '2px solid #007bff',
        borderRadius: '8px',
        backgroundColor: '#99c2ff',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
    },
    carButtonDisabled: {
        opacity: 0.6,
        cursor: 'not-allowed',
        borderColor: '#6c757d'
    },
    carButtonDiv: {
        margin: '5px 0'
    },
    lapTimesSection: {
        marginTop: '40px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px'
    },
    lapTimesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        padding: '20px'
    },
    carLapTimes: {
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    carLapTimesH4: {
        margin: '0 0 10px 0',
        color: '#007bff',
        borderBottom: '2px solid #007bff',
        paddingBottom: '5px'
    },
    lapTimesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
    },
    lapTimeEntry: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '5px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px'
    },
    lapTimeEntryEven: {
        backgroundColor: '#e9ecef'
    }
};

export default LapLineTracker;