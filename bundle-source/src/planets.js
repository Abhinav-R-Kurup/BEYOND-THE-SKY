import * as THREE from 'three';
import { Core } from './core.js';

const EARTH_V = `
varying vec2 vUv; varying vec3 vN; varying vec3 vW; varying vec3 vC;
void main(){ vUv=uv; vC=modelMatrix[3].xyz; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz;
 gl_Position=projectionMatrix*viewMatrix*w; }`;
const EARTH_F = `
uniform sampler2D dayT,nightT,specT,cloudT; uniform vec3 sunDir; uniform float cloudOff,useClouds;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){
  vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vW);
  float ndl=dot(N,sunDir);
  vec3 day=texture2D(dayT,vUv).rgb;
  // grade: bluer deeper oceans, richer greens (matches stylised reference Earth)
  float lum=dot(day,vec3(.299,.587,.114));
  float water=smoothstep(.0,.6,texture2D(specT,vUv).r);
  day=mix(day,day*vec3(.55,.95,1.5)+vec3(0.,.02,.06),water);
  day=mix(day,day*vec3(1.05,1.12,.8),(1.-water)*.35);
  vec3 night=texture2D(nightT,vUv).rgb;
  float cl=texture2D(cloudT,vUv+vec2(cloudOff,0.)).r*useClouds;
  float lit=smoothstep(-.12,.25,ndl);
  vec3 col=day*(max(ndl,0.)*1.45+.03);
  // specular sun glint on water
  vec3 H=normalize(sunDir+V); float sp=pow(max(dot(N,H),0.),90.)*water*1.3*step(0.,ndl);
  col+=vec3(1.,.93,.8)*sp;
  // clouds (self shadow, lit)
  vec3 cc=vec3(1.)*(max(ndl,0.)*1.05+.02);
  col=mix(col,cc,cl*.9*lit+cl*.0);
  // night side
  float nm=1.-smoothstep(-.18,.06,ndl);
  col+=night*vec3(1.,.8,.5)*nm*(1.-cl*.8)*1.6;
  // twilight tint
  float tw=exp(-pow(ndl*5.,2.)); col+=vec3(.9,.35,.12)*tw*.035*(1.-water*.0);
  // rim atmosphere on surface
  float fr=pow(1.-max(dot(N,V),0.),3.); col+=vec3(.25,.5,1.)*fr*.55*(lit*.9+.1);
  gl_FragColor=vec4(col,1.);
}`;
const ATM_F = `
uniform vec3 sunDir; uniform vec3 tint; uniform float power,gain;
varying vec3 vN; varying vec3 vW;
void main(){ vec3 V=normalize(cameraPosition-vW); float f=pow(max(dot(normalize(vN),V),0.),power);
 float sun=smoothstep(-.4,.5,dot(normalize(vW),sunDir));
 gl_FragColor=vec4(tint*f*gain*(.15+.85*sun),f*gain*(.2+.8*sun)); }`;

export function makeEarth(radius, opt = {}) {
  const g = new THREE.Group();
  const seg = Core.q.seg;
  const u = {
    dayT: { value: Core.tex('earthDay') }, nightT: { value: Core.tex('earthLights') },
    specT: { value: Core.tex('earthSpec', { srgb: false }) }, cloudT: { value: Core.tex('earthClouds', { srgb: false, repeat: true }) },
    sunDir: { value: new THREE.Vector3(1, .2, .6).normalize() }, cloudOff: { value: 0 }, useClouds: { value: Core.q.clouds ? 1 : 0 },
  };
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: EARTH_V, fragmentShader: EARTH_F });
  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, seg, seg / 2), mat);
  g.add(body);
  const au = { sunDir: u.sunDir, tint: { value: new THREE.Color(.28, .55, 1.) }, power: { value: 3.2 }, gain: { value: 1.5 } };
  const atm = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.045, seg, seg / 2), new THREE.ShaderMaterial({
    uniforms: au, vertexShader: EARTH_V, fragmentShader: ATM_F, side: THREE.BackSide === 0 ? 0 : THREE.FrontSide,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  // front-side halo using inverted fresnel (pow on N·V of back faces)
  atm.material.side = THREE.BackSide;
  atm.material.fragmentShader = `uniform vec3 sunDir; uniform vec3 tint; uniform float power,gain; varying vec3 vN; varying vec3 vW; varying vec3 vC;
   void main(){ vec3 V=normalize(cameraPosition-vW); float f=pow(max(dot(-normalize(vN),V),0.),power);
   float sun=smoothstep(-.5,.5,dot(normalize(vW-vC),sunDir));
   gl_FragColor=vec4(tint*f*gain*(.2+.8*sun),f*gain*(.2+.8*sun)); }`;
  atm.material.uniforms.power.value = opt.power || 6.0; atm.material.uniforms.gain.value = 1.2;
  atm.scale.setScalar(opt.atm || 1.12);
  g.add(atm);
  g.userData = { u, body, atm };
  g.tick = (dt, spin = 0.012) => { body.rotation.y += dt * spin; u.cloudOff.value += dt * 0.0006; };
  return g;
}

export function makeMoon(radius) {
  const seg = Core.q.seg;
  const m = new THREE.MeshStandardMaterial({ map: Core.tex('moon'), bumpMap: Core.tex('moonBump', { srgb: false }), bumpScale: 3, roughness: 1, metalness: 0 });
  return new THREE.Mesh(new THREE.SphereGeometry(radius, seg, seg / 2), m);
}
export function makeMars(radius) {
  const seg = Core.q.seg;
  const m = new THREE.MeshStandardMaterial({ map: Core.tex('mars'), bumpMap: Core.tex('marsBump', { srgb: false }), bumpScale: 4, roughness: 1, metalness: 0 });
  const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(radius, seg, seg / 2), m));
  const a = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.03, 48, 24), new THREE.ShaderMaterial({
    uniforms: { c: { value: new THREE.Color(.9, .5, .3) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide,
    vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader: 'uniform vec3 c; varying vec3 vN; varying vec3 vW; void main(){ vec3 V=normalize(cameraPosition-vW); float f=pow(max(dot(-normalize(vN),V),0.),8.); gl_FragColor=vec4(c*f*.5,f*.5);}' }));
  a.scale.setScalar(1.1); g.add(a);
  return g;
}

export function makeSun(radius) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), new THREE.MeshBasicMaterial({ map: Core.tex('sun'), color: new THREE.Color(2.2, 1.7, 1.1), toneMapped: false }));
  g.add(m);
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const gr = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(.15, 'rgba(255,200,120,.55)'); gr.addColorStop(.4, 'rgba(255,150,60,.15)'); gr.addColorStop(1, 'rgba(255,100,20,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
  glow.scale.setScalar(radius * 9); g.add(glow);
  g.tick = dt => { m.rotation.y += dt * 0.01; };
  return g;
}

export function makeStars(radius = 5000) {
  const g = new THREE.Group();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), new THREE.MeshBasicMaterial({ map: Core.tex('galaxy'), side: THREE.BackSide, depthWrite: false, color: new THREE.Color(.13, .13, .17), toneMapped: false }));
  sky.renderOrder = -10; g.add(sky);
  const n = Core.q.stars, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    pos.set([r * Math.cos(t) * radius * .98, u * radius * .98, r * Math.sin(t) * radius * .98], i * 3);
    const k = .5 + Math.random() * .5, w = Math.random();
    col.set([k * (.8 + .2 * w), k * .9, k * (1 - .25 * w)], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false, transparent: true, toneMapped: false }));
  pts.renderOrder = -9; g.add(pts);
  const nb = Math.max(60, n >> 4), bp = new Float32Array(nb * 3), bc = new Float32Array(nb * 3);
  for (let i = 0; i < nb; i++) { const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); bp.set([r * Math.cos(t) * radius * .97, u * radius * .97, r * Math.sin(t) * radius * .97], i * 3); const w = Math.random(); bc.set([1, .92 + .08 * w, .85 + .15 * (1 - w)], i * 3); }
  const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(bp, 3)); g2.setAttribute('color', new THREE.BufferAttribute(bc, 3));
  const bright = new THREE.Points(g2, new THREE.PointsMaterial({ size: 3.1, sizeAttenuation: false, vertexColors: true, depthWrite: false, transparent: true, opacity: .95, toneMapped: false })); bright.renderOrder = -9; g.add(bright);
  g.setVis = v => { pts.material.opacity = v; bright.material.opacity = .95 * v; sky.material.color.setRGB(.13 * v, .13 * v, .17 * v); pts.visible = bright.visible = v > .01; };
  return g;
}
