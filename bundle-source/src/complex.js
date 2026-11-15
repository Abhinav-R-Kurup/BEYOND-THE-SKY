// Launch complex built from reference proportions (Sriharikota/KSC-like): tower, lightning masts, VAB, tanks, trench.
import * as THREE from 'three';
const mat = (c, r = .6, m = .3) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });

function lattice(w, h, color, step = 12) {
  const g = new THREE.Group(); const m = mat(color, .55, .5); const s = w / 2;
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(1, h, 1), m); l.position.set(a * s, h / 2, b * s); g.add(l); });
  const sides = [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]];
  for (let y = 0; y <= h; y += step) sides.forEach(([[a, b], [c, d]], i) => {
    const len = Math.hypot((c - a) * s, (d - b) * s); const br = new THREE.Mesh(new THREE.BoxGeometry(len, .5, .5), m); br.position.set((a + c) * s / 2, y, (b + d) * s / 2); br.rotation.y = Math.atan2(-(d - b), (c - a)); g.add(br);
    if (y + step <= h) { const dg = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(len, step), .4, .4), m); dg.position.set((a + c) * s / 2, y + step / 2, (b + d) * s / 2); dg.rotation.y = br.rotation.y; dg.rotation.z = Math.atan2(step, len) * (i % 2 ? 1 : -1); g.add(dg); } });
  return g;
}

export function makeComplex() {
  const root = new THREE.Group(); const g = new THREE.Group(); g.position.y = -10.5; root.add(g);
  // pad deck + flame trench
  const deck = new THREE.Mesh(new THREE.BoxGeometry(60, 6, 60), mat(0x8c9096, .85, .1)); deck.position.y = -3 + 6; deck.receiveShadow = true; g.add(deck);
  const trench = new THREE.Mesh(new THREE.BoxGeometry(14, 6.2, 70), mat(0x1a1b1d, 1, 0)); trench.position.set(0, 3.05, 0); g.add(trench);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(55, 62, 3, 48), mat(0x6e7378, .9, .1)); base.position.y = 1.5; base.receiveShadow = true; g.add(base);
  // launch mount (table) under the rocket with hold-downs
  const mount = new THREE.Mesh(new THREE.BoxGeometry(22, 4, 22), mat(0x4a4d52, .6, .6)); mount.position.y = 8.5; mount.castShadow = true; g.add(mount);
  const hole = new THREE.Mesh(new THREE.BoxGeometry(9, 4.2, 9), mat(0x0a0a0a, 1, 0)); hole.position.y = 8.5; g.add(hole);
  const dec = new THREE.Mesh(new THREE.BoxGeometry(16, .1, 60), mat(0x0c0c0d, 1, 0)); dec.position.y = 10.55; g.add(dec);
  // umbilical tower (red/white lattice), service arms
  const tw = lattice(10, 110, 0xc2402c); tw.position.set(-22, 6, 0); tw.traverse(o => o.castShadow = true); g.add(tw);
  const tw2 = lattice(4, 15, 0xffffff, 5); tw2.position.set(-22, 116, 0); g.add(tw2);
  for (const y of [30, 55, 80, 100]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(18, 2.2, 2.2), mat(0xe8e8e8, .5, .5)); arm.position.set(-9, y + 6, 0); g.add(arm); }
  // lightning masts
  [[-60, -50], [60, -50], [-60, 60], [60, 60]].forEach(([x, z]) => { const m = lattice(2.2, 135, 0xcfd2d6, 15); m.position.set(x, 0, z); g.add(m); const tip = new THREE.Mesh(new THREE.ConeGeometry(.5, 10, 8), mat(0xffffff, .3, .8)); tip.position.set(x, 140, z); g.add(tip); });
  // spherical propellant tanks
  [[110, 80], [140, 60]].forEach(([x, z]) => { const s = new THREE.Mesh(new THREE.SphereGeometry(11, 32, 16), mat(0xf2f2f2, .45, .4)); s.position.set(x, 11, z); s.castShadow = true; g.add(s); const leg = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 4, 12), mat(0x888888)); leg.position.set(x, 2, z); g.add(leg); });
  // assembly building (VAB-style)
  const vab = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(110, 130, 95), mat(0xe9e6df, .8, .1)); body.position.y = 65; body.castShadow = true; body.receiveShadow = true; vab.add(body);
  const door = new THREE.Mesh(new THREE.BoxGeometry(.6, 90, 46), mat(0x2a3a56, .5, .3)); door.position.set(55.3, 45, 0); vab.add(door);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(111, 8, 96), mat(0x24334f)); stripe.position.y = 100; vab.add(stripe);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(.5, 24, 40), mat(0xc83b2c)); flag.position.set(55.4, 100, 20); vab.add(flag);
  vab.position.set(-420, 0, 520); g.add(vab);
  // road to pad
  const road = new THREE.Mesh(new THREE.BoxGeometry(12, .4, 600), mat(0x3b3d40, .95, 0)); road.position.set(-190, .1, 260); road.rotation.y = .0; g.add(road);
  // water deluge pipes + sound-suppression pond glow
  const pond = new THREE.Mesh(new THREE.BoxGeometry(24, .3, 24), mat(0x2b6f9a, .1, .7)); pond.position.set(60, .3, -90); g.add(pond);
  g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  return root;
}
