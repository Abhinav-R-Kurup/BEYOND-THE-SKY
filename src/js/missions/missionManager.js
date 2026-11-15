// ==========================================
// Mission Manager
// ==========================================

class MissionManager {
    constructor() {
        this.currentMission = null;
        this.difficulty = 'beginner'; // beginner, intermediate, advanced
        this.objectivesStatus = {};
        this.missionHistory = Utils.loadData('mission_history') || [];
        this.activeReport = null;
        this.events = [];
    }

    setDifficulty(diff) {
        this.difficulty = diff;
    }

    startMission(missionId, difficulty = this.difficulty) {
        const template = MISSION_DATA[missionId] || MISSION_DATA['earth-obs'];
        this.difficulty = difficulty;
        this.currentMission = Utils.deepClone(template);

        // Budget based on difficulty
        const budgetConfig = this.currentMission.budget;
        if (typeof budgetConfig === 'object') {
            this.currentMission.budgetAmount = budgetConfig[this.difficulty] || budgetConfig['beginner'] || 300000000;
        } else {
            this.currentMission.budgetAmount = budgetConfig || 300000000;
        }

        // Initialize objective statuses
        this.objectivesStatus = {};
        if (this.currentMission.objectives) {
            this.currentMission.objectives.forEach(obj => {
                this.objectivesStatus[obj.id] = {
                    completed: false,
                    text: obj.text,
                    type: obj.type
                };
            });
        }

        this.events = [];
        this.activeReport = null;
        return this.currentMission;
    }

    getBudget() {
        return this.currentMission ? (this.currentMission.budgetAmount || 500000000) : 500000000;
    }

    updateObjectives(spacecraft, physicsEngine) {
        if (!this.currentMission || !spacecraft) return;

        const objs = this.currentMission.objectives || [];
        const alt = spacecraft.altitude || 0;
        const vel = spacecraft.speed || 0;
        const inOrbit = spacecraft.inOrbit || false;
        const ap = spacecraft.orbitApoapsis || 0;
        const pe = spacecraft.orbitPeriapsis || 0;
        const landed = spacecraft.landed || false;
        const landedOn = spacecraft.landedOn ? spacecraft.landedOn.name : null;

        objs.forEach(obj => {
            const status = this.objectivesStatus[obj.id];
            if (!status || status.completed) return;

            let accomplished = false;

            switch (obj.type) {
                case 'launch':
                    if (alt > 30 && vel > 10) accomplished = true;
                    break;

                case 'altitude':
                    if (alt >= obj.value) accomplished = true;
                    break;

                case 'orbit':
                    if (inOrbit && pe >= (obj.minAlt || 140000) && ap <= (obj.maxAlt || 800000)) {
                        accomplished = true;
                    }
                    break;

                case 'escape':
                    if (spacecraft.speed > 11100 && alt > 1000000) {
                        accomplished = true;
                    }
                    break;

                case 'payload':
                    if (inOrbit && spacecraft.payloadDeployed) {
                        accomplished = true;
                    }
                    break;

                case 'landing':
                    if (landed && (!obj.body || landedOn === obj.body)) {
                        accomplished = true;
                    }
                    break;

                case 'lunar_orbit':
                    if (inOrbit && spacecraft.nearestBody && spacecraft.nearestBody.name === 'Moon') {
                        accomplished = true;
                    }
                    break;

                case 'approach':
                    if (spacecraft.nearestBody && spacecraft.nearestBody.name === obj.body && alt < 50000000) {
                        accomplished = true;
                    }
                    break;

                case 'rover_deploy':
                    if (landed && spacecraft.roverDeployed) {
                        accomplished = true;
                    }
                    break;

                case 'comm':
                    if (spacecraft.commRange >= alt) {
                        accomplished = true;
                    }
                    break;

                case 'science':
                    if (spacecraft.scienceCollected >= (obj.value || 50)) {
                        accomplished = true;
                    }
                    break;

                case 'sandbox':
                    if (alt > 1000) accomplished = true;
                    break;
            }

            if (accomplished) {
                status.completed = true;
                if (typeof Toast !== 'undefined') {
                    Toast.show(`Objective Complete: ${obj.text}`, 'success');
                }
                if (typeof Audio !== 'undefined') {
                    Audio.play('success');
                }
            }
        });
    }

    isComplete() {
        if (!this.currentMission) return false;
        const total = Object.keys(this.objectivesStatus).length;
        if (total === 0) return false;
        const completed = Object.values(this.objectivesStatus).filter(s => s.completed).length;
        return completed === total;
    }

    generateReport(spacecraft, status = 'SUCCESS', failureReason = '') {
        const totalObjs = Object.keys(this.objectivesStatus).length;
        const completedObjs = Object.values(this.objectivesStatus).filter(s => s.completed).length;

        let missionStatus = status;
        if (missionStatus !== 'FAILED') {
            if (completedObjs === totalObjs) missionStatus = 'SUCCESS';
            else if (completedObjs > 0) missionStatus = 'PARTIAL';
            else missionStatus = 'FAILED';
        }

        const cost = spacecraft ? spacecraft.totalCost : 0;
        const budget = this.getBudget();
        const budgetEfficiency = Math.max(0, 1 - (cost / budget));

        // Score formula
        let score = (completedObjs / Math.max(1, totalObjs)) * 7000;
        if (missionStatus === 'SUCCESS') score += 2000;
        score += Math.round(budgetEfficiency * 1000);
        if (spacecraft) {
            score += Math.round((spacecraft.scienceValue || 0) * 10);
            score += Math.min(500, Math.round(spacecraft.getFuelPercent() * 5));
        }

        const report = {
            id: Utils.uid(),
            missionId: this.currentMission ? this.currentMission.id : 'unknown',
            missionName: this.currentMission ? this.currentMission.name : 'Unknown Mission',
            status: missionStatus,
            difficulty: this.difficulty,
            score: Math.max(0, Math.round(score)),
            completedObjectives: completedObjs,
            totalObjectives: totalObjs,
            objectives: Utils.deepClone(this.objectivesStatus),
            cost: cost,
            budget: budget,
            duration: spacecraft ? Math.round(spacecraft.flightTime || 0) : 0,
            maxAltitude: spacecraft ? Math.round(spacecraft.maxAltitude || spacecraft.altitude || 0) : 0,
            maxVelocity: spacecraft ? Math.round(spacecraft.maxVelocity || spacecraft.speed || 0) : 0,
            scienceValue: spacecraft ? (spacecraft.scienceValue || 0) : 0,
            failureReason: failureReason || (spacecraft ? spacecraft.destroyReason : ''),
            timestamp: new Date().toISOString(),
            nasaRef: this.currentMission ? this.currentMission.nasaRef : ''
        };

        this.activeReport = report;
        this.saveReport(report);
        return report;
    }

    saveReport(report) {
        this.missionHistory.unshift(report);
        if (this.missionHistory.length > 50) this.missionHistory.pop();
        Utils.saveData('mission_history', this.missionHistory);

        // Update leaderboard
        if (typeof Leaderboard !== 'undefined' && Leaderboard.addEntry) {
            Leaderboard.addEntry({
                mission: report.missionName,
                difficulty: report.difficulty,
                score: report.score,
                status: report.status,
                date: new Date().toLocaleDateString()
            });
        }
    }
}

const MissionMgr = new MissionManager();

