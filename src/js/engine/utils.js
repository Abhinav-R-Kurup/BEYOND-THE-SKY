// ==========================================
// Utility Functions
// ==========================================

const Utils = {
    // Math helpers
    clamp(val, min, max) { return Math.max(min, Math.min(max, val)); },
    lerp(a, b, t) { return a + (b - a) * t; },
    degToRad(deg) { return deg * Math.PI / 180; },
    radToDeg(rad) { return rad * 180 / Math.PI; },
    distance(x1, y1, x2, y2) { return Math.sqrt((x2-x1)**2 + (y2-y1)**2); },
    
    // Vector helpers
    vec2(x, y) { return { x, y }; },
    vecAdd(a, b) { return { x: a.x + b.x, y: a.y + b.y }; },
    vecSub(a, b) { return { x: a.x - b.x, y: a.y - b.y }; },
    vecScale(v, s) { return { x: v.x * s, y: v.y * s }; },
    vecMag(v) { return Math.sqrt(v.x * v.x + v.y * v.y); },
    vecNorm(v) {
        const m = Utils.vecMag(v);
        return m > 0 ? { x: v.x/m, y: v.y/m } : { x: 0, y: 0 };
    },
    vecDot(a, b) { return a.x * b.x + a.y * b.y; },
    vecRotate(v, angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
    },

    // Format numbers
    formatNumber(n) {
        if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
        if (n >= 1e6) return (n/1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
        return n.toFixed(n < 10 ? 2 : 0);
    },
    
    formatDistance(meters) {
        if (meters >= 1e9) return (meters/1e9).toFixed(2) + ' Gm';
        if (meters >= 1e6) return (meters/1e6).toFixed(1) + ' Mm';
        if (meters >= 1e3) return (meters/1e3).toFixed(1) + ' km';
        return meters.toFixed(0) + ' m';
    },
    
    formatVelocity(mps) {
        if (mps >= 1000) return (mps/1000).toFixed(2) + ' km/s';
        return mps.toFixed(1) + ' m/s';
    },
    
    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    },
    
    formatMoney(amount) {
        if (amount >= 1e9) return '$' + (amount/1e9).toFixed(1) + 'B';
        if (amount >= 1e6) return '$' + (amount/1e6).toFixed(1) + 'M';
        if (amount >= 1e3) return '$' + (amount/1e3).toFixed(0) + 'K';
        return '$' + amount.toFixed(0);
    },
    
    // Random
    random(min, max) { return Math.random() * (max - min) + min; },
    randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
    randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    
    // Screen management
    showScreen(screenId) {
        const targetScreen = document.getElementById(screenId);
        if (!targetScreen) return;

        document.querySelectorAll('.screen').forEach(s => {
            if (s !== targetScreen) {
                s.classList.remove('active', 'fade-in', 'fade-out');
                s.style.display = 'none';
            }
        });

        targetScreen.style.display = 'flex';
        // trigger reflow
        void targetScreen.offsetWidth;
        targetScreen.classList.add('active', 'fade-in');
    },

    // LocalStorage helpers
    saveData(key, data) {
        try {
            localStorage.setItem('SMDS_' + key, JSON.stringify(data));
        } catch(e) { console.warn('Save failed:', e); }
    },
    
    loadData(key) {
        try {
            const data = localStorage.getItem('SMDS_' + key);
            return data ? JSON.parse(data) : null;
        } catch(e) { return null; }
    },
    
    // Deep clone
    deepClone(obj) { return JSON.parse(JSON.stringify(obj)); },
    
    // Generate unique ID
    uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); },
    
    // Canvas helpers
    drawRoundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    },
    
    drawGlow(ctx, x, y, radius, color) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    },
    
    // Orbital mechanics
    orbitalVelocity(mass, radius) {
        return Math.sqrt(CONSTANTS.G * mass / radius);
    },
    
    escapeVelocity(mass, radius) {
        return Math.sqrt(2 * CONSTANTS.G * mass / radius);
    },
    
    // Calculate delta-v using Tsiolkovsky equation
    deltaV(isp, m0, mf) {
        if (mf <= 0 || m0 <= mf) return 0;
        return isp * CONSTANTS.EARTH_SURFACE_GRAVITY * Math.log(m0 / mf);
    }
};

