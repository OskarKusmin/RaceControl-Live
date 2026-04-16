const express = require('express'); 
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv'); 
const cors = require('cors');
const RaceData = require('./data/raceData');

dotenv.config(); //load environment variables from .env file to process.env

// access keys must be defined in .env
if (!process.env.RECEPTIONIST_KEY || !process.env.OBSERVER_KEY || !process.env.SAFETY_KEY) {
    console.error('Error: Required environment variables are not set!');
    process.exit(1);
}

const app = express(); // Initialising the express application
const server = http.createServer(app); // Creating an http server using express

// Initialising a Socke.IO server
// CORS is set to allow all origins because the application is meant to be used on local networks where client device IPs are not known in advance. This is acceptable because the server is not exposed to the public internet.
const io = new Server(server, {
    cors: {
        origin: '*',
        credentials: true,
    },
});

app.use(cors({ origin: '*' }));
app.use(express.json()); // enabling the application to parse json requests. Needed for state persistence.

let raceSessions = []; //Array of raceSession objects containing drivers, race state, etc
let currentSelectSession = null; // race session currently selected (appearing in RaceControl now)
let activeTimers = {}; // active countdown timer
let raceTimers = {}; // timers and duration of sessions needed in case of server restart
let lapData = {};
let currentRaceMode = 'Danger'
let startingCountdown = null;

//This function loads the race session data from storage if the server restarts.
async function initializeData() {
    try {
        const data = await RaceData.load();
        raceSessions = data.raceSessions;
        currentSelectSession = data.currentSelectSession;
        raceTimers = data.raceTimers || {};
        activeTimers = {}; //initialising an empty object to store the active countdown timer
        raceSessions = raceSessions.filter(session => session.status !== 'Finished'); // Filtering out finished sessions
        currentRaceMode = data.currentRaceMode;

        // Removing raceTimers of finished sessions
        const activeSessionIds = new Set(raceSessions.map(s => String(s.id)));
        for (const timerId of Object.keys(raceTimers)) {
            if (!activeSessionIds.has(timerId)) {
                delete raceTimers[timerId];
            }
        }

        const selectedExists = raceSessions.some(s => s.id === currentSelectSession);
        if (!selectedExists) {
            const nextAvailable = raceSessions.find(
                s => s.status === 'upcoming' || s.status === 'confirmed'
            );
            currentSelectSession = nextAvailable ? nextAvailable.id : null;
        }

        const hasRunningRace = raceSessions.some(s => s.status === 'in-progress');
        if (!hasRunningRace) {
            currentRaceMode = 'Danger';
        }

        //Iterating over each session to check if any were in progress when the server was last stopped
        raceSessions.forEach(session => {
            if (session.status === 'in-progress' && raceTimers[session.id]) {
                const timer = raceTimers[session.id]; //retrieving the timing information for the current session from raceTimers
                if (timer.status === 'running') { //checking if countdown timer was running
                    const elapsedTime = Date.now() - timer.startTime; //calculating the time that has elapsed since the server last stopped
                    const remainingTime = timer.duration - elapsedTime //deducting the elapsed time from countdown to make sure it resumes from the correct point upon server restart
                    
                    if (remainingTime > 0) {
                        startRaceTimer(session, remainingTime); //calling startRaceTimer to resume the session with the remaining time
                    } else { // Setting race session to finished if timer was zero
                        session.status = 'Finished';
                        timer.status = 'finished';
                        io.emit('race-mode-changed', 'Finish');
                        io.emit('countdown-update', 0);
                    }
                }
            }
        });
        saveState(); // Calling save state to persist the current state of the application.
    } catch (error) {
        console.error('Error loading race data:', error);
    }
}

// Function for saving the current state of the application to storage
let saveTimeout = null;
async function saveState() {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setInterval(async () => {
        try {
            await RaceData.save({
                raceSessions,
                currentSelectSession,
                raceTimers,
                currentRaceMode
            });
        } catch (error) {
            console.error('Error saving race data: ', error);
        }
    }, 200);
}

//simple function to clear timers
function clearRaceTimer(sessionId) {
    if (activeTimers[sessionId]) {
        clearInterval(activeTimers[sessionId]);
        activeTimers[sessionId] = null;
    }
}

function startRaceTimer(session, duration) {
    if (!session) return;
    clearRaceTimer(session.id);

    const startTime = Date.now(); //Storing the current time as the start time for a race session. This is used to count elapsed time
    raceTimers[session.id] = {
        startTime,
        duration,
        status: 'running'
    };

    const timer = setInterval(() => { //starting new interval timer. 100 milisecond increments
        const elapsedTime = Date.now() - startTime;
        const remainingTime = duration - elapsedTime;

        io.emit('countdown-update', Math.max(0, remainingTime)); //emitting the countdown update to connected clients

        if (remainingTime <= 0) {
            clearRaceTimer(session.id);
            session.status = 'Finished';
            raceTimers[session.id].status = 'finished';
            currentRaceMode = 'Finish';
            io.emit('race-mode-changed', 'Finish'); //emitting race mode change to other clients when race ends
            io.emit('fetch-sessions-response', raceSessions); //updating list of sessions for clients
            saveState();//saving the current state to json
        }    
    }, 100); 

    activeTimers[session.id] = timer;
    
    io.emit('countdown-update', duration);
    io.emit('race-started', session.id); //Informing connected clients that the race has begun
    currentRaceMode = 'Safe'
    io.emit('race-mode-changed', 'Safe'); //Race mode changes to safe upon a race being started
    io.emit('fetch-sessions-response', raceSessions);
    saveState();
}

function authorize(socket, requiredRole, callback) {
    if (socket.data.role === requiredRole) {
        return true;
    }
    if (typeof callback === 'function') {
        callback({ success: false, error: 'Not authorized' });
    }
    return false;
}

function getCurrentCountdown() {
    if (!currentSelectSession) return 0;
    const timer = raceTimers[currentSelectSession];
    if (!timer || timer.status !== 'running') return 0;
    const remaining = timer.duration - (Date.now() - timer.startTime);
    return Math.max(0, remaining);
}

function buildSessionData(session) {
    const sessionLapData = lapData[session.id] || {};
    return {
        session,
        initialCars: session.drivers.map((driver, index) => {
            const stored = sessionLapData[driver.id];
            return {
                id: driver.id,
                name: driver.name,
                carNumber: `${index + 1}`,
                lapTimes: stored?.lapTimes || [],
                currentLapStart: stored?.startTime || null,
                currentTime: stored?.currentTime || 0
            };
        })
    };
};

io.on('connection', (socket) => {
    socket.emit('full-state', {
        raceSessions,
        currentSelectSession,
        currentRaceMode,
        countdown: getCurrentCountdown(),
        startingCountdown
    });
    
    //this one is for updating the clients with the latest race sessions
    socket.on('fetch-sessions', () => { 
        socket.emit('fetch-sessions-response', raceSessions);
    });

    socket.on('request-full-state', () => {
        socket.emit('full-state', {
            raceSessions,
            currentSelectSession,
            currentRaceMode,
            countdown: getCurrentCountdown(),
            startingCountdown
        });
    });

    // change-mode is emitted by RaceControl when the official clicks the flag buttons. Then emits race-mode-change to update RaceFlags and Leaderboard
    socket.on('change-mode', ({mode}) => {
        if (!authorize(socket, 'safety', null)) return;
        currentRaceMode = mode;
        io.emit('race-mode-changed', mode);
    });

    //Handler for 'start-race' which is emitted by RaceControl when the Start Race button is clicked by the safety official
    socket.on('start-race', async ({ duration, sessionId }, callback) => {
        if (!authorize(socket, 'safety', callback)) return;
        const session = raceSessions.find((s) => s.id === Number(sessionId)); // making sure the session exists before starting it
        if (!session) {
            callback({ success: false, error: 'Session not found' });
            return;
        }

        if (startingCountdown) {
            callback({ success: false, error: 'Start countdown already in progress'});
            return;
        }
        
        //this checks which duration is provided for the timer which would depend on if the server is started in development mode or normal mode
        const initialDuration = (duration || (process.env.NODE_ENV === 'development' ? 120 : 600)) * 1000;

        let count = 3;
        startingCountdown = { sessionId: session.id};
        io.emit('race-starting', { count });

        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                io.emit('race-starting', { count });
            } else {
                clearInterval(countdownInterval);
                startingCountdown = null;
                session.status = 'in-progress';
                startRaceTimer(session, initialDuration);
            }
        }, 1000);
        
        callback({ success: true });
    });

    //Handler for 'finish-race' which is emitted by RaceControl when 'Finish' flag button is clicked
    socket.on('finish-race', ({ sessionId }, callback) => {
        if (!authorize(socket, 'safety', callback)) return;
        const session = raceSessions.find(s => s.id === Number(sessionId));
        
        if (!session) {
            callback({ success: false, error: "Session not found." });
            return;
        }

        clearRaceTimer(session.id); //clearing the timer
        session.status = 'Finished';
        currentRaceMode = 'Finish';
        io.emit('race-mode-changed', 'Finish'); //Updating connected clients on race mode update to 'Finish'
        io.emit('countdown-update', 0); //Updating clients to zero the couintdown
        io.emit('fetch-sessions-response', raceSessions); //Updating the clients on the current race sessions
        
        saveState(); //Saving data to json for data persistence
        callback({ success: true });
    });

    //Handler for 'end-race-session' which is emitted by RaceControl when 'End Race' is clicked
    socket.on('end-race-session', ({ sessionId }) => {
        if (!authorize(socket, 'safety', null)) return;
        const sessionIndex = raceSessions.findIndex((s) => s.id === Number(sessionId));

        if(sessionIndex !== -1) { 
            raceSessions.splice(sessionIndex, 1); //removing the ended race session from the raceSessions array
            currentRaceMode = 'Danger';
            saveState();
            const nextSession = raceSessions.find( //checking if there is another session to queue up
                session => session.status === 'upcoming' || session.status === 'confirmed'
            );

            io.emit('session-deleted', { id: sessionId }); //Updating clients that session has been deleted (FrontDesk, LeaderBoard and NextRace)
            io.emit('end-race-session'); //Emitting this to inform LapLineTracker that this session has ended and to update to next one

            if (nextSession) { // Setting the selected session in RaceControl and other clients if another one is found. 
                currentSelectSession = nextSession.id;
                io.emit('select-session', nextSession.id); //Emitting this to inform Leaderboard and LapLineTracker to switch their display to the new race session
            }
        }

        delete lapData[sessionId];
    });

    //Handler for 'validate-key' which is emited by AccessKeyPrompt when an access key is submitted
    socket.on('validate-key', ({ key, role }) => {
        let isValid = false; //Initialising key validity to false

        //Checking for match with provided key and key assigned to that role in environment variables
        switch (role) {
            case 'receptionist':
                isValid = key === process.env.RECEPTIONIST_KEY;
                break;
            case 'observer':
                isValid = key === process.env.OBSERVER_KEY;
                break;
            case 'safety':
                isValid = key === process.env.SAFETY_KEY;
                break;
        }

        // Storing role on the socket if key is valid
        if (isValid) {
            socket.data.role = role;
        }

         // 500ms delay for invalid keys
        const delay = isValid ? 0 : 500; // No delay for valid keys
        setTimeout(() => {
            // Emitting response to AccessKeyPrompt
            socket.emit('key-validation-response', {
                success: isValid,
                message: isValid ? 'Access granted' : 'Invalid access key'
            });
        }, delay);
    });

    //Handler for car lap timers which is emitted by LapLineTracker and then broadcased to be detected by LeaderBoard so it can display them
    socket.on('current-lap-times', (data) => {
        if (!authorize(socket, 'observer', null)) return;

        if (currentSelectSession && Array.isArray(data)) {
            if(!lapData[currentSelectSession]) {
                lapData[currentSelectSession] = {};
            }
            data.forEach(car => {
                lapData[currentSelectSession][car.id] = {
                    startTime: car.startTime,
                    currentTime: car.currentTime,
                    lapTimes: car.lapTimes
                };
            });
        }
        socket.broadcast.emit('current-lap-times', data);
    });

    // Handler for which session is selected in RaceControl
    socket.on('select-session', (sessionId, callback) => {
        if (!authorize(socket, 'safety', callback)) return;
        currentSelectSession = sessionId;
        io.emit('select-session', sessionId);

        const session = raceSessions.find(s => s.id === sessionId);
        if (session) {
            //Emitting the session data for LeaderBoard and LapLinetracker to populate their displays with drivers
            socket.emit('session-data', buildSessionData(session));
        }

        if (typeof callback === 'function')  {
            callback({ success: true});
        }
    });

    // Handler for race session data requests 
    socket.on('request-session-data', (sessionId, callback) => {
        const session = raceSessions.find(s => s.id === Number(sessionId));            
        socket.emit('session-data', session ? buildSessionData(session) : null);


        if (typeof callback === 'function') {
            callback({ success: true });
        }
    });

    //Listener for race sessions being added in FrontDesk
    socket.on('add-session', async (data, callback) => {
        if (!authorize(socket, 'receptionist', callback)) return;
        const { sessionName } = data;

        if(!sessionName) {
            callback({ success: false, error: "Session name needed"});
            return;
        }

        const newSession = {
            id: Date.now(),
            sessionName,
            drivers: [],
            status: raceSessions.length === 0 ? 'upcoming' : 'confirmed',
        };

        raceSessions.push(newSession);

        // Setting the local currentSelectSession variable if this is the first race
        if (raceSessions.length === 1) {
            currentSelectSession = newSession.id;
            io.emit('select-session', currentSelectSession);
        }

        io.emit('fetch-sessions-response', raceSessions);

        await saveState();

        callback({success: true});
    });

    // Listener for race session being deleted in FrontDesk
    socket.on('delete-session', async (data, callback) => {
        if (!authorize(socket, 'receptionist', callback)) return;
        const { sessionId } = data;
    
        const sessionIndex = raceSessions.findIndex((session) => session.id === sessionId);
    
        if (sessionIndex === -1) {
            callback({ success: false, error: 'Session not found' });
            return;
        }
    
        const deletedSession = raceSessions.splice(sessionIndex, 1)[0];
        delete lapData[sessionId];

        // Ensure deletedSession is not null before emitting
        if (deletedSession) {
            io.emit('session-deleted', deletedSession);
            io.emit('fetch-sessions-response', raceSessions);
            await saveState();
            callback({ success: true });
        } else {
            callback({ success: false, error: 'Failed to delete session' });
        }
    });
    

    // Confirming a session when receptionist is done editing ('Confirm' button in FrontDesk)
    socket.on('confirm-session', async (data, callback) => {
        if (!authorize(socket, 'receptionist', callback)) return;
        const { sessionId, drivers } = data;

        const session = raceSessions.find((s) => s.id === sessionId);
        if (!session) {
            callback({ success: false, error: 'Session not found' });
            return;
        }

        // Making sure driver names in each session are unique
        const uniqueDrivers = [...new Set(drivers.filter((name) => name.trim() !== ''))];
        if (uniqueDrivers.length !== drivers.length) {
            callback({ success: false, error: 'Driver names must be unique and non-empty' });
            return;
        }

        session.drivers = uniqueDrivers.map((name, index) => ({
            id: index + 1,
            name,
        }));
        session.status = 'confirmed';

        io.emit('fetch-sessions-response', raceSessions);
        await saveState();
        callback({ success: true });
    });
    
    socket.on('disconnect', (reason) => {
        console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
    });

});

const PORT = process.env.PORT || 5001;

initializeData().then(() => {
    server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
});