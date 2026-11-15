// Procedural planetary ground (Earth coast / Moon regolith / Mars dust) with curvature, haze and sky colours.
import * as THREE from 'three';

const VS = `
uniform float R; uniform vec2 anchor; varying vec3 vP; varying vec2 vXZ; varying float vD;
void main(){
  vec3 p=position; float d2=p.x*p.x+p.z*p.z; p.y-=d2/(2.*R);
  vXZ=vec2(p.x+anchor.x,p.z+anchor.y);
  vec4 mv=modelViewMatrix*vec4(p,1.); vP=(modelMatrix*vec4(p,1.)).xyz; vD=length(mv.xyz);
  gl_Position=projectionMatrix*mv; }`;
const FS = `
precision highp float;
uniform int biome; uniform vec3 sunDir; uniform vec3 up; uniform float dens; uniform float fade; uniform vec3 hazeCol; uniform float time; uniform float lightsOn;
varying vec3 vP; varying vec2 vXZ; varying float vD;
float h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+17.1; a*=.5; } return s; }
float craters(vec2 p,float sz){ vec2 g=p/sz; vec2 i=floor(g); float h=0.;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 c=i+vec2(x,y); float r1=h21(c), r2=h21(c+7.7); vec2 ctr=c+vec2(r1,r2); float rad=.15+.3*h21(c+3.3); float d=length(g-ctr)/rad;
    if(h21(c+11.1)>.45){ float bowl=-(1.-smoothstep(0.,1.,d))*(1.-d*d*.25); float rim=smoothstep(.75,1.,d)*(1.-smoothstep(1.,1.35,d))*.35; h+=(bowl*.6+rim)*rad; } }
  return h*sz; }
float height(vec2 p){
  if(biome==1){ return craters(p,260.)*.9+craters(p,60.)*.6+craters(p,14.)*.5+craters(p,3.5)*.45+fbm(p*.02)*3.+fbm(p*.3)*.25+fbm(p*2.2)*.05+fbm(p*9.)*.012; }
  if(biome==2){ return fbm(p*.004)*30.+fbm(p*.05)*2.+craters(p,400.)*.5; }
  return fbm(p*.004)*10.+fbm(p*.08)*.8;
}
void main(){
  float e=1.5; vec2 p=vXZ; vec3 n=vec3(0.,1.,0.);
  if(vD<2500.){ float h0=height(p),hx=height(p+vec2(e,0.)),hz=height(p+vec2(0.,e));
    n=normalize(vec3(-(hx-h0)/e,1.,-(hz-h0)/e)); n=normalize(mix(n,vec3(0.,1.,0.),smoothstep(300.,2500.,vD))); }
  vec3 alb;
  if(biome==1){ float t=fbm(p*.02); float mare=smoothstep(.45,.62,fbm(p*.0025+4.)); alb=mix(vec3(.34,.33,.32),vec3(.56,.54,.50),t); alb=mix(alb,alb*vec3(.62,.64,.68),mare*.7);
    alb*=.78+.44*fbm(p*.6); alb*=.9+.2*vn(p*5.); alb*=.94+.12*vn(p*38.); alb=mix(alb,vec3(.66,.64,.60),smoothstep(.0,1.,craters(p,60.)*-.02));
    float rk=smoothstep(.80,.9,vn(p*1.7+3.)); alb=mix(alb,vec3(.16,.155,.15)*(.7+.6*vn(p*11.)),rk*.8*(1.-smoothstep(120.,900.,vD)));              // scattered dark boulders/rocks near the camera
    float ej=smoothstep(.015,.05,craters(p,14.)); alb=mix(alb,alb*1.25,ej*.5); }
  else if(biome==2){ float t=fbm(p*.01); alb=mix(vec3(.50,.24,.12),vec3(.74,.42,.24),t); alb*=.82+.3*fbm(p*.4); alb=mix(alb,vec3(.30,.16,.10),smoothstep(.62,.8,fbm(p*.003+3.))*.7); }
  else {
    float coast=1300.+350.*sin(p.y/900.)+220.*sin(p.y/310.+1.3)+90.*fbm(vec2(p.y*.01,2.));
    float sea=smoothstep(coast-30.,coast+25.,p.x);
    float t=fbm(p*.006), t2=fbm(p*.07);
    vec3 grass=mix(vec3(.10,.22,.07),vec3(.20,.34,.10),t); vec3 dry=mix(vec3(.38,.32,.18),vec3(.28,.26,.14),t);
    vec3 land=mix(grass,dry,smoothstep(.45,.7,fbm(p*.002+9.)))*(.8+.4*t2);
    float beachW=smoothstep(coast-120.,coast-10.,p.x); land=mix(land,vec3(.74,.67,.5),beachW*(1.-sea));
    // concrete roads/pad apron near the launch complex (anchor-local origin)
    float roadX=smoothstep(8.,5.,abs(p.y-420.)); float roadZ=smoothstep(8.,5.,abs(p.x+60.));
    float inRange=smoothstep(2500.,1800.,length(p));
    land=mix(land,vec3(.42,.42,.43),max(roadX*step(p.x,-60.)*step(-1600.,p.x),roadZ*step(p.y,420.)*step(0.,p.y+300.))*inRange*.9);
    float pad=smoothstep(110.,95.,length(p)); land=mix(land,vec3(.55,.55,.56)*(.9+.1*vn(p*.5)),pad);
    vec3 sw=mix(vec3(.02,.17,.30),vec3(.05,.35,.45),smoothstep(coast,coast+160.,p.x)*.0+fbm(p*.01)*.6);
    float depth=smoothstep(coast,coast+900.,p.x); sw=mix(vec3(.07,.40,.50),vec3(.01,.12,.28),depth);
    float foam=smoothstep(coast+40.,coast,p.x)*smoothstep(coast-20.,coast+10.,p.x)*(.6+.4*sin(p.x*.4-time*1.5+vn(p*.1)*6.));
    alb=mix(land,sw,sea); alb=mix(alb,vec3(.95),foam*sea*.65);
    // water normal ripple
    vec2 rp=p*.08+time*vec2(.4,.2); vec3 wn=normalize(vec3((vn(rp)-.5)*.6,1.,(vn(rp+9.)-.5)*.6)); n=mix(n,wn,sea);
    // specular sun glint
    vec3 V=normalize(cameraPosition-vP); vec3 H=normalize(sunDir+V); float sp=pow(max(dot(n,H),0.),90.)*sea*1.4;
    alb=pow(alb,vec3(2.2)); float ndl0=max(dot(n,sunDir),0.); vec3 col0=alb*(ndl0*1.35+.09)+vec3(1.,.95,.85)*sp*ndl0;
    float fogA0=1.-exp(-vD/(60000.*max(dens,.02)+3000.)); col0=mix(col0,pow(hazeCol,vec3(2.2)),clamp(fogA0,0.,1.)*dens);
    gl_FragColor=vec4(col0,fade*smoothstep(0.,1.,1.-smoothstep(.8,1.,vD/130000.))); return;
  }
  alb=pow(alb,vec3(2.2)); float ndl=max(dot(n,sunDir),0.);
  vec3 col=alb*(ndl*1.5+.0);
  if(biome==2){ col+=alb*.06; float fogA=1.-exp(-vD/(60000.)); col=mix(col,vec3(.72,.5,.38)*max(dot(up,sunDir)*.8+.3,.1),clamp(fogA,0.,1.)*.5*dens); }
  if(biome==1){ col*=1.05; }
  gl_FragColor=vec4(col,fade*(1.-smoothstep(.8,1.,vD/130000.)));
}`;

export function makeGround(R, biome, segs = 200) {
  // polar grid with log-distributed rings (fine near, coarse far)
  const rings = segs, sectors = 192, rMin = 4, rMax = 120000;
  const pos = new Float32Array((rings + 1) * (sectors + 1) * 3); let k = 0;
  for (let i = 0; i <= rings; i++) { const t = i / rings; const r = i === 0 ? 0 : rMin * Math.pow(rMax / rMin, t);
    for (let j = 0; j <= sectors; j++) { const a = j / sectors * Math.PI * 2; pos[k++] = Math.cos(a) * r; pos[k++] = 0; pos[k++] = Math.sin(a) * r; } }
  const idx = []; for (let i = 0; i < rings; i++) for (let j = 0; j < sectors; j++) { const a = i * (sectors + 1) + j, b = a + sectors + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
  const u = { R: { value: R }, anchor: { value: new THREE.Vector2() }, biome: { value: biome }, sunDir: { value: new THREE.Vector3(.45, .62, .64).normalize() }, up: { value: new THREE.Vector3(0, 1, 0) },
    dens: { value: 1 }, fade: { value: 1 }, hazeCol: { value: new THREE.Color(.62, .76, .92) }, time: { value: 0 }, lightsOn: { value: 0 } };
  const m = new THREE.ShaderMaterial({ uniforms: u, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.userData.u = u; return mesh;
}

export function makeSky() {
  const m = new THREE.ShaderMaterial({
    uniforms: { up: { value: new THREE.Vector3(0, 1, 0) }, sunDir: { value: new THREE.Vector3(.45, .62, .64).normalize() }, dens: { value: 1 } },
    vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z=gl_Position.w*.9999; }',
    fragmentShader: `uniform vec3 up,sunDir; uniform float dens; varying vec3 vD;
     void main(){ vec3 d=normalize(vD); float mu=dot(d,up); float sd=dot(sunDir,up); float day=smoothstep(-.12,.22,sd);
      vec3 zen=mix(vec3(.01,.02,.07),vec3(.11,.30,.68),day), hor=mix(vec3(.04,.05,.10),vec3(.66,.80,.95),day);
      float sun=max(dot(d,sunDir),0.);
      vec3 sunset=vec3(1.,.45,.15)*pow(sun,6.)*(1.-smoothstep(.0,.4,abs(sd)))*1.3;
      float t=pow(clamp(mu,0.,1.),.42); vec3 c=mix(hor,zen,t);
      if(mu<0.) c=mix(hor,hor*.8,clamp(-mu*4.,0.,1.));
      c+=sunset*smoothstep(-.1,.3,mu+.2)*day*1.0+vec3(1.,.85,.6)*pow(sun,64.)*.6*day+vec3(1.,.97,.9)*pow(sun,1500.)*8.*day;
      float a=clamp(pow(dens,.33)*1.15,0.,1.);
      gl_FragColor=vec4(pow(c,vec3(2.2)),a); }`,
    side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 48, 24), m); mesh.frustumCulled = false; mesh.renderOrder = -5; return mesh;
}
