// ==========================================
// Interactive Tutorials & Guides
// ==========================================

const Tutorials = {
    initialized: false,
    selectedTutorial: null,

    tutorials: [
        {
            id: 'basics',
            title: '1. Rocket Fundamentals: TWR & Delta-V',
            icon: '',
            desc: 'Learn how mass, thrust, and fuel determine whether your rocket can escape gravity.',
            content: `
                <h3>Thrust-to-Weight Ratio (TWR)</h3>
                <p>For a rocket to lift off from Earth, its engine thrust must exceed its total weight. The ratio of thrust to weight is called <strong>TWR</strong>.</p>
                <div class="tip-box"><p> <strong>Rule of Thumb:</strong> Aim for a liftoff TWR of <strong>1.3 to 1.6</strong>. If TWR is below 1.0, the rocket cannot lift off. If TWR is above 2.0, atmospheric drag and aerodynamic stresses become excessive.</p></div>

                <h3>The Tsiolkovsky Rocket Equation & Delta-V</h3>
                <p><strong>Delta-V (&Delta;v)</strong> is the total velocity change your spacecraft can produce. It depends on your engine efficiency (Specific Impulse, <em>Isp</em>) and your propellant mass fraction:</p>
                <p style="font-family: var(--font-mono); color: var(--accent-cyan); text-align: center; font-size: 1.1rem; padding: 12px 0;">&Delta;v = Isp &times; g₀ &times; ln(m₀ / mf)</p>
                <ul>
                    <li><strong>Low Earth Orbit (LEO):</strong> Requires ~9,400 m/s &Delta;v from Earth's surface (including gravity & drag losses).</li>
                    <li><strong>Trans-Lunar Injection (TLI):</strong> Requires an additional ~3,200 m/s from LEO.</li>
                    <li><strong>Lunar Landing:</strong> Requires ~1,900 m/s for powered braking.</li>
                </ul>
            `
        },
        {
            id: 'gravity_turn',
            title: '2. The Gravity Turn & Orbital Mechanics',
            icon: '',
            desc: 'Master the curved ascent trajectory needed to enter orbit instead of falling straight back down.',
            content: `
                <h3>Why Not Fly Straight Up?</h3>
                <p>Getting to orbit isn't just about going high—it's about going fast horizontally! To stay in orbit at 400 km altitude, a spacecraft must travel sideways at <strong>7,670 m/s (27,600 km/h)</strong> so that as gravity pulls it down, Earth curves away underneath it at the exact same rate.</p>

                <h3>How to Execute a Gravity Turn</h3>
                <ul>
                    <li><strong>0 to 10 km:</strong> Ascend vertically through the thickest part of the atmosphere.</li>
                    <li><strong>10 km (Pitch Over):</strong> Gently steer right (East, ~80° heading). Let gravity help pull your trajectory into a smooth arc.</li>
                    <li><strong>30 to 70 km:</strong> Continue pitching down toward 45°, then 20° as the atmosphere thins out.</li>
                    <li><strong>Cut Engines at Target Apoapsis:</strong> Once your Apoapsis (Ap) reaches ~400 km, cut your throttle (press X).</li>
                    <li><strong>Circularization Burn:</strong> Coast to Apoapsis. When you are 30 seconds before Ap, point horizontal (90°) and burn full throttle until your Periapsis (Pe) rises out of the atmosphere above 150 km!</li>
                </ul>
            `
        },
        {
            id: 'staging',
            title: '3. Staging & Decouplers',
            icon: '',
            desc: 'Understand why staging is the key to building efficient, high-performance launch vehicles.',
            content: `
                <h3>The Tyranny of the Rocket Equation</h3>
                <p>Carrying empty fuel tanks and heavy sea-level engines into space wastes huge amounts of energy. By dropping spent hardware using <strong>Decouplers</strong>, your upper stage becomes much lighter and gains enormous &Delta;v!</p>
                <div class="tip-box"><p> Place decouplers between fuel tanks. The stage below will automatically drop when you press the <strong>STAGE</strong> key, igniting the engine above!</p></div>
                <ul>
                    <li><strong>Stage 0 (Booster/First Stage):</strong> High-thrust engines (e.g., F-1, RS-25) optimized for sea-level atmosphere.</li>
                    <li><strong>Stage 1 (Upper Stage):</strong> High-efficiency vacuum engine (e.g., RL-10, Merlin Lite) with high Isp.</li>
                    <li><strong>Payload Stage:</strong> Command module, satellite bus, solar panels, and scientific payloads.</li>
                </ul>
            `
        },
        {
            id: 'landing',
            title: '4. Lunar Transfer & Surface Landing',
            icon: '',
            desc: 'Navigate to the Moon and perform a soft landing on the lunar regolith.',
            content: `
                <h3>Trans-Lunar Injection (TLI)</h3>
                <p>From Earth orbit, burn prograde (in the direction of flight) when the Moon is about 90° ahead in its orbit. This stretches your orbit into an elongated ellipse whose apoapsis intersects the Moon's sphere of influence.</p>

                <h3>Powered Lunar Descent</h3>
                <p>The Moon has no atmosphere, so parachutes and heat shields won't work! All deceleration must come from rocket thrust.</p>
                <ul>
                    <li><strong>Deorbit Burn:</strong> Burn retrograde in lunar orbit to lower your periapsis to 15 km above the surface.</li>
                    <li><strong>Final Braking:</strong> Kill all horizontal velocity as you approach the landing zone.</li>
                    <li><strong>Vertical Touchdown:</strong> Throttle carefully so your descent rate is <strong>less than 5 m/s</strong> when your landing legs touch down!</li>
                </ul>
            `
        }
    ],

    init() {
        if (!this.initialized) {
            document.getElementById('btn-back-tutorial')?.addEventListener('click', () => {
                if (this.selectedTutorial) {
                    this.selectedTutorial = null;
                    this.renderList();
                } else {
                    Utils.showScreen('menu-screen');
                }
            });
            this.initialized = true;
        }
        this.renderList();
    },

    renderList() {
        const container = document.getElementById('tutorial-content');
        if (!container) return;

        container.innerHTML = '';

        this.tutorials.forEach(tut => {
            const card = document.createElement('div');
            card.className = 'tutorial-card';
            card.innerHTML = `
                <div class="tutorial-title">${tut.icon} ${tut.title}</div>
                <div class="tutorial-desc">${tut.desc}</div>
            `;

            card.addEventListener('click', () => {
                this.selectedTutorial = tut;
                this.renderDetail(tut);
            });

            container.appendChild(card);
        });
    },

    renderDetail(tut) {
        const container = document.getElementById('tutorial-content');
        if (!container) return;

        container.innerHTML = `
            <div class="tutorial-detail">
                <button class="btn-sm" id="btn-tut-back" style="margin-bottom: 16px;">◀ Back to Topics</button>
                <h2>${tut.icon} ${tut.title}</h2>
                <div>${tut.content}</div>
            </div>
        `;

        document.getElementById('btn-tut-back')?.addEventListener('click', () => {
            this.selectedTutorial = null;
            this.renderList();
        });
    }
};

