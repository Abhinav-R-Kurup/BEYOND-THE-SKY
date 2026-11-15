// ==========================================
// Celestial Bodies
// ==========================================

class CelestialBody {
    constructor(config) {
        this.name = config.name;
        this.mass = config.mass;
        this.radius = config.radius;
        this.gm = CONSTANTS.G * config.mass; // Standard gravitational parameter
        this.pos = config.pos || { x: 0, y: 0 };
        this.vel = config.vel || { x: 0, y: 0 };
        this.color = config.color || '#ffffff';
        this.hasAtmosphere = config.hasAtmosphere || false;
        this.atmosphereHeight = config.atmosphereHeight || 0;
        this.atmosphereColor = config.atmosphereColor || 'rgba(100,180,255,0.1)';
        this.surfaceDensity = config.surfaceDensity || 0;
        this.scaleHeight = config.scaleHeight || 8500; // exponential atmosphere scale height (m)
        this.surfaceColor = config.surfaceColor || '#555';
        this.surfaceGravity = config.surfaceGravity || 9.807;
        this.description = config.description || '';
        this.type = config.type || 'planet'; // planet, moon, star
        this.orbitRadius = config.orbitRadius || 0;
        this.orbitSpeed = config.orbitSpeed || 0;
        this.parent = config.parent || null;
    }

    /** Air density (kg/m^3) at altitude h: rho0 * exp(-h/H). Zero above the modelled atmosphere. */
    densityAt(h) {
        if (!this.hasAtmosphere || h < 0 || h >= this.atmosphereHeight) return h < 0 ? this.surfaceDensity : 0;
        return this.surfaceDensity * Math.exp(-h / this.scaleHeight);
    }

    update(dt) {
        if (this.parent && this.orbitSpeed) {
            const angle = Math.atan2(this.pos.y - this.parent.pos.y, this.pos.x - this.parent.pos.x);
            const newAngle = angle + this.orbitSpeed * dt;
            this.pos.x = this.parent.pos.x + Math.cos(newAngle) * this.orbitRadius;
            this.pos.y = this.parent.pos.y + Math.sin(newAngle) * this.orbitRadius;
        }
    }

    draw(ctx, camera) {
        const screenX = (this.pos.x - camera.x) * camera.zoom + camera.screenW / 2;
        const screenY = (this.pos.y - camera.y) * camera.zoom + camera.screenH / 2;
        const screenRadius = this.radius * camera.zoom;

        // Skip if offscreen
        if (screenX + screenRadius < -100 || screenX - screenRadius > camera.screenW + 100 ||
            screenY + screenRadius < -100 || screenY - screenRadius > camera.screenH + 100) {
            // Draw direction indicator
            this.drawIndicator(ctx, screenX, screenY, camera);
            return;
        }

        // Atmosphere glow
        if (this.hasAtmosphere && screenRadius > 5) {
            const atmRadius = screenRadius * (1 + this.atmosphereHeight / this.radius);
            const gradient = ctx.createRadialGradient(screenX, screenY, screenRadius, screenX, screenY, atmRadius);
            gradient.addColorStop(0, this.atmosphereColor);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, atmRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Body
        if (screenRadius > 2) {
            // Surface detail
            const gradient = ctx.createRadialGradient(
                screenX - screenRadius * 0.3, screenY - screenRadius * 0.3, 0,
                screenX, screenY, screenRadius
            );
            gradient.addColorStop(0, this.color);
            gradient.addColorStop(0.7, this.surfaceColor || this.color);
            gradient.addColorStop(1, this.adjustColor(this.color, -60));
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
            ctx.fill();

            // Surface features
            if (screenRadius > 20) {
                this.drawSurfaceDetail(ctx, screenX, screenY, screenRadius);
            }

            // Launchpad structure on Earth
            if (this.name === 'Earth' && camera.zoom > 0.00005) {
                const padX = (0 - camera.x) * camera.zoom + camera.screenW / 2;
                const padY = (-this.radius - camera.y) * camera.zoom + camera.screenH / 2;
                if (padX > -100 && padX < camera.screenW + 100 && padY > -100 && padY < camera.screenH + 100) {
                    ctx.save();
                    // Launch table
                    ctx.fillStyle = '#334155';
                    ctx.fillRect(padX - 25, padY, 50, 8);
                    ctx.strokeStyle = '#64748b';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(padX - 25, padY, 50, 8);

                    // Service gantry tower
                    ctx.fillStyle = '#dc2626';
                    ctx.fillRect(padX + 22, padY - 60, 8, 60);
                    ctx.strokeStyle = '#f87171';
                    ctx.strokeRect(padX + 22, padY - 60, 8, 60);

                    // Gantry arm
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(padX + 22, padY - 45);
                    ctx.lineTo(padX + 8, padY - 45);
                    ctx.stroke();

                    // Lightning mast
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(padX + 26, padY - 60);
                    ctx.lineTo(padX + 26, padY - 75);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        } else {
            // Tiny dot
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, Math.max(2, screenRadius), 0, Math.PI * 2);
            ctx.fill();
        }

        // Name label
        if (screenRadius > 5 || camera.zoom < 0.001) {
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '11px Rajdhani';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, screenX, screenY + screenRadius + 16);
        }
    }

    drawSurfaceDetail(ctx, sx, sy, sr) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        
        if (this.name === 'Earth') {
            // Continents (simplified)
            ctx.fillStyle = '#2d8a4e';
            const seed = 42;
            for (let i = 0; i < 6; i++) {
                const angle = (seed + i * 60) * Math.PI / 180;
                const r = sr * (0.3 + (i * 0.1));
                const cx = sx + Math.cos(angle) * r * 0.5;
                const cy = sy + Math.sin(angle) * r * 0.4;
                ctx.beginPath();
                ctx.ellipse(cx, cy, sr * 0.2, sr * 0.15, angle, 0, Math.PI * 2);
                ctx.fill();
            }
            // Clouds
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            for (let i = 0; i < 4; i++) {
                const angle = (i * 90 + 30) * Math.PI / 180;
                const cx = sx + Math.cos(angle) * sr * 0.4;
                const cy = sy + Math.sin(angle) * sr * 0.3;
                ctx.beginPath();
                ctx.ellipse(cx, cy, sr * 0.3, sr * 0.06, angle * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.name === 'Moon') {
            // Craters
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            const craters = [[0.2, -0.3, 0.08], [-0.3, 0.1, 0.12], [0.1, 0.3, 0.06], [-0.15, -0.2, 0.1], [0.35, 0.15, 0.05]];
            for (const [cx, cy, r] of craters) {
                ctx.beginPath();
                ctx.arc(sx + cx * sr, sy + cy * sr, r * sr, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.name === 'Mars') {
            // Mars features
            ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
            ctx.beginPath();
            ctx.arc(sx - sr * 0.1, sy + sr * 0.2, sr * 0.15, 0, Math.PI * 2);
            ctx.fill();
            // Polar cap
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.arc(sx, sy - sr * 0.85, sr * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    drawIndicator(ctx, sx, sy, camera) {
        const cx = camera.screenW / 2;
        const cy = camera.screenH / 2;
        const angle = Math.atan2(sy - cy, sx - cx);
        const margin = 40;
        
        const ix = cx + Math.cos(angle) * (Math.min(camera.screenW, camera.screenH) / 2 - margin);
        const iy = cy + Math.sin(angle) * (Math.min(camera.screenW, camera.screenH) / 2 - margin);
        
        // Clamp to screen
        const px = Utils.clamp(ix, margin, camera.screenW - margin);
        const py = Utils.clamp(iy, margin, camera.screenH - margin);
        
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '10px Rajdhani';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, px, py - 10);
        ctx.restore();
    }

    adjustColor(hex, amount) {
        const clamp = (n) => Math.min(255, Math.max(0, n));
        if (hex.startsWith('#')) {
            let r = parseInt(hex.slice(1, 3), 16);
            let g = parseInt(hex.slice(3, 5), 16);
            let b = parseInt(hex.slice(5, 7), 16);
            r = clamp(r + amount);
            g = clamp(g + amount);
            b = clamp(b + amount);
            return `rgb(${r},${g},${b})`;
        }
        return hex;
    }
}

// Pre-defined celestial bodies
const CelestialBodies = {
    createEarth(pos) {
        return new CelestialBody({
            name: 'Earth',
            mass: CONSTANTS.EARTH_MASS,
            radius: CONSTANTS.EARTH_RADIUS,
            pos: pos || { x: 0, y: 0 },
            color: '#4a90d9',
            surfaceColor: '#1a5fb4',
            hasAtmosphere: true,
            atmosphereHeight: CONSTANTS.ATM_HEIGHT,
            atmosphereColor: 'rgba(100, 180, 255, 0.12)',
            surfaceDensity: 1.225,
            scaleHeight: 8500,
            surfaceGravity: 9.807,
            type: 'planet',
            description: 'Our home planet, the third from the Sun.'
        });
    },

    createMoon(earthPos) {
        return new CelestialBody({
            name: 'Moon',
            mass: CONSTANTS.MOON_MASS,
            radius: CONSTANTS.MOON_RADIUS,
            pos: { x: earthPos.x + CONSTANTS.MOON_DISTANCE, y: earthPos.y },
            color: '#c8c8c8',
            surfaceColor: '#a0a0a0',
            hasAtmosphere: false,
            surfaceGravity: 1.625,
            type: 'moon',
            orbitRadius: CONSTANTS.MOON_DISTANCE,
            orbitSpeed: 2.662e-6, // radians/second
            description: 'Earth\'s only natural satellite.'
        });
    },

    createMars(pos) {
        return new CelestialBody({
            name: 'Mars',
            mass: CONSTANTS.MARS_MASS,
            radius: CONSTANTS.MARS_RADIUS,
            pos: pos || { x: 2.28e11, y: 0 },
            color: '#c1440e',
            surfaceColor: '#a0360b',
            hasAtmosphere: true,
            atmosphereHeight: 50000,
            atmosphereColor: 'rgba(200, 120, 80, 0.08)',
            surfaceDensity: 0.020,
            scaleHeight: 11100,
            surfaceGravity: 3.72,
            type: 'planet',
            description: 'The Red Planet, fourth from the Sun.'
        });
    },

    createSun(pos) {
        return new CelestialBody({
            name: 'Sun',
            mass: 1.989e30,
            radius: 6.957e8,
            pos: pos || { x: -1.496e11, y: 0 },
            color: '#ffd700',
            surfaceColor: '#ff8c00',
            type: 'star',
            description: 'Our solar system\'s star.'
        });
    }
};

