// Glue between the original game and the Three.js "AAA" layer. index.html is untouched;
// game.js injects this file. If WebGL/bundle fails the original 2D game keeps working.
(function () {
  const base = (document.currentScript && document.currentScript.src || '').replace(/glue\.js.*$/, '');
  window.AAAGlue = { on: false };
  // top-level `const X` globals are not window properties; look them up by name
  const G = n => { try { return (0, eval)(n); } catch (e) { return undefined; } };
  function css() {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = base + '../../css/aaa.css'; document.head.appendChild(l);
  }
  function qualityFromSettings() {
    const c = (G('Settings') && G('Settings').config) || {};
    return c.graphics || 'auto';
  }
  function enable() {
    const A = window.AAA; if (!A || !A.ready) return;
    window.AAAGlue.on = true; document.body.classList.add('aaa-on');
    const q = qualityFromSettings();
    A.Core.auto = (q === 'auto');
    A.Core.setQuality(q === 'auto' ? 'medium' : q);
    // route screens -> 3D scenes
    const U = G('Utils'); const orig = U.showScreen.bind(U);
    U.showScreen = function (id) {
      orig(id); route(id);
    };
    installSettings(); applyGraphics(); applyAudio();
    const cur = document.querySelector('.screen.active');
    route(cur ? cur.id : 'menu-screen');
  }
  function route(id) {
    const A = window.AAA; if (!A || !A.ready) return;
    document.body.dataset.screen = id; if (A.audio) A.audio.setMood(id === 'simulation-screen' ? 'flight' : 'menu'); if (id === 'intro-screen' && A.audio) A.audio.setMusic(false, 0); else applyAudio();
    const menuLike = ['menu-screen', 'mission-select-screen', 'team-screen', 'tutorial-screen', 'leaderboard-screen', 'nasa-screen', 'settings-screen', 'report-screen', 'intro-screen'];
    if (id === 'intro-screen') { A.Core.show('intro'); return; }
    if (id === 'builder-screen') { A.Core.show('builder'); installBuilder(); setTimeout(installUI, 0); if (G('Builder')) setTimeout(() => G('Builder').render(), 50); return; }
    if (id === 'simulation-screen') { A.Core.show('flight'); installSim(); ensureHome(); installWarp(); return; }
    if (menuLike.includes(id)) {
      A.Core.show('menu');
      const s = A.Core.scenes.menu; s.setFocus && s.setFocus(id === 'menu-screen' ? 0 : 1);
    }
  }
  let bInstalled = false, lastInput = 0;
  function installBuilder() {
    if (bInstalled || !G('Builder')) return; bInstalled = true;
    const B = G('Builder'), orig = B.render.bind(B);
    B._classicRender = orig;
    const origDetails = B.showPartDetails.bind(B);
    B.showPartDetails = function (part) { origDetails(part); if (!part) return; const box = document.getElementById('part-details'); if (!box) return; const d = document.createElement('div'); d.className = 'aaa-info'; d.innerHTML = partInfo(part); box.appendChild(d); };
    B.render = function () {
      if (!(window.AAAGlue.on && AAA.Core.active === 'builder')) return orig();
      overlay(B);
    };
    const cv = () => B.canvas;
    const attach = () => {
      const c = cv(); if (!c) return setTimeout(attach, 200);
      c.addEventListener('contextmenu', e => e.preventDefault());
      let orbit = false, lx = 0, ly = 0;
      c.addEventListener('mousedown', e => { lastInput = performance.now(); if (e.button === 2) { orbit = true; lx = e.clientX; ly = e.clientY; e.stopImmediatePropagation(); } else { AAA.Core.scenes.builder.lock = true; } }, true);
      window.addEventListener('mousemove', e => { if (!orbit) return; AAA.Core.scenes.builder.rotateView(e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY; lastInput = performance.now(); });
      window.addEventListener('mouseup', () => { orbit = false; });
      c.addEventListener('dblclick', () => AAA.Core.scenes.builder.resetView());
    };
    attach();
    B.resize && B.resize();
    try { const tot = B.assembledParts.reduce((a, p) => a + p.height, 0); if (tot > 0 && B.canvas.height) B.camera.zoom = Math.max(.6, Math.min(2.2, B.canvas.height * .72 / tot)); B.camera.y = 0; } catch (e) {}
  }
  function partInfo(p) {
    const g0 = 9.80665, c = p.category; let w = '', y = '', where = '', miss = '', perf = '';
    if (c === 'engine') { w = 'Rocket engine: burns propellant and throws it out of the nozzle. Newton\'s 3rd law pushes the rocket the other way.'; y = 'Thrust ' + ((p.thrust || 0) / 1000).toFixed(0) + ' kN lifts the stack; Isp ' + (p.isp || 0) + ' s means exhaust speed ~' + Math.round((p.isp || 0) * g0) + ' m/s - higher Isp = more delta-V from the same fuel.'; where = 'Bottom of its stage, directly below the tank that feeds it.'; miss = 'No engine in a stage = that stage cannot push anything; the rocket stays on the pad.'; perf = 'Sea-level engines are good in air; vacuum engines have bigger nozzles with higher Isp but are weak or inefficient at sea level.'; }
    else if (c === 'fuel') { w = 'Propellant tank holding fuel and oxidiser.'; y = 'Holds ' + (p.fuelCapacity || 0) + ' kg of propellant. Delta-V = Isp x g0 x ln(full mass / empty mass) (Tsiolkovsky).'; where = 'Above the engine it feeds, inside the same stage.'; miss = 'Without propellant even a strong engine cannot burn.'; perf = 'More propellant = more delta-V, but also more weight to lift: thrust-to-weight must stay above ~1.2 at liftoff.'; }
    else if (c === 'command') { w = 'Command module / flight computer: the brain (and crew cabin) of the vehicle.'; y = 'Without a controlling unit the vehicle cannot be steered or commanded.'; where = 'At the top of the stack, protected by the fairing, away from engine heat.'; miss = 'Design validation fails: no command module present.'; perf = 'Crewed capsules weigh more and need heat shields for re-entry; probe cores are light and cheap.'; }
    else if (c === 'structural') { w = p.id === 'struct_decoupler' ? 'Decoupler: explosive bolts that separate a used stage.' : p.id === 'struct_fairing' ? 'Payload fairing: aerodynamic shell protecting the payload through the atmosphere.' : 'Structural part that connects sections of different widths.'; y = 'Staging drops dead weight so the remaining stages accelerate faster (rocket equation).'; where = p.id === 'struct_decoupler' ? 'Between two stages.' : p.id === 'struct_fairing' ? 'On top, covering the payload.' : 'Between two parts of different diameter.'; miss = p.id === 'struct_decoupler' ? 'Without it the used stage stays attached and you cannot reach orbit efficiently.' : 'Larger drag or unstable joint.'; perf = 'Light but important; fairing is jettisoned above the air (~100+ km) in the 3D flight view.'; }
    else if (c === 'booster') { w = 'Solid rocket booster: simple, powerful, cannot be throttled or shut down.'; y = 'Adds huge thrust for the first minutes to get off the pad.'; where = 'Attached to the sides of the first stage.'; miss = 'Without enough thrust the TWR stays below 1.2.'; perf = 'Great TWR, lower Isp than liquid engines.'; }
    else if (c === 'utility') { w = 'Support system (power, attitude control, communications or landing).'; y = p.powerGen ? 'Generates ' + p.powerGen + ' W to run your instruments.' : 'Keeps the vehicle controllable and powered.'; where = 'On the stage that needs it; solar panels deploy outside the fairing.'; miss = 'Power budget < 0 = instruments shut down.'; perf = 'Small mass, but a negative power balance can end the mission.'; }
    else if (c === 'science') { w = 'Science instrument that collects data for the mission objectives.'; y = 'Adds +' + (p.scienceValue || 0) + ' science points and mission value.'; where = 'On the payload, with a clear view of its target.'; miss = 'Mission objectives that need data cannot be completed.'; perf = 'Draws ' + (p.powerUse || 0) + ' W - check the power balance.'; }
    else { w = 'Payload: the reason for the mission (satellite, lander or rover).'; y = 'This is what you deliver to orbit or to a surface.'; where = 'At the very top inside the fairing (satellite) or on the descent stage (lander/rover).'; miss = 'No payload = mission cannot be completed.'; perf = 'Heavier payload needs more delta-V and thrust.'; }
    const r = (a, b) => '<div class="aaa-row"><b>' + a + '</b><span>' + b + '</span></div>';
    return '<div class="aaa-info-t">WHAT & WHY</div>' + r('What it is', w) + r('Why it matters', y) + r('Where it goes', where) + r('If missing', miss) + r('Performance', perf);
  }
  function overlay(B) {
    const ctx = B.ctx, w = B.canvas.width, h = B.canvas.height; if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    const z = B.camera.zoom;
    // centerline
    const top = B.worldToScreen(0, -500), bot = B.worldToScreen(0, 500);
    ctx.strokeStyle = 'rgba(6,182,212,.28)'; ctx.setLineDash([5, 6]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(top.x, 0); ctx.lineTo(bot.x, h); ctx.stroke(); ctx.setLineDash([]);
    // attach nodes
    ctx.fillStyle = 'rgba(6,224,255,.75)';
    B.assembledParts.forEach(p => { if (!(p.category === 'booster')) [-1, 1].forEach(s => { const q = B.worldToScreen(p.x, p.y + s * p.height / 2); ctx.beginPath(); ctx.arc(q.x, q.y, 2.2, 0, 7); ctx.fill(); }); });
    // selection
    const sp = B.selectedPart;
    if (sp) {
      const q = B.worldToScreen(sp.x, sp.y), sw = sp.width * z, sh = sp.height * z;
      ctx.strokeStyle = 'rgba(6,224,255,.9)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5; ctx.strokeRect(q.x - sw / 2 - 5, q.y - sh / 2 - 5, sw + 10, sh + 10); ctx.setLineDash([]);
      ctx.fillStyle = '#f97316'; ctx.font = '600 11px Segoe UI, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Stage ' + (sp.stageNum || 0) + ' · ' + sp.name, q.x + sw / 2 + 12, q.y - sh / 2 + 2);
    }
    // drag guidance: ghost slot + spline to nearest node + rule explanation
    const d = B.draggingPart;
    if (d) {
      let best = null, bd = 1e9;
      B.assembledParts.forEach(o => { if (o.instanceId === d.instanceId) return;
        [[-1, 1], [1, -1]].forEach(([so, sd]) => { const ty = o.y + so * (o.height / 2 + d.height / 2); const dist = Math.hypot(o.x - d.x, ty - d.y); if (dist < bd) { bd = dist; best = { o, ty, side: so }; } }); });
      const msgs = rules(B, d, best, bd);
      if (best && bd < 70) {
        const a = B.worldToScreen(d.x, d.y + (best.side === -1 ? d.height / 2 : -d.height / 2) * 1);
        const gx = best.o.x, gy = best.ty;
        const slot = B.worldToScreen(gx, gy), sw = d.width * z, sh = d.height * z;
        ctx.strokeStyle = bd < 15 ? 'rgba(80,255,140,.9)' : 'rgba(255,255,255,.35)'; ctx.setLineDash([3, 3]); ctx.strokeRect(slot.x - sw / 2, slot.y - sh / 2, sw, sh); ctx.setLineDash([]);
        const cur = B.worldToScreen(d.x, d.y);
        ctx.strokeStyle = bd < 15 ? '#52ff8c' : '#06e0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cur.x, cur.y); ctx.bezierCurveTo(cur.x, (cur.y + slot.y) / 2, slot.x, (cur.y + slot.y) / 2, slot.x, slot.y); ctx.stroke();
      }
      if (msgs.length) { ctx.font = '600 12px Segoe UI, sans-serif'; ctx.textAlign = 'left'; msgs.forEach((m, i) => { const q = B.worldToScreen(d.x, d.y); const tw = ctx.measureText(m.t).width + 16; const x = Math.min(w - tw - 8, q.x + d.width * z / 2 + 14), y = q.y - 20 + i * 24;
        ctx.fillStyle = 'rgba(14,20,28,.92)'; ctx.fillRect(x, y - 14, tw, 22); ctx.fillStyle = m.ok ? '#6dff9e' : '#ffb347'; ctx.fillText(m.t, x + 8, y + 2); }); }
    }
    ctx.fillStyle = 'rgba(190,205,225,.75)'; ctx.font = '12px Segoe UI, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Left-drag: assemble · Right-drag: orbit view · Double-click: reset view · Scroll: zoom · Shift-drag: pan · R rotate · Del remove', 16, h - 14);
  }
  function rules(B, d, best, bd) {
    const out = []; const cat = d.category; const ps = B.assembledParts.filter(p => p.instanceId !== d.instanceId);
    if (!ps.length) return out;
    const minY = Math.min(...ps.map(p => p.y)), maxY = Math.max(...ps.map(p => p.y));
    if (cat === 'engine' && ps.some(p => p.category !== 'engine' && p.y > d.y + 4)) out.push({ t: 'Engines belong at the bottom: thrust pushes the stack from below.' });
    if (cat === 'command' && d.y > minY + d.height) out.push({ t: 'Crew/command modules go at the top, away from engine heat and with a clear escape path.' });
    if (cat === 'fuel' && ps.some(p => p.category === 'engine' && p.y < d.y - 2)) out.push({ t: 'Fuel must feed the engine below it - place tanks above the engine.' });
    if (best && bd < 15) out.push({ t: 'Snapped: structural node connected.', ok: true });
    else if (best && bd < 70) out.push({ t: 'Move closer to the glowing node to snap and attach.' });
    return out;
  }
  // ---------- flight ----------
  const cd = { active: false, t: 0, done: null, lastSec: 99 };
  let sInstalled = false, mcLast = 0, mcSeen = {};
  function el(id, cls) { let e = document.getElementById(id); if (!e) { e = document.createElement('div'); e.id = id; if (cls) e.className = cls; document.body.appendChild(e); } return e; }
  function mc(msg, kind) { // mission-control style message ticker
    const box = el('aaa-mc'); const row = document.createElement('div'); row.className = 'aaa-mc-row ' + (kind || ''); row.innerHTML = '<b>MISSION CONTROL</b> ' + msg;
    box.appendChild(row); while (box.children.length > 3) box.removeChild(box.firstChild); setTimeout(() => row.classList.add('out'), 5200); setTimeout(() => row.remove(), 6000);
    if (G('Audio') && Audio.play) try { Audio.play('click'); } catch (e) {}
  }
  function checklist(sc) {
    const twr = sc.getTWR ? sc.getTWR(9.807) : 0, rep = sc.getDeltaV ? sc.getDeltaV() : 0;
    return [['Command & guidance', sc.assembledParts.some(p => p.category === 'command')], ['Propulsion online', sc.engines && sc.engines.length > 0],
      ['Propellant loaded ' + Math.round(sc.maxFuel / 1000) + ' t', sc.maxFuel > 0], ['Thrust-to-weight ' + twr.toFixed(2), twr > 1.15], ['Delta-V budget ' + Math.round(rep) + ' m/s', rep > 3000],
      ['Range safety & weather', true]];
  }
  function pollBtn() { let b = document.getElementById('aaa-pollbtn'); if (!b) { b = document.createElement('button'); b.id = 'aaa-pollbtn'; b.type = 'button'; b.textContent = '☰ GO / NO-GO POLL'; b.onclick = () => { const S = G('Simulation'); if (S && S.spacecraft) showPreLaunch(S.spacecraft); }; document.body.appendChild(b); } return b; }
  const WARPS = [1, 2, 5, 10, 50, 100];
  function installWarp() {
    const host = document.querySelector('.time-controls'); if (!host || host.querySelector('.aaa-warp')) return;
    const w = document.createElement('div'); w.className = 'aaa-warp'; w.innerHTML = '<span class="lab">WARP</span>' + WARPS.map(v => '<button data-w="' + v + '"' + (v === 1 ? ' class="on"' : '') + '>' + v + '×</button>').join('') + '<select id="aaa-cam" title="Camera (C)"></select>';
    host.appendChild(w);
    w.addEventListener('click', e => { const b = e.target.closest('button[data-w]'); if (b) setWarp(+b.dataset.w); });
    const sel = w.querySelector('select'); const names = { chase: 'Rocket follow', front: 'Front', rear: 'Rear (engines)', side: 'Side', close: 'Close-up', wide: 'Wide cinematic', pad: 'Ground tracking', orbit: 'Orbital', free: 'Free-look', nose: 'Nose view' };
    sel.innerHTML = Object.keys(names).map(k => '<option value="' + k + '">' + names[k] + '</option>').join(''); sel.onchange = () => { AAA.Core.scenes.flight.setMode(sel.value); sel.blur(); };
    window.__aaaCamNames = names;
  }
  function setWarp(v) {
    const S = G('Simulation'); if (!S || !S.physics) return; const H = G('HUD');
    const sc = S.spacecraft; const inAir = sc && sc.nearestBody && sc.altitude < 25000 && sc.nearestBody.densityAt && sc.nearestBody.densityAt(sc.altitude) > 0.01 && !sc.landed;
    if (v > 10 && inAir) { v = 10; G('Toast').show('Warp limited to 10× inside the dense atmosphere', 'warning', 1800); }
    S.physics.timeScale = v; document.querySelectorAll('.aaa-warp button[data-w]').forEach(b => b.classList.toggle('on', +b.dataset.w === v));
    G('Toast').show('Time warp: ' + v + '×', 'info', 900);
  }
  function showPreLaunch(sc) {
    const p = el('aaa-pre'); const rows = checklist(sc).map(([t, ok]) => '<div class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'GO' : 'NO-GO') + ' &nbsp; ' + t + '</div>').join('');
    p.innerHTML = '<h3>PRE-LAUNCH POLL</h3>' + rows + '<div class="hint">Press <b>SPACE</b> to start the countdown · <b>C</b> camera · drag to look · scroll to zoom</div><button class="aaa-x" type="button" title="Close (poll can be reopened)">✕</button>'; p.style.display = 'block';
    p.querySelector('.aaa-x').onclick = e => { e.stopPropagation(); p.style.display = 'none'; pollBtn().classList.add('show'); };
    pollBtn().classList.remove('show');
  }

  // ---------- v1.1: launch UI, home button, keys, sandbox free-mode ----------
  const isSandbox = () => { const m = G('MissionMgr'); return !!(m && m.currentMission && m.currentMission.isSandbox); };
  function ensureHome() {
    if (document.getElementById('aaa-home')) return;
    const b = document.createElement('button'); b.id = 'aaa-home'; b.type = 'button'; b.textContent = '⌂ MAIN MENU';
    b.addEventListener('click', () => {
      const scr = (document.querySelector('.screen.active') || {}).id; const S = G('Simulation');
      const go = () => { if (S && S.animFrame) { cancelAnimationFrame(S.animFrame); S.animFrame = 0; } if (window.AAA && AAA.audio) AAA.audio.engine(0, 0, 0); G('Utils').showScreen('menu-screen'); const M = G('Menu'); if (M && M.init) M.init(); };
      if (scr === 'simulation-screen' && G('Modal')) G('Modal').show({ title: 'Return to Main Menu', content: 'Leave this flight and go back to the main menu?', buttons: [{ text: 'Keep flying' }, { text: 'Main Menu', primary: true, onClick: go }] });
      else go();
    });
    document.body.appendChild(b);
  }
  function wrapPanel() {
    const p = document.querySelector('#builder-screen .info-panel'); if (!p || p.querySelector('.aaa-scroll')) return;
    const act = p.querySelector('.builder-actions'); const sc = document.createElement('div'); sc.className = 'aaa-scroll';
    [...p.children].forEach(c => { if (c !== act) sc.appendChild(c); }); p.insertBefore(sc, act);
    const L = document.getElementById('btn-launch'); if (L) { L.title = 'Launch (Enter)'; L.textContent = '🚀 LAUNCH'; }
  }
  function installUI() {
    ensureHome(); wrapPanel();
    const B = G('Builder'); if (B && !B._aaaL) {
      B._aaaL = 1; const ol = B.launch.bind(B);
      B.launch = function () {
        const sb = isSandbox();
        if (!sb) { let ok = true; try { ok = this.validateDesign(false); } catch (e) { } if (!ok) { this.validateDesign(true); const v = document.getElementById('validation-results'); if (v) v.scrollIntoView({ block: 'center', behavior: 'smooth' }); G('Toast').show('Launch blocked: fix the red items in VALIDATION (right panel).', 'warning', 3500); return; } }
        ol();
      };
    }
    const L = document.getElementById('btn-launch');
    if (L && !L._aaa) { L._aaa = 1; L.addEventListener('click', e => { e.stopImmediatePropagation(); G('Builder').launch(); }, true); }
  }
  document.addEventListener('keydown', e => {
    const scr = (document.querySelector('.screen.active') || {}).id; const t = e.target && e.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    const go = document.getElementById('guide-overlay'); if (go && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const b = go.querySelector('button'); b && b.click(); return; }
    if (e.key === 'Enter' && !e.repeat) {
      if (document.querySelector('#modal-overlay:not(.hidden)')) return;
      if (scr === 'builder-screen') { e.preventDefault(); G('Builder').launch(); }
      else if (scr === 'simulation-screen') { e.preventDefault(); const S = G('Simulation'); if (S && S.spacecraft && !(document.getElementById('guide-overlay'))) S.stage(); }
    }
  }, true);
  function sandboxCraft(sc) {
    if (!sc || sc._sbx) return; sc._sbx = 1;
    Object.defineProperty(sc, 'stageFuel', { get: () => 1e9, configurable: true });
    sc.burn = () => 0;
    const real = sc.getCurrentThrust.bind(sc);
    sc.getCurrentThrust = function () { return Math.max(real(), this.totalMass * 18); }; // always > 1.8 g of thrust
    if (!sc.engines.length) sc.engines = [{ category: 'engine', id: 'sandbox_drive', thrust: 1, fuelRate: 0, isp: 450, stageNum: 0 }];
    sc.getFuelConsumptionRate = () => 0;
  }
  function sandboxPhysics(S, on) {
    (S.physics.bodies || []).forEach(b => { if (b.densityAt && !b._d0) b._d0 = b.densityAt.bind(b); if (b._d0) b.densityAt = on ? () => 0 : b._d0; });
    const P = S.physics; if (!P._hc) { P._hc = P.handleCollision.bind(P); }
    P.handleCollision = on ? function (sc, body) { sc.vel = { x: 0, y: 0 }; sc.angularVel = 0; sc.landed = true; sc.landedOn = body; const d = G('Utils').vecNorm(G('Utils').vecSub(sc.pos, body.pos)); sc.pos = G('Utils').vecAdd(body.pos, G('Utils').vecScale(d, body.radius + 2.5)); } : P._hc;
  }
  function installSim() {
    const S = G('Simulation'); if (!S || sInstalled) { if (S && S.spacecraft) { showPreLaunch(S.spacecraft); } return; } sInstalled = true;
    const origRender = S.render.bind(S);
    S.render = function () {
      if (!(window.AAAGlue.on && AAA.Core.active === 'flight')) return origRender();
      const ctx = this.ctx; if (ctx) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.isMapOpen) this.renderMap();
    };
    const origStage = S.stage.bind(S);
    S.stage = function () {
      const sc = this.spacecraft; if (!sc) return origStage();
      if (window.AAAGlue.on && AAA.Core.active === 'flight' && sc.landed && !sc.hasLaunched && sc.throttle === 0) {
        if (cd.active) return; const chk = checklist(sc); if (!isSandbox() && (!chk[0][1] || !chk[1][1] || !chk[2][1])) { Toast.show('Hold! Pre-launch poll: NO-GO (needs command module, engine, propellant).', 'warning', 3500); return; }
        cd.active = true; cd.t = 5.2; cd.rt = 0; AAA.Core.scenes.flight.ign = 0; cd.lastSec = 99; cd.done = () => { cd.active = false; origStage(); }; el('aaa-pre').style.display = 'none'; pollBtn().classList.remove('show'); mc('Countdown initiated. All stations GO.'); return;
      }
      if (cd.active) return;
      origStage();
    };
    const origStart = S.start.bind(S);
    S.start = function (sc) {
      if (this.animFrame) { cancelAnimationFrame(this.animFrame); this.animFrame = 0; } const sbx = isSandbox(); if (sbx) sandboxCraft(sc); origStart(sc); sandboxPhysics(this, sbx); document.querySelectorAll('.aaa-warp button[data-w]').forEach(b => b.classList.toggle('on', b.dataset.w === '1')); pollBtn().classList.remove('show'); cd.active = false; mcSeen = {}; el('aaa-cd').style.display = 'none';
      if (window.AAAGlue.on) { AAA.Core.scenes.flight.show(); setTimeout(() => showPreLaunch(sc), 100); mc('Vehicle on the pad. Poll all stations for launch.'); }
    };
    const origUpdate = S.update.bind(S);
    S.update = function (dt) {
      origUpdate(dt); const sc = this.spacecraft; if (!sc || !(window.AAAGlue.on && AAA.Core.active === 'flight')) { if (window.AAA && AAA.audio) AAA.audio.engine(0, 0, 0); return; }
      { const b = sc.nearestBody; const dens = b && b.densityAt ? b.densityAt(Math.max(0, sc.altitude)) / (b.surfaceDensity || b.densityAt(0) || 1) : 0; const thr = Math.max((sc.throttle || 0) * ((sc.stageFuel > 0) ? 1 : 0), sc.landed && !sc.hasLaunched ? (AAA.Core.scenes.flight.ign || 0) : 0);
        AAA.audio.engine(this.physics.paused ? 0 : thr, dens || 0, sc.dynamicPressure || 0); AAA.audio.setMood(sc.inOrbit ? 'orbit' : 'flight'); }
      if (cd.active) {
        const nowT = performance.now(); const rdt = Math.min(0.5, (nowT - (cd.rt || nowT)) / 1000); cd.rt = nowT; cd.t -= Math.max(dt, rdt); const n = Math.max(0, Math.ceil(cd.t - 0.2)); const c = el('aaa-cd'); c.style.display = 'block';
        if (n !== cd.lastSec) { cd.lastSec = n; c.textContent = n > 0 ? 'T-' + n : 'LIFTOFF'; c.classList.remove('pulse'); void c.offsetWidth; c.classList.add('pulse');
          const F = AAA.Core.scenes.flight; F.ign = n >= 4 ? 0 : n === 3 ? .3 : n === 2 ? .55 : n === 1 ? .85 : 1; if (n === 3) { mc('Main engine start.'); AAA.audio.hit('ignite'); } if (n === 0) mc('Hold-down release. Liftoff!'); }
        if (cd.t <= 0.2 && cd.done) { cd.done = null; this.setThrottle(1); AAA.Core.scenes.flight.ign = 0; Toast.show('Ignition. Liftoff.', 'success', 1500); setTimeout(() => { el('aaa-cd').style.display = 'none'; cd.active = false; }, 900); }
        return;
      }
      // mission-control callouts derived from real sim state
      const once = (k, cond, msg, kind) => { if (cond && !mcSeen[k]) { mcSeen[k] = 1; mc(msg, kind); } };
      once('tower', sc.hasLaunched && sc.altitude > 150, 'Tower clear.');
      once('roll', sc.hasLaunched && sc.altitude > 1000, 'Vehicle is supersonic soon. Throttle nominal.');
      const q = sc.dynamicPressure || 0; mcSeen.maxq = Math.max(mcSeen.maxq || 0, q);
      if (sc.hasLaunched && !mcSeen.maxqCalled && mcSeen.maxq > 8000 && q < mcSeen.maxq * .9) { mcSeen.maxqCalled = 1; mc('Max-Q: peak dynamic pressure ' + (mcSeen.maxq / 1000).toFixed(1) + ' kPa. Structural loads nominal.'); }
      if (mcSeen.stg !== undefined && sc.currentStage > mcSeen.stg) AAA.audio.hit('stage'); once('stage', mcSeen.stg !== undefined && sc.currentStage > mcSeen.stg, 'Stage separation confirmed. Next stage ignition.'); mcSeen.stg = sc.currentStage;
      once('space', sc.altitude > 100000, 'Crossed the Karman line, 100 km. Vehicle is in space.');
      if (sc.inOrbit && !mcSeen.orbit) AAA.audio.hit('ok'); once('orbit', sc.inOrbit, 'Stable orbit achieved. Apoapsis ' + ((sc.orbitApoapsis || 0) / 1000).toFixed(0) + ' km. Payload deployment is a GO.');
      once('heat', (sc.heating || 0) > .5, 'High aerodynamic heating. Watch the heat shield.', 'warn');
      once('lowfuel', sc.maxFuel > 0 && sc.stageFuel < 1 && sc.currentStage >= sc.stages.length - 1 && sc.hasLaunched, 'Final stage propellant depleted.', 'warn');
    };
    const cv = S.canvas || document.getElementById('sim-canvas'); let drag = false, lx = 0, ly = 0;
    cv.addEventListener('mousedown', e => { drag = true; lx = e.clientX; ly = e.clientY; });
    window.addEventListener('mouseup', () => drag = false);
    window.addEventListener('mousemove', e => { if (drag && AAA.Core.active === 'flight') { AAA.Core.scenes.flight.dragCam(e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY; AAA.Core.scenes.flight.userMoved = true; } });
    cv.addEventListener('wheel', e => { if (!(window.AAAGlue.on && AAA.Core.active === 'flight')) return; e.preventDefault(); e.stopImmediatePropagation(); AAA.Core.scenes.flight.zoomCam(e.deltaY > 0 ? 1.12 : .89); }, { capture: true, passive: false });
    window.addEventListener('keydown', e => { if (AAA.Core.active !== 'flight') return; if (e.key.toLowerCase() === 'c') { const m = AAA.Core.scenes.flight.cycle(); Toast.show('Camera: ' + window.__aaaCamNames[m], 'info', 1200); const cs = document.getElementById('aaa-cam'); if (cs) cs.value = m; } });
    if (S.spacecraft) showPreLaunch(S.spacecraft);
  }
  // ---------- audio & settings ----------
  function cfg() { const S = G('Settings'); return (S && S.config) || {}; }
  function applyAudio() {
    const A = window.AAA; if (!A || !A.audio) return; const c = cfg();
    A.audio.setMusic(c.music !== false && c.sound !== false, c.musicVol !== undefined ? c.musicVol : .5); A.audio.setSfx((c.sfxVol !== undefined ? c.sfxVol : .8) * (c.sound === false ? 0 : 1));
  }
  function applyGraphics() {
    const A = window.AAA; if (!A || !A.ready) return; const c = cfg(); const q = c.graphics || 'auto';
    A.Core.auto = q === 'auto'; A.Core.setQuality(q === 'auto' ? (A.Core.qName === 'low' && A.Core.fps < 28 ? 'low' : 'medium') : q);
    A.Core.bloomOverride = c.bloom === false; if (c.bloom === false) { A.Core.q = Object.assign({}, A.Core.q, { bloom: false }); }
  }
  function installSettings() {
    const S = G('Settings'); if (!S || S._aaa) return; S._aaa = true; const origRender = S.render.bind(S);
    S.render = function () {
      origRender(); const box = document.getElementById('settings-content'); if (!box || !window.AAAGlue.on) return;
      const c = this.config; const sel = (v, a) => (v === a ? 'selected' : '');
      const g = document.createElement('div'); g.className = 'settings-group';
      g.innerHTML = '<h3>MUSIC & 3D GRAPHICS</h3>' +
        '<div class="setting-item"><div><div class="setting-label">Background Music</div><div class="setting-desc">Original calm space score (generated live, no files)</div></div><label class="toggle-switch"><input type="checkbox" id="aaa-music" ' + (c.music !== false ? 'checked' : '') + '><span class="toggle-slider"></span></label></div>' +
        '<div class="setting-item"><div><div class="setting-label">Music Volume</div><div class="setting-desc">Kept low so it never covers the engines</div></div><input type="range" id="aaa-musicvol" min="0" max="100" value="' + Math.round((c.musicVol !== undefined ? c.musicVol : .5) * 100) + '" style="width:140px"></div>' +
        '<div class="setting-item"><div><div class="setting-label">Engine & Effects Volume</div><div class="setting-desc">Engine rumble, wind and staging sounds</div></div><input type="range" id="aaa-sfxvol" min="0" max="100" value="' + Math.round((c.sfxVol !== undefined ? c.sfxVol : .8) * 100) + '" style="width:140px"></div>' +
        '<div class="setting-item"><div><div class="setting-label">Graphics Quality</div><div class="setting-desc">Auto lowers the 3D resolution on slow computers</div></div><select id="aaa-gfx" class="btn-sm"><option value="auto" ' + sel(c.graphics || 'auto', 'auto') + '>Auto</option><option value="low" ' + sel(c.graphics, 'low') + '>Low (weak hardware)</option><option value="medium" ' + sel(c.graphics, 'medium') + '>Medium</option><option value="high" ' + sel(c.graphics, 'high') + '>High (shadows, MSAA)</option></select></div>' +
        '<div class="setting-item"><div><div class="setting-label">Bloom / Glow</div><div class="setting-desc">Engine flame and sun glow</div></div><label class="toggle-switch"><input type="checkbox" id="aaa-bloom" ' + (c.bloom !== false ? 'checked' : '') + '><span class="toggle-slider"></span></label></div>';
      box.insertBefore(g, box.firstChild);
      const set = (k, v) => { S.config[k] = v; S.save(); applyAudio(); }; 
      g.querySelector('#aaa-music').onchange = e => set('music', e.target.checked);
      g.querySelector('#aaa-musicvol').oninput = e => set('musicVol', e.target.value / 100);
      g.querySelector('#aaa-sfxvol').oninput = e => set('sfxVol', e.target.value / 100);
      g.querySelector('#aaa-gfx').onchange = e => { set('graphics', e.target.value); applyGraphics(); };
      g.querySelector('#aaa-bloom').onchange = e => { set('bloom', e.target.checked); applyGraphics(); };
    };
    S.render();
  }
  const unlock = () => { const A = window.AAA; if (A && A.audio) { A.audio.start(); applyAudio(); } };
  window.addEventListener('click', unlock); window.addEventListener('keydown', unlock);
  window.addEventListener('aaa-ready', enable);
  window.addEventListener('aaa-fail', () => { document.body.classList.remove('aaa-on'); window.AAAGlue.on = false; const c = document.getElementById('aaa-canvas'); if (c) c.remove(); });
  css();
  const s = document.createElement('script'); s.src = base + 'aaa.bundle.js'; s.async = true;
  s.onerror = () => console.warn('[AAA] bundle missing - running classic 2D mode');
  document.head.appendChild(s);
})();

;setInterval(function () { try { const S = window.Simulation; const p = document.getElementById('aaa-pre'); if (p && p.style.display === 'block' && S && S.spacecraft && (S.spacecraft.hasLaunched || S.spacecraft.throttle > 0)) { p.style.display = 'none'; const b = document.getElementById('aaa-pollbtn'); if (b) b.classList.remove('show'); } } catch (e) { } }, 400);

// ===== v1.3 TEMPLATES (rocket / lander / mission) — built only from catalogue parts =====
;(function () {
  const G = n => { try { return (0, eval)(n); } catch (e) { return undefined; } };
  const TPL = [
    { id: 'beginner', name: 'A · Beginner Launch Rocket', tag: 'BEGINNER', col: '#4ade80',
      mission: 'Reach a stable low Earth orbit with a small satellite.',
      info: '3 stages · liquid engines · satellite under a protective fairing (opens above the atmosphere).',
      simple: 'Stage 0 lifts everything off. When its fuel is gone, press SPACE to drop it and light stage 1. Stage 2 finishes the orbit; the fairing halves fall away in space.',
      steps: ['Press LOAD below, check the green readiness light.', 'Launch (Enter). Hold at full throttle, tilt east slowly after ~10 km.', 'Stage when a stage runs dry (SPACE). Cut engines once periapsis > 150 km.'],
      spec: [['struct_fairing', 2], ['satellite_bus', 2], ['sci_camera', 2], ['solar_panel', 2], ['antenna', 2], ['cmd_probe', 2], ['fuel_small', 2], ['engine_vacuum', 2], ['struct_decoupler', 1], ['fuel_medium', 1], ['engine_medium', 1], ['struct_decoupler', 0], ['fuel_huge', 0], ['fuel_large', 0], ['engine_medium', 0]] },
    { id: 'sls', name: 'B · NASA SLS-inspired Lunar Launch Vehicle', tag: 'ADVANCED', col: '#fb923c',
      mission: 'Send the Orion crew vehicle toward the Moon (translunar injection stage).',
      info: '2 solid boosters + core stage (4 RS-25) + ICPS upper stage (RL10) + Orion + abort tower. Dimensions/masses from NASA SLS Block 1 fact sheets; some masses are approximations (see part descriptions). Orion is a crew capsule, NOT a lander.',
      simple: 'The two white boosters burn out first and drop off by themselves (~126 s). The orange core keeps going to ~8 min. The small ICPS stage then does the push toward the Moon.',
      steps: ['Load, then read the stage panel: S0 = boosters + core, S1 = ICPS + Orion.', 'Launch; boosters separate automatically, core burn ends, press SPACE to drop the core.', 'Use S1 (RL10) for orbit raising / lunar transfer.'],
      spec: [['sls_las', 0], ['sls_orion', 1], ['sls_icps', 1], ['engine_vacuum', 1], ['struct_decoupler', 1], ['sls_lvsa', 0], ['sls_core', 0], ['sls_rs25', 0]], boosters: 2 },
    { id: 'lander', name: 'C · Moon Lander (separate vehicle)', tag: 'LANDER', col: '#38bdf8',
      mission: 'Descend and land softly on the Moon, then run science.',
      info: 'Simplified Artemis-style lander: descent engine, 4 legs, tanks, solar panels, antenna, science mast. Not an exact NASA design. Needs a launcher to reach the Moon (use D, or build your own).',
      simple: 'Burn against your velocity to slow down. Keep vertical speed under ~3 m/s at touchdown; the legs absorb the rest.',
      steps: ['Load and inspect stats; this vehicle is for the final descent.', 'Start from low lunar orbit (Moon missions) or sandbox.', 'Retro-burn, hover, touch down gently.'],
      spec: [['antenna', 0], ['sci_camera', 0], ['hls_lander', 0], ['hls_descent', 0]] },
    { id: 'lunar', name: 'D · Complete Lunar Mission Stack', tag: 'ADVANCED', col: '#c084fc',
      mission: 'Launch to the Moon and land the lander with one rocket.',
      info: 'SIMPLIFIED single launch: lander sits between Orion and the ICPS (Apollo-style). NASA\'s real Artemis architecture launches Orion on SLS and meets a separate lander in lunar orbit — this layout is a game simplification, not NASA\'s plan. In this game Orion is jettisoned with the ICPS (S1) in lunar transfer, and the lander (S2, own descent engine and legs) performs lunar orbit insertion and the landing. Orion never lands.',
      simple: 'Same ride as B, but a lander rides in the stack. Core + boosters reach orbit, the ICPS pushes you toward the Moon, then the lander brakes into lunar orbit and lands.',
      steps: ['Load; stages: S0 boosters+core, S1 ICPS+Orion, S2 lander.', 'Fly to orbit as in B, then burn S1 toward the Moon (aim at it on the map, M).', 'Press SPACE to drop S1, brake with the lander engine, land under 12 m/s (sandbox: any speed).'],
      spec: [['sls_las', 0], ['sls_orion', 1], ['hls_lander', 2], ['hls_descent', 2], ['sls_icps', 1], ['engine_vacuum', 1], ['struct_decoupler', 1], ['sls_lvsa', 0], ['sls_core', 0], ['sls_rs25', 0]], boosters: 2 },
    { id: 'custom', name: 'E · Custom (start empty)', tag: 'FREE', col: '#94a3b8',
      mission: 'Design your own vehicle from the parts list.', info: 'Clears the workspace.', simple: 'Drag parts from the left list; the right panel shows stats and warnings.',
      steps: ['Add a command part, tanks, an engine.', 'Check TWR ≥ 1.2.', 'Assign stages and launch.'], spec: [] }
  ];
  function build(t) {
    const P = G('Parts'), U = G('Utils'); const total = t.spec.reduce((s, [id]) => s + P.getById(id).height, 0);
    let cursor = -total / 2; const out = [];
    t.spec.forEach(([id, stage], i) => { const tpl = P.getById(id); out.push({ ...U.deepClone(tpl), instanceId: 'tpl_' + t.id + '_' + i, x: 0, y: cursor + tpl.height / 2, rotation: 0, stageNum: stage }); cursor += tpl.height; });
    if (t.boosters) { const core = out.find(p => p.id === 'sls_core'), b = P.getById('sls_srb'); const rs = out.find(p => p.id === 'sls_rs25'); const bottom = (rs ? rs.y + rs.height / 2 : core.y + core.height / 2);
      for (let k = 0; k < t.boosters; k++) { const s = k ? 1 : -1; out.push({ ...U.deepClone(b), instanceId: 'tpl_' + t.id + '_b' + k, x: s * (core.width / 2 + b.width / 2 + 1), y: bottom - b.height / 2, rotation: 0, stageNum: 0 }); } }
    return out;
  }
  function stats(parts) { try { const S = G('Spacecraft'); const c = new S({ parts: parts.map(p => ({ ...p })) }); return { mass: c.totalMass, twr: c.getTWR(), dv: c.getDeltaV(), thrust: c.getCurrentThrust() }; } catch (e) { return null; } }
  function load(t) {
    const B = G('Builder'); B.assembledParts = build(t); B.selectedPart = null; try { B.showPartDetails(null); } catch (e) { }
    B.saveState(); B.updateStats(); B.renderStages(); B.render(); try { B.validateDesign(false); } catch (e) { }
    try { G('Toast').show('Loaded: ' + t.name, 'success', 2200); } catch (e) { }
  }
  function preview(cv, t) { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); const ps = build(t); if (!ps.length) { g.fillStyle = '#64748b'; g.font = '12px sans-serif'; g.fillText('empty', 40, 60); return; }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; ps.forEach(p => { x0 = Math.min(x0, p.x - p.width / 2); x1 = Math.max(x1, p.x + p.width / 2); y0 = Math.min(y0, p.y - p.height / 2); y1 = Math.max(y1, p.y + p.height / 2); });
    const k = Math.min((cv.height - 12) / (y1 - y0), (cv.width - 12) / (x1 - x0)), cx = cv.width / 2 - (x0 + x1) / 2 * k, cy = cv.height / 2 - (y0 + y1) / 2 * k;
    const colors = { fuel: '#e2e8f0', engine: '#64748b', booster: '#f8fafc', command: '#cbd5e1', structural: '#94a3b8', payload: '#fbbf24' };
    ps.forEach(p => { g.fillStyle = p.id === 'sls_core' ? '#c2622d' : (colors[p.category] || '#aaa'); g.fillRect(cx + (p.x - p.width / 2) * k, cy + (p.y - p.height / 2) * k, p.width * k, p.height * k); g.strokeStyle = '#0f172a'; g.strokeRect(cx + (p.x - p.width / 2) * k, cy + (p.y - p.height / 2) * k, p.width * k, p.height * k); }); }
  let adv = false;
  function open() {
    let m = document.getElementById('aaa-tpl'); if (m) m.remove(); m = document.createElement('div'); m.id = 'aaa-tpl';
    m.innerHTML = '<div class="box"><div class="hd"><b>VEHICLE TEMPLATES</b><span class="md"><button data-m="0" class="' + (adv ? '' : 'on') + '">Beginner</button><button data-m="1" class="' + (adv ? 'on' : '') + '">Advanced</button></span><button class="x">✕</button></div><div class="grid"></div></div>';
    document.body.appendChild(m); const grid = m.querySelector('.grid');
    TPL.forEach(t => { const s = t.spec.length ? stats(build(t)) : null; const ready = !s ? '—' : (s.twr >= 1.2 ? '<i style="color:#4ade80">● READY: TWR ' + s.twr.toFixed(2) + '</i>' : '<i style="color:#facc15">● LOW TWR ' + s.twr.toFixed(2) + ' (fine for a lander / upper stage)</i>');
      const stages = [...new Set(t.spec.map(x => x[1]))].sort().length;
      const d = document.createElement('div'); d.className = 'card'; d.innerHTML = '<canvas width="110" height="170"></canvas><div class="tx"><span class="tag" style="background:' + t.col + '">' + t.tag + '</span><h4>' + t.name + '</h4><p><b>Mission:</b> ' + t.mission + '</p><p class="sm">' + (adv ? t.info : t.simple) + '</p>' + (s ? '<p class="st">Mass ' + (s.mass / 1000).toFixed(0) + ' t · Thrust ' + (s.thrust / 1000).toFixed(0) + ' kN · ΔV ' + Math.round(s.dv) + ' m/s · ' + stages + ' stage(s)<br>' + ready + '</p>' : '') + '<ol>' + t.steps.map(x => '<li>' + x + '</li>').join('') + '</ol><button class="load">LOAD</button></div>';
      grid.appendChild(d); preview(d.querySelector('canvas'), t); d.querySelector('.load').onclick = () => { load(t); m.remove(); }; });
    m.querySelector('.x').onclick = () => m.remove(); m.onclick = e => { if (e.target === m) m.remove(); };
    m.querySelectorAll('.md button').forEach(b => b.onclick = () => { adv = b.dataset.m === '1'; open(); });
  }
  window.AAATemplates = { open, list: TPL, build, load, stats };
  setInterval(function () { const v = document.getElementById('btn-validate'); if (v && !document.getElementById('aaa-tplbtn')) { const b = document.createElement('button'); b.id = 'aaa-tplbtn'; b.className = 'tool-btn'; b.title = 'Vehicle templates'; b.textContent = '▦ TEMPLATES'; b.onclick = open; document.body.appendChild(b); } }, 500);
})();

// ===== v1.4 MOON WALK: after touchdown on the Moon, the crew can step out -> ASTRA Academy (embedded, own renderer) =====
;(function () {
  const G = n => { try { return (0, eval)(n); } catch (e) { return undefined; } };
  const base = (document.currentScript && document.currentScript.src || '').replace(/glue\.js.*$/, '');
  const SRC = base + '../../astra/ASTRA_Academy_v4.html';
  let btn, fade, host, open = false, prevPaused = false;
  function qLevel() { const g = (G('Settings') && G('Settings').config && G('Settings').config.graphics) || 'auto'; return g === 'low' ? 0 : g === 'high' ? 2 : 1; }
  function ensure() {
    if (btn) return;
    btn = document.createElement('button'); btn.id = 'aaa-walk'; btn.innerHTML = '🧑‍🚀 STEP OUT · WALK ON THE MOON <small>(F)</small>'; btn.onclick = enter; document.body.appendChild(btn);
    fade = document.createElement('div'); fade.id = 'aaa-fade'; fade.innerHTML = '<div class="t"></div>'; document.body.appendChild(fade);
  }
  function say(t) { fade.querySelector('.t').innerHTML = t; }
  function enter() {
    if (open) return; open = true; btn.classList.remove('show'); say('Depressurising cabin… opening hatch<br><small>Lunar gravity 1.62 m/s² · 1/6 g</small>'); fade.classList.add('on');
    setTimeout(() => {
      const S = G('Simulation'); prevPaused = !!(S && S.physics && S.physics.paused); if (S && S.physics) S.physics.paused = true;
      if (window.AAA && AAA.Core) AAA.Core.paused = true; try { AAA.audio && AAA.audio.engine && AAA.audio.engine(0, 0, 0); AAA.audio && AAA.audio.setMusic && AAA.audio.setMusic(false, 0); } catch (e) { }
      host = document.createElement('div'); host.id = 'aaa-astra';
      host.innerHTML = '<iframe allow="autoplay; fullscreen; pointer-lock" title="ASTRA Moon surface"></iframe><button class="back">◀ RETURN TO LANDER</button>';
      document.body.appendChild(host); const fr = host.querySelector('iframe'); fr.onload = () => setTimeout(() => fade.classList.remove('on'), 900); fr.src = SRC + '#embed&q=' + qLevel();
      host.querySelector('.back').onclick = leave; setTimeout(() => fade.classList.remove('on'), 6000);
    }, 1500);
  }
  function leave() {
    if (!open) return; say('Re-entering the lander… repressurising'); fade.classList.add('on');
    setTimeout(() => { if (host) { const f = host.querySelector('iframe'); try { f.src = 'about:blank'; } catch (e) { } host.remove(); host = null; }   // frees the second WebGL context and its memory
      const S = G('Simulation'); if (S && S.physics) S.physics.paused = prevPaused; if (window.AAA && AAA.Core) AAA.Core.paused = false; try { window.applyAudioHook && window.applyAudioHook(); } catch (e) { }
      open = false; fade.classList.remove('on'); }, 1300);
  }
  addEventListener('keydown', e => { if (e.code === 'KeyF' && btn && btn.classList.contains('show') && !open) { e.preventDefault(); enter(); } });
  setInterval(function () { try { ensure(); const S = G('Simulation'), sc = S && S.spacecraft; const scr = document.querySelector('.screen.active'); const on = !open && sc && scr && scr.id === 'simulation-screen' && sc.landed && !sc.destroyed && sc.landedOn && sc.landedOn.name === 'Moon' && sc.hasLaunched !== false; btn.classList.toggle('show', !!on); } catch (e) { } }, 500);
  window.AAAMoonWalk = { enter, leave };
})();
