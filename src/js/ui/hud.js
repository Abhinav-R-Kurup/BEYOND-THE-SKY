// ==========================================
// Heads-Up Display (HUD) Controller
// ==========================================

const Hud = {
    sim: null,
    initialized: false,

    init(simulation) {
        this.sim = simulation;
        if (!this.initialized) {
            this.bindEvents();
            this.initialized = true;
        }

        // Set mission title
        const titleEl = document.getElementById('hud-mission-name');
        if (titleEl && MissionMgr.currentMission) {
            titleEl.innerText = MissionMgr.currentMission.name;
        }

        this.updateObjectivesList();
        this.updateStaging();
        this.updateTimeControls(1);
    },

    bindEvents() {
        // Time warp
        document.getElementById('btn-time-slow')?.addEventListener('click', () => this.setTimeScale(0.25, 'btn-time-slow'));
        document.getElementById('btn-time-normal')?.addEventListener('click', () => this.setTimeScale(1.0, 'btn-time-normal'));
        document.getElementById('btn-time-fast')?.addEventListener('click', () => this.setTimeScale(5.0, 'btn-time-fast'));
        document.getElementById('btn-time-vfast')?.addEventListener('click', () => this.setTimeScale(20.0, 'btn-time-vfast'));

        // Pause
        const pauseBtn = document.getElementById('btn-pause');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                if (!this.sim || !this.sim.physics) return;
                this.sim.physics.paused = !this.sim.physics.paused;
                pauseBtn.innerText = this.sim.physics.paused ? '▶ RESUME' : ' PAUSE';
                if (typeof Toast !== 'undefined') {
                    Toast.show(this.sim.physics.paused ? 'Simulation Paused' : 'Simulation Resumed', 'info', 1000);
                }
            });
        }

        // Abort
        document.getElementById('btn-abort')?.addEventListener('click', () => {
            if (this.sim) this.sim.abort();
        });

        // Map View
        document.getElementById('btn-map-view')?.addEventListener('click', () => {
            if (this.sim) this.sim.toggleMap();
        });

        // Staging button
        document.getElementById('btn-stage-next')?.addEventListener('click', () => {
            if (this.sim) this.sim.stage();
        });

        // Throttle slider
        const slider = document.getElementById('throttle-slider');
        if (slider) {
            slider.addEventListener('input', (e) => {
                if (this.sim) {
                    this.sim.setThrottle(parseFloat(e.target.value) / 100);
                }
            });
        }
    },

    setTimeScale(scale, btnId) {
        if (!this.sim || !this.sim.physics) return;
        this.sim.physics.timeScale = scale;
        this.updateTimeControls(scale, btnId);
        if (typeof Toast !== 'undefined') {
            Toast.show(`Time Warp: ${scale}x`, 'info', 1000);
        }
    },

    updateTimeControls(scale, activeId) {
        document.querySelectorAll('.time-controls .time-btn').forEach(btn => btn.classList.remove('active'));
        if (activeId) {
            document.getElementById(activeId)?.classList.add('active');
        } else {
            if (scale === 0.25) document.getElementById('btn-time-slow')?.classList.add('active');
            else if (scale === 1.0) document.getElementById('btn-time-normal')?.classList.add('active');
            else if (scale === 5.0) document.getElementById('btn-time-fast')?.classList.add('active');
            else if (scale === 20.0) document.getElementById('btn-time-vfast')?.classList.add('active');
        }
    },

    update() {
        if (!this.sim || !this.sim.spacecraft) return;
        const sc = this.sim.spacecraft;

        // Timer
        const timerEl = document.getElementById('hud-timer');
        if (timerEl) {
            timerEl.innerText = Utils.formatTime(sc.flightTime || 0);
        }

        // Flight Phase Badge
        const phaseBadge = document.getElementById('hud-mission-phase');
        if (phaseBadge) {
            let phase = 'PRE-LAUNCH';
            if (sc.landed) {
                phase = (sc.landedOn && sc.landedOn.name !== 'Earth') ? `LANDED ON ${sc.landedOn.name.toUpperCase()}` : 'ON LAUNCHPAD';
            } else if (sc.inOrbit) {
                phase = (sc.nearestBody && sc.nearestBody.name !== 'Earth') ? `${sc.nearestBody.name.toUpperCase()} ORBIT` : 'LOW EARTH ORBIT';
            } else if (sc.altitude > 100000) {
                phase = 'SUB-ORBITAL FLIGHT';
            } else if (sc.altitude > 10) {
                phase = 'ASCENT';
            }
            phaseBadge.innerText = phase;
        }

        // Telemetry values
        const setText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.innerText = text;
        };

        setText('hud-altitude', Utils.formatDistance(sc.altitude || 0));
        setText('hud-velocity', Utils.formatVelocity(sc.speed || 0));
        setText('hud-accel', `${(sc.acceleration || 0).toFixed(1)} m/s²`);

        // Heading (0° = straight up, 90° = horizontal east)
        const deg = Math.round(Utils.radToDeg(sc.rotation || 0));
        const normalizedDeg = ((deg % 360) + 360) % 360;
        setText('hud-heading', `${normalizedDeg}°`);

        setText('hud-throttle', `${Math.round((sc.throttle || 0) * 100)}%`);
        setText('hud-fuel', `${Math.round(sc.getFuelPercent())}%`);
        setText('hud-mass', `${Utils.formatNumber(sc.totalMass || 0)} kg`);

        // Ap / Pe
        if (sc.inOrbit && sc.orbitApoapsis < 1e9) {
            setText('hud-orbit', `Ap: ${Utils.formatDistance(sc.orbitApoapsis)} / Pe: ${Utils.formatDistance(sc.orbitPeriapsis)}`);
        } else {
            setText('hud-orbit', 'Ap: Sub-orbital');
        }

        // Navball indicator
        const navIndicator = document.getElementById('nav-indicator');
        if (navIndicator) {
            // Position based on heading
            const pitch = sc.rotation || 0;
            const nx = 50 + Math.sin(pitch) * 35;
            const ny = 50 - Math.cos(pitch) * 35;
            navIndicator.style.left = `${nx}%`;
            navIndicator.style.top = `${ny}%`;
        }

        // Real-time objectives checkmarks
        this.updateObjectivesList();

        // Alerts
        this.updateAlerts(sc);
    },

    updateObjectivesList() {
        const container = document.getElementById('hud-objectives');
        if (!container || !MissionMgr.currentMission) return;

        const objs = MissionMgr.currentMission.objectives || [];
        container.innerHTML = '';

        objs.forEach(obj => {
            const status = MissionMgr.objectivesStatus[obj.id];
            const isDone = status && status.completed;

            const div = document.createElement('div');
            div.className = `objective-item ${isDone ? 'complete' : 'pending'}`;
            div.innerHTML = `<span>${isDone ? '✓' : '○'}</span> <span>${obj.text}</span>`;
            container.appendChild(div);
        });
    },

    updateStaging() {
        const container = document.getElementById('hud-staging-list');
        if (!container || !this.sim || !this.sim.spacecraft) return;

        const sc = this.sim.spacecraft;
        container.innerHTML = '';

        const stages = sc.stages || [];
        stages.forEach((st, idx) => {
            const div = document.createElement('div');
            let statusClass = '';
            if (idx === sc.currentStage) statusClass = 'current';
            else if (idx < sc.currentStage) statusClass = 'used';

            div.className = `hud-stage-item ${statusClass}`;
            div.innerText = `Stage ${idx} (${st.parts.length} parts)`;
            container.appendChild(div);
        });
    },

    updateAlerts(sc) {
        const container = document.getElementById('hud-alerts');
        if (!container) return;

        container.innerHTML = '';

        const addAlert = (text, type = 'info') => {
            const div = document.createElement('div');
            div.className = `alert-item ${type}`;
            div.innerText = text;
            container.appendChild(div);
        };

        if (sc.heating > 0.3) {
            addAlert(' High Atmospheric Heating', 'critical');
        }
        if (sc.currentFuel < sc.maxFuel * 0.1 && sc.currentFuel > 0) {
            addAlert(' Low Propellant Warning', 'warning');
        } else if (sc.currentFuel <= 0 && sc.maxFuel > 0) {
            addAlert(' Engine Flameout - Fuel Depleted', 'critical');
        }
        if (sc.inOrbit) {
            addAlert(' Stable Orbit Established', 'info');
        }
    }
};

