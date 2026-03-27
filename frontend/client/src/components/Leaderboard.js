import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../App';

const LeaderBoard = () => {
    const socket = useContext(SocketContext);
    const [cars, setCars] = useState([]); // Array of cars with their lap times
    const [raceInfo, setRaceInfo] = useState({mode: 'Danger', sessionName: 'No Session Selected'});
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (!socket) return;
        socket.emit('leaderboard-opened');
        setCars([]);

        const handleSessionSelected = (sessionId) => {
            setCars([]);
            socket.emit('request-session-data', sessionId);
        };
            
        const handleSessionData = (data) => {
            if (data && data.session) {
                setRaceInfo(prev => ({
                    ...prev,
                    sessionName: data.session.sessionName
                }));
                setCars(data.initialCars.map(car => ({
                    ...car,
                    currentTime: 0,
                    lapTimes: [],
                    fastestLap: null
                })));
            }
        };

        const handleCurrentLapTimes = (incoming) => {
            if (!Array.isArray(incoming)) return;
            
            setCars(prevCars => prevCars.map(car => {
                // Convert car.id to string for comparison
                const updatedCar = incoming.find(c => c.id === String(car.id));
                if (updatedCar) {
                    return {
                        ...car,
                        currentTime: updatedCar.currentTime || 0,
                        startTime: updatedCar.startTime,
                        lapTimes: updatedCar.lapTimes || [],
                        fastestLap: updatedCar.lapTimes && updatedCar.lapTimes.length > 0
                            ? Math.min(...updatedCar.lapTimes)
                            : null
                    };
                }
                return car;
            }));
        };

        const handleRaceModeChange = (mode) => {
            setRaceInfo(prev => ({ ...prev, mode }));
        };

        const handleCountdownUpdate = (timeInMs) => setCountdown(timeInMs);

        socket.on('session-data', handleSessionData);
        socket.on('countdown-update', handleCountdownUpdate);
        socket.on('select-session', handleSessionSelected);
        socket.on('current-lap-times', handleCurrentLapTimes);
        socket.on('race-mode-changed', handleRaceModeChange);
        socket.on('session-deleted', () => {
            setCars([]);
            setCountdown(0);
            setRaceInfo(prev => ({
                ...prev,
                sessionName: 'No Session Selected'
            }));
        });
        
        return () => {
            socket.off('select-session', handleSessionSelected);
            socket.off('session-data', handleSessionData);
            socket.off('current-lap-times', handleCurrentLapTimes);
            socket.off('countdown-update', handleCountdownUpdate);
            socket.off('race-mode-changed', handleRaceModeChange);
            socket.off('session-deleted');
        };
    }, [socket]);

    useEffect(() => {
        if (!socket) return;

        const handleRaceStart = () => {
            setCars(prevCars => prevCars.map(car => ({
                ...car,
                currentTime: 0,
                startTime: Date.now(),
                lapTimes: []
            })));
        };

        socket.on('race-started', handleRaceStart);

        return () => {
            socket.off('race-started', handleRaceStart);
        };
    }, [socket]);

    useEffect(() => {
        document.title = "Leaderboard";
      }, []);

    const formatTime = (milliseconds) => {
        if (!milliseconds) return '-';
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        const ms = Math.floor((milliseconds % 1000) / 10);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    };

    const handleRaceModeDisplay = (mode) => {
        switch (mode) {
            case 'Safe':
                return (
                    <div style={styles.modeIndicator}>
                        <div style={styles.safeMode}>
                            <h2 style={styles.modeText}>SAFE</h2>
                        </div>
                    </div>
                );
            case 'Hazard':
                return (
                    <div style={styles.modeIndicator}>
                        <div style={styles.hazardMode}>
                            <h2 style={styles.modeText}>HAZARD</h2>
                        </div>
                    </div>
                );
            case 'Danger':
                return (
                    <div style={styles.modeIndicator}>
                        <div style={styles.dangerMode}>
                            <h2 style={styles.modeText}>DANGER</h2>
                        </div>
                    </div>
                );
            case 'Finish':
                return (
                    <div style={styles.modeIndicator}>
                        <div style={styles.finishMode}>
                            <h2 style={styles.modeText}>FINISH</h2>
                        </div>
                    </div>
                );
            default:
                return (
                    <div>
                        <p>Error displaying race mode</p>
                    </div>
                );
        }
    };
    // ** Full-Screen Toggle Function **
    const toggleFullScreen = () => {
        const element = document.documentElement;
        if (!document.fullscreenElement) {
            element.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>Race Leaderboard</h1>
                <button style={styles.fullScreenButton} onClick={toggleFullScreen}>
                Toggle Fullscreen
            </button>
                <h2 style={styles.sessionName}>{raceInfo.sessionName}</h2>
                <div style={styles.raceTimer}>
                    <div style={styles.infoItem}>
                        <span style={styles.infoLabel}>Time Remaining:</span>
                        <span style={styles.infoValue}>{formatTime(countdown)}</span>
                    </div>
                </div>
            </div>

            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.tableHeader}>Position</th>
                            <th style={styles.tableHeader}>Car #</th>
                            <th style={styles.tableHeader}>Driver</th>
                            <th style={styles.tableHeader}>Current Lap</th>
                            <th style={styles.tableHeader}>Fastest Lap</th>
                            <th style={styles.tableHeader}>Total Laps</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cars
                            .sort((a, b) => {
                                if (!a.fastestLap && !b.fastestLap) return 0;
                                if (!a.fastestLap) return 1;
                                if (!b.fastestLap) return -1;
                                return a.fastestLap - b.fastestLap;
                            })
                            .map((car, index) => (
                                <tr 
                                    key={car.id} 
                                    style={index === 0 ? styles.leaderRow : null}
                                >
                                    <td style={{...styles.tableCell, ...styles.position}}>{index + 1}</td>
                                    <td style={{...styles.tableCell, ...styles.carNumber}}>{car.carNumber}</td>
                                    <td style={{...styles.tableCell, ...styles.driverName}}>{car.name}</td>
                                    <td style={{...styles.tableCell, ...styles.lapTime}}>
                                        {car.currentTime ? formatTime(car.currentTime) : '00:00.00'}
                                    </td>
                                    <td style={{...styles.tableCell, ...styles.fastestLap}}>
                                        {car.fastestLap ? formatTime(car.fastestLap) : '--:--:--'}
                                    </td>
                                    <td style={{...styles.tableCell, ...styles.totalLaps}}>{car.lapTimes?.length || 0}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        
            <div style={styles.modeDisplay}>
                <div style={styles.modeContainer}>
                    <span style={styles.modeTitleLabel}>Race Mode</span>
                    <div style={styles.modeStatusContainer}> 
                        {handleRaceModeDisplay(raceInfo.mode)}
                    </div>
                </div>
            </div>
            
        </div>
    );
};

const styles = {
    container: {
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        padding: '2rem',
        minHeight: '100vh',
    },
    fullScreenButton: {
        position: "absolute", top: "10px", right: "10px", padding: "10px",
        fontSize: "16px", cursor: "pointer", background: "#007BFF",
        color: "#fff", border: "none", borderRadius: "5px"
    },
    header: {
        marginBottom: '2rem'
    },
    title: {
        color: '#00ff00',
        fontSize: '2.5rem',
        marginBottom: '1rem',
        letterSpacing: '2px'
    },
    sessionName: {
        color: '#00ff00',
        fontSize: '1.8rem',
        marginBottom: '1rem',
        textAlign: 'center'
    },
    raceTimer: {
        display: 'flex',
        gap: '2rem',
        backgroundColor: '#2a2a2a',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '2rem',
        justifyContent: 'center'
    },
    infoItem: {
        display: 'flex',
        gap: '0.5rem'
    },
    infoLabel: {
        color: '#888',
        fontWeight: 'bold'
    },
    infoValue: {
        color: '#00ff00'
    },
    tableContainer: {
        overflowX: 'auto',
        marginBottom: '30px'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px'
    },
    tableHeader: {
        backgroundColor: '#333',
        padding: '1rem',
        textAlign: 'left',
        fontWeight: 'bold',
        letterSpacing: '1px'
    },
    tableCell: {
        padding: '1rem',
        borderBottom: '1px solid #444'
    },
    leaderRow: {
        backgroundColor: 'rgba(0, 255, 0, 0.1)'
    },
    position: {
        fontWeight: 'bold',
        color: '#00ff00'
    },
    carNumber: {
        fontWeight: 'bold',
        color: '#fff'
    },
    driverName: {
        color: '#fff'
    },
    lapTime: {
        color: '#00ff00'
    },
    fastestLap: {
        color: '#ff9900',
        fontWeight: 'bold'
    },
    modeDisplay: {
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        margin: '1rem 0',
        minHeight: '120px'
    },
    modeContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        width: '100%'
    },
    modeTitleLabel: {
        color: '#888',
        fontWeight: 'bold',
        fontSize: '1.2rem'
    },
    modeStatusContainer: {
        width: '100%',
        display: 'flex',
        justifyContent: 'center'
    },
    modeIndicator: {
        minWidth: '400px',
        width: '60%',
        display: 'flex',
        justifyContent: 'center'
    },
    modeText: {
        margin: 0,
        fontSize: '1.4rem',
        fontWeight: 'bold',
        letterSpacing: '1px'
    },
    safeMode: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'green',
        color: 'white',
        padding: '1.2rem 2rem',
        minHeight: '60px',
        borderRadius: '6px',
        width: '100%'
    },
    hazardMode: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f57f17',
        color: '#000000',
        padding: '1.2rem 2rem',
        minHeight: '60px',
        borderRadius: '6px',
        width: '100%'
    },
    dangerMode: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#c62828',
        color: '#ffffff',
        padding: '1.2rem 2rem',
        minHeight: '60px',
        borderRadius: '6px',
        width: '100%'
    },
    finishMode: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2f4f4f',
        color: '#ffffff',
        padding: '1.2rem 2rem',
        minHeight: '60px',
        borderRadius: '6px',
        width: '100%'
    },
};

export default LeaderBoard;