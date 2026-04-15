const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'races.json'); //creating a path to races.json which is where race session data is persisted

const RaceData = {
    async load() {
        try {
            const data = await fs.readFile(DATA_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return {
                    raceSessions: [],
                    currentSelectSession: null,
                    raceTimers: {},
                    currentRaceMode: 'Danger'
                };
            }
            throw error;
        }
    },

    async save(data) {
        await fs.writeFile(DATA_FILE, JSON.stringify(data));
    }
};

module.exports = RaceData; 