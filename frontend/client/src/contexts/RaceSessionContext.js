import React from 'react';

export const RaceSessionContext = React.createContext({
    raceSessions: [],
    setRaceSessions: () => {},
    currentSession: null,
    setCurrentSession: () => {}
}); 