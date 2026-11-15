import * as THREE from 'three';
import { Core } from './core.js';
import { Stage } from './post.js';

// Cinematic black hole: gravitational-lensing shader (Einstein-ring mapping of a procedural
// star/nebula field), Keplerian-rotating turbulent accretion disk with Doppler beaming and
// blackbody colour ramp, lensed back-side halo, photon ring. Driven by the 2D intro timeline.
const FRAG = `
precision highp float; varying vec2 vUv;
uniform float uT, uAsp, uBH, uP, uWarp, uQ; uniform vec2 uC; uniform float uR;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){if(float(i)>=uQ)break;s+=a*vn(p);p=p*2.03+vec2(17.1,9.7);a*=.5;}return s;}
vec3 stars(vec2 p){vec3 c=vec3(0.);
  for(int l=0;l<3;l++){float sc=45.+float(l)*70.;vec2 g=p*sc;vec2 id=floor(g);vec2 f=fract(g)-.5;float r=h21(id+float(l)*13.7);
    if(r>.9){vec2 o=vec2(h21(id+1.3),h21(id+7.9))-.5;float d=length(f-o*.6);float b=smoothstep(.09+float(l)*.0,0.,d)*(.5+r);
      vec3 tc=mix(vec3(.7,.8,1.),vec3(1.,.82,.62),h21(id+3.1));c+=tc*b*(1.4-float(l)*.3)*(.7+.3*sin(uT*2.+r*40.));}}
  return c;}
vec3 bg(vec2 p){
  float n=fbm(p*1.6+vec2(3.,1.))*fbm(p*.9-vec2(8.,2.));
  vec3 neb=mix(vec3(.004,.006,.014),vec3(.03,.03,.05),smoothstep(.2,.6,n));
  return neb*.9+stars(p);}
vec3 bbody(float t){t=clamp(t,0.,1.);vec3 hot=vec3(1.,.93,.82),mid=vec3(1.,.55,.16),cool=vec3(.5,.1,.03);return t>.5?mix(mid,hot,(t-.5)*2.):mix(cool,mid,t*2.);}
void main(){
  vec2 q=(vUv-.5)*vec2(uAsp,1.); vec2 c=(uC-.5)*vec2(uAsp,1.);
  vec2 p=(q-c)/uR;                       // units of shadow radius
  float r=length(p); vec2 dir=p/max(r,1e-4);
  // lensing: beta = theta - thetaE^2/theta  (thetaE ~ 1.5 shadow radii)
  float tE=1.55; vec2 beta=p-dir*tE*tE/max(r,.2);
  float rot=uT*.004; mat2 R2=mat2(cos(rot),-sin(rot),sin(rot),cos(rot));
  vec2 bp=(R2*(c+beta*uR*.55))*1.0+vec2(uT*.002,0.);
  vec3 col=bg(bp*1.2+vec2(.4,.2));
  // warp-streak stretch of stars toward horizon late in the shot
  col*= (1.+uWarp*.4);
  // ---- accretion disk (inclined ~78deg) ----
  float inc=.2; // cos(i)
  float rin=1.7, rout=7.0*(.9+.25*uP);
  vec3 add=vec3(0.); float occ=0.;
  // primary image (front of disk, in front of shadow also crossing it)
  vec2 dpl=vec2(p.x,p.y/inc); float rd=length(dpl); float ph=atan(dpl.y,dpl.x);
  // halo: back of the disk lensed over/under the shadow, circular approx with radius mapping
  float rh=r;
  for(int k=0;k<2;k++){
    float rr = k==0 ? rd : (rh*1.0+0.0);
    float ang = k==0 ? ph : atan(p.y,p.x);
    if(k==0 && !(rd>rin&&rd<rout)) continue;
    float w1=smoothstep(rin*.62,rin*.62+.45,rh)*smoothstep(rout*.34,rout*.34-1.4,rh);
    if(k==1 && w1<=0.) continue;
    float rrr = k==0 ? rr : rr*2.2;               // halo is the far side mapped to small radius
    float om = 2.2/pow(rrr,1.5);
    float a2=ang+uT*om*.55;
    float tur=fbm(vec2(a2*2.2,rrr*3.2)+uT*.05)*.8+fbm(vec2(a2*7.,rrr*9.))*.4;
    float prof=pow(max(1.-(rrr-rin)/(rout-rin),0.),1.6)*smoothstep(rin,rin+.35,rrr);
    float temp=pow(clamp(1.-(rrr-rin)/(rout-rin),0.,1.),.85);
    // doppler beaming: approaching side (left) bright, receding dim
    float v=min(.62,.75/sqrt(rrr)); float beam=1./(1.-v*(-cos(ang)*(k==0?1.:.8))); beam=pow(beam,3.);
    float I=prof*(.35+tur)*beam*(k==0?1.:.7*w1); occ=max(occ,clamp(I*.9,0.,.85));
    add+=bbody(temp*(.55+.3*clamp(beam*.35,0.,1.))+.05)*I*.55;
  }
  // photon ring
  float ring=exp(-pow((r-1.03)*28.,2.))*1.6+exp(-pow((r-1.22)*16.,2.))*.35;
  add+=vec3(1.,.82,.55)*ring*.55*(.6+.4*smoothstep(-1.,1.,-dir.x));
  // shadow + gravitational redshift
  float shadow=smoothstep(.98,1.0,r);
  col*=mix(0.,1.,shadow); col*=mix(.35,1.,smoothstep(1.,2.2,r));
  col*=1.-occ*.75; col+=add*smoothstep(.97,1.02,r);
  // soft glow
  col+=vec3(1.,.45,.15)*exp(-r*.7)*.05*uBH*smoothstep(1.,1.15,r);
  col*=mix(vec3(1.),vec3(.0),0.); col*=uBH*.0+1.;
  float vig=smoothstep(1.35,.35,length((vUv-.5)*vec2(uAsp,1.)));
  col*=mix(.55,1.,vig);
  col=vec3(1.)-exp(-col*1.15);
  gl_FragColor=vec4(col*uBH,1.);
}`;
export function createIntroScene() {
  const scene = new THREE.Scene(); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const U = { uT: { value: 0 }, uAsp: { value: 16 / 9 }, uBH: { value: 0 }, uP: { value: 0 }, uWarp: { value: 0 }, uQ: { value: 5 }, uC: { value: new THREE.Vector2(.66, .5) }, uR: { value: .1 } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}', fragmentShader: FRAG, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
  const stage = new Stage(scene, cam, { bloom: .45, radius: .7, threshold: .78 });
  let clock = 0;
  const api = {
    name: 'intro', stage, visible: true,
    resize(w, h) { stage.resize(w, h); U.uAsp.value = w / h; },
    show() { clock = 0; },
    // driven from the intro timeline (screen-space px)
    set(o) { U.uC.value.set(o.x, 1 - o.y); U.uR.value = o.r; U.uBH.value = o.a; U.uP.value = o.p; U.uWarp.value = o.warp; this.visible = o.a > 0.001; },
    update(dt) { clock += dt; U.uT.value = clock; U.uQ.value = Core.q.scale < 1 ? 3 : 5; },
    render(r) { if (!this.visible) { r.setRenderTarget(null); r.setClearColor(0x000000, 1); r.clear(); return; } stage.render(r); },
  };
  return api;
}
