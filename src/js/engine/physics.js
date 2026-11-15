// ==========================================
// Physics Engine
// ==========================================

class PhysicsEngine {
    constructor() {
        this.bodies = [];
        this.spacecraft = null;
        this.timeScale = 1;
        this.paused = false;
        this.elapsedTime = 0;
        this.trajectoryPoints = [];
        this.maxTrajectoryPoints = 1000;
    }

    reset() {
        this.bodies = [];
        this.spacecraft = null;
        this.timeScale = 1;
        this.paused = false;
        this.elapsedTime = 0;
        this.trajectoryPoints = [];
    }

    addBody(body) {
        this.bodies.push(body);
    }

    setSpacecraft(sc) {
        this.spacecraft = sc;
    }

    update(dt) {
        if (this.paused || !this.spacecraft) return;

        const scaledDt = dt * this.timeScale;
        this.elapsedTime += scaledDt;

        // Sub-stepping for stability
        const steps = Math.max(1, Math.ceil(this.timeScale));
        const subDt = scaledDt / steps;

        for (let s = 0; s < steps; s++) {
            this.physicsStep(subDt);
        }

        // Record trajectory
        if (this.elapsedTime % 0.5 < scaledDt) {
            this.trajectoryPoints.push({
                x: this.spacecraft.pos.x,
                y: this.spacecraft.pos.y
            });
            if (this.trajectoryPoints.length > this.maxTrajectoryPoints) {
                this.trajectoryPoints.shift();
            }
        }
    }

    physicsStep(dt) {
        const sc = this.spacecraft;
        if (!sc || sc.destroyed) return;

        // If spacecraft is on the ground
        if (sc.landed) {
            let body = sc.landedOn || this.bodies[0];
            const surfaceGravity = body.gm / (body.radius * body.radius);
            const totalThrust = sc.getCurrentThrust() * sc.throttle;
            const thrustMag = sc.totalMass > 0 ? totalThrust / sc.totalMass : 0;

            if (thrustMag > surfaceGravity && sc.stageFuel > 0) {
                sc.landed = false; // Liftoff!
            } else {
                sc.vel = { x: 0, y: 0 };
                sc.angularVel = 0;
                sc.altitude = 0;
                sc.speed = 0;
                sc.acceleration = 0;
                sc.nearestBody = body;

                // Lock to surface
                const upDir = Utils.vecNorm(Utils.vecSub(sc.pos, body.pos));
                sc.pos = Utils.vecAdd(body.pos, Utils.vecScale(upDir, body.radius + 2.5));

                if (sc.throttle > 0 && sc.stageFuel > 0 && sc.engines.length > 0) {
                    const fuelRate = sc.getFuelConsumptionRate() * sc.throttle * dt;
                    sc.burn(fuelRate);
                    if (sc.burnBoosters) sc.burnBoosters(dt);
                    sc.isThrusting = true;
                } else {
                    sc.isThrusting = false;
                }
                return;
            }
        }

        // Calculate gravitational acceleration from all bodies
        let gravAccel = { x: 0, y: 0 };
        let nearestBody = null;
        let nearestDist = Infinity;

        for (const body of this.bodies) {
            const dx = body.pos.x - sc.pos.x;
            const dy = body.pos.y - sc.pos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestBody = body;
            }

            // Surface collision check
            if (dist <= body.radius + 2) {
                this.handleCollision(sc, body, dist);
                return;
            }

            // GM / r^2 in direction of body
            const forceMag = body.gm / (dist * dist);
            gravAccel.x += forceMag * (dx / dist);
            gravAccel.y += forceMag * (dy / dist);
        }

        sc.nearestBody = nearestBody;
        sc.altitude = nearestDist - (nearestBody ? nearestBody.radius : 0);

        // Atmospheric drag: rho = rho0 * exp(-h / H), F = 1/2 rho v^2 Cd A
        sc.airDensity = 0;
        sc.dynamicPressure = 0;
        if (nearestBody && nearestBody.hasAtmosphere && sc.altitude < nearestBody.atmosphereHeight) {
            const airDensity = nearestBody.densityAt(sc.altitude);
            const relVel = Utils.vecSub(sc.vel, nearestBody.vel || { x: 0, y: 0 });
            const speed = Utils.vecMag(relVel);
            sc.airDensity = airDensity;
            sc.dynamicPressure = 0.5 * airDensity * speed * speed;
            if (speed > 0) {
                const dragForce = sc.dynamicPressure * CONSTANTS.DRAG_COEFFICIENT * sc.crossSection;
                const dragAccel = dragForce / sc.totalMass;
                const velNorm = Utils.vecNorm(relVel);
                gravAccel.x -= velNorm.x * dragAccel;
                gravAccel.y -= velNorm.y * dragAccel;

                // Aerodynamic heating ~ sqrt(rho) * v^3 (Sutton-Graves scaling), normalised 0..1
                const flux = Math.sqrt(airDensity) * speed * speed * speed;
                const target = Math.min(1, flux / 3.0e10);
                sc.heating = target > sc.heating ? target : Math.max(target, sc.heating - dt * 0.5);
            } else {
                sc.heating = Math.max(0, sc.heating - dt * 0.5);
            }
        } else {
            sc.heating = Math.max(0, sc.heating - dt * 0.5);
        }

        // Thrust
        let thrustAccel = { x: 0, y: 0 };
        if (sc.throttle > 0 && sc.stageFuel > 0 && sc.engines.length > 0) {
            const totalThrust = sc.getCurrentThrust() * sc.throttle;
            const thrustDir = Utils.vecRotate({ x: 0, y: -1 }, sc.rotation);
            thrustAccel = Utils.vecScale(thrustDir, totalThrust / sc.totalMass);
            
            // Consume fuel
            const fuelRate = sc.getFuelConsumptionRate() * sc.throttle * dt;
            sc.burn(fuelRate);
            if (sc.burnBoosters) sc.burnBoosters(dt);
            
            sc.isThrusting = true;
        } else {
            sc.isThrusting = false;
        }

        // Total acceleration
        const totalAccel = {
            x: gravAccel.x + thrustAccel.x,
            y: gravAccel.y + thrustAccel.y
        };

        sc.acceleration = Utils.vecMag(totalAccel);

        // Verlet integration
        sc.vel.x += totalAccel.x * dt;
        sc.vel.y += totalAccel.y * dt;
        sc.pos.x += sc.vel.x * dt;
        sc.pos.y += sc.vel.y * dt;

        // Update rotation from player input
        if (sc.rotationInput !== 0) {
            sc.angularVel += sc.rotationInput * sc.rotationSpeed * dt;
        }
        sc.angularVel *= 0.98; // damping
        sc.rotation += sc.angularVel * dt;

        // Calculate orbital parameters relative to nearest body
        if (nearestBody) {
            this.calculateOrbitalParams(sc, nearestBody);
        }

        // Speed
        sc.speed = Utils.vecMag(sc.vel);
    }

    calculateOrbitalParams(sc, body) {
        const relPos = Utils.vecSub(sc.pos, body.pos);
        const relVel = Utils.vecSub(sc.vel, body.vel || {x:0, y:0});
        const r = Utils.vecMag(relPos);
        const v = Utils.vecMag(relVel);
        
        // Specific orbital energy
        const energy = 0.5 * v * v - body.gm / r;
        
        // Semi-major axis
        if (energy < 0) {
            const a = -body.gm / (2 * energy);
            
            // Angular momentum
            const h = relPos.x * relVel.y - relPos.y * relVel.x;
            
            // Eccentricity
            const e = Math.sqrt(Math.max(0, 1 + 2 * energy * h * h / (body.gm * body.gm)));
            
            sc.orbitApoapsis = a * (1 + e) - body.radius;
            sc.orbitPeriapsis = a * (1 - e) - body.radius;
            sc.orbitEccentricity = e;
            const minOrbitAlt = body.hasAtmosphere ? body.atmosphereHeight : 10000;
            sc.inOrbit = sc.orbitPeriapsis > minOrbitAlt;
            
            // Orbital period
            sc.orbitalPeriod = 2 * Math.PI * Math.sqrt(a * a * a / body.gm);
        } else {
            sc.inOrbit = false;
            sc.orbitApoapsis = Infinity;
            sc.orbitPeriapsis = sc.altitude;
            sc.orbitEccentricity = 1 + Math.abs(energy);
        }
    }

    handleCollision(sc, body, dist) {
        const speed = Utils.vecMag(sc.vel);
        
        // Landing check
        if (speed < 12 && sc.hasLandingLegs) {
            sc.landed = true;
            sc.landedOn = body;
            sc.vel = { x: 0, y: 0 };
            sc.angularVel = 0;
            const dir = Utils.vecNorm(Utils.vecSub(sc.pos, body.pos));
            sc.pos = Utils.vecAdd(body.pos, Utils.vecScale(dir, body.radius + 2.5));
            if (typeof Toast !== 'undefined') Toast.show(`Touchdown on ${body.name}! Soft landing achieved.`, 'success', 3000);
        } else if (speed < 6) {
            sc.landed = true;
            sc.landedOn = body;
            sc.vel = { x: 0, y: 0 };
            sc.angularVel = 0;
            const dir = Utils.vecNorm(Utils.vecSub(sc.pos, body.pos));
            sc.pos = Utils.vecAdd(body.pos, Utils.vecScale(dir, body.radius + 2.5));
            if (typeof Toast !== 'undefined') Toast.show(`Touchdown on ${body.name}!`, 'info', 3000);
        } else {
            // Crash!
            sc.destroyed = true; sc.impactSpeed = speed; sc.impactMass = sc.totalMass;
            sc.destroyReason = `Impacted ${body.name} at ${speed.toFixed(0)} m/s (Max safe touchdown: 12 m/s)`;
            if (typeof Toast !== 'undefined') Toast.show(`CRASH: Impacted ${body.name} at ${speed.toFixed(0)} m/s!`, 'error', 4000);
        }
    }

    getAltitudeAbove(body) {
        if (!this.spacecraft) return 0;
        return Utils.distance(this.spacecraft.pos.x, this.spacecraft.pos.y, body.pos.x, body.pos.y) - body.radius;
    }
}

