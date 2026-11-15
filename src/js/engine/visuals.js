// Realistic visuals: shaded 3D-style parts, procedural planets, sky, ground, flames
(function(){
CONSTANTS.STAR_COUNT=900;
const P=new Uint8Array(512);(function(){const p=[];for(let i=0;i<256;i++)p.push(i);let s=7;const r=()=>(s=s*16807%2147483647)/2147483647;for(let i=255;i>0;i--){const j=r()*(i+1)|0;const t=p[i];p[i]=p[j];p[j]=t}for(let i=0;i<512;i++)P[i]=p[i&255]})();
const sm=t=>t*t*(3-2*t),lp=(a,b,t)=>a+(b-a)*t;
function vn(x,y,z){const X=Math.floor(x),Y=Math.floor(y),Z=Math.floor(z),fx=sm(x-X),fy=sm(y-Y),fz=sm(z-Z);const h=(a,b,c)=>P[P[P[(X+a)&255]+((Y+b)&255)]+((Z+c)&255)]/255;
return lp(lp(lp(h(0,0,0),h(1,0,0),fx),lp(h(0,1,0),h(1,1,0),fx),fy),lp(lp(h(0,0,1),h(1,0,1),fx),lp(h(0,1,1),h(1,1,1),fx),fy),fz)}
function fbm(x,y,z,o){let a=.5,f=1,s=0,n=0;for(let i=0;i<o;i++){s+=a*vn(x*f,y*f,z*f);n+=a;a*=.5;f*=2}return s/n}

// ---------- planets ----------
const cache={};
function planetSprite(name){
 if(cache[name])return cache[name];
 const S=name==='Earth'?600:440,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');
 const img=g.createImageData(S,S),d=img.data;
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){
  const u=(x+.5)/S*2-1,v=(y+.5)/S*2-1,r2=u*u+v*v;if(r2>=1)continue;const w=Math.sqrt(1-r2),i=(y*S+x)*4,lat=Math.abs(v);let R,G,B;
  if(name==='Earth'){
   const h=fbm(u*1.8+5,v*1.8+2,w*1.8,5);
   if(h<.5){const t=h/.5;R=8+t*22;G=35+t*70;B=85+t*95}
   else{const t=(h-.5)/.5,dz=fbm(u*3+9,v*3,w*3,3);if(t<.04){R=190;G=180;B=130}else if(t>.55){R=120+t*60;G=105+t*50;B=85+t*40}else if(dz>.55){R=176;G=150;B=100}else{R=50+t*50;G=95+t*40;B=45+t*10}}
   if(lat>.86+fbm(u*5,v*5,w*5,2)*.1){R=235;G=240;B=248}
   const a=Math.max(0,Math.min(.92,(fbm(u*2.6+11,v*3.4+4,w*2.6,5)-.48)*3.4));R+=(250-R)*a;G+=(250-G)*a;B+=(252-B)*a;
  }else if(name==='Mars'){
   const n=fbm(u*2.4,v*2.4,w*2.4,5)-.5;R=185+60*n;G=95+45*n;B=55+25*n;
   if(fbm(u*1.8+3,v*1.8,w*1.8,4)>.56){R*=.62;G*=.6;B*=.6}if(lat>.9){R=240;G=238;B=235}
  }else{
   const n=fbm(u*2.5,v*2.5,w*2.5+3,5)-.5;let k=150+90*n;if(fbm(u*1.4+7,v*1.4,w*1.4,3)>.55)k*=.62;R=G=k;B=k*.97}
  d[i]=R;d[i+1]=G;d[i+2]=B;d[i+3]=Math.min(255,(1-Math.sqrt(r2))*S*.6);
 }
 g.putImageData(img,0,0);
 const nc=name==='Moon'?170:name==='Mars'?40:0;
 if(nc){let s=3;const rn=()=>(s=s*16807%2147483647)/2147483647;g.save();g.beginPath();g.arc(S/2,S/2,S/2,0,7);g.clip();
  for(let i=0;i<nc;i++){const a=rn()*6.283,rr=Math.sqrt(rn())*.92,cs=3+Math.pow(rn(),3)*S*.07;g.save();g.translate(S/2+Math.cos(a)*rr*S/2,S/2+Math.sin(a)*rr*S/2);g.rotate(a);g.scale(Math.sqrt(1-rr*rr)+.05,1);
   const gr=g.createRadialGradient(0,0,cs*.2,0,0,cs);gr.addColorStop(0,'rgba(0,0,0,.35)');gr.addColorStop(.8,'rgba(0,0,0,.18)');gr.addColorStop(.92,'rgba(255,255,255,.22)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.arc(0,0,cs,0,7);g.fill();g.restore()}
  g.restore()}
 const im=g.getImageData(0,0,S,S),q=im.data;
 for(let y=0;y<S;y++)for(let x=0;x<S;x++){const i=(y*S+x)*4;if(!q[i+3])continue;const u=(x+.5)/S*2-1,v=(y+.5)/S*2-1,w=Math.sqrt(Math.max(0,1-u*u-v*v));
  let l=Math.max(0,u*-.5+v*-.42+w*.72);l=.05+.95*Math.pow(l,.75);const rim=name==='Earth'?Math.pow(1-w,2.6)*(l+.1):0;
  q[i]=q[i]*l+rim*70;q[i+1]=q[i+1]*l+rim*120;q[i+2]=q[i+2]*l+rim*230}
 g.putImageData(im,0,0);return cache[name]=c;
}
window.Visuals={planetSprite};

// ---------- body drawing ----------
let gpat={};
function groundPattern(ctx,key,col){if(gpat[key])return gpat[key];const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');for(let i=0;i<900;i++){g.fillStyle=Math.random()<.5?'rgba(0,0,0,.28)':col;g.fillRect(Math.random()*128,Math.random()*128,1+Math.random()*2,1+Math.random()*2)}return gpat[key]=ctx.createPattern(c,'repeat')}
const PAL={Earth:['#5b8c43','#38632d','#223c1d','#7f93a8','#62788e'],Mars:['#b4623f','#8a452c','#53291a','#9a5a42','#7d4632'],Moon:['#9a9a9a','#707070','#434343','#7c7c7c','#5f5f5f']};
function drawGround(ctx,b,cam,sx,sy,R){
 const W=cam.screenW,H=cam.screenH,phi=Math.atan2(H/2-sy,W/2-sx),D=Math.hypot(W,H),span=Math.min(Math.PI,D*.9/R+.02),N=48,pts=[];
 for(let i=0;i<=N;i++){const a=phi-span+2*span*i/N,nx=Math.cos(a),ny=Math.sin(a);pts.push({a,nx,ny,x:sx+nx*R,y:sy+ny*R})}
 const pal=PAL[b.name]||PAL.Moon,sc=window.Simulation&&Simulation.spacecraft,alt=sc&&sc.nearestBody===b?Math.max(0,sc.altitude):1e9,mk=Math.max(0,Math.min(1,1-alt/14000));
 if(mk>.02)[[90,3],[55,4]].forEach(([amp,col],l)=>{ctx.fillStyle=pal[col];ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
  pts.forEach(p=>{const s=p.a*b.radius,h=amp*mk*(.25+.75*(vn(s/6000,l*7,0)*.6+vn(s/1700,l*3,5)*.4));ctx.lineTo(p.x+p.nx*h,p.y+p.ny*h)});ctx.lineTo(pts[N].x,pts[N].y);ctx.closePath();ctx.fill()});
 const path=()=>{ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);pts.forEach(p=>ctx.lineTo(p.x,p.y));const e=pts[N],s=pts[0];ctx.lineTo(e.x-e.nx*D*1.5,e.y-e.ny*D*1.5);ctx.lineTo(s.x-s.nx*D*1.5,s.y-s.ny*D*1.5);ctx.closePath()};
 const dx=Math.cos(phi),dy=Math.sin(phi),p0={x:sx+dx*R,y:sy+dy*R},g=ctx.createLinearGradient(p0.x,p0.y,p0.x-dx*320,p0.y-dy*320);
 g.addColorStop(0,pal[0]);g.addColorStop(.12,pal[1]);g.addColorStop(1,pal[2]);ctx.fillStyle=g;path();ctx.fill();
 const pat=groundPattern(ctx,b.name,'rgba(255,255,255,.12)');if(pat.setTransform)pat.setTransform(new DOMMatrix([1,0,0,1,-(cam.x*cam.zoom)%128,-(cam.y*cam.zoom)%128]));
 ctx.globalAlpha=.6;ctx.fillStyle=pat;path();ctx.fill();ctx.globalAlpha=1;
 ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=2;ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
 if(b.name==='Earth'&&cam.zoom>.015){const px=(0-cam.x)*cam.zoom+W/2,py=(-b.radius-cam.y)*cam.zoom+H/2;ctx.save();ctx.translate(px,py);ctx.scale(cam.zoom,cam.zoom);
  ctx.fillStyle='#8a8f96';ctx.fillRect(-70,-1.2,140,1.2);ctx.fillStyle='#5f656d';ctx.fillRect(-22,-4,44,3);ctx.fillStyle='#2b2f35';ctx.fillRect(-7,-3.2,14,2.2);
  ctx.strokeStyle='#b9bfc7';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(30,-1);ctx.lineTo(30,-98);ctx.moveTo(38,-1);ctx.lineTo(38,-98);ctx.stroke();
  ctx.strokeStyle='#8f969e';ctx.lineWidth=.45;ctx.beginPath();for(let y=-1;y>-98;y-=7){ctx.moveTo(30,y);ctx.lineTo(38,y-7);ctx.moveTo(38,y);ctx.lineTo(30,y-7)}ctx.stroke();
  ctx.strokeStyle='#d0d4d9';ctx.lineWidth=1.3;ctx.beginPath();[-62,-42].forEach(y=>{ctx.moveTo(30,y);ctx.lineTo(7,y)});ctx.stroke();
  ctx.strokeStyle='#fff';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(34,-98);ctx.lineTo(34,-112);ctx.stroke();ctx.fillStyle='#d33';ctx.fillRect(33.3,-113,1.4,1.4);
  ctx.fillStyle='#9aa1a9';ctx.fillRect(-60,-30,8,29);ctx.beginPath();ctx.ellipse(-56,-33,9,5,0,0,7);ctx.fill();ctx.restore()}
}
CelestialBody.prototype.draw=function(ctx,cam){
 const W=cam.screenW,H=cam.screenH,sx=(this.pos.x-cam.x)*cam.zoom+W/2,sy=(this.pos.y-cam.y)*cam.zoom+H/2,R=this.radius*cam.zoom;
 const nx=Math.max(-50,Math.min(W+50,sx)),ny=Math.max(-50,Math.min(H+50,sy));
 if((nx-sx)*(nx-sx)+(ny-sy)*(ny-sy)>R*R){this.drawIndicator(ctx,sx,sy,cam);return}
 if(R>3500){drawGround(ctx,this,cam,sx,sy,R);return}
 if(this.hasAtmosphere&&R>4){const t=Math.max(this.atmosphereHeight/this.radius,.04),gr=ctx.createRadialGradient(sx,sy,R*.985,sx,sy,R*(1+t)),c=this.name==='Mars'?'230,150,100':'110,170,255';
  gr.addColorStop(0,`rgba(${c},.55)`);gr.addColorStop(1,`rgba(${c},0)`);ctx.fillStyle=gr;ctx.beginPath();ctx.arc(sx,sy,R*(1+t),0,7);ctx.fill()}
 if(R>1.5)ctx.drawImage(planetSprite(this.name),sx-R,sy-R,2*R,2*R);else{ctx.fillStyle=this.color;ctx.beginPath();ctx.arc(sx,sy,2,0,7);ctx.fill()}
 ctx.fillStyle='rgba(255,255,255,.75)';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(this.name,sx,sy+Math.max(R,2)+16);
};

// ---------- sky, stars, camera ----------
Renderer.prototype.clear=function(){
 const ctx=this.ctx,W=this.canvas.width,H=this.canvas.height,sc=window.Simulation&&Simulation.spacecraft,b=sc&&sc.nearestBody;
 ctx.fillStyle='#02030a';ctx.fillRect(0,0,W,H);this.spaceFactor=1;
 if(sc&&b&&b.hasAtmosphere){const alt=Math.max(0,Math.hypot(sc.pos.x-b.pos.x,sc.pos.y-b.pos.y)-b.radius),k=Math.pow(Math.max(0,Math.min(1,1-alt/(b.atmosphereHeight*.85))),1.4);this.spaceFactor=1-k;
  if(k>.01){const ux=(sc.pos.x-b.pos.x),uy=(sc.pos.y-b.pos.y),m=Math.hypot(ux,uy)||1,L=Math.hypot(W,H)/2,x=ux/m,y=uy/m,m2=b.name==='Mars',g=ctx.createLinearGradient(W/2-x*L,H/2-y*L,W/2+x*L,H/2+y*L);
   g.addColorStop(0,`rgba(${m2?'225,165,115':'158,205,242'},${k})`);g.addColorStop(.45,`rgba(${m2?'190,120,85':'70,130,215'},${k})`);g.addColorStop(1,`rgba(${m2?'110,70,55':'20,60,150'},${k})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}}
};
const oS=Renderer.prototype.drawStars;
Renderer.prototype.drawStars=function(t){const ctx=this.ctx,W=this.canvas.width,H=this.canvas.height,f=this.spaceFactor==null?1:this.spaceFactor;if(f<.02)return;
 ctx.globalAlpha=f;oS.call(this,t);ctx.globalAlpha=1;const g=ctx.createRadialGradient(W*.1,H*.08,0,W*.1,H*.08,Math.max(W,H)*.35);
 g.addColorStop(0,`rgba(255,244,214,${.75*f})`);g.addColorStop(.06,`rgba(255,230,180,${.3*f})`);g.addColorStop(1,'rgba(255,220,160,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H)};
Renderer.prototype.updateCamera=function(){const c=this.camera,f=c.following;
 if(f){c.x=f.pos.x;c.y=f.pos.y;c.userScale=c.userScale||1;c.targetZoom=3/(1+Math.max(0,f.altitude||0)/150)*c.userScale}
 c.zoom+=(c.targetZoom-c.zoom)*.1};

// ---------- spacecraft parts ----------
const hx=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
const sh=(c,a)=>{const [r,g,b]=hx(c),f=v=>Math.max(0,Math.min(255,v+a))|0;return `rgb(${f(r)},${f(g)},${f(b)})`};
function cyl(ctx,x,y,w,h,c){const g=ctx.createLinearGradient(x,0,x+w,0);g.addColorStop(0,sh(c,-60));g.addColorStop(.22,sh(c,30));g.addColorStop(.42,sh(c,12));g.addColorStop(.75,sh(c,-35));g.addColorStop(1,sh(c,-75));ctx.fillStyle=g;ctx.fillRect(x,y,w,h)}
const ln=(ctx,a,b,c,d,col,lw)=>{ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke()};
function solar(ctx,hw,y,h,lw){cyl(ctx,-hw*.35,y,hw*.7,h,'#8b939d');for(const s of[-1,1]){const x0=s<0?-hw*2.15:hw*.35,ww=hw*1.8;ctx.fillStyle='#17356a';ctx.fillRect(x0,y+h*.1,ww,h*.8);ctx.strokeStyle='rgba(130,180,255,.5)';ctx.lineWidth=lw*.5;for(let i=0;i<=5;i++)ln(ctx,x0+i*ww/5,y+h*.1,x0+i*ww/5,y+h*.9,'rgba(130,180,255,.5)',lw*.5);ln(ctx,x0,y+h*.5,x0+ww,y+h*.5,'rgba(130,180,255,.5)',lw*.5);ctx.strokeStyle='#cfd5db';ctx.lineWidth=lw*.6;ctx.strokeRect(x0,y+h*.1,ww,h*.8)}}
function legs(ctx,hw,y,h,lw,c){ctx.strokeStyle=c;ctx.lineWidth=lw*1.6;ctx.beginPath();ctx.moveTo(-hw*.3,y+h*.1);ctx.lineTo(-hw*1.4,y+h);ctx.moveTo(hw*.3,y+h*.1);ctx.lineTo(hw*1.4,y+h);ctx.stroke();ctx.fillStyle='#5d6670';ctx.fillRect(-hw*1.7,y+h-lw,hw*.6,lw*1.6);ctx.fillRect(hw*1.1,y+h-lw,hw*.6,lw*1.6)}
function part(ctx,p,x,y,w,h){
 const id=p.id||'',cat=p.category,hw=w/2,lw=Math.max(.6,w*.03),ol='rgba(10,14,20,.7)';ctx.lineJoin='round';
 if(cat==='command'){
  if(id==='cmd_probe'){cyl(ctx,-hw,y,w,h,'#c9a24a');ln(ctx,-hw,y+h*.3,hw,y+h*.3,'rgba(0,0,0,.35)',lw);ln(ctx,-hw,y+h*.7,hw,y+h*.7,'rgba(0,0,0,.35)',lw);ctx.fillStyle='#222';ctx.fillRect(-hw*.4,y+h*.4,w*.4,h*.2);return}
  ctx.save();ctx.beginPath();ctx.moveTo(-hw*.22,y);ctx.quadraticCurveTo(-hw*.3,y,-hw*.45,y+h*.35);ctx.lineTo(-hw,y+h*.88);ctx.lineTo(-hw,y+h);ctx.lineTo(hw,y+h);ctx.lineTo(hw,y+h*.88);ctx.lineTo(hw*.45,y+h*.35);ctx.quadraticCurveTo(hw*.3,y,hw*.22,y);ctx.closePath();ctx.clip();
  cyl(ctx,-hw,y,w,h,'#d3d9e0');ctx.fillStyle='#2b2623';ctx.fillRect(-hw,y+h*.88,w,h*.12);ctx.fillStyle='rgba(20,30,50,.88)';for(const s of[-1,1]){ctx.beginPath();ctx.ellipse(s*hw*.18,y+h*.42,w*.07,h*.09,0,0,7);ctx.fill()}
  ln(ctx,-hw,y+h*.7,hw,y+h*.7,'rgba(0,0,0,.3)',lw);ctx.restore();return}
 if(cat==='fuel'){const col=id==='fuel_large'?'#c9692a':id==='fuel_huge'?'#dcdcdf':id==='fuel_rcs'?'#9aa5ae':'#eceae4',r=Math.min(w*.18,h*.2);
  ctx.save();Utils.drawRoundRect(ctx,-hw,y,w,h,r);ctx.clip();cyl(ctx,-hw,y,w,h,col);for(let i=1;i<4;i++)ln(ctx,-hw,y+h*i/4,hw,y+h*i/4,'rgba(0,0,0,.22)',lw*.8);
  if(id==='fuel_huge'){ctx.fillStyle='#c9692a';ctx.fillRect(-hw,y+h*.4,w,h*.12)}if(id==='fuel_medium'){ctx.fillStyle='#202428';ctx.fillRect(-hw,y+h*.12,w,h*.05);ctx.fillRect(-hw,y+h*.83,w,h*.05)}
  ctx.restore();ctx.strokeStyle=ol;ctx.lineWidth=lw;Utils.drawRoundRect(ctx,-hw,y,w,h,r);ctx.stroke();return}
 if(cat==='engine'){
  if(id==='engine_ion'){cyl(ctx,-hw,y,w,h*.4,'#5a6370');ctx.fillStyle='#8fb8e8';ctx.beginPath();ctx.ellipse(0,y+h*.75,hw*.9,h*.25,0,0,7);ctx.fill();ctx.strokeStyle='#e9f3ff';ctx.lineWidth=lw;ctx.stroke();return}
  cyl(ctx,-hw*.45,y,w*.45,h*.3,'#59606b');ctx.save();ctx.beginPath();ctx.moveTo(-hw*.3,y+h*.25);ctx.quadraticCurveTo(-hw*.35,y+h*.6,-hw,y+h);ctx.lineTo(hw,y+h);ctx.quadraticCurveTo(hw*.35,y+h*.6,hw*.3,y+h*.25);ctx.closePath();ctx.clip();
  cyl(ctx,-hw,y+h*.2,w,h*.8,'#8c6b4a');for(let i=1;i<6;i++)ln(ctx,-hw,y+h*(.25+i*.12),hw,y+h*(.25+i*.12),'rgba(0,0,0,.28)',lw*.7);ctx.fillStyle='rgba(15,10,8,.75)';ctx.fillRect(-hw,y+h*.94,w,h*.06);ctx.restore();return}
 if(cat==='booster'){ctx.save();ctx.beginPath();ctx.moveTo(-hw,y+h*.15);ctx.quadraticCurveTo(-hw,y+h*.02,0,y);ctx.quadraticCurveTo(hw,y+h*.02,hw,y+h*.15);ctx.lineTo(hw,y+h*.94);ctx.lineTo(-hw,y+h*.94);ctx.closePath();ctx.clip();cyl(ctx,-hw,y,w,h,'#f1f1f1');
  [.35,.55,.75].forEach(f=>ln(ctx,-hw,y+h*f,hw,y+h*f,'rgba(0,0,0,.3)',lw));ctx.fillStyle='#b3262a';ctx.fillRect(-hw,y+h*.15,w,h*.05);ctx.restore();cyl(ctx,-hw*.5,y+h*.94,w*.5,h*.06,'#2a2a2e');return}
 if(cat==='structural'){
  if(id==='struct_decoupler'){cyl(ctx,-hw,y,w,h,'#3a3f47');ctx.fillStyle='#e6b422';for(let i=0;i<6;i++)ctx.fillRect(-hw+i*w/6,y+h*.3,w/12,h*.4);return}
  if(id==='struct_fairing'){ctx.save();ctx.beginPath();ctx.moveTo(-hw,y+h);ctx.quadraticCurveTo(-hw,y+h*.35,0,y);ctx.quadraticCurveTo(hw,y+h*.35,hw,y+h);ctx.closePath();ctx.clip();cyl(ctx,-hw,y,w,h,'#f4f4f2');ln(ctx,0,y,0,y+h,'rgba(0,0,0,.18)',lw);ln(ctx,-hw,y+h*.55,hw,y+h*.55,'rgba(0,0,0,.2)',lw);ctx.restore();return}
  if(id==='struct_truss'){ctx.strokeStyle='#aab2bd';ctx.lineWidth=lw;ctx.strokeRect(-hw,y,w,h);ln(ctx,-hw,y,hw,y+h,'#aab2bd',lw);ln(ctx,hw,y,-hw,y+h,'#aab2bd',lw);return}
  ctx.save();ctx.beginPath();ctx.moveTo(-hw*.7,y);ctx.lineTo(hw*.7,y);ctx.lineTo(hw,y+h);ctx.lineTo(-hw,y+h);ctx.closePath();ctx.clip();cyl(ctx,-hw,y,w,h,'#aeb5be');ln(ctx,-hw,y+h*.5,hw,y+h*.5,'rgba(0,0,0,.25)',lw);ctx.restore();return}
 if(cat==='utility'){
  if(id==='landing_legs'){legs(ctx,hw,y,h,lw,'#9aa3ad');cyl(ctx,-hw*.45,y,w*.45,h*.35,'#7b848e');return}
  if(p.type==='solar_panel'){solar(ctx,hw,y,h,lw);return}
  cyl(ctx,-hw,y,w,h,id==='battery'?'#3d6b4f':id==='computer'?'#2c3138':'#7b848e');ln(ctx,-hw,y+h*.5,hw,y+h*.5,'rgba(255,255,255,.18)',lw);return}
 if(cat==='science'){cyl(ctx,-hw,y,w,h,'#b9bfc7');ctx.fillStyle='#0f1a2b';ctx.beginPath();ctx.arc(0,y+h/2,Math.min(w,h)*.27,0,7);ctx.fill();ctx.fillStyle='rgba(160,200,255,.6)';ctx.beginPath();ctx.arc(-w*.06,y+h/2-h*.06,Math.min(w,h)*.07,0,7);ctx.fill();return}
 if(cat==='payload'){
  if(id==='antenna'){ln(ctx,0,y+h,0,y,'#cfd5db',lw*1.4);ctx.fillStyle='#e8ecef';ctx.beginPath();ctx.arc(0,y,lw*1.6,0,7);ctx.fill();cyl(ctx,-hw,y+h*.8,w,h*.2,'#6d7680');return}
  if(id==='dish_antenna'){const g=ctx.createRadialGradient(-hw*.3,y+h*.2,0,0,y+h*.35,hw*1.1);g.addColorStop(0,'#fff');g.addColorStop(1,'#8b939d');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,y+h*.35,hw,h*.3,0,0,7);ctx.fill();ln(ctx,-hw*.6,y+h*.4,0,y-h*.05,'#aab2bd',lw*.8);ln(ctx,hw*.6,y+h*.4,0,y-h*.05,'#aab2bd',lw*.8);cyl(ctx,-hw*.25,y+h*.65,hw*.5,h*.35,'#6d7680');return}
  if(id==='satellite_bus'){solar(ctx,hw,y,h,lw);cyl(ctx,-hw*.5,y,hw,h,'#c9a24a');return}
  if(id==='rover'){cyl(ctx,-hw*.8,y+h*.15,w*.8,h*.45,'#c8ccd2');ln(ctx,0,y+h*.15,0,y-h*.1,'#9aa3ad',lw);for(let i=0;i<3;i++)for(const s of[-1,1]){ctx.fillStyle='#1e2227';ctx.beginPath();ctx.arc(s*hw*.85,y+h*.82-i*0,h*.17,0,7);ctx.fill();break}for(const cx of[-hw*.7,0,hw*.7]){ctx.fillStyle='#1e2227';ctx.beginPath();ctx.arc(cx,y+h*.82,h*.17,0,7);ctx.fill()}return}
  if(id==='lander'){legs(ctx,hw,y+h*.2,h*.8,lw,'#9aa3ad');cyl(ctx,-hw*.7,y,w*.7,h*.7,'#c9a24a');ln(ctx,-hw*.7,y+h*.35,hw*.7,y+h*.35,'rgba(0,0,0,.35)',lw);return}
 }
 cyl(ctx,-hw,y,w,h,'#7b848e');
}
Renderer.prototype.drawPart=function(ctx,p,x,y,w,h){part(ctx,p,x,y,w,h)};
Builder.drawBuilderPart=function(ctx,p,x,y,w,h){part(ctx,p,x,y,w,h)};

// ---------- spacecraft + flames ----------
function plume(ctx,x,y,w,len){ctx.globalCompositeOperation='lighter';
 [[1,1,'rgba(255,90,20,.55)'],[.62,.78,'rgba(255,170,60,.7)'],[.3,.5,'rgba(255,250,220,.95)']].forEach(([wf,lf,c])=>{const l=len*lf*(.88+Math.random()*.24),g=ctx.createLinearGradient(0,y,0,y+l);g.addColorStop(0,c);g.addColorStop(1,'rgba(255,60,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-w*wf/2,y);ctx.quadraticCurveTo(x-w*wf*.35,y+l*.6,x,y+l);ctx.quadraticCurveTo(x+w*wf*.35,y+l*.6,x+w*wf/2,y);ctx.fill()});
 ctx.globalCompositeOperation='source-over'}
Renderer.prototype.drawSpacecraft=function(sc,particles){
 if(!sc||sc.destroyed)return;const ctx=this.ctx,cam=this.camera,parts=sc.assembledParts||[];if(!parts.length)return;
 let sx=(sc.pos.x-cam.x)*cam.zoom+cam.screenW/2,sy=(sc.pos.y-cam.y)*cam.zoom+cam.screenH/2;
 const u=Math.max(.11,Math.min(1.5,cam.zoom*.5));let top=1e9,bot=-1e9,ax=0;parts.forEach(p=>{top=Math.min(top,p.y-p.height/2);bot=Math.max(bot,p.y+p.height/2);ax+=p.x||0});ax/=parts.length;const cy=(top+bot)/2;
 const b=sc.nearestBody;if(b){const ux=sc.pos.x-b.pos.x,uy=sc.pos.y-b.pos.y,m=Math.hypot(ux,uy)||1,off=(bot-cy)*u;sx+=ux/m*off;sy+=uy/m*off}
 ctx.save();ctx.translate(sx,sy);ctx.rotate(sc.rotation);
 parts.forEach(p=>{ctx.save();ctx.translate(((p.x||0)-ax)*u,(p.y-cy)*u);if(p.rotation)ctx.rotate(p.rotation);part(ctx,p,0,-p.height*u/2,p.width*u,p.height*u);ctx.restore()});
 if(sc.isThrusting){const eng=sc.engines||[],cur=eng.filter(e=>(e.stageNum||0)===sc.currentStage),act=cur.length?cur:eng,atm=b&&b.hasAtmosphere?Math.max(0,1-sc.altitude/b.atmosphereHeight):0;
  act.forEach(e=>plume(ctx,((e.x||0)-ax)*u,(e.y+e.height/2-cy)*u,e.width*u*(1+(1-atm)*.7),(e.height*3+40)*u*Math.max(.15,sc.throttle)*(e.category==='booster'?1.3:1)))}
 ctx.restore();
 if(sc.isThrusting&&particles&&b&&b.hasAtmosphere&&sc.altitude<b.atmosphereHeight*.6){const dx=Math.sin(sc.rotation),dy=-Math.cos(sc.rotation),ex=sx-dx*(bot-cy)*u,ey=sy-dy*(bot-cy)*u;
  for(let i=0;i<2;i++)particles.emit(ex+(Math.random()-.5)*8,ey+(Math.random()-.5)*8,{vx:-sc.vel.x*cam.zoom+(Math.random()-.5)*40-dx*20,vy:-sc.vel.y*cam.zoom+(Math.random()-.5)*40-dy*20,life:Utils.random(1,2.2),size:Utils.random(5,12)*Math.max(.4,u),color:'rgba(205,205,205,.55)'})}
 if(sc.heating>.1){const r=(bot-top)*u*.8,g=ctx.createRadialGradient(sx,sy,0,sx,sy,r);g.addColorStop(0,`rgba(255,110,20,${sc.heating*.45})`);g.addColorStop(1,'rgba(255,110,20,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,sy,r,0,7);ctx.fill()}
};
})();
