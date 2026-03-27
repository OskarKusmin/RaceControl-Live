import React, { useEffect, useState, useContext } from 'react';
import { SocketContext } from '../App';

const RaceCountdown = () => {
    const socket = useContext(SocketContext);
    const [countdown, setCountdown] = useState(0); // Time in milliseconds
    const [status, setStatus] = useState('Danger');

    useEffect(() => {
        socket.on('countdown-update', (time) => setCountdown(time));
        socket.on('race-mode-changed', (mode) => setStatus(mode));

        return () => {
            socket.off('countdown-update');
            socket.off('race-mode-changed');
        };
    }, [socket]);

    useEffect(() => {
        document.title = "Countdown";
      }, []);

    // Format the countdown into hours, minutes, and seconds
    const formatCountdown = (milliseconds) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.countdown}>Countdown: {formatCountdown(countdown)}</h1>
            <h2 style={styles.status}>Status: {status}</h2>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: 'Arial, sans-serif',
    },
    countdown: {
        fontSize: '48px',
        fontWeight: 'bold',
        color: '#333',
    },
    status: {
        fontSize: '24px',
        fontWeight: '500',
        marginTop: '20px',
        color: '#555',
    },
};

export default RaceCountdown;