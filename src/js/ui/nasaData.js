// ==========================================
// NASA Data Center (Scientific Resource)
// Sourced from NASA Open APIs & Planetary Data System
// ==========================================

const NasaData = {
    initialized: false,

    planetaryData: [
        {
            name: 'Earth (Sol III)',
            source: 'NASA Planetary Data System (PDS)',
            stats: [
                { label: 'Mean Radius', val: '6,371.0 km' },
                { label: 'Mass', val: '5.9722 &times; 10&sup2;&sup4; kg' },
                { label: 'Surface Gravity', val: '9.80665 m/s&sup2; (1.00 g)' },
                { label: 'Escape Velocity', val: '11.186 km/s' },
                { label: 'Orbital Speed', val: '29.78 km/s' },
                { label: 'Surface Atmospheric Pressure', val: '101.325 kPa (1.00 bar)' },
                { label: 'Atmospheric Composition', val: '78.08% N&sup2;, 20.95% O&sup2;, 0.93% Ar' }
            ],
            desc: 'Earth is the third planet from the Sun and the only astronomical object known to harbor life. According to radiometric dating estimation, Earth formed over 4.5 billion years ago. Earth\'s gravity interacts with other objects in space, especially the Sun and the Moon.'
        },
        {
            name: 'The Moon (Luna)',
            source: 'NASA Space Science Data Coordinated Archive (NSSDCA)',
            stats: [
                { label: 'Mean Radius', val: '1,737.4 km (0.272 Earths)' },
                { label: 'Mass', val: '7.342 &times; 10&sup2;&sup2; kg (0.0123 Earths)' },
                { label: 'Surface Gravity', val: '1.62 m/s&sup2; (0.166 g)' },
                { label: 'Escape Velocity', val: '2.38 km/s' },
                { label: 'Average Distance from Earth', val: '384,400 km' },
                { label: 'Orbital Period', val: '27.321661 days (sidereal)' },
                { label: 'Surface Temp Range', val: '-130&deg;C to +120&deg;C' }
            ],
            desc: 'The Moon is Earth\'s only natural satellite. It is in synchronous rotation with Earth, meaning the same side always faces Earth. The lunar surface is covered in regolith and cratered terrain from billions of years of meteorite bombardment.'
        },
        {
            name: 'Mars (Sol IV)',
            source: 'NASA Mars Exploration Program',
            stats: [
                { label: 'Mean Radius', val: '3,389.5 km (0.532 Earths)' },
                { label: 'Mass', val: '6.4171 &times; 10&sup2;&sup3; kg (0.107 Earths)' },
                { label: 'Surface Gravity', val: '3.72076 m/s&sup2; (0.379 g)' },
                { label: 'Escape Velocity', val: '5.027 km/s' },
                { label: 'Semi-Major Axis', val: '227.9 million km (1.524 AU)' },
                { label: 'Atmospheric Pressure', val: '0.636 kPa (~0.006 atm)' },
                { label: 'Atmospheric Composition', val: '95.32% CO&sup2;, 2.6% N&sup2;, 1.9% Ar' }
            ],
            desc: 'Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System. Known as the Red Planet due to iron oxide prevalent on its surface, Mars features Olympus Mons (the largest volcano in the Solar System) and Valles Marineris (one of the largest canyons).'
        }
    ],

    missions: [
        {
            name: 'Apollo 11 & Artemis Program',
            agency: 'NASA',
            desc: 'On July 20, 1969, Apollo 11 astronauts Neil Armstrong and Buzz Aldrin became the first humans to land on the Moon. Today, NASA\'s Artemis campaign is leading humanity back to the lunar South Pole to prepare for future missions to Mars.'
        },
        {
            name: 'Mars 2020 / Perseverance Rover',
            agency: 'NASA Jet Propulsion Laboratory (JPL)',
            desc: 'Perseverance landed in Jezero Crater on February 18, 2021, seeking signs of ancient microbial life and collecting rock core samples for future Earth return. It also carried the Ingenuity helicopter, the first powered aircraft to fly on another planet.'
        },
        {
            name: 'Voyager Interstellar Mission',
            agency: 'NASA / JPL',
            desc: 'Launched in 1977, Voyager 1 and Voyager 2 explored Jupiter, Saturn, Uranus, and Neptune. Both spacecraft are now operating in interstellar space, beyond the heliosphere—making them the farthest human-made objects in history.'
        }
    ],

    init() {
        if (!this.initialized) {
            document.getElementById('btn-back-nasa')?.addEventListener('click', () => {
                Utils.showScreen('menu-screen');
            });
            this.initialized = true;
        }

        this.render();
    },

    render() {
        const container = document.getElementById('nasa-content');
        if (!container) return;

        let planetsHtml = '';
        this.planetaryData.forEach(p => {
            let statsRows = '';
            p.stats.forEach(s => {
                statsRows += `<div class="nasa-stat"><span>${s.label}</span><span>${s.val}</span></div>`;
            });

            planetsHtml += `
                <div class="nasa-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <h3>${p.name}</h3>
                        <span style="font-size: 0.75rem; color: var(--accent-cyan); font-family: var(--font-mono);">${p.source}</span>
                    </div>
                    <p style="margin-bottom: 16px;">${p.desc}</p>
                    <div style="background: rgba(15,23,42,0.6); padding: 12px; border-radius: 8px; border: 1px solid rgba(59,130,246,0.15);">
                        ${statsRows}
                    </div>
                </div>
            `;
        });

        let missionsHtml = '';
        this.missions.forEach(m => {
            missionsHtml += `
                <div class="nasa-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <h3>${m.name}</h3>
                        <span style="font-size: 0.75rem; color: var(--accent-orange); font-family: var(--font-mono);">${m.agency}</span>
                    </div>
                    <p>${m.desc}</p>
                </div>
            `;
        });

        container.innerHTML = `
            <div style="margin-bottom: 30px;">
                <h2 style="font-family: var(--font-display); color: var(--accent-cyan); font-size: 1.2rem; letter-spacing: 2px; margin-bottom: 12px;">CELESTIAL EPHEMERIS & PLANETARY DATA</h2>
                ${planetsHtml}
            </div>

            <div>
                <h2 style="font-family: var(--font-display); color: var(--accent-orange); font-size: 1.2rem; letter-spacing: 2px; margin-bottom: 12px;">HISTORIC NASA EXPLORATION MISSIONS</h2>
                ${missionsHtml}
            </div>
        `;
    }
};

