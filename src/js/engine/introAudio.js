// ==========================================
// Intro Score - procedural cinematic theme
// Pipe-organ swells, ticking clock, rising arpeggio ostinato,
// a held breath of silence, then the lightning-strike impact.
// 100% synthesized with the Web Audio API (no audio files needed).
// Timings are in seconds from the start of the intro and are kept
// in sync with Intro.cfg.T in src/js/ui/intro.js
// ==========================================

const IntroScore = {
    ctx: null,
    out: null,
    duck: null,
    dry: null,
    send: null,
    noiseBuf: null,
    organWave: null,
    reedWave: null,
    t0: 0,
    active: false,

    midi(n) { return 440 * Math.pow(2, (n - 69) / 12); },

    // ---------- lifecycle ----------
    start(volume = 0.8) {
        if (this.active) return this.t0;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
            const ctx = this.ctx = new AC();
            if (ctx.state === 'suspended') ctx.resume();

            // master chain: duck -> compressor -> out
            const comp = ctx.createDynamicsCompressor();
            comp.threshold.value = -16;
            comp.knee.value = 18;
            comp.ratio.value = 3;
            comp.attack.value = 0.01;
            comp.release.value = 0.35;
            this.out = ctx.createGain();
            this.out.gain.value = volume;
            this.duck = ctx.createGain();
            this.duck.connect(comp);
            comp.connect(this.out);
            this.out.connect(ctx.destination);

            // dry bus + big dark reverb send
            this.dry = ctx.createGain();
            this.dry.connect(this.duck);
            const conv = ctx.createConvolver();
            conv.buffer = this._impulse(5.2, 2.2);
            this.send = ctx.createGain();
            const wet = ctx.createGain();
            wet.gain.value = 0.85;
            this.send.connect(conv);
            conv.connect(wet);
            wet.connect(this.duck);

            this._buildResources();
            this.t0 = ctx.currentTime + 0.15;
            this._schedule(this.t0);
            this.active = true;
            return this.t0;
        } catch (e) {
            console.warn('IntroScore failed:', e);
            return null;
        }
    },

    stop(fade = 0.7) {
        if (!this.ctx || !this.out) return;
        const ctx = this.ctx;
        try {
            const now = ctx.currentTime;
            this.out.gain.cancelScheduledValues(now);
            this.out.gain.setValueAtTime(this.out.gain.value, now);
            this.out.gain.linearRampToValueAtTime(0.0001, now + fade);
            setTimeout(() => { try { ctx.close(); } catch (e) {} }, (fade + 0.3) * 1000);
        } catch (e) {}
        this.active = false;
    },

    // ---------- resources ----------
    _impulse(seconds, decay) {
        const ctx = this.ctx;
        const len = Math.floor(ctx.sampleRate * seconds);
        const buf = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            let y = 0;
            for (let i = 0; i < len; i++) {
                const k = i / len;
                const x = (Math.random() * 2 - 1) * Math.pow(1 - k, decay);
                const a = 0.55 - 0.45 * k; // gets darker as it decays
                y += (x - y) * a;
                d[i] = y;
            }
        }
        return buf;
    },

    _buildResources() {
        const ctx = this.ctx;
        const n = ctx.sampleRate * 4;
        this.noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;

        const z = (len) => new Float32Array(len);
        const organ = [0, 1, 0.55, 0.32, 0.22, 0.1, 0.14, 0.04, 0.08];
        const reed = [0, 1, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1];
        this.organWave = ctx.createPeriodicWave(z(organ.length), Float32Array.from(organ));
        this.reedWave = ctx.createPeriodicWave(z(reed.length), Float32Array.from(reed));
    },

    _route(node, rev = 0.5, dry = 1) {
        const ctx = this.ctx;
        if (dry > 0) {
            const g = ctx.createGain();
            g.gain.value = dry;
            node.connect(g);
            g.connect(this.dry);
        }
        if (rev > 0) {
            const s = ctx.createGain();
            s.gain.value = rev;
            node.connect(s);
            s.connect(this.send);
        }
    },

    // ---------- instruments ----------
    // sustained organ voice with filter swell
    _organ(freq, t, dur, o = {}) {
        const ctx = this.ctx;
        const vol = o.vol ?? 0.06, a = o.a ?? 1.5, r = o.r ?? 1.5;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.Q.value = 0.6;
        f.frequency.setValueAtTime(o.c0 ?? 700, t);
        f.frequency.linearRampToValueAtTime(o.c1 ?? 2600, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + a);
        g.gain.setValueAtTime(vol, Math.max(t + a, t + dur - r));
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        f.connect(g);
        const dets = o.detune ?? [-6, 6];
        dets.forEach(dc => {
            const osc = ctx.createOscillator();
            osc.setPeriodicWave(o.reed ? this.reedWave : this.organWave);
            osc.frequency.value = freq;
            osc.detune.value = dc;
            osc.connect(f);
            osc.start(t);
            osc.stop(t + dur + 0.05);
        });
        this._route(g, o.rev ?? 0.55, 0.8);
    },

    _chord(notes, t, dur, o = {}) {
        notes.forEach((n, i) => {
            this._organ(this.midi(n), t + i * 0.04, dur, o);
        });
    },

    // soft glassy pluck (the ostinato / harp)
    _pluck(freq, t, vol, bright = 2200, rev = 0.9) {
        const ctx = this.ctx;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(bright, t);
        f.frequency.exponentialRampToValueAtTime(Math.max(300, bright * 0.25), t + 0.5);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        f.connect(g);
        const o1 = ctx.createOscillator();
        o1.type = 'triangle';
        o1.frequency.value = freq;
        const o2 = ctx.createOscillator();
        o2.type = 'sine';
        o2.frequency.value = freq * 2;
        const g2 = ctx.createGain();
        g2.gain.value = 0.35;
        o1.connect(f);
        o2.connect(g2);
        g2.connect(f);
        o1.start(t); o2.start(t);
        o1.stop(t + 0.75); o2.stop(t + 0.75);
        this._route(g, rev, 0.55);
    },

    // wooden clock tick (alternating left/right)
    _tick(t, vol, pan) {
        const ctx = this.ctx;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 3000;
        bp.Q.value = 2.5;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
        src.connect(bp);
        bp.connect(g);
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = 1150;
        const og = ctx.createGain();
        og.gain.setValueAtTime(vol * 0.8, t);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        o.connect(og);
        let tail = ctx.createGain();
        g.connect(tail);
        og.connect(tail);
        if (ctx.createStereoPanner) {
            const p = ctx.createStereoPanner();
            p.pan.value = pan;
            tail.connect(p);
            tail = p;
        }
        this._route(tail, 0.3, 1);
        src.start(t, Math.random() * 2, 0.05);
        o.start(t);
        o.stop(t + 0.06);
    },

    _drone(t, dur) {
        const ctx = this.ctx;
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 180;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.16, t + 5.5);
        g.gain.linearRampToValueAtTime(0.24, t + 16.2);
        g.gain.linearRampToValueAtTime(0.13, t + 18.2);
        g.gain.linearRampToValueAtTime(0.11, t + 26.5);
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        f.connect(g);
        [[55, 'sine', 0], [82.41, 'sine', 4], [110, 'triangle', -3], [55.2, 'sawtooth', 0]].forEach(([fr, ty, dc]) => {
            const o = ctx.createOscillator();
            o.type = ty;
            o.frequency.value = fr;
            o.detune.value = dc;
            const og = ctx.createGain();
            og.gain.value = ty === 'sawtooth' ? 0.18 : 0.7;
            o.connect(og);
            og.connect(f);
            o.start(t);
            o.stop(t + dur + 0.1);
        });
        this._route(g, 0.25, 1);
    },

    _riser(t, dur) {
        const ctx = this.ctx;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        src.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 1.1;
        bp.frequency.setValueAtTime(220, t);
        bp.frequency.exponentialRampToValueAtTime(7000, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.5, t + dur);
        src.connect(bp);
        bp.connect(g);
        src.start(t);
        src.stop(t + dur + 0.05);
        this._route(g, 0.4, 1);

        // tonal swell underneath
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(110, t);
        o.frequency.exponentialRampToValueAtTime(880, t + dur);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(300, t);
        lp.frequency.exponentialRampToValueAtTime(5000, t + dur);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.0001, t);
        og.gain.exponentialRampToValueAtTime(0.09, t + dur);
        o.connect(lp);
        lp.connect(og);
        o.start(t);
        o.stop(t + dur + 0.05);
        this._route(og, 0.5, 1);
    },

    _boom(t, vol = 1) {
        const ctx = this.ctx;
        // sub drop
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(115, t);
        o.frequency.exponentialRampToValueAtTime(31, t + 1.7);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.9 * vol, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
        o.connect(g);
        o.start(t);
        o.stop(t + 3.9);
        this._route(g, 0.35, 1);

        // body thump / crack
        const n = ctx.createBufferSource();
        n.buffer = this.noiseBuf;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(2600, t);
        lp.frequency.exponentialRampToValueAtTime(140, t + 1.2);
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.0001, t);
        ng.gain.linearRampToValueAtTime(0.75 * vol, t + 0.006);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
        n.connect(lp);
        lp.connect(ng);
        n.start(t, 0, 1.6);
        this._route(ng, 0.6, 1);
    },

    _sparkle(t, vol = 0.05, base = 84) {
        [0, 4, 7, 12, 16].forEach((st, i) => {
            const f = this.midi(base + st);
            const o = this.ctx.createOscillator();
            o.type = 'sine';
            o.frequency.value = f;
            const g = this.ctx.createGain();
            const s = t + i * 0.07;
            g.gain.setValueAtTime(0.0001, s);
            g.gain.linearRampToValueAtTime(vol, s + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0001, s + 3.2);
            o.connect(g);
            o.start(s);
            o.stop(s + 3.3);
            this._route(g, 1, 0.3);
        });
    },

    // ---------- the score ----------
    _schedule(T) {
        const ctx = this.ctx;
        const A = (s) => T + s;

        // Bed
        this._drone(A(0.2), 28.2);

        // Ticking clock (stops just before the held silence)
        let k = 0;
        for (let s = 1.5; s < 16.3; s += 0.75, k++) {
            const prog = (s - 1.5) / 14.8;
            this._tick(A(s), 0.07 + 0.11 * prog, k % 2 ? 0.35 : -0.35);
        }

        // Organ pads, overlapping swells (Am - F - C - G flavour)
        const pads = [
            [6.0, 5.2, [45, 52, 57, 60], 0.05],     // A minor
            [9.4, 4.6, [41, 48, 53, 57, 64], 0.06], // F maj7
            [12.4, 4.4, [48, 55, 60, 64, 67], 0.075], // C
            [15.2, 1.6, [43, 50, 55, 59, 62], 0.09]   // G
        ];
        pads.forEach(([s, d, notes, v]) => this._chord(notes, A(s), d, { vol: v, a: 2.2, r: 1.2, c0: 500, c1: 2400 }));

        // Rising ostinato (original pattern, A minor arpeggios)
        const chords = [
            [7.5, [57, 64, 69, 72, 76]],  // Am
            [10.5, [53, 60, 65, 69, 72]], // F
            [13.5, [60, 64, 67, 72, 76]], // C
            [16.5, [55, 62, 67, 71, 74]], // G
            [19.5, [57, 64, 69, 72, 76]]  // Am
        ];
        const pattern = [0, 1, 2, 3, 4, 3, 2, 1];
        const step = 0.1875;
        const vAt = (s) => {
            if (s < 16.5) return 0.035 + (s - 7.5) / 9 * 0.12;
            return 0.1 - (s - 17.1) / 5 * 0.04;
        };
        let idx = 0;
        for (let s = 7.5; s < 21.8; s += step, idx++) {
            if (s > 16.45 && s < 17.1) continue; // the held breath
            let notes = chords[0][1];
            chords.forEach(c => { if (s >= c[0]) notes = c[1]; });
            const n = notes[pattern[idx % pattern.length]];
            const bright = 1400 + Math.min(1, (s - 7.5) / 9) * 2600;
            this._pluck(this.midi(n), A(s), Math.max(0.02, vAt(s)), bright);
        }

        // Build: riser into the silence
        this._riser(A(12.0), 4.45);

        // The held breath: everything ducks, then returns on impact
        this.duck.gain.setValueAtTime(1, A(16.35));
        this.duck.gain.linearRampToValueAtTime(0.08, A(16.5));
        this.duck.gain.setValueAtTime(0.08, A(17.05));
        this.duck.gain.setValueAtTime(1, A(17.07));

        // IMPACT - lightning strike on the logo
        this._boom(A(17.1), 1);
        this._sparkle(A(17.15), 0.05, 84);
        this._chord([33, 45, 52, 57, 60, 64, 71], A(17.1), 5.4,
            { vol: 0.12, a: 0.06, r: 2.2, c0: 1600, c1: 4600, reed: true, rev: 0.7 });

        // Title: lift to F, soft sub hit, glassy harp
        this._boom(A(22.1), 0.45);
        this._chord([41, 53, 57, 60, 64, 69], A(22.0), 3.6,
            { vol: 0.1, a: 1.2, r: 1.6, c0: 900, c1: 3800, rev: 0.7 });
        const harp = [69, 72, 76, 81, 76, 72, 69, 64];
        harp.forEach((n, i) => this._pluck(this.midi(n), A(22.6 + i * 0.42), 0.06, 4200, 1.1));
        this._sparkle(A(23.9), 0.035, 88);

        // Final resolve and fade
        this._chord([33, 45, 52, 57, 60, 64, 71], A(24.7), 3.9,
            { vol: 0.1, a: 1.4, r: 2.6, c0: 900, c1: 3000, rev: 0.8 });

        this.out.gain.setValueAtTime(this.out.gain.value, A(27.4));
        this.out.gain.linearRampToValueAtTime(0.0001, A(28.5));
    }
};
