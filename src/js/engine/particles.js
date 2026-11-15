// ==========================================
// Particle System
// ==========================================

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = CONSTANTS.PARTICLE_MAX;
    }

    emit(x, y, config) {
        if (this.particles.length >= this.maxParticles) {
            this.particles.shift();
        }
        
        this.particles.push({
            x, y,
            vx: config.vx || 0,
            vy: config.vy || 0,
            life: config.life || 1,
            maxLife: config.life || 1,
            size: config.size || 3,
            color: config.color || '#ff6b35',
            decay: config.decay || 1
        });
    }

    emitBurst(x, y, count, config) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Utils.random(config.minSpeed || 20, config.maxSpeed || 100);
            this.emit(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: Utils.random(0.3, config.maxLife || 1.5),
                size: Utils.random(config.minSize || 1, config.maxSize || 5),
                color: config.color || Utils.randomChoice(['#ff6b35', '#ff4444', '#ffaa33', '#ffffff']),
                decay: config.decay || 1
            });
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt * p.decay;
            p.vx *= 0.99;
            p.vy *= 0.99;
            
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            const alpha = p.life / p.maxLife;
            const size = p.size * alpha;
            
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha * 0.8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    clear() {
        this.particles = [];
    }
}

