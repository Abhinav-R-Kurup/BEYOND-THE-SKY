import * as THREE from 'three';
import { Core } from './core.js';
import { Stage } from './post.js';
import { makeEarth, makeMoon, makeMars, makeSun, makeStars } from './planets.js';

function ring(r, color, op = .18, n = 256) {
  const p = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; p.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false }));
}

export function makeSatellite(scale = 1) {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a53a, metalness: .9, roughness: .35 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1.4), gold); g.add(body);
  const solar = new THREE.MeshStandardMaterial({ color: 0x1c3a78, metalness: .6, roughness: .3, emissive: 0x0a1a40, emissiveIntensity: .5 });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(3, .04, 1.2), solar); p.position.x = s * 2.2; g.add(p); }
  const dish = new THREE.Mesh(new THREE.SphereGeometry(.45, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: .6, roughness: .4 }));
  dish.position.set(0, .7, 0); g.add(dish);
  g.scale.setScalar(scale); return g;
}

export function createMenuScene() {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 20000);
  const stage = new Stage(scene, cam, { bloom: .55, radius: .7, threshold: .9 });
  const sunDir = new THREE.Vector3(.9, .3, .45).normalize();
  scene.add(makeStars(9000));
  const amb = new THREE.AmbientLight(0x1a2438, 0.6); scene.add(amb);
  const sl = new THREE.DirectionalLight(0xfff1dd, 3.2); sl.position.copy(sunDir).multiplyScalar(1000); scene.add(sl);

  const R = 100;
  const earth = makeEarth(R); earth.position.set(140, -80, 0); earth.rotation.z = THREE.MathUtils.degToRad(23.4);
  earth.userData.u.sunDir.value.copy(sunDir); scene.add(earth);
  const moonPivot = new THREE.Group(); moonPivot.position.copy(earth.position); moonPivot.rotation.x = .09; scene.add(moonPivot);
  const moon = makeMoon(R * .27); moon.position.set(R * 4.2, 0, 0); moonPivot.add(moon);
  const moonOrbit = ring(R * 4.2, 0x5fa8ff, .07); moonPivot.add(moonOrbit);
  const mars = makeMars(R * .53); mars.position.set(R * 11, R * 1.2, -R * 9); scene.add(mars);
  const sun = makeSun(R * 3); sun.position.copy(sunDir).multiplyScalar(R * 70); scene.add(sun);

  // satellites on inclined rings around Earth
  const sats = [];
  [[1.28, 52, .9], [1.45, 98, .6], [1.9, 20, .4]].forEach(([k, inc, sp], i) => {
    const piv = new THREE.Group(); piv.position.copy(earth.position); piv.rotation.set(THREE.MathUtils.degToRad(inc), i, 0); scene.add(piv);
    piv.add(ring(R * k, 0x6bd3ff, .05));
    const s = makeSatellite(R * .018); s.position.set(R * k, 0, 0); piv.add(s); sats.push({ piv, s, sp: sp * .06 });
  });

  cam.position.set(0, 20, 330); cam.lookAt(-10, -10, 0);
  let t0 = 0, blur = 0, blurT = 0;
  const base = new THREE.Vector3(0, 20, 470);
  return {
    name: 'menu', stage,
    resize(w, h) { stage.resize(w, h); },
    setFocus(f) { blurT = f; },   // 0 = hero menu, 1 = dimmed (other screens)
    update(dt, t) {
      earth.tick(dt, .02);
      moonPivot.rotation.y += dt * .025; moon.rotation.y += dt * .004;
      mars.rotation.y += dt * .01;
      sun.tick(dt);
      sats.forEach(o => { o.piv.rotation.y += dt * o.sp * .3; o.s.rotation.y += dt * .5; });
      blur += (blurT - blur) * Math.min(1, dt * 2);
      const mx = Core.mouse.x, my = Core.mouse.y;
      const a = t * .03;
      cam.position.x += (base.x + mx * 22 + Math.sin(a) * 20 - cam.position.x) * Math.min(1, dt * 1.5);
      cam.position.y += (base.y - my * 14 + Math.cos(a * .8) * 8 - cam.position.y) * Math.min(1, dt * 1.5);
      cam.position.z = base.z - blur * 90;
      cam.lookAt(40 + blur * 20, -25, 0);
      stage.bp && (stage.bp.strength = .55 - blur * .25);
      amb.intensity = .6 - blur * .25;
    },
    render(r) { stage.render(r); },
  };
}
