const fs = require('fs').promises; //file import with promises support
const path = require('path'); //importing module for path management

const DATA_FILE = path.join(__dirname, 'races.json'); //creating a path to race.json which is where race session data is persisted

const RaceData = {
    // Load method attempts to read from races.json and parse it's content
    async load() {
        try {
            const data = await fs.readFile(DATA_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') { //if file does not exist, returns empty raceSessions, selection and timer as is default
                return {
                    raceSessions: [],
                    currentSelectSession: null,
                    raceTimers: {}
                };
            }
            throw error;
        }
    },

    //method that writes provided data to races.json
    async save(data) {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    }
};

module.exports = RaceData; 