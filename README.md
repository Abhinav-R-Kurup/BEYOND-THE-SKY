# FLY BEYOND SKY — AAA 3D Edition

## Run
Simplest: double-click `index.html` (Chrome/Edge/Firefox, WebGL required). Works from file://.
Optional local server: `start.bat` (Windows) or `start.sh` (Mac/Linux) -> http://127.0.0.1:8000

## What changed
`index.html` is untouched. A Three.js layer (`src/js/aaa/aaa.bundle.js`, glue in `glue.js`, styles in `src/css/aaa.css`) draws:
cinematic 3D solar-system menu, 3D VAB rocket builder, 3D launch complex, dual-pass flight (Earth/Moon/Mars, atmosphere, re-entry plasma, debris, fairing jettison), camera modes (C key, drag, wheel), original procedural BGM + engine/wind SFX, mission-control callouts, part info (what/why/where/if missing/performance).
If WebGL or the bundle fails, the original 2D game runs unchanged.

## v1.1 changes
- LAUNCH button was pushed off-screen on short windows; the right panel now scrolls and LAUNCH is pinned. Enter also launches (builder) / starts countdown (flight); Space still works.
- "MAIN MENU" button in builder and flight.
- Sandbox = free mode: any craft launches (even with no engine), unlimited propellant, no air drag/heating, no crash. Other missions keep the realistic NASA-based physics.
- Builder: no solid pad; shadow flicker fixed (parts are no longer rebuilt every frame, shadow bias tuned).
- Intro: real-time 3D black hole (gravitational lensing, rotating accretion disk, Doppler beaming, photon ring).

## v1.2 (NASA-prompt pass) — what was actually done
- Space: near-black sky, varied star sizes/brightness; stars fade out inside the atmosphere; intro nebula removed.
- Intro: large "AN INCREDIBLES PRODUCTION" title; real-time 3D black hole.
- Cameras (C key or dropdown): Rocket follow, Front, Rear/engines, Side, Close-up, Wide cinematic, Ground tracking, Orbital, Free-look, Nose; smooth blended transitions.
- Time warp 1x/2x/5x/10x/50x/100x with visible selector (capped at 10x in dense atmosphere); physics sub-stepped; 50x and 100x tested for finite state only.
- Pre-launch poll: close (X) button, reopen button; auto-hides after launch.
- Exhaust is anchored to the active stage's engine nozzles (moves up after staging).
- Debris: ballistic fall with gravity + drag, aerodynamic heating (glow, flames, sparks), charring, impact, persistent dark wreckage with smoke/embers (newest 14 kept).
- Sandbox flights no longer auto-end with a mission report.

## v1.3 (physics / rocket-system pass) — what was actually done
- **Templates** (builder toolbar ▦ TEMPLATES): A Beginner Launch Rocket, B SLS-inspired Lunar Launch Vehicle, C Moon Lander, D Lunar Mission Stack, E Custom. Preview, mission text, Beginner/Advanced explanations, build steps, TWR/ΔV/stage readiness line.
- **New parts** (parts.js, models.js): SLS core, RS-25 x4 section, 5-segment SRB, LVSA, ICPS, Orion, Launch Abort System, lander, lander descent engine. NASA-sourced: SLS 98.3 m / 2,608 t / core 64.6 m x 8.4 m / 988 t propellant / SRB 54.1 m x 3.7 m, 726 t / ICPS 13.7 m x 5.1 m 32.7 t. **Approximations (not NASA data):** Orion mass, LAS mass, LVSA mass, SRB average thrust/Isp/propellant, core dry mass, RS-25 effective Isp, lander mass/thrust.
- **Solid boosters** burn their own propellant in parallel with the core and auto-separate at burnout (~126 s); liquid stages unchanged.
- **Crash explosions**: energy 1/2 m v^2 scales fireball, smoke, sparks, shockwave ring, flash, camera shake and sound; once per impact; none during staging; charred wreckage persists. Delay before the failure report raised to 7 s so it can be seen.
- **Re-entry**: heat glow on the hull follows physics `heating` (continuous with air density x speed), soft plasma wake + sparks, structural vibration grows with dynamic pressure.
- Tests actually run (headless Chrome, software GL, low fps): launch via button / Enter / Space OK; template modal (5 cards) OK; SLS template TWR 1.37, mass 2,630 t, physics-engine orbit 188 x 165 km reached with a gentle pitch program, SRBs jettisoned t=126 s; forced 209 m/s impact => explosion fired once, 14 wreckage pieces, no console errors; forced re-entry (7.6 km/s at 75 km) => heating 0.21 -> 0.35 smoothly, no errors; settings graphics low persisted; 2D fallback with bundle removed OK; index.html md5 unchanged (712b864e...).

- **v1.3.1 fixes:** exhaust now emitted per engine at its own nozzle exit and always rearward (no blobs on the hull); TEMPLATES button moved to its own fixed spot; richer lunar surface (fine craters, regolith grain, maria tint, scattered rocks); Template D rebuilt so the lander has its own descent engine (Orion leaves with the ICPS). Headless physics check: powered descent to the Moon lands safely (5 m/s and 30 m/s starts, throttle-controlled). Not verified: full Earth-to-Moon transfer by an unaided player; the ICPS alone gives ~2.3 km/s, below the ~3.1 km/s typical TLI burn, so a real-physics mission needs leftover core propellant (sandbox has no such limit).

## v1.4 — Moon walk + plume
- **Moon walk:** after touching down on the Moon a "STEP OUT · WALK ON THE MOON" button (key F) appears. Fade-to-black transition, then your uploaded **ASTRA Academy v4** runs full-screen (`src/astra/ASTRA_Academy_v4.html`, only change: an auto-start snippet at the end). "RETURN TO LANDER" button goes back. While ASTRA is open the rocket scene renderer and physics are paused and the ASTRA iframe (second WebGL context) is destroyed on return, to save GPU/memory. Our Low/Medium/High setting is passed to ASTRA's own quality switch.
- ASTRA keeps its own renderer (Three.js r128, procedural regolith). It is NOT the same renderer as the rocket scenes, so the look is similar in quality but not pixel-identical. Click inside it once to capture the mouse.
- **Plume:** engine flame is now a noise-driven shader plume (white-hot core, billowing orange body, teardrop tip, wider in vacuum, shock-diamond banding in air) modelled on the two reference photos; it is a stylised look, not a CFD result.
- Tested: Moon touchdown -> button -> transition -> ASTRA starts and renders -> return restores the rocket scene (headless Chrome). Not tested: playing ASTRA to its end, returning to the lander afterwards and lifting off again.

## Not done in v1.3 (honest)
- Automatic fairing generation in the builder (the fairing part still must be placed by hand; its 2-half separation in flight works).
- Per-engine exhaust differentiation (booster vs core vs upper stage plume) and nozzle-exit pooling beyond v1.2 behaviour.
- Template D cannot split into two independently flown craft (game staging limitation); Orion is never a lander.
- Full 23-item regression list was NOT run; only the tests listed above. No LOD/culling audit; particle cap/quality presets from v1.2 unchanged.
- SLS max thrust in-game 35.3 MN (NASA quotes 39.1 MN max); booster debris off-centre rendering not visually verified.
- Still open from earlier prompts: Artemis mission sequence, solar-system zoom with planets/orbits, NASA data/attribution UI, Sketchfab Earth GLB, full photo-realism.

## NOT done yet (honest list, from earlier versions)
- NASA SLS Block 1 default rocket (core stage, SRBs, ICPS, Orion, LAS) — not modelled.
- Artemis lunar mission sequence and separate lander — not implemented.
- Full solar-system zoom (inner/outer planets, labels, orbits) — not implemented.
- NASA datasets/attribution UI, performance/memory audit and full regression test are only partially done (see tests actually run: launch, staging, cameras, warp, debris state, black-hole intro frame).
- Fairing separation not re-tested this round.

## Settings
Settings -> "MUSIC & 3D GRAPHICS": music on/off, volumes, graphics Low/Medium/High/Auto, bloom. Use Low on weak hardware.

## Known limitations (honest list)
- The Sketchfab "Earth" by Akshat could not be downloaded here. Earth is built from NASA-based textures with day/night/cloud/atmosphere shaders. No GLB loader is included yet.
- Rocket/part models are procedural, realistic in proportion, not exact replicas.
- Tested headless (software GL, ~20-49 fps); a full orbit flight was not played end-to-end in a real GPU browser. Mars ground/rover deploy untested visually.
- Tutorials remain 2D. Builder shows payload parts under the fairing (fairing appears in flight only).

## Rebuild bundle
`cd bundle-source && npm i three@0.170.0 esbuild && npx esbuild src/main.js --bundle --minify --format=iife --outfile=../src/js/aaa/aaa.bundle.js`

## Credits
Earth/Moon/Mars textures: NASA / Planet Pixel Emporium (see tools/embed_assets.py). Audio is generated in code. Three.js (MIT).
