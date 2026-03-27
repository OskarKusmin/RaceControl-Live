import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
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
        // Replace localhost url with ngrok free url when using ngrok
        const newSocket = io("http://localhost:5001", { transports: ["polling", "websocket"] });

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

        newSocket.on('session-added', (newSession) => {
            setRaceSessions(prev => [...prev, newSession]);
        })

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
            newSocket.off('session-added');
            newSocket.off('session-deleted');
        }
    }, []);

    const handleAccessGranted = (userRole, accessKey) => {
        setAccessGranted(true);
        setRole(userRole);

        if (socket) {
            socket.emit('join-role', { role: userRole, accessKey });
        }
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
                                    onAccessGranted={(key) => handleAccessGranted('receptionist', key)}
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
                                    onAccessGranted={(key) => handleAccessGranted('safety', key)}
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
                                onAccessGranted={(key) => handleAccessGranted('observer', key)}
                                role='observer'
                            />
                        )
                        } 
                    />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/race-flags" element={<RaceFlags />} />
                    <Route path="/" element={<Navigate to="/front-desk" replace />} />
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