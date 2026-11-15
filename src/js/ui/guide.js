// First-time instructions, flight coach, and Space-Flight-Simulator style map (press M)
(function(){
const $=id=>document.getElementById(id);
const Guide={
 seen:k=>!!Utils.loadData('seen_'+k),mark:k=>Utils.saveData('seen_'+k,1),
 modal(title,steps,key){if($('guide-overlay'))return;const o=document.createElement('div');o.id='guide-overlay';
  o.innerHTML=`<div class="guide-box"><h2>${title}</h2><ol>${steps.map(s=>`<li>${s}</li>`).join('')}</ol><button class="guide-ok">Got it</button></div>`;document.body.appendChild(o);
  o.querySelector('button').onclick=()=>{o.remove();if(key)Guide.mark(key)}},
 BUILD:['Click a part on the left to add it. Drag parts to move them. Press R to rotate, Delete to remove.','A rocket needs a command module on top, fuel tanks in the middle and an engine at the bottom.','Press the check button to test your design. Thrust must be stronger than the weight (TWR above 1.2).','Press LAUNCH when the checks pass.'],
 FLY:['Press SPACE to start the engines.','W / S change engine power. Z is full power, X cuts the engines.','A / D turn the rocket. Fly straight up first, then slowly tilt right (D) to gain sideways speed.','When a stage runs out of fuel, press SPACE to drop it and use the next one.','Press M to open the map. Use the mouse wheel to zoom the view.','To reach orbit, raise your lowest point (periapsis) above 100 km.'],
 help(){Guide.modal('How to play',['<b>Build:</b> '+Guide.BUILD.join(' ')].concat(Guide.FLY))},
 coach(sc){if(sc.destroyed)return'';const deg=((sc.rotation*57.2958)%360+360)%360,out=sc.stageFuel<=.5&&sc.maxFuel>0;
  if(sc.landed&&!sc.hasLaunched)return'Press SPACE to start the engines.';
  if(sc.inOrbit)return'You are in orbit. Press M for the map. SPACE deploys your payload.';
  if(sc.landed)return'Landed. Press SPACE to deploy the rover, or raise power (W) to take off.';
  if(out&&sc.currentStage<sc.stages.length-1)return'Out of fuel. Press SPACE to drop this stage and use the next one.';
  if(out)return'Out of fuel. Press M to see where you are heading.';
  if(sc.altitude<800)return'Keep going straight up. Hold W for more power.';
  if(sc.altitude<35000&&(deg<20||deg>340))return'Tilt slowly to the right with D. Aim for about 45° by 20 km up.';
  if(sc.throttle>0&&sc.orbitApoapsis>100000&&sc.altitude<80000)return'Highest point is above 100 km. Press X to cut the engines and coast.';
  if(sc.altitude>60000)return'Coast to the top of your arc, point right (90°) and burn until your whole orbit is above 100 km. Press M to check.';
  return'A / D turn   W / S power   Z full   X cut   SPACE stage   M map'}
};
window.Guide=Guide;

// builder hook
const bi=Builder.init.bind(Builder);Builder.init=function(){bi();if(!$('btn-help-b')){const t=document.querySelector('.builder-toolbar'),b=document.createElement('button');b.id='btn-help-b';b.className='tool-btn';b.textContent='Help';b.onclick=Guide.help;t&&t.appendChild(b)}
 if(!Guide.seen('build'))Guide.modal('Build your rocket',Guide.BUILD,'build')};

// simulation hooks
const ss=Simulation.start.bind(Simulation);
Simulation.start=function(sc){ss(sc);sc.throttle=0;this.setThrottle(0);sc.landed=true;sc.hasLaunched=false;
 const c=this.renderer.camera;c.zoom=c.targetZoom=3;c.userScale=1;
 if(!$('coach')){const d=document.createElement('div');d.id='coach';$('simulation-screen').appendChild(d)}
 if(!$('btn-help')){const p=document.querySelector('.controls-panel'),b=document.createElement('button');b.id='btn-help';b.className='hud-btn';b.textContent='HELP';b.onclick=()=>Guide.help();p&&p.appendChild(b)}
 if(!this._wheel){this._wheel=1;$('simulation-screen').addEventListener('wheel',e=>{if(M.open)return;e.stopPropagation();e.preventDefault();const c=this.renderer.camera;c.userScale=Math.max(.02,Math.min(400,(c.userScale||1)*(e.deltaY>0?.8:1.25)))},{capture:true,passive:false})}
 if(!Guide.seen('fly'))Guide.modal('How to fly',Guide.FLY,'fly')};
const st=Simulation.stage.bind(Simulation);
Simulation.stage=function(){const sc=this.spacecraft;if(sc&&sc.landed&&!sc.hasLaunched&&sc.throttle===0){this.setThrottle(1);Toast.show('Ignition. Liftoff.','success',1500);return}st()};
const up=Simulation.update.bind(Simulation);
Simulation.update=function(dt){up(dt);const sc=this.spacecraft;if(!sc)return;if(!sc.landed)sc.hasLaunched=true;
 if(sc.landed&&sc.hasLaunched&&sc.nearestBody){const b=sc.nearestBody,t=Math.atan2(sc.pos.x-b.pos.x,-(sc.pos.y-b.pos.y));let d=t-sc.rotation;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;sc.rotation+=d*Math.min(1,dt*3)}
 const c=$('coach');if(c){const t=M.open?'':Guide.coach(sc);if(c.textContent!==t)c.textContent=t;c.style.display=t?'block':'none'}};

// ---------- map ----------
const M={open:false,zoom:1e-6,focus:'Earth',pan:{x:0,y:0},pred:null,last:0,drag:null,info:''};
const fd=Utils.formatDistance,fv=Utils.formatVelocity,ft=s=>s>86400?(s/86400).toFixed(1)+' d':Utils.formatTime(s);
function predict(sim){
 const sc=sim.spacecraft,earth=sim.earth,moon=sim.moon,B=sim.physics.bodies,a0=Math.atan2(moon.pos.y-earth.pos.y,moon.pos.x-earth.pos.x);
 const posOf=(b,t)=>{if(b!==moon)return b.pos;const a=a0+moon.orbitSpeed*t;return{x:earth.pos.x+Math.cos(a)*moon.orbitRadius,y:earth.pos.y+Math.sin(a)*moon.orbitRadius}};
 const prim=sc.nearestBody||earth;let p={x:sc.pos.x,y:sc.pos.y},v={x:sc.vel.x,y:sc.vel.y},t=0,ax=0,ay=0,hit=null,mm={d:1e30,t:0};
 const acc=()=>{ax=0;ay=0;for(const b of B){const q=posOf(b,t),dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);if(d<b.radius){hit={x:p.x,y:p.y,t};return}const g=b.gm/(d*d*d);ax+=g*dx;ay+=g*dy}};
 acc();const raw=[{x:p.x,y:p.y,t}];let swept=0,pp=posOf(prim,0),la=Math.atan2(p.y-pp.y,p.x-pp.x);
 for(let i=0;i<1600&&!hit;i++){const pq=posOf(prim,t),r=Math.hypot(p.x-pq.x,p.y-pq.y),dt=Math.min(4000,Math.max(2,.025*Math.sqrt(r*r*r/prim.gm)));
  v.x+=ax*dt/2;v.y+=ay*dt/2;p.x+=v.x*dt;p.y+=v.y*dt;t+=dt;acc();v.x+=ax*dt/2;v.y+=ay*dt/2;raw.push({x:p.x,y:p.y,t});
  const q2=posOf(prim,t),an=Math.atan2(p.y-q2.y,p.x-q2.x);let da=an-la;while(da>Math.PI)da-=2*Math.PI;while(da<-Math.PI)da+=2*Math.PI;swept+=Math.abs(da);la=an;
  if(prim!==moon){const m=posOf(moon,t),dm=Math.hypot(p.x-m.x,p.y-m.y);if(dm<mm.d)mm={d:dm,t}}
  if(swept>6.4||t>12*86400)break}
 let ap=-1,pe=-1,ar=-1,pr=1e30;const pts=raw.map((q,i)=>{const c=posOf(prim,q.t),r=Math.hypot(q.x-c.x,q.y-c.y);if(r>ar){ar=r;ap=i}if(r<pr){pr=r;pe=i}return{x:prim.pos.x+q.x-c.x,y:prim.pos.y+q.y-c.y,t:q.t,r}});
 const n=pts.length-1;return{pts,hit,prim,ap:ap>0&&ap<n?pts[ap]:null,pe:pe>0&&pe<n?pts[pe]:null,moonGhost:prim!==moon&&mm.d<1.5e8?{pos:posOf(moon,mm.t),d:mm.d,t:mm.t}:null,hitPt:hit&&pts[n]}}
function fpos(sim){return M.focus==='craft'?sim.spacecraft.pos:M.focus==='Moon'?sim.moon.pos:sim.earth.pos}
function reset(sim){const cv=sim.mapCanvas,sc=sim.spacecraft,R=Math.max(Math.hypot(sc.pos.x-sim.earth.pos.x,sc.pos.y-sim.earth.pos.y)*1.5,sim.earth.radius*2.4);M.zoom=.4*Math.min(cv.width,cv.height)/R;M.focus='Earth';M.pan={x:0,y:0};M.pred=null;M.last=0}
function initMap(sim){
 const ov=$('map-overlay'),cv=sim.mapCanvas;if(ov.dataset.ready)return;ov.dataset.ready=1;
 const tools=document.createElement('div');tools.id='map-tools';tools.innerHTML='<button data-f="craft">Rocket</button><button data-f="Earth">Earth</button><button data-f="Moon">Moon</button><button data-z="1">+</button><button data-z="-1">&minus;</button>';ov.appendChild(tools);
 const info=document.createElement('div');info.id='map-info';ov.appendChild(info);
 tools.onclick=e=>{const f=e.target.dataset.f,z=e.target.dataset.z;if(f){M.focus=f;M.pan={x:0,y:0}}if(z)M.zoom*=z>0?1.5:1/1.5};
 cv.addEventListener('wheel',e=>{e.preventDefault();M.zoom*=e.deltaY>0?1/1.2:1.2},{passive:false});
 cv.addEventListener('mousedown',e=>{M.drag={x:e.clientX,y:e.clientY,px:M.pan.x,py:M.pan.y}});
 window.addEventListener('mousemove',e=>{if(M.drag){M.pan.x=M.drag.px+e.clientX-M.drag.x;M.pan.y=M.drag.py+e.clientY-M.drag.y}});
 window.addEventListener('mouseup',()=>M.drag=null);
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&M.open)sim.toggleMap(false)})}
const tm=Simulation.toggleMap.bind(Simulation);
Simulation.toggleMap=function(f){tm(f);M.open=this.isMapOpen;if(M.open){initMap(this);reset(this)}};
Simulation.renderMap=function(){
 const ctx=this.mapCtx,cv=this.mapCanvas,sc=this.spacecraft;if(!ctx||!sc)return;const w=cv.width,h=cv.height;
 ctx.fillStyle='#04070d';ctx.fillRect(0,0,w,h);this.renderer.stars.forEach(s=>{ctx.fillStyle=`rgba(255,255,255,${s.brightness*.6})`;ctx.fillRect(s.x*w,s.y*h,s.size>1.6?2:1,s.size>1.6?2:1)});
 const f=fpos(this),T=p=>({x:w/2+(p.x-f.x)*M.zoom+M.pan.x,y:h/2+(p.y-f.y)*M.zoom+M.pan.y});
 if(performance.now()-M.last>300){M.pred=sc.landed?null:predict(this);M.last=performance.now()}
 const e=T(this.earth.pos),mr=this.moon.orbitRadius*M.zoom;if(mr<2e6){ctx.strokeStyle='rgba(255,255,255,.18)';ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(e.x,e.y,mr,0,7);ctx.stroke();ctx.setLineDash([])}
 this.physics.bodies.forEach(b=>{const s=T(b.pos),R=b.radius*M.zoom,r=Math.max(R,5);if(b.hasAtmosphere&&R>8){ctx.fillStyle='rgba(110,170,255,.25)';ctx.beginPath();ctx.arc(s.x,s.y,R*(1+b.atmosphereHeight/b.radius*3),0,7);ctx.fill()}
  ctx.drawImage(Visuals.planetSprite(b.name),s.x-r,s.y-r,2*r,2*r);ctx.fillStyle='rgba(255,255,255,.8)';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(b.name,s.x,s.y+r+15)});
 const pr=M.pred,mark=(p,txt,col)=>{const s=T(p);ctx.fillStyle=col;ctx.beginPath();ctx.arc(s.x,s.y,5,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#fff';ctx.font='12px sans-serif';ctx.textAlign='left';ctx.fillText(txt,s.x+10,s.y+4)};
 if(pr){ctx.strokeStyle='#4fb6ff';ctx.lineWidth=2;ctx.beginPath();pr.pts.forEach((p,i)=>{const s=T(p);i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y)});ctx.stroke();
  if(pr.ap)mark(pr.ap,'Ap '+fd(pr.ap.r-pr.prim.radius),'#4fb6ff');if(pr.pe)mark(pr.pe,'Pe '+fd(pr.pe.r-pr.prim.radius),'#f2a33a');
  if(pr.hit)mark(pr.pts[pr.pts.length-1],'Impact in '+ft(pr.hit.t),'#e5483d');
  if(pr.moonGhost){const s=T(pr.moonGhost.pos),r=Math.max(5,this.moon.radius*M.zoom);ctx.strokeStyle='rgba(255,255,255,.6)';ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(s.x,s.y,r,0,7);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#fff';ctx.font='12px sans-serif';ctx.textAlign='left';ctx.fillText('Moon encounter: '+fd(pr.moonGhost.d-this.moon.radius)+' in '+ft(pr.moonGhost.t),s.x+r+6,s.y)}}
 const c=T(sc.pos);ctx.save();ctx.translate(c.x,c.y);ctx.rotate(sc.rotation);ctx.fillStyle='#fff';ctx.strokeStyle='#e8832a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(6,7);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 const b=sc.nearestBody,rows=[['Near',b?b.name:'-'],['Altitude',fd(sc.altitude||0)],['Speed',fv(sc.speed||0)]];
 if(pr){if(pr.ap)rows.push(['Apoapsis',fd(pr.ap.r-pr.prim.radius)+' in '+ft(pr.ap.t)]);if(pr.pe)rows.push(['Periapsis',fd(pr.pe.r-pr.prim.radius)+' in '+ft(pr.pe.t)]);if(pr.hit)rows.push(['Impact','in '+ft(pr.hit.t)]);else if(!pr.ap&&!pr.pe)rows.push(['Path','Escape trajectory'])}
 else rows.push(['Status','On the ground']);
 const html=rows.map(r=>`<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');if(html!==M.info){M.info=html;$('map-info').innerHTML=html}};
})();
