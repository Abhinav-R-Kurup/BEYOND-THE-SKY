// Original procedural score + engine/wind SFX (WebAudio, no external files, no copyrighted material).
const A = { ctx: null, master: null, music: null, sfx: null, rev: null, started: false, mood: 'menu', musicOn: true, musicVol: .5, sfxVol: .7, eng: null, wind: null, nextT: 0, chordI: 0, timer: null, beat: 0 };

function impulse(ctx, sec = 3.2, decay = 2.6) {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
  return b;
}
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
// chord progression (midi), D Dorian / Bb / Gm / A sus: calm, open, cinematic
const CH = [[50, 57, 62, 65, 69], [46, 53, 58, 62, 65], [43, 50, 55, 58, 62], [45, 52, 57, 60, 64]];
const SCALE = [62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79];

A.start = function () {
  if (A.started) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
  try { A.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  const c = A.ctx; A.started = true;
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(c.destination);
  A.master = c.createGain(); A.master.gain.value = .9; A.master.connect(comp);
  A.music = c.createGain(); A.music.gain.value = A.musicOn ? A.musicVol * .35 : 0; A.music.connect(A.master);
  A.sfx = c.createGain(); A.sfx.gain.value = A.sfxVol; A.sfx.connect(A.master);
  A.rev = c.createConvolver(); A.rev.buffer = impulse(c); const rg = c.createGain(); rg.gain.value = .55; A.rev.connect(rg); rg.connect(A.music);
  A.dly = c.createDelay(1.5); A.dly.delayTime.value = .46; const fb = c.createGain(); fb.gain.value = .38; A.dly.connect(fb); fb.connect(A.dly); const dg = c.createGain(); dg.gain.value = .5; A.dly.connect(dg); dg.connect(A.rev); dg.connect(A.music);
  A.nextT = c.currentTime + .2; A.timer = setInterval(sched, 120);
  // engine & wind beds
  const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0); let b0 = 0; for (let i = 0; i < nd.length; i++) { const w = Math.random() * 2 - 1; b0 = .985 * b0 + .015 * w; nd[i] = (w * .5 + b0 * 6); } A._nb = nb;
  const mk = (f1, f2, q) => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f1; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f2; bp.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(lp); lp.connect(bp); bp.connect(g); g.connect(A.sfx); s.start(); return { g, lp, bp }; };
  A.eng = mk(420, 110, .6); A.eng2 = mk(2200, 900, .4); A.wind = mk(1800, 700, .5);
  const sub = c.createOscillator(); sub.type = 'sine'; sub.frequency.value = 38; const sg = c.createGain(); sg.gain.value = 0; sub.connect(sg); sg.connect(A.sfx); sub.start(); A.sub = sg; A.subOsc = sub;
};

function pad(t, notes, dur, bright) {
  const c = A.ctx;
  notes.forEach((m, i) => {
    for (const det of [-7, 6]) {
      const o = c.createOscillator(); o.type = i % 2 ? 'triangle' : 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500 + bright * 900; f.Q.value = .5;
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05 / (1 + i * .15), t + 3.2); g.gain.linearRampToValueAtTime(.04 / (1 + i * .15), t + dur - 1); g.gain.linearRampToValueAtTime(0, t + dur + 3);
      o.connect(f); f.connect(g); g.connect(A.music); g.connect(A.rev); o.start(t); o.stop(t + dur + 3.2);
    }
  });
  const b = c.createOscillator(); b.type = 'sine'; b.frequency.value = mtof(notes[0] - 12); const bg = c.createGain(); bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(.16, t + 2); bg.gain.linearRampToValueAtTime(0, t + dur + 2.5); b.connect(bg); bg.connect(A.music); b.start(t); b.stop(t + dur + 2.6);
}
function bell(t, m, vel = 1) {
  const c = A.ctx; const o = c.createOscillator(), o2 = c.createOscillator(); o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = mtof(m); o2.frequency.value = mtof(m + 12);
  const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09 * vel, t + .015); g.gain.exponentialRampToValueAtTime(.0008, t + 2.6);
  const g2 = c.createGain(); g2.gain.value = .18; o.connect(g); o2.connect(g2); g2.connect(g); g.connect(A.music); g.connect(A.dly); g.connect(A.rev); o.start(t); o2.start(t); o.stop(t + 2.8); o2.stop(t + 2.8);
}
function pulse(t) { const c = A.ctx; const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(42, t + .25); const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.13, t + .01); g.gain.exponentialRampToValueAtTime(.0005, t + .4); o.connect(g); g.connect(A.music); o.start(t); o.stop(t + .45); }

function sched() {
  if (!A.ctx || A.ctx.state !== 'running' || !A.musicOn) { if (A.ctx) A.nextT = Math.max(A.nextT, A.ctx.currentTime); return; }
  const c = A.ctx; const bar = A.mood === 'flight' ? 6.4 : 8;
  while (A.nextT < c.currentTime + .6) {
    const t = A.nextT, ch = CH[A.chordI % CH.length]; pad(t, ch, bar, A.mood === 'flight' ? .9 : A.mood === 'orbit' ? .4 : .6);
    const step = bar / 16; for (let i = 0; i < 16; i++) { const tt = t + i * step;
      if (A.mood === 'menu' || A.mood === 'orbit') { if (Math.random() < (A.mood === 'orbit' ? .16 : .26)) bell(tt, SCALE[(Math.random() * SCALE.length) | 0] - (Math.random() < .3 ? 12 : 0), .7 + Math.random() * .4); }
      else { if (i % 2 === 0 && Math.random() < .55) bell(tt, ch[(Math.random() * ch.length) | 0] + 12, .6); if (i % 4 === 0) pulse(tt); } }
    A.chordI++; A.nextT += bar - .4;
  }
}
A.setMood = m => { A.mood = m; };
A.setMusic = (on, vol) => { A.musicOn = on; A.musicVol = vol; if (A.music) A.music.gain.setTargetAtTime(on ? vol * .35 : 0, A.ctx.currentTime, .3); };
A.setSfx = v => { A.sfxVol = v; if (A.sfx) A.sfx.gain.setTargetAtTime(v, A.ctx.currentTime, .1); };
A.duck = (d) => { if (A.music && A.musicOn) A.music.gain.setTargetAtTime(A.musicVol * .35 * d, A.ctx.currentTime, .6); };
// engine: thr 0..1, dens 0..1 (air), q dynamic pressure, vib = structure-borne in vacuum
A.engine = (thr, dens, q = 0) => {
  if (!A.eng) return; const t = A.ctx.currentTime;
  const air = .12 + .88 * Math.min(1, dens * 3);
  A.eng.g.gain.setTargetAtTime(thr * .5 * air, t, .12); A.eng.lp.frequency.setTargetAtTime(260 + thr * 500, t, .2);
  A.eng2.g.gain.setTargetAtTime(thr * .08 * air, t, .12);
  A.sub.gain.setTargetAtTime(thr * .22, t, .15); A.subOsc.frequency.setTargetAtTime(34 + thr * 12, t, .2);
  A.wind.g.gain.setTargetAtTime(Math.min(.2, q / 90000) * (dens > .002 ? 1 : 0), t, .25); A.wind.bp.frequency.setTargetAtTime(500 + q / 60, t, .3);
};
A.hit = (kind) => { if (!A.ctx) return; const c = A.ctx, t = c.currentTime;
  if (kind === 'stage') { const o = c.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(60, t + .25); const g = c.createGain(); g.gain.setValueAtTime(.18, t); g.gain.exponentialRampToValueAtTime(.001, t + .4); o.connect(g); g.connect(A.sfx); o.start(t); o.stop(t + .45); }
  if (kind === 'ignite') { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(50, t); o.frequency.linearRampToValueAtTime(90, t + 2); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300; const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.25, t + 1); g.gain.exponentialRampToValueAtTime(.001, t + 3); o.connect(f); f.connect(g); g.connect(A.sfx); o.start(t); o.stop(t + 3.2); }
  if (kind === 'ok') { [0, 4, 7].forEach((s, i) => bell(t + i * .12, 74 + s, 1)); }
};
// energy-scaled impact explosion: noise burst (low-passed, longer for bigger), sub thump, no tonal ringing
A.boom = (f = .5, small = false) => { if (!A.ctx || !A.sfx) return; const c = A.ctx, t = c.currentTime, dur = .8 + 3.2 * f;
  const s = c.createBufferSource(); s.buffer = A._nb; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(small ? 1800 : 900 + 1400 * f, t); lp.frequency.exponentialRampToValueAtTime(70, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35 + .65 * f, t + .02); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(lp); lp.connect(g); g.connect(A.sfx); s.start(t); s.stop(t + dur + .1);
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(24, t + dur); const og = c.createGain(); og.gain.setValueAtTime(.7 * f + .1, t); og.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(og); og.connect(A.sfx); o.start(t); o.stop(t + dur + .1); A.duck && A.duck(.4); setTimeout(() => A.duck && A.duck(1), 2500); };
export const Audio3D = A;
