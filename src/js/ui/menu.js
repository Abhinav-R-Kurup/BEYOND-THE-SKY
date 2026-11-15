// ==========================================
// Main Menu
// ==========================================

const Menu = {
    canvas: null,
    ctx: null,
    animFrame: null,
    stars: [],
    initialized: false,

    init() {
        if (!this.canvas) {
            this.canvas = document.getElementById('menu-bg-canvas');
        }
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());
            this.generateStars();
            requestAnimationFrame(() => this.resize());
        }

        if (!this.initialized) {
            this.bindEvents();
            this.initialized = true;
        }

        this.startBackgroundLoop();
    },

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    generateStars() {
        this.stars = [];
        for (let i = 0; i < 220; i++) {
            this.stars.push({
                x: Math.random() * (this.canvas ? this.canvas.width : 1920),
                y: Math.random() * (this.canvas ? this.canvas.height : 1080),
                size: Math.random() * 1.8 + 0.5,
                twinkle: Math.random() * Math.PI * 2
            });
        }
    },

    bindEvents() {
        const bindBtn = (id, callback) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('mouseenter', () => {
                    if (typeof Audio !== 'undefined') Audio.play('hover');
                });
                el.addEventListener('click', () => {
                    if (typeof Audio !== 'undefined') {
                        Audio.init();
                        Audio.play('click');
                    }
                    callback();
                });
            }
        };

        // New Mission -> Mission Select
        bindBtn('btn-new-mission', () => {
            Utils.showScreen('mission-select-screen');
            if (typeof MissionSelect !== 'undefined') {
                MissionSelect.init();
            }
        });

        // Sandbox Mode -> Builder with Sandbox Mission
        bindBtn('btn-sandbox', () => {
            MissionMgr.startMission('sandbox', 'beginner');
            Utils.showScreen('builder-screen');
            if (typeof Builder !== 'undefined') {
                Builder.init();
            }
            if (typeof Toast !== 'undefined') {
                Toast.show('Sandbox Mode Activated - Unlimited Budget & Freedom', 'info');
            }
        });

        // Tutorials
        bindBtn('btn-tutorials', () => {
            Utils.showScreen('tutorial-screen');
            if (typeof Tutorials !== 'undefined') Tutorials.init();
        });

        // Team Planning
        bindBtn('btn-team-mode', () => {
            Utils.showScreen('team-screen');
            if (typeof TeamMode !== 'undefined') TeamMode.init();
        });

        // Leaderboard
        bindBtn('btn-leaderboard', () => {
            Utils.showScreen('leaderboard-screen');
            if (typeof Leaderboard !== 'undefined') Leaderboard.init();
        });

        // NASA Data Center
        bindBtn('btn-nasa-data', () => {
            Utils.showScreen('nasa-screen');
            if (typeof NasaData !== 'undefined') NasaData.init();
        });

        // Settings
        bindBtn('btn-settings', () => {
            Utils.showScreen('settings-screen');
            if (typeof Settings !== 'undefined') Settings.init();
        });
    },

    startBackgroundLoop() {
        if (this.animFrame) cancelAnimationFrame(this.animFrame);

        let angle = 0;
        const render = () => {
            if (!this.canvas || !this.ctx) return;
            const ctx = this.ctx;
            const w = this.canvas.width;
            const h = this.canvas.height;

            ctx.fillStyle = '#080c16';
            ctx.fillRect(0, 0, w, h);

            // Draw Stars
            const time = Date.now() * 0.0015;
            ctx.fillStyle = '#ffffff';
            this.stars.forEach(s => {
                const alpha = 0.3 + 0.7 * Math.sin(time + s.twinkle);
                ctx.globalAlpha = Math.max(0.1, alpha);
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;

            // Earth illustration on side
            const earthX = w * 0.88;
            const earthY = h * 0.6;
            const earthRadius = Math.min(w, h) * 0.45;

            // Atmosphere glow
            const atmGlow = ctx.createRadialGradient(earthX, earthY, earthRadius * 0.95, earthX, earthY, earthRadius * 1.2);
            atmGlow.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
            atmGlow.addColorStop(0.7, 'rgba(59, 130, 246, 0.08)');
            atmGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = atmGlow;
            ctx.beginPath();
            ctx.arc(earthX, earthY, earthRadius * 1.2, 0, Math.PI * 2);
            ctx.fill();

            // Earth disc
            const earthGrad = ctx.createRadialGradient(earthX - earthRadius * 0.3, earthY - earthRadius * 0.3, earthRadius * 0.1, earthX, earthY, earthRadius);
            earthGrad.addColorStop(0, '#38bdf8');
            earthGrad.addColorStop(0.5, '#0284c7');
            earthGrad.addColorStop(0.9, '#0f172a');
            earthGrad.addColorStop(1, '#020617');
            ctx.fillStyle = earthGrad;
            ctx.beginPath();
            ctx.arc(earthX, earthY, earthRadius, 0, Math.PI * 2);
            ctx.fill();

            // Orbit line
            angle += 0.005;
            const orbitR = earthRadius * 1.35;
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.arc(earthX, earthY, orbitR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Orbiting satellite
            const satX = earthX + Math.cos(angle) * orbitR;
            const satY = earthY + Math.sin(angle) * orbitR;

            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(satX, satY, 4, 0, Math.PI * 2);
            ctx.fill();

            // Solar panels
            ctx.fillStyle = '#0284c7';
            ctx.fillRect(satX - 8, satY - 2, 4, 4);
            ctx.fillRect(satX + 4, satY - 2, 4, 4);

            this.animFrame = requestAnimationFrame(render);
        };

        render();
    }
};
