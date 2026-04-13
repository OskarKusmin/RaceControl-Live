import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import io from 'socket.io-client';
import FrontDesk from './components/FrontDesk';
import RaceControl from './components/RaceControl';
import Leaderboard from './components/Leaderboard';
import RaceFlags from './components/RaceFlags';
import AccessKeyPrompt from './components/AccessKeyPrompt';
import NextRace from './components/NextRace';
import LapLineTracker from './components/LapLineTracker';
import RaceCountdown from './components/RaceCountdown';
import LandingPage from './components/LandingPage';
import { RaceSessionContext } from './contexts/RaceSessionContext';

export const SocketContext = React.createContext();

const App = () => {
    const [socket, setSocket] = useState(null);
    const [accessGranted, setAccessGranted] = useState(false);
    const [role, setRole] = useState('');
    const [currentSession, setCurrentSession] = useState(null);
    const [raceSessions, setRaceSessions] = useState([]);

    useEffect(() => {
        const serverUrl = `${window.location.protocol}//${window.location.hostname}:5001`
        const newSocket = io(serverUrl, { transports: ["polling", "websocket"] });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to server');
            // Request current state
            newSocket.emit('fetch-sessions');
        });

        newSocket.on('reconnect', () => {
            console.log('Reconnected to server');
            // Re-fetch all necessary data
            newSocket.emit('fetch-sessions');
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket connection failed:', err);
        });

        newSocket.on('fetch-sessions-response', (sessions) => {
            setRaceSessions(sessions);
        });

        newSocket.on('session-deleted', (deletedSession) => {
            if (deletedSession && deletedSession.id) {
                setRaceSessions(prev =>
                    prev.filter(session => session.id !== deletedSession.id)
                );
            }
        });

        // Clean up the socket connection on unmount
        return () => {
            newSocket.disconnect();
            newSocket.off('connect');
            newSocket.off('fetch-sessions-response');
            newSocket.off('session-deleted');
        }
    }, []);

    const handleAccessGranted = (userRole) => {
        setAccessGranted(true);
        setRole(userRole);
    };

    return (
        <SocketContext.Provider value={socket}>
            <RaceSessionContext.Provider value={{
                raceSessions,
                setRaceSessions,
                currentSession,
                setCurrentSession
            }}>
            <Router>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route
                        path="/front-desk"
                        element={
                            accessGranted && role === 'receptionist' ? (
                                <FrontDesk />
                            ) : (
                                <AccessKeyPrompt
                                    onAccessGranted={() => handleAccessGranted('receptionist')}
                                    role="receptionist"
                                />
                            )
                        }
                    />
                    <Route
                        path="/race-control"
                        element={
                            accessGranted && role === 'safety' ? (
                                <RaceControl />
                            ) : (
                                <AccessKeyPrompt
                                    onAccessGranted={() => handleAccessGranted('safety')}
                                    role="safety"
                                />
                            )
                        }
                    />
                    <Route 
                        path="/lap-line-tracker" 
                        element={
                        accessGranted && role === 'observer' ? (
                            <LapLineTracker />
                        ) : (
                            <AccessKeyPrompt
                                onAccessGranted={() => handleAccessGranted('observer')}
                                role='observer'
                            />
                        )
                        } 
                    />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/race-flags" element={<RaceFlags />} />
                    <Route path="/next-race" element={<NextRace />} />
                    <Route path="/race-countdown" element={<RaceCountdown />} />
                    <Route path="*" element={<p>404: Page Not Found</p>} />
                </Routes>
            </Router>
            </RaceSessionContext.Provider>
        </SocketContext.Provider>
    );
};

export default App;