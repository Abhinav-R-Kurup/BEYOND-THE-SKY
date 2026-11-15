// Core: renderer, quality presets, texture loader, scene loop
import * as THREE from 'three';
import { IMG } from './assets.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const PRESETS = {
  low:    { scale: 0.65,  bloom: false, aa: false, shadows: false, stars: 1500, seg: 48,  particles: 0.4, clouds: false },
  medium: { scale: 1.0, bloom: true,  aa: false, shadows: false, stars: 3000, seg: 96,  particles: 0.7, clouds: true },
  high:   { scale: 1.0,  bloom: true,  aa: true,  shadows: true,  stars: 5000, seg: 160, particles: 1.0, clouds: true },
};

export const Core = {
  THREE, canvas: null, renderer: null, q: PRESETS.medium, qName: 'medium',
  scenes: {}, active: null, last: 0, time: 0, mouse: { x: 0, y: 0 }, texCache: {},
  fps: 60, _fa: 0, _fc: 0, autoScale: 1, ok: false, listeners: [],

  init() {
    const c = document.createElement('canvas');
    c.id = 'aaa-canvas';
    c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:0;display:block;pointer-events:none;background:#000';
    document.body.insertBefore(c, document.body.firstChild);
    this.canvas = c;
    const gl = c.getContext('webgl2', { antialias: false, powerPreference: 'high-performance', alpha: false });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.renderer = new THREE.WebGLRenderer({ canvas: c, context: gl, antialias: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX / innerWidth * 2 - 1; this.mouse.y = e.clientY / innerHeight * 2 - 1;
    });
    document.addEventListener('visibilitychange', () => { this.paused = document.hidden; this.last = performance.now(); });
    const pm = new THREE.PMREMGenerator(this.renderer); this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    this.ok = true;
    this.resize();
    requestAnimationFrame(t => this.loop(t));
  },

  setQuality(name) {
    if (!PRESETS[name]) name = 'medium';
    this.qName = name; this.q = PRESETS[name]; this.autoScale = 1;
    this.resize();
    this.listeners.forEach(f => f(name));
  },

  resize() {
    if (!this.renderer) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = this.q.scale * this.autoScale * dpr;
    const w = Math.max(2, Math.floor(innerWidth * s)), h = Math.max(2, Math.floor(innerHeight * s));
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = '100vw'; this.canvas.style.height = '100vh';
    Object.values(this.scenes).forEach(s => s.resize && s.resize(w, h));
  },

  register(name, scene) { this.scenes[name] = scene; },

  show(name) {
    if (this.active === name) return;
    if (this.active && this.scenes[this.active].hide) this.scenes[this.active].hide();
    this.active = name;
    this.renderer.toneMappingExposure = name === 'flight' ? .95 : 1.25;
    const s = name && this.scenes[name];
    this.canvas.style.visibility = s ? 'visible' : 'hidden';
    if (s) { s.show && s.show(); this.resize(); }
  },

  // base64 texture loader (sync-ish); returns THREE.Texture
  tex(key, { srgb = true, repeat = false } = {}) {
    const k = key + srgb + repeat;
    if (this.texCache[k]) return this.texCache[k];
    const img = new Image();
    const t = new THREE.Texture(img);
    img.onload = () => { t.needsUpdate = true; };
    img.src = IMG[key];
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    t.wrapS = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    this.texCache[k] = t; return t;
  },

  loop(t) {
    requestAnimationFrame(tt => this.loop(tt));
    if (this.paused) return;
    const dt = Math.min(0.05, (t - this.last) / 1000 || 0.016); this.last = t; this.time += dt;
    // dynamic resolution scaling
    this._fa += dt; this._fc++;
    if (this._fa > 1.5) {
      this.fps = this._fc / this._fa; this._fa = 0; this._fc = 0;
      if (this.auto) {
        if (this.fps < 28 && this.autoScale > 0.5) { this.autoScale = Math.max(0.5, this.autoScale - 0.1); this.resize(); }
        else if (this.fps > 56 && this.autoScale < 1) { this.autoScale = Math.min(1, this.autoScale + 0.05); this.resize(); }
      }
    }
    const s = this.active && this.scenes[this.active];
    if (!s) return;
    try { s.update && s.update(dt, this.time); s.render(this.renderer); }
    catch (e) { if (!this._err) { this._err = true; console.error('[AAA] render error', e); window.dispatchEvent(new Event('aaa-fail')); } }
  },
};
