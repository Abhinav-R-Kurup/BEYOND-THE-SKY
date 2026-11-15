// Procedural, realistic-proportion part models. Local frame: origin = part centre, +Y up (towards nose),
// diameter = part.width, height = part.height (same box the 2D builder logic snaps against).
import * as THREE from 'three';
import { Core } from './core.js';

const M = {};
function mats() {
  if (M.ready) return M; M.ready = true;
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const ctex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  // painted white hull with panel seams + rivets
  const hull = ctex(256, 256, (g, w, h) => { g.fillStyle = '#e9ecef'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(80,90,100,.55)'; g.lineWidth = 2;
    for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0; x < w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = 'rgba(70,80,90,.4)'; for (let y = 4; y < h; y += 64) for (let x = 6; x < w; x += 16) g.fillRect(x, y, 2, 2);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${100 + Math.random() * 60},${100 + Math.random() * 60},${100 + Math.random() * 60},.05)`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); } });
  const foam = ctex(256, 256, (g, w, h) => { g.fillStyle = '#c8651b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4000; i++) { const v = Math.random(); g.fillStyle = `rgba(${v > .5 ? 255 : 120},${v > .5 ? 170 : 60},${v > .5 ? 80 : 20},.08)`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 2 + Math.random() * 4); }
    g.strokeStyle = 'rgba(70,35,10,.45)'; g.lineWidth = 2; for (let y = 0; y < h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
  const foil = ctex(128, 128, (g, w, h) => { g.fillStyle = '#c99a3a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.strokeStyle = `rgba(${Math.random() > .5 ? '255,230,150' : '110,70,10'},.25)`; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 40, y + (Math.random() - .5) * 40); g.stroke(); } });
  const cells = ctex(256, 128, (g, w, h) => { g.fillStyle = '#10265c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6f8fc9'; g.lineWidth = 1;
    for (let x = 0; x <= w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, 'rgba(120,170,255,.25)'); gr.addColorStop(1, 'rgba(0,0,30,.2)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  hull.repeat.set(2, 1); foam.repeat.set(2, 1);
  Object.assign(M, {
    hull: std({ map: hull, roughness: .55, metalness: .25 }),
    hullPlain: std({ color: 0xdfe3e8, roughness: .5, metalness: .3 }),
    foam: std({ map: foam, roughness: .95, metalness: 0 }),
    foil: std({ map: foil, roughness: .35, metalness: .9 }),
    cells: std({ map: cells, roughness: .3, metalness: .6, emissive: 0x050c22 }),
    black: std({ color: 0x15171a, roughness: .6, metalness: .4 }),
    dark: std({ color: 0x2b2f35, roughness: .5, metalness: .7 }),
    steel: std({ color: 0x9aa3ad, roughness: .35, metalness: .85 }),
    nozzle: std({ color: 0x3a3430, roughness: .4, metalness: .9 }),
    copper: std({ color: 0xa8663a, roughness: .35, metalness: .9 }),
    shield: std({ color: 0x4a3226, roughness: .9, metalness: .1 }),
    orange: std({ color: 0xe8631a, roughness: .5, metalness: .2 }),
    glass: std({ color: 0x223a55, roughness: .1, metalness: .9 }),
    red: std({ color: 0xc23a2a, roughness: .5 }),
    glow: new THREE.MeshBasicMaterial({ color: 0x66aaff, toneMapped: false }),
    white: std({ color: 0xf5f5f5, roughness: .6, metalness: .1 }),
    wheel: std({ color: 0x1b1b1d, roughness: .9, metalness: .1 }),
  });
  return M;
}

const SEG = () => Core.q ? (Core.q.seg >= 128 ? 48 : Core.q.seg >= 90 ? 36 : 24) : 32;
function lathe(pts, mat) { // pts: [radius, y]
  const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), SEG());
  const m = new THREE.Mesh(g, mat); return m;
}
function cyl(rt, rb, h, mat, y = 0) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, SEG()), mat); m.position.y = y; return m; }
function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }
function ogive(r, h, n = 14) { const pts = []; const rho = (r * r + h * h) / (2 * r);
  for (let i = 0; i <= n; i++) { const t = i / n; const x = t * h; const rad = Math.sqrt(Math.max(0, rho * rho - (h - x) * (h - x))) + r - rho; pts.push([Math.max(.0001, rad), x]); }
  return pts.reverse().map(([rr, y]) => [rr, h - y]).reverse(); }

function bell(rThroat, rExit, h, mat) { // De Laval (bell) nozzle, origin at top of nozzle (chamber face), extends down by h
  const pts = []; const n = 14;
  for (let i = 0; i <= n; i++) { const t = i / n; const r = rThroat + (rExit - rThroat) * (1 - Math.pow(1 - t, 2.2)); pts.push([r, -h * t]); }
  const m = lathe(pts, mat); m.material = mat.clone(); m.material.side = THREE.DoubleSide; return m;
}
function ring(r, t, y, mat) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, t, SEG(), 1, true), mat); m.position.y = y; m.material = mat; return m; }

function engine(p, kind) {
  const g = new THREE.Group(); const w = p.width, h = p.height, r = w / 2;
  const m = mats();
  const cap = h * .26;
  g.add(cyl(r * .55, r * .62, cap, m.steel, h / 2 - cap / 2));                 // thrust structure/chamber
  const tp = cyl(r * .18, r * .18, cap * .9, m.dark, h / 2 - cap / 2); tp.position.x = r * .58; g.add(tp); // turbopump
  const pipe = cyl(r * .05, r * .05, cap * .8, m.copper, h / 2 - cap / 2); pipe.position.x = -r * .55; g.add(pipe);
  const exitR = kind === 'vac' ? r * .98 : r * .85, bh = h - cap;
  const b = bell(r * .22, exitR, bh, m.nozzle); b.position.y = h / 2 - cap; g.add(b);
  const lip = ring(exitR, h * .03, -h / 2 + h * .015, m.copper); g.add(lip);
  // regenerative cooling bands
  for (let i = 1; i < 4; i++) { const t = i / 4; const rr = r * .22 + (exitR - r * .22) * (1 - Math.pow(1 - t, 2.2)) + .01; const rb = ring(rr, h * .012, h / 2 - cap - bh * t, m.copper); g.add(rb); }
  // glow of heated throat
  const gl = new THREE.Mesh(new THREE.CylinderGeometry(exitR * .98, exitR * .98, .02, SEG()), new THREE.MeshBasicMaterial({ color: 0x000000 })); gl.position.y = -h / 2 + .02; g.add(gl);
  g.userData.nozzleY = -h / 2; g.userData.nozzleR = exitR;
  return g;
}

function tank(p, style) {
  const g = new THREE.Group(); const m = mats(); const r = p.width / 2, h = p.height;
  const mat = style === 'foam' ? m.foam : m.hull;
  const body = cyl(r, r, h, mat); body.material = mat.clone(); if (body.material.map) { body.material.map = body.material.map.clone(); body.material.map.needsUpdate = true; body.material.map.repeat.set(2, Math.max(1, Math.round(h / (p.width * 1.4)))); } g.add(body);
  // dome end caps
  for (const s of [1, -1]) { const d = new THREE.Mesh(new THREE.SphereGeometry(r, SEG(), 8, 0, Math.PI * 2, 0, Math.PI / 2), mat); d.scale.y = .14; d.position.y = s * h / 2; if (s < 0) d.rotation.x = Math.PI; g.add(d); }
  // interstage rings & hazard bands
  g.add(ring(r * 1.005, h * .05, h / 2 - h * .06, style === 'foam' ? m.hullPlain : m.black));
  g.add(ring(r * 1.005, h * .05, -h / 2 + h * .06, style === 'foam' ? m.hullPlain : m.black));
  if (style === 'foam') { for (const a of [0, Math.PI]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r * .035, r * .035, h * .92, 8), m.dark); c.position.set(Math.cos(a) * r * 1.05, 0, Math.sin(a) * r * 1.05); g.add(c); } }
  else { const stripe = ring(r * 1.004, h * .12, 0, m.black); g.add(stripe); }
  return g;
}

function capsule(p, kind) {
  const g = new THREE.Group(); const m = mats(); const r = p.width / 2, h = p.height;
  if (kind === 'apollo') {
    const body = lathe([[.0001, h * .5], [r * .16, h * .5], [r * .2, h * .44], [r * .86, -h * .38], [r * .98, -h * .5 + h * .06], [r * .98, -h * .5]], m.hullPlain); body.material = m.hullPlain; g.add(body);
    const sh = lathe([[.0001, -h * .5 - h * .015], [r * .55, -h * .5 - h * .01], [r * .98, -h * .5 + h * .01], [r * .98, -h * .5 + h * .06]], m.shield); g.add(sh);
    for (const s of [-1, 1]) { const w = box(r * .22, h * .1, .5, m.glass, s * r * .26, h * .02, r * .5); w.lookAt(0, h * .02, 0); w.rotation.set(0, 0, 0); w.position.set(s * r * .25, h * .0, r * .52); g.add(w); }
    const probe = cyl(r * .05, r * .05, h * .18, m.steel, h * .55); g.add(probe);
    g.add(box(r * .3, h * .08, r * .3, m.dark, 0, -h * .1, -r * .5));
  } else if (kind === 'gemini') {
    g.add(lathe([[.0001, h * .5], [r * .3, h * .5], [r * .45, h * .42], [r * .95, -h * .2], [r * 1.0, -h * .5]], m.hullPlain));
    g.add(lathe([[.0001, -h * .5 - h * .02], [r * .96, -h * .5 - h * .01], [r * 1.0, -h * .5 + h * .03]], m.shield));
    for (const s of [-1, 1]) g.add(box(r * .3, h * .16, r * .06, m.glass, s * r * .32, h * .08, r * .72));
  } else { // mercury
    g.add(lathe([[.0001, h * .5], [r * .22, h * .5], [r * .22, h * .3], [r * .3, h * .22], [r * .98, -h * .35], [r * .98, -h * .5]], m.dark));
    g.add(lathe([[.0001, -h * .5 - h * .02], [r * .95, -h * .5], [r * .98, -h * .5 + h * .03]], m.shield));
    g.add(box(r * .28, h * .15, r * .06, m.glass, 0, h * .0, r * .55));
    g.add(cyl(r * .04, r * .04, h * .2, m.steel, h * .6));
  }
  return g;
}

function panel(w, h, mat, hinge = true) { const g = new THREE.Group(); const m = mats();
  const n = 2; for (let i = 0; i < n; i++) for (const s of [-1, 1]) { const p = box(w * .48, .12, h, mat, s * (w * .26 + i * w * .5), 0, 0); g.add(p); }
  g.add(cyl(.12, .12, w * 1.1, m.steel)); g.children[g.children.length - 1].rotation.z = Math.PI / 2; return g; }


// ---- NASA SLS Block 1 / Orion / lander models (proportions from NASA dimensions, see parts.js) ----
function slsModel(p, m) {
  const r = p.width / 2, h = p.height, id = p.id, g = new THREE.Group(); const foam = m.foam || m.hull;
  if (id === 'sls_core') {
    g.add(cyl(r, r, h * .94, foam, -h * .03));                                  // orange foam-covered tank
    g.add(cyl(r * 1.005, r * 1.005, h * .06, m.hullPlain, h * .47));             // forward skirt
    g.add(ring(r * 1.012, h * .018, h * .30, m.hullPlain));                     // intertank
    g.add(ring(r * 1.012, h * .006, h * .20, m.black)); g.add(ring(r * 1.012, h * .006, -h * .18, m.black));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const l = box(.5, h * .8, .8, m.dark, Math.cos(a) * r * 1.01, -h * .02, Math.sin(a) * r * 1.01); l.rotation.y = -a; g.add(l); } // propellant feed lines
    g.add(cyl(r * 1.0, r * .96, h * .05, m.dark, -h * .5 + h * .025));
  } else if (id === 'sls_rs25') {
    g.add(cyl(r, r, h * .3, m.dark, h * .35));
    const o = r * .5; for (const [x, z] of [[-o, -o], [o, -o], [-o, o], [o, o]]) { const b = bell(r * .1, r * .32, h * .78, m.nozzle); b.position.set(x, h * .2, z); g.add(b); const t = cyl(r * .13, r * .13, h * .14, m.steel, h * .3); t.position.set(x, h * .3, z); g.add(t); }
  } else if (id === 'sls_srb') {
    const nh = h * .1, bh = h * .78, tail = h * .06;
    g.add(cyl(r, r, bh, m.hullPlain, -h / 2 + tail + bh / 2));
    for (let i = 1; i < 5; i++) g.add(ring(r * 1.012, h * .005, -h / 2 + tail + bh * i / 5, m.black));
    g.add(ring(r * 1.012, h * .02, -h / 2 + tail + bh * .08, m.orange));
    const nose = lathe(ogive(r, nh + h * .06, 14), m.hullPlain); nose.position.y = h / 2 - nh - h * .06; g.add(nose);
    g.add(cyl(r * 1.0, r * 1.1, tail, m.dark, -h / 2 + tail / 2));
    const nz = bell(r * .22, r * .58, h * .05, m.nozzle); nz.position.y = -h / 2 + tail * .4; g.add(nz);
  } else if (id === 'sls_lvsa') {
    g.add(lathe([[r * .6, h / 2], [r * .6, h / 2 - h * .06], [r, -h / 2 + h * .1], [r, -h / 2]], m.hullPlain)); g.add(ring(r * 1.01, h * .03, -h / 2 + h * .2, m.orange));
  } else if (id === 'sls_icps') {
    g.add(cyl(r, r, h, m.hullPlain)); g.add(ring(r * 1.01, h * .04, h * .1, m.orange)); g.add(ring(r * 1.01, h * .01, -h * .25, m.black)); g.add(ring(r * 1.01, h * .01, h * .38, m.black));
    g.add(cyl(r * 1.03, r * 1.03, h * .06, m.foil, -h * .46));
  } else if (id === 'sls_orion') {
    const sm = h * .5, cm = h * .5;
    g.add(cyl(r * .96, r * .96, sm, m.hullPlain, -h / 2 + sm / 2));               // European Service Module
    for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const sp = box(r * .06, sm * .7, r * .5, m.cells, Math.cos(a) * r * 1.0, -h / 2 + sm / 2, Math.sin(a) * r * 1.0); sp.rotation.y = -a; g.add(sp); } // stowed solar wings
    g.add(cyl(r * .5, r * .5, sm * .16, m.steel, -h / 2 - sm * .06)); // main engine bell hint
    g.add(lathe([[r * .98, -h / 2 + sm], [r * .94, -h / 2 + sm + cm * .08], [r * .22, h / 2 - cm * .05], [.0001, h / 2]], m.hullPlain)); // crew module (capsule cone)
    g.add(lathe([[r * .98, -h / 2 + sm - .05], [r * .98, -h / 2 + sm + .05]].concat([]), m.shield));
    g.add(ring(r * .99, sm * .04, -h / 2 + sm, m.foil));
  } else if (id === 'sls_las') {
    const bpc = h * .42; g.add(lathe([[r * 2.15, -h / 2], [r * 2.1, -h / 2 + bpc * .15], [r * .9, -h / 2 + bpc]], m.hullPlain));  // boost protective cover
    for (const a of [0, 1, 2, 3]) { const t = cyl(.22, .22, h * .45, m.steel, -h / 2 + bpc + h * .22); t.position.x = Math.cos(a * Math.PI / 2 + Math.PI / 4) * r * .7; t.position.z = Math.sin(a * Math.PI / 2 + Math.PI / 4) * r * .7; g.add(t); } // truss
    g.add(cyl(r * .85, r * .85, h * .3, m.hullPlain, h / 2 - h * .13 - h * .06));  // abort motor
    const nose = lathe(ogive(r * .85, h * .07, 10), m.hullPlain); nose.position.y = h / 2 - h * .07; g.add(nose); g.add(cyl(.12, .12, h * .1, m.steel, h / 2 + h * .02));
  } else if (id === 'hls_lander') {
    g.add(cyl(r * .72, r * .86, h * .5, m.foil, h * .05)); g.children[0].geometry = new THREE.CylinderGeometry(r * .72, r * .86, h * .5, 8);  // octagonal gold-foil crew/ascent body
    g.add(cyl(r * .45, r * .72, h * .14, m.hullPlain, h * .37)); g.add(box(r * .5, h * .16, r * .12, m.glass, 0, h * .18, r * .75));        // hatch/window
    for (const s of [-1, 1]) { const t = cyl(r * .26, r * .26, h * .26, m.steel, -h * .06); t.position.x = s * r * 1.0; g.add(t); }              // propellant tanks
    const b = bell(r * .16, r * .42, h * .2, m.nozzle); b.position.y = -h * .2; g.add(b);                                                         // descent engine
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const leg = cyl(1.1, 1.1, h * .75, m.steel); const d = new THREE.Vector3(Math.cos(a) * 1.0, -1, Math.sin(a) * 1.0).normalize(); leg.position.set(Math.cos(a) * r * 1.0, -h * .08, Math.sin(a) * r * 1.0); leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().negate()); g.add(leg);
      const pad = cyl(3.2, 3.6, .8, m.foil, 0); pad.position.set(Math.cos(a) * r * 2.1, -h / 2 + .15, Math.sin(a) * r * 2.1); g.add(pad); }
    for (const s of [-1, 1]) { const sp = box(r * 1.5, .15, r * .7, m.cells, s * r * 1.6, h * .3, 0); g.add(sp); }
    g.add(cyl(.15, .15, h * .35, m.steel, h * .55)); { const d = new THREE.Mesh(new THREE.SphereGeometry(r * .3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), m.hullPlain); d.position.y = h * .72; d.rotation.x = Math.PI * .2; g.add(d); } // comm dish
    g.add(cyl(.1, .1, h * .4, m.steel, h * .5)); g.children[g.children.length - 1].position.x = -r * .5;                                       // science mast
  }
  return g;
}

export function makePart(p) {
  const m = mats(); const id = p.id; const g = new THREE.Group(); const r = p.width / 2, h = p.height;
  let o;
  switch (true) {
    case id.startsWith('sls_') || id === 'hls_lander': o = slsModel(p, m); break;
    case id === 'cmd_pod_3': o = capsule(p, 'apollo'); break;
    case id === 'cmd_pod_2': o = capsule(p, 'gemini'); break;
    case id === 'cmd_pod_1': o = capsule(p, 'mercury'); break;
    case id === 'cmd_probe': o = new THREE.Group(); o.add(cyl(r, r, h, m.foil)); o.children[0].geometry = new THREE.CylinderGeometry(r, r, h, 8);
      o.add(cyl(r * .35, r * .35, h * .15, m.dark, h * .5)); o.add(cyl(.12, .12, h * .5, m.steel, h * .75)); break;
    case id.startsWith('struct_adapter'): o = lathe([[r, h / 2], [r * 1.0, h / 2 - h * .08], [r * .72, -h / 2 + h * .08], [r * .72, -h / 2]], m.hull);
      o = new THREE.Group().add(lathe([[r * .72, h / 2], [r * .72, h / 2 - h * .08], [r, -h / 2 + h * .08], [r, -h / 2]], m.hullPlain)); break;
    case id === 'struct_fairing': { o = new THREE.Group(); const pts = []; const n = 16; const body = h * .25;
      pts.push([r, -h / 2]); pts.push([r, -h / 2 + body]);
      const og = ogive(r, h - body, n); og.forEach(([rr, y]) => pts.push([rr, -h / 2 + body + y])); const geo = lathe(pts.slice().reverse().reverse(), m.hullPlain); o.add(geo);
      o.add(ring(r * 1.004, h * .015, -h / 2 + body, m.black)); break; }
    case id === 'struct_decoupler': o = new THREE.Group(); o.add(cyl(r, r, h, m.dark)); o.add(ring(r * 1.02, h * .35, 0, m.orange)); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const b = cyl(.12, .12, h * 1.05, m.steel); b.position.set(Math.cos(a) * r * .94, 0, Math.sin(a) * r * .94); o.add(b); } break;
    case id === 'struct_truss': o = new THREE.Group(); for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4; const c = cyl(.35, .35, h, m.steel); c.position.set(Math.cos(a) * r * .85, 0, Math.sin(a) * r * .85); o.add(c);
      const d = cyl(.2, .2, Math.hypot(h, r * 1.2), m.steel); d.position.set(Math.cos(a) * r * .85, 0, Math.sin(a) * r * .85); d.rotation.set(0, 0, 0); o.add(d); d.visible = false; }
      for (const y of [-h / 2, h / 2]) { const rr = new THREE.Mesh(new THREE.TorusGeometry(r * .85 * 1.2, .25, 6, 4), m.steel); rr.rotation.x = Math.PI / 2; rr.rotation.z = Math.PI / 4; rr.position.y = y; o.add(rr); }
      for (let s = 0; s < 4; s++) { const a1 = s / 4 * Math.PI * 2 + Math.PI / 4, a2 = (s + 1) / 4 * Math.PI * 2 + Math.PI / 4; const p1 = new THREE.Vector3(Math.cos(a1) * r * .85, -h / 2, Math.sin(a1) * r * .85), p2 = new THREE.Vector3(Math.cos(a2) * r * .85, h / 2, Math.sin(a2) * r * .85);
        const len = p1.distanceTo(p2); const br = cyl(.18, .18, len, m.steel); br.position.copy(p1.clone().add(p2).multiplyScalar(.5)); br.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p2.clone().sub(p1).normalize()); o.add(br); } break;
    case id === 'fuel_rcs': o = new THREE.Group(); { const s = new THREE.Mesh(new THREE.SphereGeometry(Math.min(r, h / 2) * .98, SEG(), 16), m.foil); o.add(s); } break;
    case id === 'fuel_large' || id === 'fuel_huge': o = tank(p, 'foam'); break;
    case id.startsWith('fuel_'): o = tank(p, 'hull'); break;
    case id === 'engine_vacuum': o = engine(p, 'vac'); break;
    case id === 'engine_ion': o = new THREE.Group(); o.add(box(r * 1.4, h * .5, r * 1.4, m.dark, 0, h * .25, 0)); o.add(cyl(r * .85, r * .9, h * .12, m.steel, -h * .1)); { const gr = cyl(r * .8, r * .8, .15, m.glow, -h * .18); o.add(gr); } o.add(cyl(r * .3, r * .3, h * .2, m.copper, h * .55)); break;
    case id.startsWith('engine_'): o = engine(p, 'sea'); break;
    case id.startsWith('booster_'): { o = new THREE.Group(); const body = h * .62, nz = h * .12;
      o.add(cyl(r, r, body, m.hull, h / 2 - body / 2 - h * .26)); o.children[0].position.y = -h / 2 + nz + body / 2;
      const nose = lathe(ogive(r, h * .26, 12).map(([rr, y]) => [rr, y]), m.hullPlain); nose.position.y = h / 2 - h * .26; o.add(nose);
      const nb = bell(r * .35, r * .62, nz, m.nozzle); nb.position.y = -h / 2 + nz; o.add(nb); o.add(ring(r * 1.01, h * .03, 0, m.red)); break; }
    case id === 'solar_panel' || id === 'solar_panel_large': o = new THREE.Group(); { const a = panel(p.width, p.height * .9, m.cells); o.add(a); o.rotation.set(0, 0, 0); } o.scale.set(1, 1, 1); break;
    case id === 'battery': o = new THREE.Group(); o.add(box(r * 1.7, h, r * 1.7, m.dark)); o.add(box(r * 1.75, h * .12, r * 1.75, m.orange, 0, h * .2)); o.add(cyl(r * .2, r * .2, h * .15, m.steel, h * .55)); break;
    case id === 'reaction_wheel': o = new THREE.Group(); o.add(cyl(r, r, h * .6, m.dark)); { const t = new THREE.Mesh(new THREE.TorusGeometry(r * .75, r * .12, 8, 20), m.steel); t.rotation.x = Math.PI / 2; o.add(t); } break;
    case id === 'rcs_thruster': o = new THREE.Group(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const n = bell(r * .12, r * .3, h * .5, m.nozzle); n.rotation.z = -Math.PI / 2; n.position.set(Math.cos(a) * r * .7, 0, Math.sin(a) * r * .7); n.rotation.set(0, -a, Math.PI / 2); o.add(n); } o.add(cyl(r * .5, r * .5, h * .5, m.dark)); break;
    case id === 'computer': o = new THREE.Group(); o.add(box(r * 1.8, h * .8, r * 1.8, m.dark)); for (let i = 0; i < 4; i++) o.add(box(.5, .5, .2, new THREE.MeshBasicMaterial({ color: [0x33ff77, 0xffb020, 0x33aaff, 0xff4040][i] }), -r * .6 + i * r * .4, 0, r * .91)); break;
    case id === 'landing_legs': o = new THREE.Group(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const leg = cyl(.5, .5, Math.hypot(h, r * .9), m.steel); leg.position.set(Math.cos(a) * r * .55, 0, Math.sin(a) * r * .55);
        const dir = new THREE.Vector3(Math.cos(a) * r * 1.1, -h, Math.sin(a) * r * 1.1).normalize(); leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate()); o.add(leg);
        const pad = cyl(1.6, 1.6, .3, m.foil, -h / 2); pad.position.x = Math.cos(a) * r * 1.1; pad.position.z = Math.sin(a) * r * 1.1; o.add(pad); } o.add(cyl(r * .5, r * .5, h * .3, m.dark, h * .3)); break;
    case id === 'sci_camera': o = new THREE.Group(); o.add(box(r * 1.6, h * .8, r * 1.6, m.dark)); o.add(cyl(r * .5, r * .55, h * .5, m.black, 0)); o.children[1].rotation.x = Math.PI / 2; o.children[1].position.z = r * .9; o.add(cyl(r * .35, r * .35, .1, m.glass)); o.children[2].rotation.x = Math.PI / 2; o.children[2].position.z = r * .9 + h * .26; break;
    case id === 'sci_spectrometer': o = new THREE.Group(); o.add(cyl(r * .8, r * .8, h * .8, m.steel)); o.add(cyl(r * .55, r * .55, h * .2, m.glass, h * .45)); break;
    case id === 'sci_magnetometer': o = new THREE.Group(); o.add(box(r, r, r, m.dark, 0, -h * .25)); { const bm = cyl(.12, .12, h * 2.4, m.steel, h * .9); o.add(bm); const tip = new THREE.Mesh(new THREE.SphereGeometry(.45, 12, 8), m.orange); tip.position.y = h * 2.1; o.add(tip); } break;
    case id === 'sci_radar': o = new THREE.Group(); o.add(cyl(r * .3, r * .3, h * .5, m.dark, -h * .2)); { const d = new THREE.Mesh(new THREE.SphereGeometry(r, SEG(), 8, 0, Math.PI * 2, 0, Math.PI / 3), m.hullPlain); d.scale.y = .5; d.position.y = h * .1; o.add(d); } break;
    case id === 'sci_thermometer': o = new THREE.Group(); o.add(box(r * 1.2, h * .6, r * 1.2, m.foil)); o.add(cyl(.1, .1, h * 1.2, m.steel, h * .6)); break;
    case id === 'antenna': o = new THREE.Group(); o.add(cyl(.18, .24, h, m.steel)); o.add(cyl(.5, .5, .12, m.steel, h / 2)); for (let i = 0; i < 3; i++) { const a = cyl(.06, .06, r * 1.8, m.steel, h * (.15 + i * .2)); a.rotation.z = Math.PI / 2; o.add(a); } break;
    case id === 'dish_antenna': o = new THREE.Group(); o.add(cyl(.3, .3, h * .5, m.steel, -h * .25)); { const d = new THREE.Mesh(new THREE.SphereGeometry(r * 1.0, SEG(), 10, 0, Math.PI * 2, 0, Math.PI / 2.6), m.white); d.material = m.white.clone(); d.material.side = THREE.DoubleSide; d.scale.y = .45; d.rotation.x = Math.PI * .22; d.position.y = h * .1; o.add(d);
      const f = cyl(.08, .08, h * .45, m.steel, h * .3); f.rotation.x = Math.PI * .22; o.add(f); } break;
    case id === 'satellite_bus': o = new THREE.Group(); o.add(box(r * 1.3, h * .9, r * 1.3, m.foil)); { const a = panel(p.width * 1.2, p.height * .55, m.cells); a.position.y = 0; o.add(a); const d = new THREE.Mesh(new THREE.SphereGeometry(r * .45, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), m.white); d.position.y = h * .45; o.add(d); } break;
    case id === 'rover': o = new THREE.Group(); o.add(box(r * 1.2, h * .35, r * 1.5, m.hullPlain, 0, h * .1)); for (const s of [-1, 1]) for (const z of [-.6, 0, .6]) { const w = cyl(h * .22, h * .22, r * .22, m.wheel, -h * .22); w.rotation.z = Math.PI / 2; w.position.set(s * r * .75, -h * .22, z * r * .75); o.add(w); }
      o.add(cyl(.18, .18, h * .6, m.steel, h * .5)); o.add(box(r * 1.4, .12, r * 1.0, m.cells, 0, h * .3)); break;
    case id === 'lander': o = new THREE.Group(); o.add(cyl(r * .95, r * 1.0, h * .45, m.foil, -h * .15)); o.children[0].geometry = new THREE.CylinderGeometry(r * .95, r * 1.0, h * .45, 8); o.add(cyl(r * .55, r * .6, h * .4, m.hullPlain, h * .25)); o.children[1].geometry = new THREE.CylinderGeometry(r * .55, r * .6, h * .4, 8);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; const leg = cyl(.35, .35, h * .7, m.steel); const dir = new THREE.Vector3(Math.cos(a) * .9, -1, Math.sin(a) * .9).normalize(); leg.position.set(Math.cos(a) * r * 1.2, -h * .1, Math.sin(a) * r * 1.2); leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate()); o.add(leg);
        const pad = cyl(1.2, 1.2, .25, m.foil, -h / 2); pad.position.set(Math.cos(a) * r * 1.9, -h / 2 + .1, Math.sin(a) * r * 1.9); o.add(pad); }
      { const b = bell(r * .15, r * .38, h * .22, m.nozzle); b.position.y = -h * .37; o.add(b); } break;
    default: o = new THREE.Group(); o.add(cyl(r, r, h, m.hull));
  }
  g.add(o);
  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  g.userData.part = p;
  return g;
}

// Payload fairing shell (half). Covers a payload stack of total height h; tangent-ogive nose, cylindrical body.
export function makeFairingHalf(r, h, side) {
  const m = mats(); const nl = Math.min(h * .62, r * 5.2), cl = Math.max(.01, h - nl); const rho = (r * r + nl * nl) / (2 * r); const pts = [[r, -h / 2], [r, -h / 2 + cl]];
  const n = 14; for (let i = 1; i <= n; i++) { const x = i / n * nl; pts.push([Math.max(.001, Math.sqrt(Math.max(0, rho * rho - x * x)) + r - rho), -h / 2 + cl + x]); }
  const geo = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 24, side * Math.PI, Math.PI);
  const mat = m.hullPlain.clone(); mat.side = THREE.DoubleSide;
  const g = new THREE.Group(); g.add(new THREE.Mesh(geo, mat));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.005, r * 1.005, h * .02, 24, 1, true, side * Math.PI, Math.PI), m.black); band.position.y = -h / 2 + cl; g.add(band);
  return g;
}
