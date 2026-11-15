// ==========================================
// Renderer
// ==========================================

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = {
            x: 0, y: 0,
            zoom: 0.00005,
            targetZoom: 0.00005,
            targetX: 0, targetY: 0,
            screenW: 0, screenH: 0,
            following: null
        };
        this.stars = [];
        this.resize();
        this.generateStars();
        
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = this.canvas.parentElement?.clientWidth || window.innerWidth;
        this.canvas.height = this.canvas.parentElement?.clientHeight || window.innerHeight;
        this.camera.screenW = this.canvas.width;
        this.camera.screenH = this.canvas.height;
    }

    generateStars() {
        this.stars = [];
        for (let i = 0; i < CONSTANTS.STAR_COUNT; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.5 + 0.5,
                twinkle: Math.random() * Math.PI * 2
            });
        }
    }

    updateCamera(dt) {
        // Smooth camera follow
        if (this.camera.following) {
            this.camera.targetX = this.camera.following.pos.x;
            this.camera.targetY = this.camera.following.pos.y;
        }
        
        this.camera.x += (this.camera.targetX - this.camera.x) * 0.1;
        this.camera.y += (this.camera.targetY - this.camera.y) * 0.1;
        this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.08;
    }

    clear() {
        this.ctx.fillStyle = CONSTANTS.COLORS.space;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawStars(time) {
        const ctx = this.ctx;
        for (const star of this.stars) {
            const twinkle = Math.sin(time * 2 + star.twinkle) * 0.3 + 0.7;
            const alpha = star.brightness * twinkle;
            
            // Parallax
            const parallaxFactor = 0.0001;
            const sx = ((star.x * this.canvas.width + this.camera.x * parallaxFactor * star.size) % this.canvas.width + this.canvas.width) % this.canvas.width;
            const sy = ((star.y * this.canvas.height + this.camera.y * parallaxFactor * star.size) % this.canvas.height + this.canvas.height) % this.canvas.height;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawTrajectory(points) {
        if (points.length < 2) return;
        const ctx = this.ctx;
        const cam = this.camera;
        
        ctx.strokeStyle = CONSTANTS.COLORS.trajectory;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        
        const startIdx = Math.max(0, points.length - 500);
        for (let i = startIdx; i < points.length; i++) {
            const sx = (points[i].x - cam.x) * cam.zoom + cam.screenW / 2;
            const sy = (points[i].y - cam.y) * cam.zoom + cam.screenH / 2;
            if (i === startIdx) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    }

    drawSpacecraft(sc, particles) {
        if (!sc || sc.destroyed) return;
        
        const ctx = this.ctx;
        const cam = this.camera;
        const sx = (sc.pos.x - cam.x) * cam.zoom + cam.screenW / 2;
        const sy = (sc.pos.y - cam.y) * cam.zoom + cam.screenH / 2;
        
        // Min size for visibility
        const minSize = 14;
        const scale = Math.max(minSize, 30 * cam.zoom * 20000);
        
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(sc.rotation);
        
        // Draw each part of the spacecraft
        this.drawSpacecraftParts(ctx, sc, scale);
        
        // Engine exhaust from lowest parts
        if (sc.isThrusting && particles) {
            const exhaustLocalY = scale * 0.45;
            for (let i = 0; i < 4; i++) {
                const spread = (Math.random() - 0.5) * 6;
                const exhaustWorld = Utils.vecRotate({ x: spread, y: exhaustLocalY }, sc.rotation);
                const pVel = Utils.vecRotate({ x: (Math.random() - 0.5) * 15, y: Utils.random(40, 90) }, sc.rotation);
                particles.emit(
                    sx + exhaustWorld.x,
                    sy + exhaustWorld.y,
                    {
                        vx: pVel.x,
                        vy: pVel.y,
                        life: Utils.random(0.3, 0.7),
                        size: Utils.random(2, 6),
                        color: Math.random() > 0.4 ? '#ff6b35' : (Math.random() > 0.5 ? '#f59e0b' : '#ef4444')
                    }
                );
            }
        }
        
        ctx.restore();
        
        // Heating effect
        if (sc.heating > 0.1) {
            const glowRadius = scale * 2;
            const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowRadius);
            gradient.addColorStop(0, `rgba(255, 100, 0, ${sc.heating * 0.4})`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(sx, sy, glowRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawSpacecraftParts(ctx, sc, scale) {
        const parts = sc.assembledParts || [];
        
        if (parts.length === 0) {
            // Fallback simple rocket shape
            this.drawDefaultRocket(ctx, scale);
            return;
        }
        
        let avgX = 0, avgY = 0;
        if (parts.length > 0) {
            let sumX = 0, sumY = 0;
            parts.forEach(p => { sumX += (p.x || 0); sumY += (p.y || 0); });
            avgX = sumX / parts.length;
            avgY = sumY / parts.length;
        }
        
        const partScale = scale / 60;
        for (const part of parts) {
            const partW = (part.width || 20) * partScale;
            const partH = (part.height || 20) * partScale;
            const px = ((part.x || 0) - avgX) * partScale;
            const py = ((part.y || 0) - avgY) * partScale;
            
            ctx.save();
            ctx.translate(px, py);
            if (part.rotation) ctx.rotate(part.rotation);
            this.drawPart(ctx, part, 0, -partH / 2, partW, partH, scale);
            ctx.restore();
        }
    }
    
    drawPart(ctx, part, x, y, w, h, scale) {
        const cat = part.category;
        
        switch(cat) {
            case 'command':
                // Capsule shape (cone top)
                ctx.fillStyle = '#4a90d9';
                ctx.beginPath();
                ctx.moveTo(x - w/2, y + h);
                ctx.lineTo(x - w/3, y);
                ctx.lineTo(x + w/3, y);
                ctx.lineTo(x + w/2, y + h);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#6ab0ff';
                ctx.lineWidth = 1;
                ctx.stroke();
                // Window
                ctx.fillStyle = '#88ccff';
                ctx.beginPath();
                ctx.arc(x, y + h * 0.4, w * 0.15, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'fuel':
                ctx.fillStyle = '#d97706';
                Utils.drawRoundRect(ctx, x - w/2, y, w, h, 3);
                ctx.fill();
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 1;
                ctx.stroke();
                // Fuel level indicator
                ctx.fillStyle = '#92400e';
                ctx.fillRect(x - w/2 + 2, y + 2, w - 4, h * 0.3);
                break;
                
            case 'engine':
                // Nozzle shape
                ctx.fillStyle = '#7c3aed';
                ctx.beginPath();
                ctx.moveTo(x - w/3, y);
                ctx.lineTo(x - w/2, y + h);
                ctx.lineTo(x + w/2, y + h);
                ctx.lineTo(x + w/3, y);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#a78bfa';
                ctx.lineWidth = 1;
                ctx.stroke();
                break;
                
            case 'booster':
                ctx.fillStyle = '#dc2626';
                Utils.drawRoundRect(ctx, x - w/2, y, w, h, 2);
                ctx.fill();
                ctx.strokeStyle = '#f87171';
                ctx.lineWidth = 1;
                ctx.stroke();
                break;
                
            case 'structural':
                ctx.fillStyle = '#475569';
                Utils.drawRoundRect(ctx, x - w/2, y, w, h, 2);
                ctx.fill();
                ctx.strokeStyle = '#64748b';
                ctx.lineWidth = 1;
                ctx.stroke();
                break;
                
            case 'utility':
                ctx.fillStyle = '#0891b2';
                Utils.drawRoundRect(ctx, x - w/2, y, w, h, 2);
                ctx.fill();
                // Solar panel wings
                if (part.type === 'solar_panel') {
                    ctx.fillStyle = '#164e63';
                    ctx.fillRect(x - w * 1.2, y + 2, w * 0.5, h - 4);
                    ctx.fillRect(x + w * 0.7, y + 2, w * 0.5, h - 4);
                }
                break;
                
            case 'science':
                ctx.fillStyle = '#7c3aed';
                Utils.drawRoundRect(ctx, x - w/2, y, w, h, 3);
                ctx.fill();
                ctx.strokeStyle = '#a855f7';
                ctx.lineWidth = 1;
                ctx.stroke();
                break;
                
            case 'payload':
                ctx.fillStyle = '#059669';
                Utils.drawRoundRect(ctx, x - w/2, y, w, h, 3);
                ctx.fill();
                ctx.strokeStyle = '#34d399';
                ctx.lineWidth = 1;
                ctx.stroke();
                // Antenna
                if (part.type === 'antenna' || part.type === 'dish_antenna') {
                    ctx.strokeStyle = '#34d399';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, y - h * 0.5);
                    ctx.stroke();
                }
                break;
                
            default:
                ctx.fillStyle = '#64748b';
                Utils.drawRoundRect(ctx, x - w/2, y, w, h, 2);
                ctx.fill();
        }
    }

    drawDefaultRocket(ctx, scale) {
        // Nose cone
        ctx.fillStyle = '#4a90d9';
        ctx.beginPath();
        ctx.moveTo(0, -scale * 0.5);
        ctx.lineTo(-scale * 0.15, -scale * 0.25);
        ctx.lineTo(scale * 0.15, -scale * 0.25);
        ctx.closePath();
        ctx.fill();

        // Body
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-scale * 0.12, -scale * 0.25, scale * 0.24, scale * 0.45);

        // Fuel tank
        ctx.fillStyle = '#d97706';
        ctx.fillRect(-scale * 0.12, scale * 0.05, scale * 0.24, scale * 0.2);

        // Engine
        ctx.fillStyle = '#7c3aed';
        ctx.beginPath();
        ctx.moveTo(-scale * 0.1, scale * 0.25);
        ctx.lineTo(-scale * 0.15, scale * 0.45);
        ctx.lineTo(scale * 0.15, scale * 0.45);
        ctx.lineTo(scale * 0.1, scale * 0.25);
        ctx.closePath();
        ctx.fill();

        // Fins
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(-scale * 0.12, scale * 0.15);
        ctx.lineTo(-scale * 0.25, scale * 0.45);
        ctx.lineTo(-scale * 0.12, scale * 0.35);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(scale * 0.12, scale * 0.15);
        ctx.lineTo(scale * 0.25, scale * 0.45);
        ctx.lineTo(scale * 0.12, scale * 0.35);
        ctx.closePath();
        ctx.fill();

        // Window
        ctx.fillStyle = '#88ccff';
        ctx.beginPath();
        ctx.arc(0, -scale * 0.15, scale * 0.04, 0, Math.PI * 2);
        ctx.fill();
    }

    drawOrbitPreview(body, spacecraft) {
        if (!spacecraft || !spacecraft.inOrbit) return;
        
        const ctx = this.ctx;
        const cam = this.camera;
        const bx = (body.pos.x - cam.x) * cam.zoom + cam.screenW / 2;
        const by = (body.pos.y - cam.y) * cam.zoom + cam.screenH / 2;
        
        // Draw orbit ellipse approximation
        if (spacecraft.orbitApoapsis < Infinity && spacecraft.orbitPeriapsis > -body.radius) {
            const ap = (spacecraft.orbitApoapsis + body.radius) * cam.zoom;
            const pe = (spacecraft.orbitPeriapsis + body.radius) * cam.zoom;
            const a = (ap + pe) / 2;
            const c = (ap - pe) / 2;
            const b = Math.sqrt(Math.abs(a * a - c * c));
            
            ctx.strokeStyle = CONSTANTS.COLORS.orbit;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.ellipse(bx + c, by, Math.abs(a), Math.abs(b), 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.camera.x) * this.camera.zoom + this.camera.screenW / 2,
            y: (worldY - this.camera.y) * this.camera.zoom + this.camera.screenH / 2
        };
    }

    screenToWorld(screenX, screenY) {
        return {
            x: (screenX - this.camera.screenW / 2) / this.camera.zoom + this.camera.x,
            y: (screenY - this.camera.screenH / 2) / this.camera.zoom + this.camera.y
        };
    }
}

