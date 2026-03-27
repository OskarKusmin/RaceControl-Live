import React, { useState, useEffect, useContext } from 'react';
import { SocketContext } from '../App';

const flagStyles = {
    Safe: { backgroundColor: 'green', color: 'white' },
    Hazard: { backgroundColor: 'yellow', color: 'black' },
    Danger: { backgroundColor: 'red', color: 'white' },
    Finish: { 
        backgroundImage: `
          linear-gradient(45deg, black 25%, transparent 25%, transparent 75%, black 75%, black),
          linear-gradient(45deg, black 25%, transparent 25%, transparent 75%, black 75%, black)
        `,
        backgroundSize: '60px 60px', // Adjust the size of the squares
        backgroundPosition: '0 0, 30px 30px', // Create the checkered effect
        color: 'black'
      },
    default: { backgroundColor: 'grey', color: 'white' },
};

const RaceFlags = () => {
    const socket = useContext(SocketContext);
    const [raceMode, setRaceMode] = useState('Danger');

    useEffect(() => {
        if (!socket) return;

        const handleRaceModeChange = (mode) => {
            console.log(`Race mode updated to: ${mode}`);
            setRaceMode(mode);
        };

        // Listen for 'race-mode-changed' events
        socket.on('race-mode-changed', handleRaceModeChange);

        // Cleanup event listener
        return () => {
            socket.off('race-mode-changed', handleRaceModeChange);
        };
    }, [socket]);

    useEffect(() => {
        document.title = "Flags";
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
        
        <div
            style={{
                ...flagStyles[raceMode] || flagStyles.default,
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '4rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
            }}
        >
        <button
            onClick={toggleFullScreen}
            style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: '#000',
                color: '#fff',
                border: 'none',
                padding: '10px 15px',
                fontSize: '1rem',
                cursor: 'pointer',
                borderRadius: '5px',
        }}
    >
        Full Screen
    </button>
        </div>
    );
};

export default RaceFlags;