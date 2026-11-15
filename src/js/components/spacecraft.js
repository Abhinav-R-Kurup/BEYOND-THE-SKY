// ==========================================
// Spacecraft Class
// Engineering model: every number below is derived from the assembled
// parts (mass, propellant, thrust, Isp). Nothing is hard-coded for display.
//
// Conventions
//   * SI units: kg, N, m, s. Propellant capacity in the catalog is treated
//     as kg (1 L ~ 1 kg for the game's generic bipropellant).
//   * Stage numbers: the stage with the LOWEST number fires first and is
//     the first one dropped. Each stage burns only the propellant stored in
//     its own tanks/boosters, so jettisoning a stage also jettisons what is
//     left in it (just like a real launcher).
// ==========================================

const G0 = 9.80665; // standard gravity, m/s^2 (for Isp -> exhaust velocity)

class Spacecraft {
    constructor(config) {
        this.name = config.name || 'Untitled Craft';
        this.assembledParts = config.parts || [];

        // Position & Motion
        this.pos = config.pos || { x: 0, y: 0 };
        this.vel = config.vel || { x: 0, y: 0 };
        this.rotation = config.rotation !== undefined ? config.rotation : 0; // 0 rad = pointing straight up
        this.angularVel = 0;
        this.rotationInput = 0;
        this.rotationSpeed = 2.0;

        // Propellant is tracked per tank (kg). Parts are never mutated.
        this._fuel = new Map();
        this.assembledParts.forEach(p => { if (p.fuelCapacity) this._fuel.set(p, p.fuelCapacity); });
        this.maxFuel = this.calculateTotalFuel();

        // Mass
        this.calculateMass();

        // Engines
        this.engines = this.assembledParts.filter(p => p.category === 'engine' || p.category === 'booster');

        // State
        this.throttle = 0;
        this.isThrusting = false;
        this.landed = false;
        this.landedOn = null;
        this.destroyed = false;
        this.destroyReason = '';
        this.damage = 0;
        this.heating = 0;
        this.inOrbit = false;

        // Orbital params
        this.altitude = 0;
        this.speed = 0;
        this.acceleration = 0;
        this.orbitApoapsis = 0;
        this.orbitPeriapsis = 0;
        this.orbitEccentricity = 0;
        this.orbitalPeriod = 0;
        this.nearestBody = null;

        // Cross section for drag
        this.crossSection = this.calculateCrossSection();

        // Properties
        this.hasLandingLegs = this.assembledParts.some(p => p.providesLanding);
        this.hasHeatShield = this.assembledParts.some(p => p.heatShield);

        // Staging
        this.stages = config.stages || this.autoStage();
        this.currentStage = 0;
        this.activeEngines = [];

        // Power
        this.powerGeneration = this.assembledParts.reduce((s, p) => s + (p.powerGen || 0), 0);
        this.powerConsumption = this.assembledParts.reduce((s, p) => s + (p.powerUse || 0), 0);

        // Science
        this.scienceValue = this.assembledParts.reduce((s, p) => s + (p.scienceValue || 0), 0);

        // Comm
        this.commRange = Math.max(...this.assembledParts.map(p => p.commRange || 0), 0);

        // Cost
        this.totalCost = this.assembledParts.reduce((s, p) => s + (p.cost || 0), 0);
    }

    // ---------- mass & propellant ----------
    /** Structural (dry) mass of everything still attached. */
    calculateMass() {
        this.dryMass = this.assembledParts.reduce((s, p) => {
            if (p.fuelCapacity) return s + (p.dryMass !== undefined ? p.dryMass : p.mass * 0.2);
            return s + p.mass;
        }, 0);
    }

    /** Total propellant still on board (all attached stages), kg. */
    get currentFuel() {
        let t = 0;
        for (const p of this.assembledParts) t += this._fuel.get(p) || 0;
        return t;
    }
    set currentFuel(v) { // compatibility: only ever allows draining
        const cur = this.currentFuel;
        if (v < cur) this.burn(cur - v, true);
    }

    /** Wet mass = structure + remaining propellant. Always consistent. */
    get totalMass() { return this.dryMass + this.currentFuel; }
    set totalMass(_v) { /* derived value; ignored */ }

    /** Number of the stage that is currently firing. */
    get activeStageNum() {
        const st = this.stages[this.currentStage];
        return st ? st.num : 0;
    }

    /** Engines that are firing now (the active stage; fall back to all). */
    getActiveEngines() {
        const n = this.activeStageNum;
        const act = this.engines.filter(e => (e.stageNum || 0) === n);
        return act.length ? act : this.engines;
    }

    /** Tanks feeding the active engines. */
    getActiveTanks() {
        const n = this.activeStageNum;
        const act = this.engines.filter(e => (e.stageNum || 0) === n);
        const all = this.assembledParts.filter(p => this._fuel.has(p));
        return act.length ? all.filter(p => (p.stageNum || 0) === n && p.category !== 'booster') : all.filter(p => p.category !== 'booster');
    }

    /** Solid boosters of the active stage that still have propellant (own, non-pooled grains). */
    getLiveBoosters() { return this.getActiveEngines().filter(e => e.category === 'booster' && (this._fuel.get(e) || 0) > 0.5); }

    /** Propellant available to the active stage, kg. */
    get stageFuel() {
        let t = 0;
        for (const p of this.getActiveTanks()) t += this._fuel.get(p) || 0;
        for (const b of this.getLiveBoosters()) t += this._fuel.get(b) || 0;
        return t;
    }

    /** Burn solid boosters (fixed rate, cannot throttle). Spent boosters are queued for jettison. */
    burnBoosters(dt) {
        for (const b of this.getLiveBoosters()) {
            const f = this._fuel.get(b) || 0, use = Math.min(f, (b.fuelRate || 0) * dt);
            this._fuel.set(b, f - use);
            if (f - use <= 0.5) { (this._spent || (this._spent = [])).push(b); }
        }
    }

    /** Detach burnt-out boosters; returns the removed parts. */
    takeSpent() {
        if (!this._spent || !this._spent.length) return [];
        const out = this._spent; this._spent = [];
        this.assembledParts = this.assembledParts.filter(p => !out.includes(p));
        out.forEach(p => this._fuel.delete(p));
        this.calculateMass();
        this.engines = this.assembledParts.filter(p => p.category === 'engine' || p.category === 'booster');
        return out;
    }

    /** Draw propellant from the active stage's tanks (proportionally). */
    burn(amount, anyTank = false) {
        const tanks = anyTank ? this.assembledParts.filter(p => this._fuel.has(p)) : this.getActiveTanks();
        let avail = 0;
        tanks.forEach(p => avail += this._fuel.get(p) || 0);
        if (avail <= 0 || amount <= 0) return 0;
        const used = Math.min(amount, avail), k = used / avail;
        tanks.forEach(p => this._fuel.set(p, (this._fuel.get(p) || 0) * (1 - k)));
        return used;
    }

    fuelOf(part) { return this._fuel.get(part) || 0; }

    calculateTotalFuel() {
        return this.assembledParts.reduce((s, p) => s + (p.fuelCapacity || 0), 0);
    }

    calculateCrossSection() {
        // Frontal area of the widest part. Catalog widths are in builder units
        // (1 unit = 0.2 m), so a 22-unit tank is a 4.4 m diameter stage.
        const maxWidth = Math.max(...this.assembledParts.map(p => p.width || 10), 10);
        const r = maxWidth * 0.1;
        return Math.PI * r * r;
    }

    // ---------- propulsion ----------
    getCurrentThrust() {
        const tankFuel = this.getActiveTanks().reduce((t, p) => t + (this._fuel.get(p) || 0), 0);
        return this.getActiveEngines().reduce((total, e) => {
            if (e.category === 'booster') return total + ((this._fuel.get(e) || 0) > 0.5 ? (e.thrust || 0) : 0);
            return total + (tankFuel > 0 ? (e.thrust || 0) : 0);
        }, 0);
    }

    /** Liquid-engine propellant flow only (boosters are drawn separately). */
    getFuelConsumptionRate() {
        return this.getActiveEngines().reduce((total, e) => total + (e.category === 'booster' ? 0 : (e.fuelRate || 0)), 0);
    }

    /** Thrust-weighted specific impulse of a set of engines (s). */
    static effectiveIsp(engines) {
        let F = 0, mdot = 0;
        engines.forEach(e => {
            const f = e.thrust || 0;
            if (f > 0 && e.isp > 0) { F += f; mdot += f / (e.isp * G0); }
        });
        return mdot > 0 ? F / (mdot * G0) : 0;
    }

    autoStage() {
        const stageMap = {};
        for (const part of this.assembledParts) {
            const s = part.stageNum !== undefined ? part.stageNum : 0;
            if (!stageMap[s]) stageMap[s] = [];
            stageMap[s].push(part);
        }

        const sortedStages = Object.keys(stageMap).map(Number).sort((a, b) => a - b);
        if (sortedStages.length > 0) {
            return sortedStages.map(s => ({
                num: s,
                parts: stageMap[s],
                type: 'stage'
            }));
        }
        return [{ num: 0, parts: this.assembledParts, type: 'stage' }];
    }

    activateNextStage() {
        if (this.currentStage < this.stages.length - 1) {
            // Drop the stage that just finished (its leftover propellant goes with it)
            const currentParts = this.stages[this.currentStage].parts;
            this.assembledParts = this.assembledParts.filter(p => !currentParts.includes(p));
            currentParts.forEach(p => this._fuel.delete(p));

            this.currentStage++;
            this.calculateMass();
            this.engines = this.assembledParts.filter(p => p.category === 'engine' || p.category === 'booster');
            this.crossSection = this.calculateCrossSection();

            return true;
        }
        return false;
    }

    getTWR(surfaceGravity = 9.807) {
        const thrust = this.getCurrentThrust();
        const weight = this.totalMass * surfaceGravity;
        return weight > 0 ? thrust / weight : 0;
    }

    /**
     * Staged Tsiolkovsky delta-V.
     * For every remaining stage k:  dV_k = Isp_k * g0 * ln(m0_k / mf_k)
     *   m0_k = everything still attached when stage k ignites (structure + all propellant)
     *   mf_k = m0_k - propellant burned by stage k
     */
    getStageReport() {
        const rep = [];
        let fromIdx = this.currentStage;
        for (let i = fromIdx; i < this.stages.length; i++) {
            const num = this.stages[i].num;
            const upto = this.assembledParts.filter(p => (p.stageNum || 0) >= num);
            const dry = upto.reduce((s, p) => s + (p.fuelCapacity ? (p.dryMass !== undefined ? p.dryMass : p.mass * 0.2) : p.mass), 0);
            const fuelAll = upto.reduce((s, p) => s + (this._fuel.get(p) || 0), 0);
            const own = upto.filter(p => (p.stageNum || 0) === num);
            const fuelStage = own.reduce((s, p) => s + (this._fuel.get(p) || 0), 0);
            const eng = own.filter(p => p.category === 'engine' || p.category === 'booster');
            const isp = Spacecraft.effectiveIsp(eng);
            const thrust = eng.reduce((s, e) => s + (e.thrust || 0), 0);
            const m0 = dry + fuelAll;
            const mf = m0 - fuelStage;
            let dv = (isp > 0 && fuelStage > 0 && mf > 0) ? isp * G0 * Math.log(m0 / mf) : 0;
            const boo = eng.filter(e => e.category === 'booster'), liq = eng.filter(e => e.category !== 'booster');
            if (boo.length && liq.length) { // phase A: boosters + core; phase B: core alone after booster burnout/jettison
                const fB = boo.reduce((t, e) => t + (this._fuel.get(e) || 0), 0), mB = boo.reduce((t, e) => t + (e.fuelRate || 0), 0);
                const mC = liq.reduce((t, e) => t + (e.fuelRate || 0), 0), fC = fuelStage - fB, tB = mB > 0 ? Math.max(...boo.map(e => (this._fuel.get(e) || 0) / (e.fuelRate || 1))) : 0;
                const burnedC = Math.min(fC, mC * tB), mfA = m0 - fB - burnedC, dryB = boo.reduce((t, e) => t + (e.dryMass !== undefined ? e.dryMass : e.mass * .2), 0);
                const ispA = Spacecraft.effectiveIsp(eng), ispB = Spacecraft.effectiveIsp(liq);
                const dvA = (ispA > 0 && mfA > 0) ? ispA * G0 * Math.log(m0 / mfA) : 0;
                const m0B = mfA - dryB, mfB = m0B - (fC - burnedC);
                const dvB = (ispB > 0 && fC - burnedC > 0 && mfB > 0) ? ispB * G0 * Math.log(m0B / mfB) : 0;
                dv = dvA + dvB;
            }
            const mdot = eng.reduce((s, e) => s + (e.fuelRate || 0), 0);
            rep.push({
                num, m0, mf, fuel: fuelStage, isp, thrust, dv,
                twr: m0 > 0 ? thrust / (m0 * 9.807) : 0,
                burn: mdot > 0 ? fuelStage / mdot : 0,
                engines: eng.length, hasFuel: fuelStage > 0
            });
        }
        return rep;
    }

    getDeltaV() {
        return this.getStageReport().reduce((s, r) => s + r.dv, 0);
    }

    getAverageIsp() {
        const rep = this.getStageReport().filter(r => r.isp > 0);
        if (!rep.length) return 0;
        const dv = rep.reduce((s, r) => s + r.dv, 0);
        return dv > 0 ? rep.reduce((s, r) => s + r.isp * r.dv, 0) / dv : rep[0].isp;
    }

    /** Extra mass the first stage could lift at TWR 1.3 (negative = overweight). */
    getPayloadCapacity() {
        const rep = this.getStageReport();
        if (!rep.length) return 0;
        const f = rep[0];
        return f.thrust / (1.3 * 9.807) - this.totalMass;
    }

    /** What the delta-V budget could do (rough, educational thresholds). */
    getMissionCapability() {
        const dv = this.getDeltaV();
        const T = [
            [14500, 'Mars transfer & landing'],
            [12600, 'Lunar landing'],
            [12200, 'Trans-lunar injection'],
            [13200 - 1000, 'Geostationary transfer'],
            [9400, 'Low Earth orbit'],
            [3000, 'Sub-orbital hop']
        ].sort((a, b) => b[0] - a[0]);
        const hit = T.find(t => dv >= t[0]);
        return hit ? hit[1] : 'Cannot leave the pad';
    }

    getFuelPercent() {
        return this.maxFuel > 0 ? (this.currentFuel / this.maxFuel) * 100 : 0;
    }

    getStageFuelPercent() {
        const n = this.activeStageNum;
        const cap = this.assembledParts.filter(p => (p.stageNum || 0) === n).reduce((s, p) => s + (p.fuelCapacity || 0), 0);
        return cap > 0 ? this.stageFuel / cap * 100 : 0;
    }

    validate() {
        const results = [];

        // Must have command module
        const hasCommand = this.assembledParts.some(p => p.category === 'command');
        results.push({
            pass: hasCommand,
            message: hasCommand ? 'Command module present' : 'Missing command module!',
            severity: hasCommand ? 'pass' : 'fail'
        });

        // Must have engine
        const hasEngine = this.assembledParts.some(p => p.category === 'engine' || p.category === 'booster');
        results.push({
            pass: hasEngine,
            message: hasEngine ? 'Propulsion system present' : 'No engines or boosters!',
            severity: hasEngine ? 'pass' : 'fail'
        });

        // Must have fuel
        const hasFuel = this.calculateTotalFuel() > 0;
        results.push({
            pass: hasFuel,
            message: hasFuel ? `Fuel capacity: ${Utils.formatNumber(this.calculateTotalFuel())} kg` : 'No fuel tanks!',
            severity: hasFuel ? 'pass' : 'fail'
        });

        // Every firing stage needs its own propellant
        const rep = this.getStageReport();
        rep.forEach((r, i) => {
            if (r.engines > 0 && !r.hasFuel) {
                results.push({
                    pass: false,
                    message: `Stage ${r.num} has engines but no propellant - assign a tank to Stage ${r.num}`,
                    severity: i === 0 ? 'fail' : 'warn'
                });
            }
        });
        if (rep.length > 1) {
            const hasDecoupler = this.assembledParts.some(p => p.id === 'struct_decoupler');
            results.push({
                pass: hasDecoupler,
                message: hasDecoupler ? `${rep.length} stages with decoupler` : 'Multiple stages but no decoupler between them',
                severity: hasDecoupler ? 'pass' : 'warn'
            });
        }

        // TWR check
        const twr = this.getTWR();
        const twrOk = twr >= 1.2;
        results.push({
            pass: twrOk,
            message: `TWR: ${twr.toFixed(2)} ${twrOk ? '(sufficient)' : '(too low for liftoff!)'}`,
            severity: twrOk ? 'pass' : (twr >= 1.0 ? 'warn' : 'fail')
        });

        // Power check
        const powerOk = this.powerGeneration >= this.powerConsumption;
        results.push({
            pass: powerOk,
            message: powerOk ? `Power: ${this.powerGeneration}W gen / ${this.powerConsumption}W use` : `Insufficient power! Need ${this.powerConsumption - this.powerGeneration}W more`,
            severity: powerOk ? 'pass' : 'warn'
        });

        // Comm check
        const hasComm = this.commRange > 0;
        results.push({
            pass: hasComm,
            message: hasComm ? `Comm range: ${Utils.formatDistance(this.commRange)}` : 'No communication system!',
            severity: hasComm ? 'pass' : 'warn'
        });

        // Delta-V estimate
        const dv = this.getDeltaV();
        results.push({
            pass: dv > 0,
            message: `Delta-V: ${Utils.formatNumber(dv)} m/s - ${this.getMissionCapability()}`,
            severity: dv >= 9400 ? 'pass' : (dv >= 3000 ? 'warn' : 'fail')
        });

        // Landing legs for landing missions
        if (this.hasLandingLegs) {
            results.push({ pass: true, message: 'Landing legs equipped', severity: 'pass' });
        }

        return results;
    }
}
