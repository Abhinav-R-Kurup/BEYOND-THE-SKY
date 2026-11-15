import * as THREE from 'three';
import { Core } from './core.js';
import { Stage } from './post.js';
import { makePart } from './models.js';

function gridTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#1a2029'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .03})`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2); }
  g.strokeStyle = 'rgba(120,160,200,.22)'; g.lineWidth = 2; for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20, 20); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function backdrop() {
  const c = document.createElement('canvas'); c.width = 8; c.height = 256; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#0b1220'); gr.addColorStop(.55, '#1b2a40'); gr.addColorStop(1, '#2a3a52'); g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function tower(h) {
  const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: 0xb8402a, roughness: .6, metalness: .5 });
  const w = 26; const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  legs.forEach(([a, b]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(2, h, 2), m); l.position.set(a * w / 2, h / 2, b * w / 2); g.add(l); });
  for (let y = 0; y <= h; y += 22) { for (let i = 0; i < 4; i++) { const [a, b] = legs[i], [c, d] = legs[(i + 1) % 4]; const len = Math.hypot((c - a) * w / 2, (d - b) * w / 2) ; const br = new THREE.Mesh(new THREE.BoxGeometry(len, 1.2, 1.2), m);
    br.position.set((a + c) * w / 4, y, (b + d) * w / 4); br.rotation.y = Math.atan2(-(d - b), (c - a)); g.add(br);
    if (y < h) { const dg = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(len, 22), 1, 1), m); dg.position.set((a + c) * w / 4, y + 11, (b + d) * w / 4); dg.rotation.y = br.rotation.y; dg.rotation.z = Math.atan2(22, len) * (i % 2 ? 1 : -1); g.add(dg); } } }
  return g;
}

export function createBuilderScene() {
  const scene = new THREE.Scene(); scene.background = backdrop(); scene.fog = new THREE.Fog(0x16202f, 500, 1800); scene.environment = Core.env; scene.environmentIntensity = .7;
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, 1, 6000);
  const stage = new Stage(scene, cam, { bloom: .25, radius: .5, threshold: .92 });
  scene.add(new THREE.HemisphereLight(0xbcd2ff, 0x1a1c20, .9));
  const key = new THREE.DirectionalLight(0xfff0dd, 3.0); key.position.set(160, 260, 220); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); const sc = key.shadow.camera; sc.left = -260; sc.right = 260; sc.top = 320; sc.bottom = -320; sc.near = 10; sc.far = 900; key.shadow.bias = -0.0003; key.shadow.normalBias = 1.5; key.shadow.radius = 3; scene.add(key);
  const rim = new THREE.DirectionalLight(0x6aa8ff, 1.4); rim.position.set(-200, 120, -180); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.ShadowMaterial({ opacity: .28, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -150; floor.receiveShadow = true; floor.renderOrder = 1; scene.add(floor);
  const gridMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: {}, vertexShader: 'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vP;void main(){vec2 g=abs(fract(vP.xy/50.+.5)-.5)/fwidth(vP.xy/50.);float l=1.-min(min(g.x,g.y),1.);float f=smoothstep(700.,60.,length(vP.xy));gl_FragColor=vec4(.45,.65,.9,l*.22*f);}', extensions: { derivatives: true } });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), gridMat); grid.rotation.x = -Math.PI / 2; grid.position.y = -150; grid.renderOrder = 0; scene.add(grid);
  const tw = tower(330); tw.position.set(-70, -150, -40); scene.add(tw);
  const arm = new THREE.Group(); const hb = new THREE.Mesh(new THREE.BoxGeometry(60, 3, 3), tw.children[0].material); hb.position.set(30, 0, 0); arm.add(hb); arm.position.set(-57, 20, -40); scene.add(arm);
  // back wall panels (VAB interior feel)
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(2600, 900), new THREE.MeshStandardMaterial({ color: 0x141a24, roughness: 1 })); wall.position.set(0, 250, -420); scene.add(wall);

  const rocket = new THREE.Group(); scene.add(rocket);
  const world = new THREE.Group(); scene.add(world); world.add(rocket);
  const sel = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x06e0ff, toneMapped: false })); sel.visible = false; scene.add(sel);
  const ghost = new THREE.Group(); scene.add(ghost);
  let sig = '', meshes = new Map(), yaw = .45, pitch = .12, tYaw = .45, tPitch = .12;
  const api = {
    name: 'builder', stage, get yaw() { return tYaw; },
    rotateView(dx, dy) { tYaw += dx * .008; tPitch = Math.max(-.5, Math.min(.9, tPitch + dy * .006)); },
    resetView() { tYaw = .45; tPitch = .12; },
    resize(w, h) { stage.resize(w, h); },
    show() { sig = ''; key.castShadow = Core.q.scale >= 1; },
    rebuild(parts) {
      const bot = parts.length ? Math.max(...parts.map(p => p.y + p.height / 2)) : 150; const fy = -bot - 4;
      floor.position.y = fy; grid.position.y = fy - .2; tw.position.y = fy; arm.position.y = fy + 215;
      const seen = new Set();
      parts.forEach(p => {
        seen.add(p.instanceId); let e = meshes.get(p.instanceId);
        if (!e || e.id !== p.id || e.w !== p.width || e.h !== p.height) {
          if (e) { rocket.remove(e.m); e.m.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
          const m = makePart(p); m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); rocket.add(m); e = { m, id: p.id, w: p.width, h: p.height }; meshes.set(p.instanceId, e);
        }
        e.m.position.set(p.x, -p.y, 0); e.m.rotation.z = -(p.rotation || 0);
      });
      for (const [k, e] of meshes) if (!seen.has(k)) { rocket.remove(e.m); e.m.traverse(o => { if (o.geometry) o.geometry.dispose(); }); meshes.delete(k); }
    },
    update(dt) {
      const B = (api._B = api._B || (0, eval)('typeof Builder!=="undefined"?Builder:null')); if (!B || !B.canvas) return;
      const parts = B.assembledParts || [];
      const s = parts.map(p => p.instanceId + ':' + p.id + ':' + p.x.toFixed(1) + ':' + p.y.toFixed(1) + ':' + (p.rotation || 0)).join('|');
      if (s !== sig) { sig = s; this.rebuild(parts); }
      yaw += (tYaw - yaw) * Math.min(1, dt * 8); pitch += (tPitch - pitch) * Math.min(1, dt * 8);
      const idleSpin = B.draggingPart || B.isPanning ? 0 : 0;
      world.rotation.y = yaw + idleSpin; world.rotation.x = 0;
      // camera: match 2D builder camera (pan/zoom) so the 2D overlay lines up
      const r = B.canvas.getBoundingClientRect(); const W = innerWidth, H = innerHeight; const zoom = B.camera.zoom;
      const d = (H / zoom) / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)));
      const tx = -B.camera.x / zoom, ty = B.camera.y / zoom;
      cam.position.set(tx, ty + Math.sin(pitch) * d, Math.cos(pitch) * d);
      cam.position.y = ty + Math.sin(pitch) * d; cam.lookAt(tx, ty, 0);
      cam.updateMatrixWorld();
      const cxc = r.left + r.width / 2, cyc = r.top + r.height / 2;
      cam.setViewOffset(W, H, -(cxc - W / 2), -(cyc - H / 2), W, H);
      cam.aspect = W / H; // viewport shape stays full-window; area matched via offset
      // selection box
      const sp = B.selectedPart; sel.visible = false;
      if (sp && meshes.has(sp.instanceId)) { const m = meshes.get(sp.instanceId).m; const bb = new THREE.Box3().setFromObject(m); const size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
        sel.visible = true; sel.position.copy(c); sel.scale.copy(size.multiplyScalar(1.04)); }
    },
    render(r) { stage.render(r); },
    pick: null,
  };
  return api;
}
