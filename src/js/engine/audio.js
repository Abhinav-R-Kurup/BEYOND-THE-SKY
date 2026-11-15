// ==========================================
// Audio Manager (Web Audio API)
// ==========================================

class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.3;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch(e) {
            console.warn('Audio not available:', e);
            this.enabled = false;
        }
    }

    play(type) {
        if (!this.enabled || !this.initialized) return;
        
        try {
            switch(type) {
                case 'click': this.playTone(800, 0.05, 'sine', 0.2); break;
                case 'hover': this.playTone(600, 0.03, 'sine', 0.1); break;
                case 'launch': this.playRumble(0.5); break;
                case 'stage': this.playTone(400, 0.2, 'square', 0.3); break;
                case 'explosion': this.playNoise(0.5); break;
                case 'success': this.playMelody([523, 659, 784], 0.15); break;
                case 'failure': this.playMelody([400, 300, 200], 0.2); break;
                case 'alert': this.playTone(1000, 0.1, 'square', 0.25); break;
                case 'engine': this.playRumble(0.3); break;
            }
        } catch(e) { /* silent fail */ }
    }

    playTone(freq, duration, type = 'sine', vol = 0.2) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(vol * this.volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playRumble(duration) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        
        const source = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        gain.gain.value = this.volume * 0.5;
        
        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
    }

    playNoise(duration) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
        }
        
        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        gain.gain.value = this.volume * 0.4;
        
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
    }

    playMelody(notes, noteLen) {
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, noteLen, 'sine', 0.3), i * noteLen * 1000);
        });
    }
}

const Audio = new AudioManager();

