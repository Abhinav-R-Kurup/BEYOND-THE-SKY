// ==========================================
// Simulation & Flight Control Engine
// ==========================================

const Simulation = {
    canvas: null,
    ctx: null,
    mapCanvas: null,
    mapCtx: null,
    physics: null,
    renderer: null,
    particles: null,
    spacecraft: null,
    earth: null,
    moon: null,
    mars: null,
    animFrame: null,
    lastTime: 0,
    keys: {},
    isMapOpen: false,
    mapZoom: 0.00000008,
    mapPan: { x: 0, y: 0 },
    debris: [],
    initialized: false,

    start(spacecraft) {
        if (!this.canvas) {
            this.canvas = document.getElementById('sim-canvas');
            this.mapCanvas = document.getElementById('map-canvas');
        }
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());
            requestAnimationFrame(() => this.resize());
        }
        if (this.mapCanvas) {
            this.mapCtx = this.mapCanvas.getContext('2d');
        }

        // Initialize engines
        this.physics = new PhysicsEngine();
        this.renderer = new Renderer(this.canvas);
        this.particles = new ParticleSystem();
        this.debris = [];

        // Set up Celestial Bodies
        this.earth = CelestialBodies.createEarth({ x: 0, y: 0 });
        this.moon = CelestialBodies.createMoon(this.earth.pos);
        this.physics.addBody(this.earth);
        this.physics.addBody(this.moon);

        if (MissionMgr.currentMission?.id === 'mars-rover') {
            this.mars = CelestialBodies.createMars({ x: 1.5e8, y: -2.0e8 }); // scaled for gameplay transfer
            this.physics.addBody(this.mars);
        }

        // Setup Spacecraft on Earth's surface
        this.spacecraft = spacecraft;
        this.spacecraft.pos = {
            x: 0,
            y: -CONSTANTS.EARTH_RADIUS - 10 // On surface
        };
        this.spacecraft.vel = { x: 0, y: 0 };
        this.spacecraft.rotation = 0; // Pointing straight up
        this.spacecraft.throttle = 1.0; // Ready for launch
        this.spacecraft.flightTime = 0;
        this.spacecraft.maxAltitude = 0;
        this.spacecraft.maxVelocity = 0;
        this.spacecraft.payloadDeployed = false;
        this.spacecraft.roverDeployed = false;
        this.spacecraft.landed = true; // Resting on launchpad

        this.physics.setSpacecraft(this.spacecraft);
        this.renderer.camera.following = this.spacecraft;
        this.renderer.camera.zoom = 0.0004;
        this.renderer.camera.targetZoom = 0.0004;

        if (!this.initialized) {
            this.bindControls();
            this.initialized = true;
        }

        if (typeof Hud !== 'undefined') {
            Hud.init(this);
        }

        this.lastTime = performance.now();
        this.loop(this.lastTime);
    },

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        if (this.renderer) this.renderer.resize();

        if (this.mapCanvas) {
            this.mapCanvas.width = window.innerWidth;
            this.mapCanvas.height = window.innerHeight;
        }
    },

    bindControls() {
        window.addEventListener('keydown', (e) => {
            if (!document.getElementById('simulation-screen').classList.contains('active')) return;
            this.keys[e.key.toLowerCase()] = true;

            // Immediate actions
            if (e.key === ' ' || e.code === 'Space') {
                e.preventDefault();
                this.stage();
            } else if (e.key.toLowerCase() === 'm') {
                this.toggleMap();
            } else if (e.key.toLowerCase() === 'z') {
                this.setThrottle(1.0);
            } else if (e.key.toLowerCase() === 'x') {
                this.setThrottle(0.0);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY > 0 ? 0.8 : 1.25;
            this.renderer.camera.targetZoom = Utils.clamp(this.renderer.camera.targetZoom * factor, 0.0000005, 0.002);
        }, { passive: false });

        // Map close button
        document.getElementById('btn-close-map')?.addEventListener('click', () => this.toggleMap(false));
    },

    setThrottle(val) {
        if (!this.spacecraft) return;
        this.spacecraft.throttle = Utils.clamp(val, 0, 1);
        const slider = document.getElementById('throttle-slider');
        if (slider) slider.value = Math.round(this.spacecraft.throttle * 100);
    },

    stage() {
        if (!this.spacecraft) return;
        const currentStageParts = this.spacecraft.stages[this.spacecraft.currentStage]?.parts || [];

        const hasNext = this.spacecraft.activateNextStage();
        if (hasNext) {
            if (typeof Audio !== 'undefined') Audio.play('stage');
            Toast.show(`Stage ${this.spacecraft.currentStage} Activated!`, 'success', 1500);

            // Create falling debris from jettisoned stage
            if (currentStageParts.length > 0) {
                this.debris.push({
                    pos: { ...this.spacecraft.pos },
                    vel: {
                        x: this.spacecraft.vel.x - Math.sin(this.spacecraft.rotation) * 15 + (Math.random() - 0.5) * 5,
                        y: this.spacecraft.vel.y - Math.cos(this.spacecraft.rotation) * 15 + (Math.random() - 0.5) * 5
                    },
                    rotation: this.spacecraft.rotation,
                    angularVel: (Math.random() - 0.5) * 2,
                    parts: currentStageParts,
                    life: 1e9
                });
            }

            // Staging smoke burst
            this.particles.emitBurst(
                this.canvas.width / 2,
                this.canvas.height / 2,
                20,
                { color: '#e2e8f0', minSpeed: 30, maxSpeed: 100 }
            );

            if (typeof Hud !== 'undefined') Hud.updateStaging();
        } else {
            // Check if we can deploy payload or rover
            this.deployPayload();
        }
    },

    deployPayload() {
        if (!this.spacecraft) return;

        if (this.spacecraft.landed) {
            // Deploy Rover
            if (!this.spacecraft.roverDeployed) {
                this.spacecraft.roverDeployed = true;
                if (typeof Audio !== 'undefined') Audio.play('success');
                Toast.show('Exploration Rover Deployed on Surface!', 'success', 3000);
            }
        } else if (this.spacecraft.inOrbit) {
            // Deploy Satellite
            if (!this.spacecraft.payloadDeployed) {
                this.spacecraft.payloadDeployed = true;
                if (typeof Audio !== 'undefined') Audio.play('success');
                Toast.show('Satellite Payload Successfully Deployed in Orbit!', 'success', 3000);
            }
        } else {
            Toast.show('Cannot deploy payload: Reach stable orbit or land first!', 'warning', 2000);
        }
    },

    toggleMap(forceState) {
        this.isMapOpen = forceState !== undefined ? forceState : !this.isMapOpen;
        const mapOverlay = document.getElementById('map-overlay');
        if (mapOverlay) {
            if (this.isMapOpen) {
                mapOverlay.classList.remove('hidden');
            } else {
                mapOverlay.classList.add('hidden');
            }
        }
    },

    handleFlightInputs(dt) {
        const sc = this.spacecraft;
        if (!sc || sc.destroyed) return;

        // Steering
        sc.rotationInput = 0;
        if (this.keys['a'] || this.keys['arrowleft']) {
            sc.rotationInput -= 1.0;
        }
        if (this.keys['d'] || this.keys['arrowright']) {
            sc.rotationInput += 1.0;
        }

        // Throttle
        if (this.keys['w'] || this.keys['arrowup']) {
            this.setThrottle(sc.throttle + dt * 0.5);
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
            this.setThrottle(sc.throttle - dt * 0.5);
        }

        // Liftoff check: if on ground, any upward thrust un-lands the rocket
        if (sc.landed && sc.throttle > 0 && sc.stageFuel > 0) {
            const twr = sc.getTWR();
            if (twr > 0.95) {
                sc.landed = false;
            }
        }
    },

    update(dt) {
        if (this.physics.paused) return;

        // Handle user flight input
        this.handleFlightInputs(dt);

        // Update physics
        this.physics.update(dt);

        const sc = this.spacecraft;
        if (sc) {
            sc.flightTime = (sc.flightTime || 0) + dt * this.physics.timeScale;
            sc.maxAltitude = Math.max(sc.maxAltitude || 0, sc.altitude || 0);
            sc.maxVelocity = Math.max(sc.maxVelocity || 0, sc.speed || 0);

            // Update celestial bodies positions
            this.moon.update(dt * this.physics.timeScale);

            // burnt-out solid boosters separate on their own (SLS SRBs ~126 s)
            if (sc.takeSpent) { const sp = sc.takeSpent(); if (sp.length) { const rt = { x: Math.cos(sc.rotation), y: -Math.sin(sc.rotation) };
                sp.forEach((pt, k) => { const side = pt.x >= 0 ? 1 : -1; this.debris.push({ pos: { ...sc.pos }, vel: { x: sc.vel.x + rt.x * side * 4, y: sc.vel.y + rt.y * side * 4 }, rotation: sc.rotation, angularVel: side * (0.05 + Math.random() * 0.08), parts: [pt], life: 1e9 }); });
                Toast.show('Solid boosters burnt out - separated', 'info', 2200); if (typeof Audio !== 'undefined') Audio.play('stage'); } }
            // Update debris: ballistic fall with gravity + drag, aerodynamic heating, persistent wreckage on impact
            const dts = dt * this.physics.timeScale; const bodyD = sc.nearestBody || (this.physics.bodies && this.physics.bodies[0]);
            for (let i = this.debris.length - 1; i >= 0; i--) {
                const d = this.debris[i];
                if (d.rest) { d.t = (d.t || 0) + dts; d.glow = Math.max(0, (d.glow || 0) - dts * 0.02); d.char = Math.min(1, (d.char || 0) + dts * 0.01); continue; }
                if (bodyD) {
                    const rx = d.pos.x - bodyD.pos.x, ry = d.pos.y - bodyD.pos.y, r = Math.hypot(rx, ry) || 1, alt = r - bodyD.radius;
                    const g = bodyD.gm / (r * r); let ax = -g * rx / r, ay = -g * ry / r;
                    const rho = bodyD.densityAt ? bodyD.densityAt(Math.max(0, alt)) : 0; const vx = d.vel.x - (bodyD.vel ? bodyD.vel.x : 0), vy = d.vel.y - (bodyD.vel ? bodyD.vel.y : 0), v = Math.hypot(vx, vy);
                    if (rho > 0) { const k = 0.5 * rho * v / 250; ax -= k * vx; ay -= k * vy; // ballistic coefficient ~250 kg/m2
                        d.heat = (d.heat || 0) + rho * v * v * v * 2.2e-9 * dts; }
                    d.heat = Math.max(0, (d.heat || 0) - dts * 0.05 * (1 - Math.min(1, rho * 20)));
                    d.glow = Math.min(1, d.heat); if (d.glow > 0.4) d.char = Math.min(1, (d.char || 0) + dts * 0.02 * d.glow);
                    d.vel.x += ax * dts; d.vel.y += ay * dts; d.pos.x += d.vel.x * dts; d.pos.y += d.vel.y * dts; d.rotation += d.angularVel * dts * (1 - Math.min(0.9, rho * 3));
                    const r2 = Math.hypot(d.pos.x - bodyD.pos.x, d.pos.y - bodyD.pos.y);
                    if (r2 <= bodyD.radius + 4) { const ux = (d.pos.x - bodyD.pos.x) / r2, uy = (d.pos.y - bodyD.pos.y) / r2; d.pos.x = bodyD.pos.x + ux * (bodyD.radius + 3); d.pos.y = bodyD.pos.y + uy * (bodyD.radius + 3); d.rotation = Math.atan2(ux, uy) + Math.PI / 2; d.impactSpeed = v; d.vel = { x: 0, y: 0 }; d.angularVel = 0; d.rest = true; d.t = 0; d.char = Math.max(d.char || 0, Math.min(1, v / 400)); d.justHit = true; }
                } else { d.pos.x += d.vel.x * dts; d.pos.y += d.vel.y * dts; d.rotation += d.angularVel * dts; }
            }
            while (this.debris.length > 14) this.debris.shift(); // keep the newest 14 pieces

            // Update mission objectives
            MissionMgr.updateObjectives(sc, this.physics);

            // Check mission completion
            if (MissionMgr.isComplete() && !(MissionMgr.currentMission && MissionMgr.currentMission.isSandbox)) {
                setTimeout(() => {
                    this.endMission('SUCCESS');
                }, 2000);
            }

            // Check destruction
            if (sc.destroyed) {
                if (typeof Audio !== 'undefined') Audio.play('explosion');
                this.particles.emitBurst(
                    this.canvas.width / 2,
                    this.canvas.height / 2,
                    80,
                    { color: '#ef4444', minSpeed: 50, maxSpeed: 250, maxSize: 8 }
                );
                setTimeout(() => {
                    this.endMission('FAILED', sc.destroyReason || 'Vehicle Destroyed');
                }, 7000); // let the crash explosion + wreckage play out before the report
            }
        }

        // Update particles
        this.particles.update(dt * this.physics.timeScale);

        // Update camera
        this.renderer.updateCamera(dt);

        // Update HUD
        if (typeof Hud !== 'undefined') Hud.update();
    },

    render() {
        const ctx = this.ctx;
        const time = performance.now() * 0.001;

        this.renderer.clear();
        this.renderer.drawStars(time);

        // Draw Celestial Bodies
        this.earth.draw(ctx, this.renderer.camera);
        this.moon.draw(ctx, this.renderer.camera);
        if (this.mars) this.mars.draw(ctx, this.renderer.camera);

        // Draw Orbit preview
        if (this.spacecraft && this.spacecraft.nearestBody) {
            this.renderer.drawOrbitPreview(this.spacecraft.nearestBody, this.spacecraft);
        }

        // Draw Flight Trajectory
        this.renderer.drawTrajectory(this.physics.trajectoryPoints);

        // Draw Debris
        this.debris.forEach(d => {
            const screen = this.renderer.worldToScreen(d.pos.x, d.pos.y);
            ctx.save();
            ctx.translate(screen.x, screen.y);
            ctx.rotate(d.rotation);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(-8, -15, 16, 30);
            ctx.restore();
        });

        // Draw Spacecraft & Engine Plumes
        this.renderer.drawSpacecraft(this.spacecraft, this.particles);

        // Draw Particles
        this.particles.draw(ctx);

        // Draw Map view if active
        if (this.isMapOpen) {
            this.renderMap();
        }
    },

    renderMap() {
        if (!this.mapCanvas || !this.mapCtx) return;
        const ctx = this.mapCtx;
        const w = this.mapCanvas.width;
        const h = this.mapCanvas.height;

        ctx.fillStyle = '#060a12';
        ctx.fillRect(0, 0, w, h);

        const zoom = this.mapZoom;
        const cx = w / 2;
        const cy = h / 2;

        const toMapScreen = (worldPos) => ({
            x: cx + worldPos.x * zoom,
            y: cy + worldPos.y * zoom
        });

        // Earth
        const earthScreen = toMapScreen(this.earth.pos);
        const earthR = Math.max(8, this.earth.radius * zoom);
        ctx.fillStyle = '#1e40af';
        ctx.beginPath();
        ctx.arc(earthScreen.x, earthScreen.y, earthR, 0, Math.PI * 2);
        ctx.fill();

        // Moon Orbit & Moon
        const moonScreen = toMapScreen(this.moon.pos);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(earthScreen.x, earthScreen.y, this.moon.orbitRadius * zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(moonScreen.x, moonScreen.y, Math.max(4, this.moon.radius * zoom), 0, Math.PI * 2);
        ctx.fill();

        // Trajectory
        if (this.physics.trajectoryPoints.length > 1) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            this.physics.trajectoryPoints.forEach((pt, i) => {
                const s = toMapScreen(pt);
                if (i === 0) ctx.moveTo(s.x, s.y);
                else ctx.lineTo(s.x, s.y);
            });
            ctx.stroke();
        }

        // Spacecraft icon
        if (this.spacecraft) {
            const scScreen = toMapScreen(this.spacecraft.pos);
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(scScreen.x, scScreen.y, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Share Tech Mono';
            ctx.fillText('CRAFT', scScreen.x + 8, scScreen.y - 4);
        }
    },

    loop(currentTime) {
        const dt = Math.min(0.1, (currentTime - this.lastTime) * 0.001);
        this.lastTime = currentTime;

        this.update(dt);
        this.render();

        this.animFrame = requestAnimationFrame((t) => this.loop(t));
    },

    endMission(status = 'SUCCESS', reason = '') {
        if (this.animFrame) cancelAnimationFrame(this.animFrame);
        const report = MissionMgr.generateReport(this.spacecraft, status, reason);

        Utils.showScreen('report-screen');
        if (typeof MissionReport !== 'undefined') {
            MissionReport.show(report);
        }
    },

    abort() {
        Modal.show({
            title: 'Abort Mission',
            content: 'Are you sure you want to abort the current mission flight?',
            buttons: [
                { text: 'Resume' },
                {
                    text: 'Abort', primary: true, onClick: () => {
                        this.endMission('FAILED', 'Mission Aborted by Flight Commander');
                    }
                }
            ]
        });
    }
};
