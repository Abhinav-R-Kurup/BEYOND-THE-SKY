import * as THREE from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Core } from './core.js';
import { makeEarth, makeMoon, makeMars, makeSun, makeStars } from './planets.js';
import { makePart, makeFairingHalf } from './models.js';
import { makeGround, makeSky } from './ground.js';
import { makeComplex } from './complex.js';

const S = 0.19;                    // metres per builder pixel (a 330 px stack ~ 63 m, like a real launcher)
const SUN = new THREE.Vector3(.45, .62, .64).normalize();
const SITE = { lat: 13.72, lon: 80.23 };   // Sriharikota launch site orientation for the texture
const KM = 1000;

function earthQuat() {
  const lat = THREE.MathUtils.degToRad(SITE.lat), lon = THREE.MathUtils.degToRad(SITE.lon);
  const p = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon));
  const e = new THREE.Vector3(-Math.sin(lon), 0, -Math.cos(lon));
  const n = new THREE.Vector3(-Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon));
  const A = new THREE.Matrix4().makeBasis(e, n, p);                       // local frame -> world(local coords)
  const B = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0));
  const M = B.multiply(A.transpose());
  return new THREE.Quaternion().setFromRotationMatrix(M);
}

class DualPass extends Pass {
  constructor(fl) { super(); this.fl = fl; this.needsSwap = false; }
  render(renderer, writeBuffer, readBuffer) { renderer.setRenderTarget(this.renderToScreen ? null : readBuffer); this.fl.renderDual(renderer); }
}

function flameTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(.12, 'rgba(255,225,150,.95)'); gr.addColorStop(.4, 'rgba(255,140,40,.6)'); gr.addColorStop(1, 'rgba(255,60,10,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const rg = g.createLinearGradient(0, 0, 64, 0); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(.5, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = rg; g.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}
function puffTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
}

export function createFlightScene() {
  const far = new THREE.Scene(), near = new THREE.Scene();
  const camFar = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 2e9), camNear = new THREE.PerspectiveCamera(50, 16 / 9, 0.4, 6e5);
  const sunV = SUN.clone();

  // ---- FAR (km) ----
  const starsG = makeStars(1e8); far.add(starsG);
  const earth = makeEarth(6371, { atm: 0.985, power: 7 }); earth.userData.body.quaternion.copy(earthQuat()); far.add(earth); earth.userData.u.sunDir.value.copy(sunV);
  const moon = makeMoon(1737); moon.rotation.y = Math.PI; far.add(moon);
  let mars = null;
  const sun = makeSun(696000 * 0.05 * 40); sun.position.copy(sunV).multiplyScalar(1.4e8); far.add(sun);
  far.add(new THREE.AmbientLight(0x1a2438, .5));
  const dlFar = new THREE.DirectionalLight(0xfff1dd, 3.4); dlFar.position.copy(sunV); far.add(dlFar);

  // ---- NEAR (m) ----
  near.environment = Core.env; near.environmentIntensity = .45;
  const sky = makeSky(); const skyScene = new THREE.Scene(); skyScene.add(sky);
  const hemi = new THREE.HemisphereLight(0x9ec4ff, 0x40382c, .75); near.add(hemi);
  const dlNear = new THREE.DirectionalLight(0xfff0dd, 3.6); dlNear.position.copy(sunV).multiplyScalar(500); dlNear.target.position.set(0, 0, 0); near.add(dlNear, dlNear.target);
  dlNear.castShadow = true; dlNear.shadow.mapSize.set(2048, 2048); { const c = dlNear.shadow.camera; c.left = -140; c.right = 140; c.top = 140; c.bottom = -140; c.near = 10; c.far = 1200; } dlNear.shadow.bias = -0.0004; dlNear.shadow.normalBias = 1.0;
  const grounds = { earth: makeGround(6.371e6, 0), moon: makeGround(1.737e6, 1), mars: makeGround(3.3895e6, 2) };
  Object.values(grounds).forEach(g => { g.visible = false; near.add(g); });
  const complex = makeComplex(); near.add(complex);
  const rocketRoot = new THREE.Group(); near.add(rocketRoot);
  const stack = new THREE.Group(); rocketRoot.add(stack);
  const engineLight = new THREE.PointLight(0xff9a40, 0, 300, 1.6); rocketRoot.add(engineLight);

  // flame (additive cone planes)
  const fTex = flameTex();
  const flame = new THREE.Group(); rocketRoot.add(flame);
  const flameMats = [];
  // volumetric-looking plume (shader): white-hot core at the nozzle, billowing turbulent orange body, teardrop tip (reference: real engine firings)
  const PLUME_FS = `varying vec2 vUv; uniform float uT, uA, uVac;
    float h(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
    float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+7.1; a*=.5; } return s; }
    void main(){ float x=vUv.x*2.-1.; float t=1.-vUv.y;
      float n=fbm(vec2(x*2.6, t*3.2-uT*5.5)); float n2=fbm(vec2(x*5.+3., t*7.-uT*9.));
      float r=.30+.62*smoothstep(0.,.55,t)-.30*smoothstep(.62,1.,t); r*=1.+.35*uVac*smoothstep(0.,.8,t);
      float d=abs(x)/max(r,.05); d+=(n-.5)*.75*t+(n2-.5)*.25*t;
      float body=smoothstep(1.,.25,d)*(1.-smoothstep(.5,1.,t+(n-.5)*.35));
      float core=smoothstep(.62,0.,d)*pow(max(1.-t*1.15,0.),1.3);
      float diam=1.+.30*sin(t*34.)*(1.-t)*(1.-uVac)*smoothstep(.0,.15,t);
      vec3 hot=vec3(1.,.86,.52), mid=vec3(1.,.46,.1), cool=vec3(.7,.16,.03);
      vec3 col=mix(mix(cool,mid,smoothstep(.0,.8,body)),hot,core*diam);
      col+=vec3(1.,.9,.7)*smoothstep(.1,0.,t)*smoothstep(1.,.2,d)*.5;                  // white-hot disc at the nozzle exit
      float a=(body*.8+core*.35)*uA*smoothstep(0.,.025,t);
      gl_FragColor=vec4(col*a*.62,a*.9); }`;
  for (let i = 0; i < 3; i++) { const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: 0 }, uA: { value: 1 }, uVac: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: PLUME_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); pl.rotation.y = i * Math.PI / 3; flameMats.push(m); const holder = new THREE.Group(); holder.add(pl); flame.add(holder); }
  // re-entry plasma
  const plasmaTex = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 64, 0, 0); gr.addColorStop(0, '#000'); gr.addColorStop(.55, '#222'); gr.addColorStop(1, '#fff'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64); const t = new THREE.CanvasTexture(c); return t; })();
  const plasma = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xff7a2a, alphaMap: plasmaTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  rocketRoot.add(plasma);

  // particles (smoke, dust, sparks) in sim-world double coordinates
  const pTex = puffTex(); const MAXP = Math.round(2600 * Math.max(.3, Core.q.particles));
  const pPos = new Float32Array(MAXP * 3), pCol = new Float32Array(MAXP * 4), pSize = new Float32Array(MAXP);
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pCol, 4)); pg.setAttribute('size', new THREE.BufferAttribute(pSize, 1));
  const pm = new THREE.ShaderMaterial({ uniforms: { map: { value: pTex }, scale: { value: 600 } }, transparent: true, depthWrite: false,
    vertexShader: 'attribute float size; attribute vec4 color; varying vec4 vC; uniform float scale; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=clamp(size*scale/-mv.z,0.,256.); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform sampler2D map; varying vec4 vC; void main(){ vec4 t=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vC.rgb,vC.a*t.a); }' });
  const points = new THREE.Points(pg, pm); points.frustumCulled = false; near.add(points); points.renderOrder = 10;
  const parts = []; // {x,y,z(world sim 3D doubles), vx,vy,vz, life, max, s0, s1, r,g,b,a, drag}
  const rocketMats = []; let boomShake = 0, boomed = null; const blasts = [];
  function emit(o) { if (parts.length >= MAXP) parts.shift(); parts.push(o); }

  // state
  let prevCam = '', blend = 1; const lastPos = new THREE.Vector3(), lastTar = new THREE.Vector3(), transFrom = { pos: new THREE.Vector3(), tar: new THREE.Vector3() }; let sig = '', refBottomPx = null, debrisMap = new Map(), camMode = 'pad', camYaw = 0, camPitch = -.12, camDist = 1, userMode = false, shake = 0, tSim = 0, roverMesh = null;
  const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3(), lookQ = new THREE.Quaternion();
  const stage = { composer: null, size: [2, 2] };
  const api = { name: 'flight', mode: () => camMode };

  function SIM() { return (0, eval)('typeof Simulation!=="undefined"?Simulation:null'); }
  let fairingGone = false; const halves = [];
  function fairingInfo(sc) {
    const fair = sc.assembledParts.find(p => p.id === 'struct_fairing'); if (!fair) return null;
    const below = sc.assembledParts.filter(p => p.y > fair.y && ['payload', 'science', 'utility'].includes(p.category)).sort((a, b) => a.y - b.y);
    const covered = new Set(); let last = fair; for (const p of below) { if (p.y - last.y <= (last.height + p.height) / 2 + 3) { covered.add(p); last = p; } else break; }
    const top = fair.y - fair.height / 2, bot = last.y + last.height / 2; const wmax = Math.max(fair.width, ...[...covered].map(p => p.width));
    return { fair, covered, top, bot, r: wmax / 2 };
  }
  function rebuild(sc) {
    stack.clear(); const fi = (!fairingGone) ? fairingInfo(sc) : null;
    if (fi) { for (const side of [0, 1]) { const h = makeFairingHalf(fi.r * S, (fi.bot - fi.top) * S, side); h.position.set(fi.fair.x * S, -((fi.top + fi.bot) / 2) * S, 0); stack.add(h); } }
    sc.assembledParts.forEach(p => { if (fi && (p === fi.fair || fi.covered.has(p))) return; if (fairingGone && p.id === 'struct_fairing') return; const m = makePart(p); m.position.set(p.x * S, -p.y * S, 0); m.rotation.z = -(p.rotation || 0); m.scale.setScalar(S); m.userData.pid = p.instanceId; stack.add(m); });
    stack.position.y = -2.5 + (refBottomPx) * S;
    rocketMats.length = 0; stack.traverse(o => { if (o.isMesh && o.material && o.material.emissive) { o.material = o.material.clone(); rocketMats.push([o.material, o.material.emissive.clone(), o.material.emissiveIntensity]); } });
  }
  function stackFor(parts) { const g = new THREE.Group(); parts.forEach(p => { const m = makePart(p); m.position.set(p.x * S, -p.y * S, 0); m.rotation.z = -(p.rotation || 0); m.scale.setScalar(S); g.add(m); }); g.position.y = -2.5 + refBottomPx * S; return g; }

  api.resize = (w, h) => { stage.size = [w, h]; camFar.aspect = camNear.aspect = w / h; camFar.updateProjectionMatrix(); camNear.updateProjectionMatrix(); if (stage.composer) { stage.composer.dispose(); stage.composer = null; } pm.uniforms.scale.value = h * .9; };
  api.show = () => { Core.renderer.toneMappingExposure = .95; fairingGone = false; halves.forEach(h => near.remove(h.g)); halves.length = 0; sig = ''; refBottomPx = null; parts.length = 0; debrisMap.forEach(d => near.remove(d.g)); debrisMap.clear(); camMode = 'pad'; userMode = false; camYaw = 0; camPitch = -.12; camDist = 1; tSim = 0; if (roverMesh) { near.remove(roverMesh); roverMesh = null; } };
  const CAMS = ['chase', 'front', 'rear', 'side', 'close', 'wide', 'pad', 'orbit', 'free', 'nose'];
  api.CAMS = CAMS; api.mode = () => camMode;
  api.setMode = (m) => { if (CAMS.includes(m)) { camMode = m; userMode = true; camYaw = 0; camPitch = -.12; camDist = 1; } return camMode; };
  api.cycle = () => { camMode = CAMS[(CAMS.indexOf(camMode) + 1) % CAMS.length]; userMode = true; camYaw = 0; camPitch = -.12; camDist = 1; return camMode; };
  api.dragCam = (dx, dy) => { camYaw -= dx * .006; camPitch = Math.max(-1.2, Math.min(1.4, camPitch + dy * .005)); };
  api.zoomCam = f => { camDist = Math.max(.25, Math.min(8, camDist * f)); };

  api.update = (dt, time) => {
    const sim = SIM(); const sc = sim && sim.spacecraft; if (!sc) return;
    if (!sim.physics.paused) tSim += dt * sim.physics.timeScale;
    if (refBottomPx === null) { refBottomPx = Math.max(...sc.assembledParts.map(p => p.y + p.height / 2)); }
    const key = sc.assembledParts.map(p => p.instanceId).join(',') + (fairingGone ? 'F' : '');
    if (key !== sig) { sig = key; rebuild(sc); }
    const P = sc.pos; let body = sim.earth, bestG = -1; for (const b of sim.physics.bodies) { if (!b.radius || b.radius > 1e8 || !b.gm) continue; const dd = Math.hypot(P.x - b.pos.x, P.y - b.pos.y); const gg = b.gm / (dd * dd); if (gg > bestG) { bestG = gg; body = b; } }
    const kind = body === sim.moon ? 'moon' : (body === sim.mars ? 'mars' : 'earth');
    // ---- far scene placement: camera-relative in km (done after camera computed) ----
    // orientation & local frame
    const bx = body.pos.x, by = body.pos.y; const dxp = P.x - bx, dyp = P.y - by; const dist = Math.hypot(dxp, dyp) || 1;
    const up3 = new THREE.Vector3(dxp / dist, -dyp / dist, 0);                      // local up (3D)
    const alt = Math.max(0, dist - body.radius); const dens = body.hasAtmosphere ? Math.exp(-alt / (body.scaleHeight || 8500)) : 0;
    const ang = Math.atan2(dxp, -dyp);                                              // angle from sim "up" at body
    const R = body.radius;
    // fairing jettison once above the sensible atmosphere
    if (!fairingGone && sc.hasLaunched && alt > 115e3 && fairingInfo(sc)) { const fi = fairingInfo(sc); fairingGone = true;
      const ax = new THREE.Vector3(Math.sin(sc.rotation), Math.cos(sc.rotation), 0), rt = new THREE.Vector3(Math.cos(sc.rotation), -Math.sin(sc.rotation), 0);
      for (const side of [0, 1]) { const h = makeFairingHalf(fi.r * S, (fi.bot - fi.top) * S, side); const holder = new THREE.Group(); holder.add(h); holder.position.set(0, 0, 0); near.add(holder);
        const dir = rt.clone().multiplyScalar(side ? -1 : 1); halves.push({ g: holder, h, p: new THREE.Vector3(P.x, -P.y, 0).addScaledVector(ax, -1 + ((fi.top + fi.bot) / 2 * -1 + 0) * 0), off: new THREE.Vector3(fi.fair.x * S, -((fi.top + fi.bot) / 2) * S + (-2.5 + refBottomPx * S), 0), v: new THREE.Vector3(sc.vel.x, -sc.vel.y, 0).addScaledVector(dir, 2.6), w: (side ? -1 : 1) * .35, rot: sc.rotation, t: 0, ax, side }); }
      if (typeof Toast !== 'undefined') try { Toast.show('Payload fairing jettisoned', 'info', 2000); } catch (e) {} }
    for (let i = halves.length - 1; i >= 0; i--) { const h = halves[i]; if (!sim.physics.paused) { const k = dt * sim.physics.timeScale; h.t += k; h.p.addScaledVector(h.v, k); h.rot += h.w * k * -1; }
      const o = h.off.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), -h.rot); h.g.position.set(h.p.x - P.x, h.p.y + P.y, 0).add(o); h.g.rotation.set(0, 0, -h.rot); if (h.t > 30) { near.remove(h.g); halves.splice(i, 1); } }
    // rocket transform
    const vib = sc.hasLaunched && !sc.destroyed ? Math.min(.3, (sc.dynamicPressure || 0) / 120000) : 0;   // structural buffeting grows with dynamic pressure (max-Q)
    rocketRoot.position.set((Math.random() - .5) * vib, (Math.random() - .5) * vib, 0); rocketRoot.rotation.set(0, 0, -sc.rotation + (Math.random() - .5) * vib * .01);
    // hide rocket body if destroyed
    rocketRoot.visible = !sc.destroyed;
    // flame
    const thr = Math.max((sc.throttle || 0) * ((sc.stageFuel > 0 && sc.engines.length) ? 1 : 0), sc.landed && !sc.hasLaunched ? (api.ign || 0) : 0);
    const eng = sc.engines.filter(e => e.category === 'engine' || e.category === 'booster');
    const exitW = eng.length ? Math.max(...eng.map(e => e.width)) * S * (eng.length > 3 ? 1.4 : 1) : 4;
    const vac = 1 - Math.min(1, dens * 2.2);
    const fl = thr * (1 + vac * .6); const flen = (18 + 50 * thr) * (.6 + .4 * Math.min(1, exitW / 3)) * (1 + vac * .9);
    flame.visible = thr > .02;
    const bottomY = eng.length && refBottomPx != null ? -2.5 + (refBottomPx - Math.max(...eng.map(e => e.y + e.height / 2))) * S : -2.5; // exit plane of the ACTIVE engines (moves up after staging)
    flame.position.set(0, bottomY - .5, 0);
    flame.children.forEach((h, i) => { const pl = h.children[0]; const wob = 1 + Math.sin(time * 40 + i * 2) * .06 + Math.sin(time * 71) * .04; pl.scale.set(exitW * (3.4 + vac * 2.2) * wob, flen * wob, 1); pl.position.y = -flen / 2; });
    flameMats.forEach(m => { m.uniforms.uA.value = Math.min(1, fl); m.uniforms.uT.value = time; m.uniforms.uVac.value = vac; });
    engineLight.intensity = thr * 9000 * (.4 + dens * .6); engineLight.position.set(0, bottomY - 8, 0); engineLight.distance = 400;
    // plasma / re-entry
    const heat = sc.heating || 0;
    rocketMats.forEach(([m, e0, i0]) => { if (heat > .02) { m.emissive.setRGB(heat * 1.5, heat * .38, heat * .05); m.emissiveIntensity = 1; } else { m.emissive.copy(e0); m.emissiveIntensity = i0; } });   // heat glow (smoothly follows physics heating, fades as density drops)
    if (heat > .2 && !sc.landed && !sc.destroyed) { const vm2 = Math.hypot(sc.vel.x, sc.vel.y) || 1; for (let i = 0; i < 1 + Math.round(heat * 4); i++) emit({ x: P.x + (Math.random() - .5) * 6, y: -P.y + (Math.random() - .5) * 6, z: (Math.random() - .5) * 6, vx: -sc.vel.x / vm2 * 40 + (Math.random() - .5) * 15, vy: sc.vel.y / vm2 * 40 + (Math.random() - .5) * 15, vz: (Math.random() - .5) * 15, life: .5, max: .5, s0: 5 + heat * 10, s1: 18 + heat * 20, r: 1, g: .45 + .25 * Math.random(), b: .1, a: .4 * heat, drag: 1.2 }); } plasma.visible = heat > .05 && !sc.landed;
    if (plasma.visible) { const v = new THREE.Vector3(sc.vel.x, -sc.vel.y, 0); const vm = v.length() || 1; plasma.material.opacity = Math.min(.5, heat * .8); const w = 10 + heat * 18; plasma.scale.set(w, w * 3.2, w);
      const dir = v.clone().divideScalar(vm); plasma.position.copy(dir.clone().multiplyScalar(-w * 1.2 + 5)); plasma.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate()); plasma.position.copy(dir.clone().multiplyScalar(3)); plasma.parent.worldToLocal && 0;
      plasma.position.applyAxisAngle(new THREE.Vector3(0, 0, 1), sc.rotation); plasma.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), sc.rotation)); }

    // ---- ground, sky, complex ----
    Object.entries(grounds).forEach(([k, g]) => g.visible = (k === kind));
    const g = grounds[kind]; const gu = g.userData.u;
    const surf = new THREE.Vector3(up3.x * -alt, up3.y * -alt, 0);                    // surface point below rocket, relative to rocket
    g.position.copy(surf); g.rotation.set(0, 0, -ang);
    gu.anchor.value.set(((R * ang) % 5e5), 0); gu.up.value.copy(up3); gu.dens.value = dens;
    const fade = kind === 'earth' ? 1 - Math.min(1, Math.max(0, (alt - 40e3) / 90e3)) : 1 - Math.min(1, Math.max(0, (alt - 15e3) / 45e3)); gu.fade.value = fade; g.visible = g.visible && fade > .01;
    gu.sunDir.value.copy(sunV); gu.time.value = time;
    const dayF = Math.max(0, Math.min(1, (sunV.dot(up3) + .12) / .34));
    gu.hazeCol.value.setRGB(.55 * dayF + .02, .70 * dayF + .03, .92 * dayF + .06);
    const su = sky.material.uniforms; su.up.value.copy(up3); su.sunDir.value.copy(sunV); su.dens.value = dens; sky.visible = dens > .0005;
    const toBody = new THREE.Vector3((bx - P.x), -(by - P.y), 0);
    // complex only on Earth near the pad (anchor = surface at sim x=0)
    const A = new THREE.Vector3(0 - P.x, -(-sim.earth.radius - P.y), 0);
    complex.visible = kind === 'earth' && A.length() < 90e3; complex.position.copy(A); complex.rotation.set(0, 0, 0); complex.position.y += 0;
    // hemisphere & sun
    hemi.intensity = .12 + dens * .45 * dayF; hemi.color.setRGB(.5 + .1 * dayF, .65, 1); near.environmentIntensity = .12 + .3 * dens * dayF + (kind !== 'earth' ? .05 : 0);
    dlNear.intensity = 2.3; dlNear.position.copy(sunV).multiplyScalar(600); dlNear.target.position.set(0, 0, 0);
    dlNear.color.setRGB(1, .97 - .2 * (1 - dayF) * dens, .92 - .45 * (1 - dayF) * dens);
    if (kind !== 'earth' || dens < .003) dlNear.intensity = 3.2;
    const fadeLight = (kind === 'earth') ? Math.max(.0, Math.min(1, (sunV.dot(up3) + .15) / .3)) : 1; if (dens > .01) dlNear.intensity *= fadeLight;
    if (!dlNear.userData.set) dlNear.userData.set = 1;

    // ---- CRASH EXPLOSION (once per spacecraft; energy-scaled; none for staging) ----
    if (sc.destroyed && boomed !== sc && /Impacted/.test(sc.destroyReason || '')) {
      boomed = sc;
      const v = sc.impactSpeed || Math.hypot(sc.vel.x, sc.vel.y), m = sc.impactMass || sc.totalMass || 1000, E = .5 * m * v * v;   // joules
      const f = Math.max(.08, Math.min(1, (Math.log10(Math.max(E, 1)) - 6.5) / 4.5));                                           // 0..1 intensity (log energy)
      const kind = m < 8000 ? 'component' : (m < 120000 ? 'stage' : 'vehicle'); const fuelFrac = Math.min(1, (sc.currentFuel || 0) / Math.max(1, sc.maxFuel || 1));
      const fire = f * (.35 + .65 * fuelFrac) * (kind === 'component' ? .5 : 1);               // propellant makes the fireball
      const R = 6 + 150 * Math.pow(f, 1.1) * (.4 + .6 * fuelFrac);
      const gx = P.x, gy = -P.y, rnd = Math.random, ux = up3.x, uy = up3.y;
      const N = Math.round((50 + 420 * f) * Math.max(.3, Core.q.particles));
      for (let i = 0; i < N; i++) { const a = rnd() * Math.PI * 2, e = rnd() * Math.PI * .5, sp = (6 + rnd() * 50) * (.4 + f * 1.4); const dx = Math.cos(a) * Math.cos(e), dz = Math.sin(a) * Math.cos(e), dy = Math.sin(e);
        // rotate local-frame blast into world: up = up3, tangent = (-uy,ux)
        const vx = dx * sp * -uy + dy * sp * ux, vy = dx * sp * ux + dy * sp * uy;
        if (rnd() < fire) emit({ x: gx, y: gy, z: 0, vx, vy, vz: dz * sp, life: .8 + rnd() * 1.6, max: 2.4, s0: R * .15, s1: R * (.35 + rnd() * .5), r: 1, g: .4 + .35 * rnd(), b: .1, a: .5, drag: 1.1 });
        emit({ x: gx, y: gy, z: 0, vx: vx * .7, vy: vy * .7 + 4, vz: dz * sp * .7, life: 4 + rnd() * 8, max: 12, s0: R * .15, s1: R * (.5 + rnd() * .7), r: .13, g: .12, b: .11, a: .45 + .3 * f, drag: .6 });
        if (i % 3 === 0) emit({ x: gx, y: gy, z: 0, vx: vx * 2.2, vy: vy * 2.2, vz: dz * sp * 2.2, life: .8 + rnd() * 1.4, max: 2.2, s0: 1.2, s1: .4, r: 1, g: .8, b: .45, a: 1, drag: .25 }); }
      // shockwave ring + flash
      const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      ring.position.set(0, 0, 0); ring.lookAt(up3.clone()); near.add(ring);
      const fl = new THREE.PointLight(0xffb060, 0, 2000, 1.4); near.add(fl); blasts.push({ ring, fl, t: 0, R: R * 2.2 + 30, f });
      boomShake = Math.max(boomShake, .25 + .9 * f);
      if (window.AAA && AAA.audio && AAA.audio.boom) AAA.audio.boom(f, kind === 'component');
      // persistent charred wreckage (kept by the existing debris physics); capped to avoid clutter
      const pieces = (sc.assembledParts || []).slice(0, 18); const sim2 = sim;
      pieces.forEach(pt => { sim2.debris.push({ pos: { ...sc.pos }, vel: { x: -uy * (rnd() - .5) * 40 * f + ux * rnd() * 25 * f, y: ux * (rnd() - .5) * 40 * f + uy * rnd() * 25 * f }, rotation: sc.rotation + (rnd() - .5), angularVel: (rnd() - .5) * 3, parts: [{ ...pt, x: 0, y: 0 }], life: 1e9, heat: .6 * f, glow: .5 * f, char: .5 + .5 * f, t: 0 }); });
      sc.assembledParts = [];
    }
    for (let i = blasts.length - 1; i >= 0; i--) { const b = blasts[i]; b.t += dt; const k = Math.min(1, b.t / (1 + 2 * b.f)); const sc3 = 1 + b.R * Math.pow(k, .7); b.ring.scale.setScalar(sc3); b.ring.material.opacity = .8 * (1 - k); b.fl.intensity = 9e4 * b.f * b.f * Math.max(0, 1 - b.t * 4); b.fl.position.set(0, 14 + 25 * b.f, 0); if (k >= 1) { near.remove(b.ring); near.remove(b.fl); b.ring.geometry.dispose(); b.ring.material.dispose(); b.fl.dispose && b.fl.dispose(); blasts.splice(i, 1); } }
    // ---- debris ----
    const list = sim.debris || [];
    list.forEach(d => { if (!debrisMap.has(d)) { const gg = stackFor(d.parts); const holder = new THREE.Group(); const mats = []; gg.traverse(o => { if (o.isMesh && o.material) { o.material = o.material.clone(); if (o.material.emissive) { mats.push([o.material, o.material.color.clone()]); } } }); holder.add(gg); near.add(holder); debrisMap.set(d, { g: holder, mats }); } });
    debrisMap.forEach((v, d) => { if (!list.includes(d)) { near.remove(v.g); debrisMap.delete(d); return; }
      v.g.position.set(d.pos.x - P.x, -(d.pos.y - P.y), 0); v.g.rotation.set(0, 0, -d.rotation);
      const gl = d.glow || 0, ch = d.char || 0;
      v.mats.forEach(([m, c0]) => { m.color.copy(c0).multiplyScalar(1 - .78 * ch); m.emissive.setRGB(gl * 1.6, gl * .45 * (1 - .4 * gl), gl * .08); m.emissiveIntensity = 1; });
      const pos = { x: d.pos.x, y: -d.pos.y }; const spd = d.rest ? 0 : Math.hypot(d.vel.x, d.vel.y);
      if (!d.rest && gl > .05) { // plasma sheath: edge flames + sparks, trailing opposite to velocity
        const tx = -d.vel.x / (spd || 1), ty = d.vel.y / (spd || 1);
        for (let i = 0; i < 2 + gl * 4; i++) emit({ x: pos.x + (Math.random() - .5) * 8, y: pos.y + (Math.random() - .5) * 20, z: (Math.random() - .5) * 6, vx: tx * 40 + (Math.random() - .5) * 20, vy: ty * 40 + (Math.random() - .5) * 20, vz: (Math.random() - .5) * 10, life: .6, max: .6, s0: 6 + gl * 6, s1: 22, r: 1, g: .5 + .2 * Math.random(), b: .15, a: .55 * gl, drag: 1.4 });
        if (Math.random() < gl) emit({ x: pos.x, y: pos.y, z: 0, vx: tx * 80 + (Math.random() - .5) * 60, vy: ty * 80 + (Math.random() - .5) * 60, vz: (Math.random() - .5) * 40, life: .9, max: .9, s0: 1.4, s1: .5, r: 1, g: .8, b: .4, a: 1, drag: .4 });
      } else if (!d.rest && Math.random() < .5 && dens > .02) emit({ x: pos.x, y: pos.y, z: 0, vx: 0, vy: 0, vz: 0, life: 4, max: 4, s0: 3, s1: 14, r: .9, g: .9, b: .95, a: .25, drag: 1 });
      if (d.justHit) { d.justHit = false; const sp = Math.min(1, (d.impactSpeed || 0) / 250); for (let i = 0; i < 24 + 40 * sp; i++) emit({ x: pos.x, y: pos.y, z: 0, vx: (Math.random() - .5) * 60 * (.3 + sp), vy: Math.random() * 30 * (.3 + sp), vz: (Math.random() - .5) * 60 * (.3 + sp), life: 2.2, max: 2.2, s0: 6, s1: 30, r: .35, g: .3, b: .27, a: .5, drag: 1.2 }); shake = Math.max(shake, .3 * sp); }
      if (d.rest && (d.t || 0) < 90 && Math.random() < .12) emit({ x: pos.x + (Math.random() - .5) * 4, y: pos.y + 2, z: (Math.random() - .5) * 4, vx: 0, vy: 6, vz: 0, life: 5, max: 5, s0: 3, s1: 16, r: .25, g: .24, b: .24, a: .22 * (1 - (d.t || 0) / 90), drag: .5 });
      if (d.rest && (d.glow || 0) > .05 && Math.random() < .2) emit({ x: pos.x, y: pos.y + 1, z: 0, vx: 0, vy: 2, vz: 0, life: 1, max: 1, s0: 3, s1: 5, r: 1, g: .4, b: .1, a: .5 * d.glow, drag: 1 });
    });

    // rover visual
    if (sc.roverDeployed && !roverMesh && sc.landed) { const pr = { id: 'rover', width: 18, height: 14 }; roverMesh = makePart(pr); roverMesh.scale.setScalar(.2 * 1.7); near.add(roverMesh); roverMesh.userData.t0 = tSim; }
    if (roverMesh) { const t = tSim - roverMesh.userData.t0; const sx = Math.min(80, t * 1.6); const sp = surf.clone().add(new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), -ang).multiplyScalar(14 + sx)); roverMesh.position.copy(sp); roverMesh.position.add(up3.clone().multiplyScalar(.7)); roverMesh.rotation.set(0, 0, -ang); }

    // ---- exhaust particles ----
    const axis = new THREE.Vector3(Math.sin(sc.rotation), Math.cos(sc.rotation), 0);
    const P3 = new THREE.Vector3(P.x, -P.y, 0);
    const vel3 = new THREE.Vector3(sc.vel.x, -sc.vel.y, 0);
    const steps = Math.min(4, Math.max(1, Math.round(dt * 60)));
    if (thr > .05 && !sim.physics.paused && eng.length) {
      const xdir = new THREE.Vector3(Math.cos(sc.rotation), -Math.sin(sc.rotation), 0);
      const live = eng.filter(e => e.category !== 'booster' || (sc._fuel && (sc._fuel.get(e) || 0) > .5)); const em = live.length ? live : eng;
      for (let i = 0; i < steps * 4; i++) {
        const e = em[(Math.random() * em.length) | 0]; const solid = e.category === 'booster', hydro = e.id === 'sls_rs25' || e.id === 'engine_vacuum';
        const ew = (e.width || 14) * S; const ly = -2.5 - .5 + (refBottomPx - (e.y + e.height / 2)) * S;               // nozzle exit plane of THIS engine
        const base = P3.clone().addScaledVector(axis, ly).addScaledVector(xdir, (e.x || 0) * S + (Math.random() - .5) * ew * .5);
        const sp = 60 + Math.random() * 70; const v = vel3.clone().addScaledVector(axis, -sp);                          // always rearward relative to the vehicle
        if (dens > .03 && (solid || !hydro || Math.random() < .35)) emit({ x: base.x, y: base.y, z: (Math.random() - .5) * ew * .5, vx: v.x + (Math.random() - .5) * 6, vy: v.y + (Math.random() - .5) * 6, vz: (Math.random() - .5) * 5, life: 2.5 + Math.random() * 3 * Math.min(1, dens * 3), max: 5.5, s0: ew * .5, s1: ew * (1.2 + 2 * dens) * (solid ? 1.6 : 1), r: solid ? .88 : .95, g: solid ? .88 : .95, b: solid ? .86 : .97, a: (solid ? .3 : .12) * Math.min(1, dens * 2) * thr, drag: 1.6 });
        if (i % 2 === 0) emit({ x: base.x, y: base.y, z: 0, vx: v.x, vy: v.y, vz: 0, life: .22 + .12 * vac, max: .34, s0: ew * (hydro ? .8 : 1.1), s1: ew * (.35 + .5 * vac), r: hydro ? .75 : 1, g: hydro ? .8 : .7, b: hydro ? 1 : .35, a: (solid ? .3 : .22) * thr, drag: 0 });
      }
    }
    // ground blast: dust, steam, scorch while close to the pad (Earth/Moon/Mars)
    if (thr > .1 && alt < 260 && !sim.physics.paused) for (let i = 0; i < steps * 4; i++) {
      const a = Math.random() * Math.PI * 2, sp = 25 + Math.random() * 55 * (1 - alt / 300);
      const gp = P3.clone().sub(up3.clone().multiplyScalar(alt)); const perp = new THREE.Vector3(-up3.y, up3.x, 0);
      const lat = perp.clone().multiplyScalar(Math.cos(a) * sp);
      const col = kind === 'moon' ? [.62, .6, .58] : kind === 'mars' ? [.75, .45, .3] : [.9, .88, .85];
      emit({ x: gp.x + Math.cos(a) * 8, y: gp.y + Math.cos(a) * 0, z: Math.sin(a) * 8, vx: lat.x * 1.0 + up3.x * 6 * Math.random(), vy: lat.y + up3.y * 8 * Math.random(), vz: Math.sin(a) * sp, life: 6 + Math.random() * 6, max: 12, s0: 10, s1: 34 + 36 * Math.random(), r: col[0], g: col[1], b: col[2], a: .2 * thr * (1 - alt / 300), drag: 1.4 });
    }
    // upload particles (camera-relative: floating origin = rocket)
    const dtp = sim.physics.paused ? 0 : dt * Math.min(sim.physics.timeScale, 4);
    let n = 0;
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dtp; if (p.life <= 0) { parts.splice(i, 1); continue; }
      const k = Math.exp(-p.drag * dtp); p.vx *= k; p.vy *= k; p.vz *= k; p.x += p.vx * dtp; p.y += p.vy * dtp; p.z += p.vz * dtp; }
    parts.forEach((p, i) => { const t = 1 - p.life / p.max; pPos[i * 3] = p.x - P.x; pPos[i * 3 + 1] = p.y - (-P.y) ; pPos[i * 3 + 2] = p.z; pPos[i * 3 + 1] = p.y + P.y - 0; /* P.y sim -> -P.y */ pPos[i * 3 + 1] = p.y - (-P.y); const sc2 = p.s0 + (p.s1 - p.s0) * t; pSize[i] = sc2; const fa = p.a * (1 - t) * Math.min(1, t * 8 + .2); pCol[i * 4] = p.r; pCol[i * 4 + 1] = p.g; pCol[i * 4 + 2] = p.b; pCol[i * 4 + 3] = fa; n = i + 1; });
    pg.setDrawRange(0, n); pg.attributes.position.needsUpdate = pg.attributes.color.needsUpdate = pg.attributes.size.needsUpdate = true;

    // ---- camera ----
    const H = refBottomPx * 2 * S * .55; const rocketH = Math.max(40, sc.assembledParts.length ? (Math.max(...sc.assembledParts.map(p => p.y + p.height / 2)) - Math.min(...sc.assembledParts.map(p => p.y - p.height / 2))) * S : 60);
    if (!userMode && camMode === 'pad' && (alt > 4500 || (sc.hasLaunched && alt > 2500))) camMode = 'chase';
    const center = axis.clone().multiplyScalar(-2.5 + rocketH * .5);
    const base = rocketH * 2.6 * camDist;
    const up = up3.clone(); const right = new THREE.Vector3(-up.y, up.x, 0);
    const prefersCinema = camMode === 'pad';
    if (camMode === 'pad') {
      // static ground camera on the pad apron looking at the rocket (cinematic)
      const side = new THREE.Vector3(0, 0, 1);
      const dd = (rocketH * 3.3 + 20) * camDist; const a = camYaw * .5 + .5 + Math.sin(tSim * .05) * .06 + (sc.hasLaunched ? 0 : Math.sin(time * .1) * .12);
      const rel = new THREE.Vector3(Math.sin(a) * dd * .55, 0, Math.cos(a) * dd * .9);
      const camBase = A.clone().add(new THREE.Vector3(0, 0, 0));
      const groundCam = (kind === 'earth' && A.length() < 40e3) ? A.clone() : surf.clone();
      camPos.copy(groundCam).add(rel).add(up3.clone().multiplyScalar(22 + camPitch * 40));
      camTarget.copy(center).addScaledVector(axis, rocketH * .12);
    } else if (camMode === 'nose') {
      camPos.copy(axis.clone().multiplyScalar(-2.5 + rocketH + 3)); camTarget.copy(axis.clone().multiplyScalar(2000));
      const yaw = camYaw; camTarget.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    } else {
      let yaw = camYaw, pitch = camPitch; const sideV = new THREE.Vector3(-axis.y, axis.x, 0), zV = new THREE.Vector3(0, 0, 1);
      const ringAt = (yo, bm, pOff) => { const y = yaw + yo, p = pitch + (pOff || 0); const ring = zV.clone().multiplyScalar(Math.cos(y)).add(sideV.clone().multiplyScalar(Math.sin(y))); return center.clone().add(ring.multiplyScalar(Math.cos(p)).addScaledVector(axis, -Math.sin(p)).multiplyScalar(base * bm)); };
      if (camMode === 'chase') camPos.copy(ringAt(.6, 1));
      else if (camMode === 'front') camPos.copy(ringAt(0, 1.05, .05));
      else if (camMode === 'side') camPos.copy(ringAt(Math.PI / 2, 1.05, .02));
      else if (camMode === 'close') camPos.copy(ringAt(.6, .38, .05));
      else if (camMode === 'wide') camPos.copy(ringAt(.6 + Math.sin(tSim * .03) * .35, 3.4, .22));
      else if (camMode === 'rear') { const e = center.clone().addScaledVector(axis, -rocketH * .5 - 6); const ring = zV.clone().multiplyScalar(Math.cos(yaw)).add(sideV.clone().multiplyScalar(Math.sin(yaw))); camPos.copy(e).addScaledVector(axis, -rocketH * .12 * camDist).addScaledVector(ring, rocketH * 1.0 * camDist); camTarget.copy(e).addScaledVector(axis, rocketH * .06); }
      else { const f = camMode === 'free' ? 1.9 : 1.1; const offs = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(base * f);
        const basis = new THREE.Matrix4().makeBasis(right, up, new THREE.Vector3(0, 0, 1)); offs.applyMatrix4(basis); camPos.copy(center).add(offs); }
      if (camMode !== 'rear') camTarget.copy(center);
    }
    // smooth transition between camera modes (no sudden jumps)
    if (camMode !== prevCam) { transFrom.pos.copy(lastPos); transFrom.tar.copy(lastTar); blend = lastPos.lengthSq() ? 0 : 1; prevCam = camMode; }
    if (blend < 1) { blend = Math.min(1, blend + dt / 1.1); const e2 = blend * blend * (3 - 2 * blend); camPos.lerpVectors(transFrom.pos, camPos.clone(), e2); camTarget.lerpVectors(transFrom.tar, camTarget.clone(), e2); }
    lastPos.copy(camPos); lastTar.copy(camTarget);
    // keep camera above ground
    const camAlt = camPos.dot(up3) + alt; if (camAlt < 3 && kind !== 'x') camPos.addScaledVector(up3, 3 - camAlt);
    // shake: dynamic pressure + engine rumble at low altitude
    shake += (Math.min(1, ((sc.dynamicPressure || 0) / 35000) + thr * .35 * Math.min(1, dens * 2.5)) - shake) * Math.min(1, dt * 4);
    boomShake *= Math.max(0, 1 - dt * 1.4); shake = Math.max(shake, boomShake * 4);
    const sh = shake * (camMode === 'nose' ? .25 : .6);
    camNear.position.copy(camPos).add(new THREE.Vector3((Math.random() - .5) * sh, (Math.random() - .5) * sh, (Math.random() - .5) * sh));
    camNear.up.copy(camMode === 'rear' ? axis : camMode === 'nose' ? new THREE.Vector3(-axis.y, axis.x, 0).multiplyScalar(0) .add(new THREE.Vector3(0, 0, 1)) : up3); camNear.lookAt(camTarget);
    camNear.fov = (camMode === 'pad' ? 36 : 50) - (camMode === 'pad' && sc.hasLaunched ? Math.min(20, alt / 500) : 0); camNear.updateProjectionMatrix();
    camFar.fov = camNear.fov; camFar.updateProjectionMatrix();
    // far camera: same orientation, position in km (world = P3 + camPos)
    camFar.quaternion.copy(camNear.quaternion);
    const cw = new THREE.Vector3(P.x + camPos.x, -P.y + camPos.y, camPos.z).divideScalar(KM);
    camFar.position.copy(cw);
    const nearD = Math.max(.003, Math.min(500, (cw.distanceTo(new THREE.Vector3((bx) / KM, -by / KM, 0)) - body.radius / KM) * .05)); camFar.near = nearD; camFar.far = 2e9; camFar.updateProjectionMatrix();
    // far bodies
    const e = sim.earth; earth.position.set(e.pos.x / KM, -e.pos.y / KM, 0); earth.tick(dt, 0);
    moon.position.set(sim.moon.pos.x / KM, -sim.moon.pos.y / KM, 0);
    if (sim.mars) { if (!mars) { mars = makeMars(sim.mars.radius / KM); far.add(mars); } mars.position.set(sim.mars.pos.x / KM, -sim.mars.pos.y / KM, 0); }
    { const x = Math.min(1, Math.max(0, (dens - .003) / .117)); starsG.setVis(1 - x * x * (3 - 2 * x)); }
    api.alt = alt; api.dens = dens;
    sun.tick(dt);
  };

  api.renderDual = (r) => {
    const ac = r.autoClear; r.autoClear = false;
    r.clear(true, true, true);
    r.render(far, camFar);
    sky.position.copy(camNear.position); if (sky.visible) r.render(skyScene, camNear);
    r.clearDepth();
    r.render(near, camNear);
    r.autoClear = ac;
  };
  api.render = (r) => {
    
    dlNear.castShadow = !!Core.q.shadows;
    if (stage.composer && stage.hadBloom !== Core.q.bloom) { stage.composer.dispose(); stage.composer = null; }
    {
      if (!stage.composer) { stage.hadBloom = Core.q.bloom; const s = stage.size; const rt = new THREE.WebGLRenderTarget(s[0], s[1], { type: THREE.HalfFloatType, samples: Core.qName === 'high' ? 4 : 0 });
        stage.composer = new EffectComposer(r, rt); stage.composer.setPixelRatio(1); stage.composer.setSize(s[0], s[1]); stage.composer.addPass(new DualPass(api));
        if (Core.q.bloom) stage.composer.addPass(new UnrealBloomPass(new THREE.Vector2(s[0], s[1]), .5, .6, .92)); stage.composer.addPass(new OutputPass()); }
      stage.composer.render();
    }
  };
  return api;
}
