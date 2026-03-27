import React, { useState, useEffect, useContext, useCallback } from "react";
import { SocketContext } from "../App";
import { RaceSessionContext } from "../contexts/RaceSessionContext";

const NextRace = () => {
    const socket = useContext(SocketContext);
    const { raceSessions } = useContext(RaceSessionContext);
    const [nextRace, setNextRace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    const fetchNextRace = useCallback(() => {

        const nextAvailableRace = raceSessions.find(session => 
            (session.status === 'upcoming' || session.status === 'confirmed') &&
            session.status !== 'in-progress'
        );

        setLoading(false);

        if (nextAvailableRace) {
            setNextRace({
                sessionName: nextAvailableRace.sessionName,
                drivers: nextAvailableRace.drivers.map((driver, index) => ({
                    ...driver,
                    car: `Car ${index + 1}`
                }))
            });
        } else {
            setNextRace(null);
            setMessage("No upcoming race available");
        }
    }, [raceSessions]);

    useEffect(() => {
        if (!socket) return;

        socket.on('select-session', () => {
            fetchNextRace();
        });

        socket.on('race-started', () => {
            setMessage("");
            fetchNextRace();
        });

        socket.on('race-mode-changed', (mode) => {
            fetchNextRace();
        });

        socket.on('end-race-session', () => {
            setMessage("Please proceed to paddock");
            fetchNextRace();
        });

        fetchNextRace();

        return () => {
            socket.off('select-session');
            socket.off('race-started');
            socket.off('race-mode-changed');
            socket.off('end-race-session');
        };
    }, [socket, fetchNextRace]);

    useEffect(() => {
        document.title = "Next Race";
    }, []);

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
            <h1 style={styles.title}>Next Race</h1>
            <button style={styles.fullScreenButton} onClick={toggleFullScreen}>
                Toggle Fullscreen
            </button>
            {loading ? (
                <p style={styles.loading}>Loading...</p>
            ) : nextRace ? (
                <div style={styles.card}>
                    <p style={styles.sessionName}>{nextRace.sessionName}</p>
                    <div style={styles.driversContainer}>
                        <h3 style={styles.driversTitle}>DRIVERS</h3>
                        <ul style={styles.driversList}>
                            {nextRace.drivers.map((driver) => (
                                <li key={driver.id} style={styles.driverItem}>
                                    <span style={styles.driverName}>
                                        {driver.name}
                                    </span>
                                    <span style={styles.carNumber}>
                                        {driver.car}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {message && <p style={styles.message}>{message}</p>}
                </div>
            ) : (
                <p style={styles.message}>{message}</p>
            )}
        </div>
    );
};

const styles = {
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        padding: "20px",
        fontFamily: "'Arial', sans-serif",
    },
    fullScreenButton: {
        position: "absolute", top: "10px", right: "10px", padding: "10px",
        fontSize: "16px", cursor: "pointer", background: "#007BFF",
        color: "#fff", border: "none", borderRadius: "5px"
    },
    title: {
        fontSize: "32px",
        fontWeight: "bold",
        marginBottom: "20px",
        textAlign: "center",
    },
    card: {
        backgroundColor: "white",
        padding: "20px",
        borderRadius: "10px",
        boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
        textAlign: "center",
        maxWidth: "400px",
        width: "100%",
    },
    subTitle: {
        fontSize: "24px",
        fontWeight: "bold",
        marginBottom: "10px",
    },
    sessionName: {
        fontSize: "18px",
        marginBottom: "20px",
    },
    driversContainer: {
        textAlign: "center",
    },
    driversTitle: {
        fontSize: "20px",
        fontWeight: "bold",
        marginBottom: "10px",
    },
    driversList: {
        listStyleType: "none",
        padding: 0,
    },
    driverItem: {
        display: "flex",
        justifyContent: "space-between",
        padding: "10px",
        marginBottom: "5px",
        border: "1px solid #ddd",
        borderRadius: "5px",
    },
    driverName: {
        fontSize: "16px",
    },
    carNumber: {
        fontSize: "16px",
        fontWeight: "bold",
    },
    loading: {
        fontSize: "18px",
    },
    message: {
        fontSize: "24px",
        color: "#dc3545",
        fontWeight: "bold",
        textAlign: "center",
    }
};

export default NextRace;
