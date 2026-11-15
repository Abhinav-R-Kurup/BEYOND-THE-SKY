// ==========================================
// Cinematic Intro Sequence
// An INCREDIBLES Production
//
//  0.0  deep space, letterbox opens, nebula + stars drift in
//  3.0  a black hole rises; the spacecraft glides past
//  9.0  "AN INCREDIBLES PRODUCTION"
// 11.0  the camera is pulled in, stars stretch toward the horizon
// 16.5  cut to black, a held breath of silence
// 17.1  lightning strikes: the INCREDIBLES logo is struck into being
// 22.3  the game title rises over a sunrise limb of Earth
// 28.5  fade to the main menu
//
// All graphics are drawn live on <canvas>; the score is synthesized
// in src/js/engine/introAudio.js. Tune timings in cfg.T below
// (and the matching times in IntroScore._schedule).
// ==========================================

const Intro = {
    cfg: {
        requireGesture: true,   // browsers need a click before audio can play
        T: {
            bars: [0.4, 2.4],
            stars: [0.3, 3.0],
            bh: [3.0, 7.5],
            craft: [5.0, 15.8],
            caption: [9.0, 14.4],
            warp: [11.0, 16.45],
            cut: 16.45,
            strike: 17.1,
            wordmark: 18.1,
            logoOut: 21.3,
            title: 22.3,
            subtitle: 23.8,
            sun: [21.8, 26.5],
            titleOut: 27.2,
            end: 28.5
        }
    },

    // logo geometry, traced from the supplied artwork (1254 x 1254 source)
    LOGO: {
        dot: { x: 662.3, y: 276.8, r: 99.6 },
        bolt: [[602, 420], [767, 419], [817, 767], [652, 724], [754, 1087], [439, 564], [650, 612]],
        cx: 627.5, cy: 633.5,
        top: 177, bottom: 1089, left: 437, right: 818
    },

    canvas: null, ctx: null, W: 0, H: 0, dpr: 1,
    raf: 0, started: false, skipped: false, t0: 0, last: 0,
    stars: [], diskDots: [], sparks: [], trail: [], cues: [],
    nebula: null, vignette: null, grain: null, grainTick: 0,
    path: null, geo: null,

    // ---------- helpers ----------
    clamp01(v) { return Math.max(0, Math.min(1, v)); },
    ramp(t, a, b) { return this.clamp01((t - a) / (b - a)); },
    smooth(x) { return x * x * (3 - 2 * x); },
    easeOut(x) { return 1 - Math.pow(1 - x, 3); },
    easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    easeOutBack(x) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    lerp(a, b, k) { return a + (b - a) * k; },
    rnd(a, b) { return a + Math.random() * (b - a); },

    // ---------- init ----------
    init() {
        this.canvas = document.getElementById('intro-canvas');
        if (!this.canvas) { this.finishNow(); return; }
        this.ctx = this.canvas.getContext('2d');

        this.buildPaths();
        this.splitTitle();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.generateStars();
        this.generateDisk();
        this.bindControls();

        const soundOn = !(typeof Audio !== 'undefined' && Audio.enabled === false);
        const gate = document.getElementById('intro-gate');
        if (this.cfg.requireGesture && soundOn && gate) {
            gate.classList.add('show');
            const go = (e) => {
                if (e && e.type === 'keydown' && !['Enter', ' ', 'Spacebar'].includes(e.key)) return;
                window.removeEventListener('keydown', go);
                gate.removeEventListener('click', go);
                gate.classList.remove('show');
                this.begin(true);
            };
            gate.addEventListener('click', go);
            window.addEventListener('keydown', go);
            this.idleLoop();
        } else {
            if (gate) gate.classList.remove('show');
            this.begin(soundOn);
        }
    },

    buildPaths() {
        const L = this.LOGO;
        const p = new Path2D();
        p.arc(L.dot.x, L.dot.y, L.dot.r, 0, Math.PI * 2);
        const b = new Path2D();
        L.bolt.forEach((pt, i) => i ? b.lineTo(pt[0], pt[1]) : b.moveTo(pt[0], pt[1]));
        b.closePath();
        this.path = { dot: p, bolt: b };
    },

    splitTitle() {
        const el = document.getElementById('game-title');
        if (!el || el.dataset.split) return;
        const txt = el.textContent.trim();
        el.setAttribute('aria-label', txt);
        el.textContent = '';
        let i = 0;
        txt.split(' ').forEach((word, wi, arr) => {
            const w = document.createElement('span');
            w.className = 'word';
            w.setAttribute('aria-hidden', 'true');
            [...word].forEach(ch => {
                const s = document.createElement('span');
                s.className = 'ch';
                s.style.setProperty('--i', i++);
                s.textContent = ch;
                w.appendChild(s);
            });
            el.appendChild(w);
            if (wi < arr.length - 1) { el.appendChild(document.createTextNode(' ')); i++; }
        });
        el.dataset.split = '1';
    },

    resize() {
        if (!this.canvas) return;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.W = window.innerWidth;
        this.H = window.innerHeight;
        this.canvas.width = Math.round(this.W * this.dpr);
        this.canvas.height = Math.round(this.H * this.dpr);
        this.canvas.style.width = this.W + 'px';
        this.canvas.style.height = this.H + 'px';
        this.buildNebula();
        this.buildVignette();
        this.layoutLogo();
    },

    layoutLogo() {
        const L = this.LOGO, W = this.W, H = this.H;
        const lh = L.bottom - L.top, lw = L.right - L.left;
        const s = Math.min((H * 0.40) / lh, (W * 0.62) / lw);
        const cx = W / 2;
        const cy = H * 0.47;
        const bottomY = cy + (L.bottom - L.cy) * s;
        this.geo = { s, cx, cy, bottomY, lw: lw * s };
        const root = document.getElementById('intro-screen');
        if (root) {
            root.style.setProperty('--wm-top', (bottomY + H * 0.045) + 'px');
            root.style.setProperty('--wm-size', Math.max(13, 42 * s) + 'px');
        }
    },

    buildNebula() {
        const W = Math.round(this.W * 1.35), H = Math.round(this.H * 1.35);
        const c = document.createElement('canvas');
        c.width = Math.max(2, W >> 1); c.height = Math.max(2, H >> 1);
        const x = c.getContext('2d');
        x.globalCompositeOperation = 'lighter';
        const blobs = [
            [0.25, 0.30, 0.55, [40, 70, 190], 0.20],
            [0.78, 0.62, 0.60, [120, 50, 170], 0.15],
            [0.55, 0.82, 0.45, [20, 140, 170], 0.13],
            [0.12, 0.78, 0.40, [60, 40, 140], 0.14],
            [0.88, 0.18, 0.35, [200, 90, 60], 0.08],
            [0.50, 0.45, 0.70, [30, 50, 120], 0.12]
        ];
        blobs.forEach(([bx, by, br, col, a]) => {
            const r = br * Math.max(c.width, c.height);
            const g = x.createRadialGradient(bx * c.width, by * c.height, 0, bx * c.width, by * c.height, r);
            g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
            g.addColorStop(0.5, `rgba(${col[0]},${col[1]},${col[2]},${a * 0.35})`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            x.fillStyle = g;
            x.fillRect(0, 0, c.width, c.height);
        });
        this.nebula = c;
    },

    buildVignette() {
        const c = document.createElement('canvas');
        c.width = Math.max(2, Math.round(this.W / 2));
        c.height = Math.max(2, Math.round(this.H / 2));
        const x = c.getContext('2d');
        const g = x.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.35,
            c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.78);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.78)');
        x.fillStyle = g;
        x.fillRect(0, 0, c.width, c.height);
        this.vignette = c;
    },

    generateStars() {
        this.stars = [];
        for (let i = 0; i < 460; i++) this.stars.push(this.newStar(true));
    },

    newStar(initial) {
        const tint = Math.random();
        return {
            x: this.rnd(-1.5, 1.5),
            y: this.rnd(-1.5, 1.5),
            z: initial ? this.rnd(0.12, 1) : 1,
            tw: Math.random() * 6.28,
            col: tint < 0.12 ? [170, 200, 255] : tint < 0.2 ? [255, 215, 180] : [255, 255, 255]
        };
    },

    generateDisk() {
        this.diskDots = [];
        for (let i = 0; i < 130; i++) {
            this.diskDots.push({
                r: this.rnd(1.25, 3.7),
                th: Math.random() * 6.283,
                len: this.rnd(0.05, 0.28),
                a: this.rnd(0.35, 1)
            });
        }
    },

    bindControls() {
        const skip = document.getElementById('skip-intro');
        if (skip) skip.addEventListener('click', (e) => { e.stopPropagation(); this.finish(); });
        window.addEventListener('keydown', (e) => {
            if (this.started && !this.skipped && ['Escape', 'Enter', ' '].includes(e.key)) this.finish();
        });
    },

    // ---------- run ----------
    begin(withAudio) {
        if (this.started) return;
        this.started = true;
        cancelAnimationFrame(this.raf);

        if (withAudio && typeof IntroScore !== 'undefined') {
            const vol = (typeof Audio !== 'undefined' && typeof Audio.volume === 'number') ? Audio.volume : 0.5;
            IntroScore.start(Math.max(0.35, Math.min(1, vol * 1.6)));
        }
        this.t0 = performance.now() + 150; // matches IntroScore's 0.15s lead-in
        this.last = performance.now();

        const T = this.cfg.T;
        const el = (id) => document.getElementById(id);
        const add = (id, cls) => () => el(id) && el(id).classList.add(cls);
        const rem = (id, cls) => () => el(id) && el(id).classList.remove(cls);
        this.cues = [
            [0.5, add('skip-intro', 'show')],
            [T.caption[0], add('intro-caption', 'show')],
            [T.caption[1], rem('intro-caption', 'show')],
            [T.wordmark, add('intro-wordmark', 'show')],
            [T.logoOut, rem('intro-wordmark', 'show')],
            [T.title, () => {
                const tc = el('game-title-container');
                if (tc) { tc.classList.remove('hidden'); void tc.offsetWidth; tc.classList.add('visible'); }
            }],
            [T.subtitle, add('game-title-container', 'sub')],
            [T.titleOut, add('intro-screen', 'ending')],
            [T.end, () => this.finish()]
        ].map(c => ({ t: c[0], fn: c[1], done: false }));

        this.loop();
    },

    idleLoop() {
        if (this.started) return;
        const c = this.ctx;
        c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        c.fillStyle = '#000';
        c.fillRect(0, 0, this.W, this.H);
        this.raf = requestAnimationFrame(() => this.idleLoop());
    },

    loop() {
        if (this.skipped) return;
        const now = performance.now();
        const t = Math.max(0, (now - this.t0) / 1000);
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;

        this.cues.forEach(c => { if (!c.done && t >= c.t) { c.done = true; c.fn(); } });
        this.render(t, dt);
        this.raf = requestAnimationFrame(() => this.loop());
    },

    finish() {
        if (this.skipped) return;
        this.skipped = true;
        cancelAnimationFrame(this.raf);
        if (typeof IntroScore !== 'undefined') IntroScore.stop(0.7);
        const root = document.getElementById('intro-screen');
        if (root) root.classList.add('leaving');
        setTimeout(() => this.finishNow(), 700);
    },

    finishNow() {
        Utils.showScreen('menu-screen');
        if (typeof Menu !== 'undefined' && Menu.init) Menu.init();
    },

    // ---------- render ----------
    render(t, dt) {
        const c = this.ctx, W = this.W, H = this.H, T = this.cfg.T;
        c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = 1;
        c.shadowBlur = 0;
        const inSpace = t < T.cut;
        const A3 = (window.AAAGlue && window.AAAGlue.on && window.AAA && AAA.Core.scenes.intro && AAA.Core.active === 'intro') ? AAA.Core.scenes.intro : null;
        if (A3 && inSpace) c.clearRect(0, 0, W, H);
        else { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
        const p = this.ramp(t, 3.0, T.cut);              // approach progress
        const R = Math.min(W, H) * (0.045 + 0.115 * this.easeOut(p));
        const bx = W * (0.66 - 0.16 * this.easeInOut(p));
        const by = H * 0.5;
        const starsVis = this.smooth(this.ramp(t, T.stars[0], T.stars[1]));

        // ----- Scene A: deep space + black hole -----
        if (inSpace) {
            const warp = Math.pow(this.ramp(t, T.warp[0], T.warp[1]), 2.2);
            const bh = this.smooth(this.ramp(t, T.bh[0], T.bh[1]));
            if (A3) {
                const fadeIn = this.smooth(this.ramp(t, 0.2, 2.2));
                A3.set({ x: bx / W, y: by / H, r: (R / H) * 0.92, a: Math.max(fadeIn, bh), p, warp });
                if (warp > 0.02) this.drawStars(c, dt, bx, by, 0.012 + 2.4 * warp, starsVis, warp);
            } else {
                this.drawStars(c, dt, bx, by, 0.012 + 2.4 * warp, starsVis, warp);
                if (bh > 0.001) this.drawBlackHole(c, bx, by, R, bh, t, p);
            }
            this.drawCraft(c, t, dt);

            if (t > T.cut - 0.5) {
                const f = this.ramp(t, T.cut - 0.5, T.cut);
                c.fillStyle = `rgba(255,236,210,${0.18 * f})`;
                c.fillRect(0, 0, W, H);
            }
        } else if (t >= T.strike - 0.02) {
            // ----- Scene B/C: calm star field behind the logo and title -----
            const after = this.ramp(t, T.strike, T.strike + 1.5);
            this.drawNebula(c, t, 0.35 * after);
            this.drawStars(c, dt, W / 2, H / 2, 0.01, 0.55 * after, 0);
        }

        // ----- logo strike -----
        if (t >= T.strike - 0.2 && t < T.logoOut + 1.4) this.drawLogoScene(c, t, dt);

        // ----- sunrise over Earth (title) -----
        if (t >= T.sun[0]) this.drawEarth(c, t);

        // ----- screen flash at the strike -----
        const lt = t - T.strike;
        if (lt > 0 && lt < 0.5) {
            const f = Math.pow(1 - lt / 0.5, 2);
            c.fillStyle = `rgba(235,245,255,${0.95 * f})`;
            c.fillRect(0, 0, W, H);
        }

        this.drawFilm(c, t);

        // fade to black at the end
        if (t > T.titleOut) {
            c.fillStyle = `rgba(0,0,0,${this.ramp(t, T.titleOut, T.end - 0.1)})`;
            c.fillRect(0, 0, W, H);
        }
    },

    drawNebula(c, t, a) {
        if (!this.nebula || a <= 0.001) return;
        const W = this.W, H = this.H;
        const sc = 1 + 0.012 * t;
        const w = W * 1.35 * sc, h = H * 1.35 * sc;
        const ox = -(w - W) / 2 - Math.sin(t * 0.05) * 18;
        const oy = -(h - H) / 2 + Math.cos(t * 0.04) * 12;
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = a * 0.95;
        c.drawImage(this.nebula, ox, oy, w, h);
        c.restore();
    },

    drawStars(c, dt, cx, cy, speed, vis, warp) {
        if (vis <= 0.001) return;
        const S = Math.max(this.W, this.H) * 0.45;
        const W = this.W, H = this.H;
        const now = performance.now() * 0.002;
        c.save();
        c.globalCompositeOperation = 'lighter';
        this.stars.forEach((s) => {
            s.z -= speed * dt;
            let px = cx + (s.x / s.z) * S, py = cy + (s.y / s.z) * S;
            if (s.z < 0.03 || px < -W * 0.3 || px > W * 1.3 || py < -H * 0.3 || py > H * 1.3) {
                Object.assign(s, this.newStar(false));
                px = cx + (s.x / s.z) * S; py = cy + (s.y / s.z) * S;
            }
            const near = 1 - s.z;
            const tw = 0.75 + 0.25 * Math.sin(now + s.tw);
            const a = Math.min(1, (0.25 + near * 0.9) * tw) * vis;
            const col = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${a})`;
            if (warp > 0.04) {
                const zp = s.z + speed * 0.045;
                const qx = cx + (s.x / zp) * S, qy = cy + (s.y / zp) * S;
                c.strokeStyle = col;
                c.lineWidth = 0.5 + near * 1.6;
                c.beginPath();
                c.moveTo(qx, qy);
                c.lineTo(px, py);
                c.stroke();
            } else {
                c.fillStyle = col;
                c.beginPath();
                c.arc(px, py, 0.35 + near * 1.5, 0, 6.283);
                c.fill();
            }
        });
        c.restore();
    },

    streak(c, x, y, len, thick, rgb, a) {
        if (a <= 0.002) return;
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.translate(x, y);
        c.scale(1, thick / len);
        const g = c.createRadialGradient(0, 0, 0, 0, 0, len);
        g.addColorStop(0, `rgba(${rgb},${a})`);
        g.addColorStop(0.25, `rgba(${rgb},${a * 0.45})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, 0, len, 0, 6.283);
        c.fill();
        c.restore();
    },

    drawBlackHole(c, bx, by, R, a, t, p) {
        const heat = 0.45 + 0.55 * this.easeOut(p);
        c.save();

        // outer glow
        c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(bx, by, R * 0.9, bx, by, R * 7.5);
        g.addColorStop(0, `rgba(255,185,110,${0.34 * a * heat})`);
        g.addColorStop(0.3, `rgba(255,110,40,${0.12 * a * heat})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(bx, by, R * 7.5, 0, 6.283);
        c.fill();

        // lensed halo: bright above and below, thin at the sides
        const rings = [[1.16, 0.115, 0.95], [1.27, 0.07, 0.6], [1.38, 0.045, 0.4], [1.5, 0.03, 0.22]];
        rings.forEach(([rr, wd, al]) => {
            const N = 90;
            for (let i = 0; i < N; i++) {
                const a0 = (i / N) * 6.2832, a1 = ((i + 1.4) / N) * 6.2832;
                const m = Math.pow(Math.abs(Math.sin((a0 + a1) / 2)), 1.4);
                c.lineWidth = R * wd * (0.12 + 0.88 * m);
                c.strokeStyle = `rgba(255,${Math.round(200 - rr * 12)},${Math.round(150 - rr * 20)},${al * a * heat * (0.35 + 0.65 * m)})`;
                c.beginPath();
                c.arc(bx, by, R * rr, a0, a1);
                c.stroke();
            }
        });

        // the shadow
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#000';
        c.beginPath();
        c.arc(bx, by, R * 1.02, 0, 6.283);
        c.fill();

        // accretion band crossing in front, slightly tilted
        c.globalCompositeOperation = 'lighter';
        c.translate(bx, by);
        c.rotate(-0.09);
        const rx = R * 3.9;
        const bandG = c.createLinearGradient(-rx, 0, rx, 0);
        bandG.addColorStop(0, 'rgba(255,120,40,0)');
        bandG.addColorStop(0.14, `rgba(255,130,50,${0.55 * a * heat})`);
        bandG.addColorStop(0.34, `rgba(255,200,130,${0.95 * a * heat})`);
        bandG.addColorStop(0.5, `rgba(255,236,205,${0.85 * a * heat})`);
        bandG.addColorStop(0.66, `rgba(255,170,90,${0.7 * a * heat})`);
        bandG.addColorStop(0.86, `rgba(220,90,35,${0.4 * a * heat})`);
        bandG.addColorStop(1, 'rgba(200,70,30,0)');
        c.fillStyle = bandG;
        for (let i = 0; i < 6; i++) {
            c.beginPath();
            c.ellipse(0, 0, rx * (1 - i * 0.02), R * (0.30 - i * 0.043), 0, 0, 6.283);
            c.globalAlpha = 0.34 + i * 0.1;
            c.fill();
        }
        c.globalAlpha = 1;

        // swirling matter, faster closer in
        this.diskDots.forEach(d => {
            const th = d.th + t * (1.8 / Math.pow(d.r, 1.5));
            const x = Math.cos(th) * d.r * R;
            const y = Math.sin(th) * d.r * R * 0.075;
            const L = d.len * R;
            const fall = 1 - this.clamp01((d.r - 1.25) / 2.6);
            c.strokeStyle = `rgba(255,${Math.round(190 + fall * 55)},${Math.round(140 + fall * 90)},${d.a * a * heat * (0.4 + 0.6 * fall)})`;
            c.lineWidth = 1 + fall * 1.2;
            c.beginPath();
            c.moveTo(x, y);
            c.lineTo(x - Math.sin(th) * L, y + Math.cos(th) * L * 0.07);
            c.stroke();
        });
        c.restore();

        // anamorphic glare that grows as we approach
        this.streak(c, bx, by, R * 9, R * 0.16, '255,205,150', 0.55 * a * heat * this.ramp(p, 0.25, 1));
        this.streak(c, bx, by, R * 4.5, R * 0.05, '255,240,225', 0.5 * a * heat * this.ramp(p, 0.5, 1));
    },

    drawCraft(c, t, dt) {
        const T = this.cfg.T, W = this.W, H = this.H;
        const q = this.ramp(t, T.craft[0], T.craft[1]);
        if (q <= 0 || q >= 1) return;
        const x = this.lerp(-0.07 * W, 1.06 * W, q);
        const y = H * (0.30 - 0.04 * q) + Math.sin(q * 4) * 4;
        const ang = -0.04 + 0.03 * Math.sin(q * 3);
        const sc = Math.min(W, H) / 820 * 1.1;
        const fade = Math.min(this.ramp(q, 0, 0.08), 1 - this.ramp(q, 0.92, 1));

        if (Math.random() > 0.35) this.trail.push({ x: x - 22 * sc, y: y + 0.5, life: 1 });
        c.save();
        c.globalCompositeOperation = 'lighter';
        for (let i = this.trail.length - 1; i >= 0; i--) {
            const tr = this.trail[i];
            tr.life -= dt * 0.9;
            if (tr.life <= 0) { this.trail.splice(i, 1); continue; }
            c.fillStyle = `rgba(80,200,230,${tr.life * 0.35 * fade})`;
            c.beginPath();
            c.arc(tr.x, tr.y, tr.life * 2.6 * sc + 0.3, 0, 6.283);
            c.fill();
        }
        c.restore();

        c.save();
        c.translate(x, y);
        c.rotate(ang);
        c.scale(sc, sc);
        c.globalAlpha = fade;
        const glow = c.createRadialGradient(-18, 0, 0, -18, 0, 18);
        glow.addColorStop(0, 'rgba(120,230,255,0.9)');
        glow.addColorStop(1, 'rgba(6,182,212,0)');
        c.fillStyle = glow;
        c.beginPath();
        c.arc(-18, 0, 18, 0, 6.283);
        c.fill();
        c.fillStyle = '#cfd8e6';
        c.beginPath();
        c.moveTo(25, 0); c.lineTo(-12, -8); c.lineTo(-16, -6); c.lineTo(-16, 6); c.lineTo(-12, 8);
        c.closePath();
        c.fill();
        c.fillStyle = '#0a5f93';
        c.fillRect(-6, -18, 12, 8);
        c.fillRect(-6, 10, 12, 8);
        c.fillStyle = '#7cecff';
        c.beginPath();
        c.arc(10, 0, 3, 0, 6.283);
        c.fill();
        c.strokeStyle = 'rgba(255,190,120,0.75)';   // rim light from the black hole
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(25, 0); c.lineTo(-12, 8);
        c.stroke();
        c.restore();
    },

    // ---------- logo ----------
    lightning(c, x0, y0, x1, y1, seed, alpha) {
        const rnd = (n) => { const v = Math.sin(seed * 91.7 + n * 12.9898) * 43758.5453; return v - Math.floor(v); };
        const pts = [[x0, y0]];
        const N = 16;
        for (let i = 1; i < N; i++) {
            const k = i / N;
            const j = (1 - Math.abs(k - 0.5) * 0.6) * 46;
            pts.push([this.lerp(x0, x1, k) + (rnd(i) - 0.5) * j * 2, this.lerp(y0, y1, k)]);
        }
        pts.push([x1, y1]);
        const draw = (list, lw, col) => {
            c.strokeStyle = col;
            c.lineWidth = lw;
            c.lineJoin = 'round';
            c.beginPath();
            list.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
            c.stroke();
        };
        const branch = [];
        [4, 9].forEach((bi, n) => {
            const s = pts[bi];
            const dir = n ? 1 : -1;
            const b = [s];
            for (let i = 1; i <= 5; i++) b.push([s[0] + dir * i * 22 + (rnd(bi + i) - 0.5) * 18, s[1] + i * 26]);
            branch.push(b);
        });
        c.save();
        c.globalCompositeOperation = 'lighter';
        draw(pts, 14, `rgba(90,160,255,${0.18 * alpha})`);
        branch.forEach(b => draw(b, 6, `rgba(90,160,255,${0.16 * alpha})`));
        draw(pts, 5, `rgba(170,215,255,${0.6 * alpha})`);
        branch.forEach(b => draw(b, 2.2, `rgba(190,225,255,${0.5 * alpha})`));
        draw(pts, 1.8, `rgba(255,255,255,${alpha})`);
        c.restore();
    },

    drawLogoScene(c, t, dt) {
        const T = this.cfg.T, W = this.W, H = this.H, L = this.LOGO, g = this.geo;
        const lt = t - T.strike;
        const out = this.smooth(this.ramp(t, T.logoOut, T.logoOut + 1.0));
        const vis = 1 - out;

        // blue halo behind the logo
        const halo = this.easeOut(this.ramp(lt, 0, 1.4)) * vis;
        if (halo > 0.001) {
            const hg = c.createRadialGradient(g.cx, g.cy, 0, g.cx, g.cy, Math.max(W, H) * 0.55);
            hg.addColorStop(0, `rgba(70,130,255,${0.22 * halo})`);
            hg.addColorStop(0.4, `rgba(40,80,200,${0.08 * halo})`);
            hg.addColorStop(1, 'rgba(0,0,0,0)');
            c.save();
            c.globalCompositeOperation = 'lighter';
            c.fillStyle = hg;
            c.fillRect(0, 0, W, H);
            c.restore();
        }

        const scale = g.s * (1 + 0.010 * Math.max(0, lt) + 0.12 * out);
        const toScreen = (sx, sy) => [g.cx + (sx - L.cx) * scale, g.cy + (sy - L.cy) * scale];
        const dotP = toScreen(L.dot.x, L.dot.y);
        const dotR = L.dot.r * scale;

        // lightning arriving from above the frame
        if (lt > -0.16 && lt < 0.2) {
            const seed = Math.floor((lt + 1) * 45);
            const a = lt < 0 ? this.ramp(lt, -0.16, -0.02) : 1 - this.ramp(lt, 0.05, 0.2);
            this.lightning(c, dotP[0] + Math.sin(seed) * 40, H * 0.08, dotP[0], dotP[1] - dotR * 0.9, seed, a);
        }

        if (lt >= 0 && vis > 0.001) {
            const wipe = this.easeOut(this.ramp(lt, 0.18, 0.62));
            const yEdge = L.bolt[0][1] + (L.bottom - L.bolt[0][1]) * wipe;

            // sparks
            if (lt < 0.06 && this.sparks.length < 40) this.burst(dotP[0], dotP[1], 40, 360, 1);
            if (lt >= 0.18 && lt <= 0.64) {
                const halfW = (L.right - L.left) * 0.18;
                for (let i = 0; i < 3; i++) {
                    const sp = toScreen(this.rnd(L.cx - halfW, L.cx + halfW), yEdge);
                    this.spark(sp[0], sp[1], this.rnd(-90, 90), this.rnd(-60, 140), this.rnd(0.4, 0.9));
                }
            }

            c.save();
            c.translate(g.cx, g.cy);
            c.scale(scale, scale);
            c.translate(-L.cx, -L.cy);

            const settle = this.ramp(lt, 0.5, 1.6);
            const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
            c.shadowColor = `rgba(120,190,255,${0.95 * vis})`;
            c.shadowBlur = (46 - 26 * settle + 4 * pulse * settle) * this.dpr;
            c.fillStyle = `rgba(255,255,255,${vis})`;

            // the dot of the "i"
            const dp = this.easeOutBack(this.ramp(lt, 0.02, 0.42));
            if (dp > 0.001) {
                c.save();
                c.translate(L.dot.x, L.dot.y);
                c.scale(dp, dp);
                c.translate(-L.dot.x, -L.dot.y);
                c.fill(this.path.dot);
                c.restore();
            }

            // the bolt is struck downward
            if (wipe > 0.001) {
                c.save();
                c.beginPath();
                c.rect(L.left - 40, L.top + 200, (L.right - L.left) + 80, yEdge - (L.top + 200));
                c.clip();
                c.fill(this.path.bolt);
                c.restore();
            }
            c.shadowBlur = 0;

            // white-hot leading edge while it travels
            if (wipe > 0.001 && wipe < 0.999) {
                c.save();
                c.globalCompositeOperation = 'lighter';
                c.beginPath();
                c.rect(L.left - 40, yEdge - 26, (L.right - L.left) + 80, 26);
                c.clip();
                c.fillStyle = 'rgba(200,230,255,0.9)';
                c.fill(this.path.bolt);
                c.restore();
            }

            // shine pass
            const sh = this.ramp(lt, 1.0, 2.6);
            if (sh > 0 && sh < 1) {
                c.save();
                c.globalCompositeOperation = 'lighter';
                c.clip(this.path.bolt);
                const sx = this.lerp(L.left - 250, L.right + 250, sh);
                const sg = c.createLinearGradient(sx - 90, L.top, sx + 90, L.bottom);
                sg.addColorStop(0, 'rgba(120,200,255,0)');
                sg.addColorStop(0.5, 'rgba(160,220,255,0.55)');
                sg.addColorStop(1, 'rgba(120,200,255,0)');
                c.fillStyle = sg;
                c.fillRect(L.left - 300, L.top, 1100, 1000);
                c.restore();
                c.save();
                c.globalCompositeOperation = 'lighter';
                c.clip(this.path.dot);
                c.fillStyle = `rgba(150,215,255,${0.35 * Math.sin(sh * 3.1416)})`;
                c.fillRect(L.left, L.top, 400, 220);
                c.restore();
            }
            c.restore();

            // shockwaves + anamorphic streaks
            this.ring(c, dotP[0], dotP[1], dotR, this.ramp(lt, 0, 1.1), 11, 0.65 * vis);
            if (lt > 0.6) {
                const tip = toScreen(L.bolt[4][0], L.bolt[4][1]);
                this.ring(c, tip[0], tip[1], dotR * 0.3, this.ramp(lt, 0.6, 1.5), 7, 0.45 * vis);
                this.streak(c, tip[0], tip[1], g.lw * 1.2, 5, '150,210,255', 0.55 * (1 - this.ramp(lt, 0.6, 1.6)) * vis);
            }
            const sa = (1 - this.ramp(lt, 0, 1.6)) * vis;
            this.streak(c, dotP[0], dotP[1], W * 0.7, 10, '150,205,255', 0.95 * sa);
            this.streak(c, dotP[0], dotP[1], W * 0.28, 4, '255,255,255', 0.9 * sa);
        }

        this.updateSparks(c, dt);
    },

    ring(c, x, y, r0, k, grow, a) {
        if (k <= 0 || k >= 1) return;
        const e = this.easeOut(k);
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = `rgba(170,215,255,${a * (1 - k)})`;
        c.lineWidth = 1 + 3 * (1 - k);
        c.beginPath();
        c.arc(x, y, r0 * (1 + grow * e), 0, 6.283);
        c.stroke();
        c.restore();
    },

    spark(x, y, vx, vy, life) {
        if (this.sparks.length > 220) return;
        this.sparks.push({ x, y, vx, vy, life, max: life, s: this.rnd(0.8, 2.2) });
    },

    burst(x, y, n, speed, life) {
        for (let i = 0; i < n; i++) {
            const a = Math.random() * 6.283, v = this.rnd(speed * 0.2, speed);
            this.spark(x, y, Math.cos(a) * v, Math.sin(a) * v, this.rnd(0.4, life + 0.6));
        }
    },

    updateSparks(c, dt) {
        if (!this.sparks.length) return;
        c.save();
        c.globalCompositeOperation = 'lighter';
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.life -= dt;
            if (s.life <= 0) { this.sparks.splice(i, 1); continue; }
            s.vx *= 0.985;
            s.vy = s.vy * 0.985 + 90 * dt;
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            const k = s.life / s.max;
            c.strokeStyle = `rgba(${Math.round(170 + 85 * k)},${Math.round(215 + 40 * k)},255,${k})`;
            c.lineWidth = s.s * (0.5 + k);
            c.beginPath();
            c.moveTo(s.x, s.y);
            c.lineTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03);
            c.stroke();
        }
        c.restore();
    },

    // ---------- Earth limb + sunrise for the title ----------
    drawEarth(c, t) {
        const T = this.cfg.T, W = this.W, H = this.H;
        const e = this.smooth(this.ramp(t, T.sun[0], T.sun[0] + 2.8));
        if (e <= 0.001) return;
        const Rr = W * 1.1;
        const cx = W / 2;
        const top = H * (1.05 - 0.31 * this.easeOut(this.ramp(t, T.sun[0], T.sun[1])));
        const cy = top + Rr;

        c.save();
        c.globalAlpha = e;
        const body = c.createRadialGradient(cx, cy - Rr * 0.3, Rr * 0.2, cx, cy, Rr);
        body.addColorStop(0, '#02060f');
        body.addColorStop(0.9, '#030a18');
        body.addColorStop(1, '#06162e');
        c.fillStyle = body;
        c.beginPath();
        c.arc(cx, cy, Rr, 0, 6.283);
        c.fill();

        // atmosphere rim
        c.globalCompositeOperation = 'lighter';
        const rim = c.createRadialGradient(cx, cy, Rr * 0.985, cx, cy, Rr * 1.035);
        rim.addColorStop(0, 'rgba(30,110,255,0)');
        rim.addColorStop(0.45, 'rgba(70,170,255,0.55)');
        rim.addColorStop(1, 'rgba(30,110,255,0)');
        c.fillStyle = rim;
        c.beginPath();
        c.arc(cx, cy, Rr * 1.04, 0, 6.283);
        c.fill();

        // sun climbing over the horizon on the right
        const sunK = this.easeOut(this.ramp(t, T.sun[0] + 0.8, T.sun[1]));
        const ang = -Math.PI / 2 + 0.34;
        const sx = cx + Math.cos(ang) * Rr * (1.0 + 0.012 * sunK);
        const sy = cy + Math.sin(ang) * Rr * (1.0 + 0.012 * sunK) - 6 * sunK;
        const sg = c.createRadialGradient(sx, sy, 0, sx, sy, Math.min(W, H) * (0.18 + 0.1 * sunK));
        sg.addColorStop(0, `rgba(255,245,225,${0.95 * sunK})`);
        sg.addColorStop(0.15, `rgba(255,190,110,${0.7 * sunK})`);
        sg.addColorStop(0.5, `rgba(255,110,40,${0.2 * sunK})`);
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = sg;
        c.fillRect(0, 0, W, H);

        // warm bloom hugging the horizon near the sun
        c.globalAlpha = e * sunK * 0.5;
        const hg = c.createLinearGradient(sx - W * 0.45, 0, sx + W * 0.45, 0);
        hg.addColorStop(0, 'rgba(255,140,60,0)');
        hg.addColorStop(0.5, 'rgba(255,150,70,0.5)');
        hg.addColorStop(1, 'rgba(255,140,60,0)');
        c.strokeStyle = hg;
        c.lineWidth = 3;
        c.beginPath();
        c.arc(cx, cy, Rr * 1.001, -Math.PI / 2 - 0.5, -Math.PI / 2 + 1.2);
        c.stroke();
        c.restore();

        this.streak(c, sx, sy, W * 0.6, 7, '255,200,150', 0.7 * sunK * e);
        this.streak(c, sx, sy, W * 0.22, 3, '255,250,240', 0.7 * sunK * e);
    },

    // ---------- film look ----------
    drawFilm(c, t) {
        const W = this.W, H = this.H, T = this.cfg.T;
        c.save();
        c.globalAlpha = 0.9;
        c.drawImage(this.vignette, 0, 0, W, H);
        c.restore();

        // grain
        if (!this.grain) {
            this.grain = document.createElement('canvas');
            this.grain.width = this.grain.height = 128;
        }
        if ((this.grainTick++ % 2) === 0) {
            const gx = this.grain.getContext('2d');
            const id = gx.createImageData(128, 128);
            for (let i = 0; i < id.data.length; i += 4) {
                const v = Math.random() * 255;
                id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
                id.data[i + 3] = 255;
            }
            gx.putImageData(id, 0, 0);
        }
        c.save();
        c.globalAlpha = 0.05;
        c.globalCompositeOperation = 'overlay';
        c.fillStyle = c.createPattern(this.grain, 'repeat');
        c.fillRect(0, 0, W, H);
        c.restore();

        // letterbox bars
        const bh = H * 0.105 * this.easeInOut(this.ramp(t, T.bars[0], T.bars[1]));
        c.fillStyle = '#000';
        c.fillRect(0, 0, W, bh);
        c.fillRect(0, H - bh, W, bh);
    }
};
