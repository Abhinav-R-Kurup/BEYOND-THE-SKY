// ==========================================
// Mission Data
// ==========================================

const MISSION_DATA = {
    'earth-obs': {
        id: 'earth-obs',
        name: 'Earth Observation Satellite',
        icon: '',
        description: 'Deploy an Earth observation satellite into Low Earth Orbit (LEO). The satellite must carry imaging equipment and maintain stable orbit at 400km altitude.',
        destination: 'LEO (400km)',
        difficulty: { beginner: true, intermediate: true, advanced: true },
        budget: { beginner: 300000000, intermediate: 200000000, advanced: 120000000 },
        targetAltitude: 400000,      // 400km in meters
        targetOrbitMin: 350000,
        targetOrbitMax: 450000,
        objectives: [
            { id: 'launch', text: 'Launch from Earth surface', type: 'launch' },
            { id: 'altitude', text: 'Reach 100km altitude (Kármán line)', type: 'altitude', value: 100000 },
            { id: 'orbit', text: 'Achieve stable orbit at 350-450km', type: 'orbit', minAlt: 350000, maxAlt: 450000 },
            { id: 'satellite', text: 'Deploy observation satellite', type: 'payload', requires: ['satellite_bus', 'sci_camera'] },
            { id: 'comm', text: 'Establish communication link', type: 'comm' }
        ],
        requiredParts: ['command', 'engine', 'fuel'],
        recommendedParts: ['satellite_bus', 'sci_camera', 'solar_panel', 'antenna'],
        scienceReward: 50,
        tips: [
            'A TWR of 1.3-1.5 is ideal for launch',
            'Start your gravity turn at about 10km altitude',
            'Orbital velocity at 400km is approximately 7.67 km/s',
            'Remember to include solar panels for satellite power'
        ],
        nasaRef: 'Earth observation satellites like Landsat and Terra provide critical data about our planet\'s surface, atmosphere, and climate systems. NASA\'s Earth Observing System (EOS) represents the most comprehensive study of Earth from space.'
    },

    'moon-landing': {
        id: 'moon-landing',
        name: 'Moon Landing',
        icon: '',
        description: 'Land a spacecraft on the lunar surface. Navigate from Earth orbit to the Moon, perform orbital insertion, and execute a powered descent to the surface.',
        destination: 'Moon Surface',
        difficulty: { beginner: false, intermediate: true, advanced: true },
        budget: { intermediate: 400000000, advanced: 250000000 },
        targetBody: 'Moon',
        objectives: [
            { id: 'launch', text: 'Launch from Earth surface', type: 'launch' },
            { id: 'leo', text: 'Achieve Earth orbit', type: 'orbit', minAlt: 180000, maxAlt: 500000 },
            { id: 'tli', text: 'Trans-Lunar Injection burn', type: 'altitude', value: 300000000 },
            { id: 'lunar-orbit', text: 'Enter lunar orbit', type: 'lunar_orbit' },
            { id: 'landing', text: 'Land on the Moon', type: 'landing', body: 'Moon' },
        ],
        requiredParts: ['command', 'engine', 'fuel', 'landing_legs'],
        recommendedParts: ['cmd_pod_3', 'lander', 'dish_antenna', 'computer'],
        scienceReward: 150,
        tips: [
            'You need approximately 3,200 m/s delta-V for Trans-Lunar Injection',
            'Landing requires precise throttle control - aim for < 5 m/s at touchdown',
            'Include landing legs on your spacecraft',
            'A separate lander stage makes the mission more efficient'
        ],
        nasaRef: 'The Apollo program successfully landed 12 astronauts on the Moon between 1969 and 1972. The Artemis program aims to return humans to the lunar surface, establishing sustainable exploration by the late 2020s.'
    },

    'mars-rover': {
        id: 'mars-rover',
        name: 'Mars Rover Exploration',
        icon: '',
        description: 'Send a rover to Mars. Design a spacecraft capable of the interplanetary journey, Mars orbital insertion, and deploy a rover to the Martian surface.',
        destination: 'Mars Surface',
        difficulty: { beginner: false, intermediate: false, advanced: true },
        budget: { advanced: 500000000 },
        targetBody: 'Mars',
        objectives: [
            { id: 'launch', text: 'Launch from Earth surface', type: 'launch' },
            { id: 'leo', text: 'Achieve Earth orbit', type: 'orbit', minAlt: 180000, maxAlt: 500000 },
            { id: 'tmi', text: 'Trans-Mars Injection', type: 'escape' },
            { id: 'mars-approach', text: 'Approach Mars', type: 'approach', body: 'Mars' },
            { id: 'rover-deploy', text: 'Deploy rover to Mars surface', type: 'rover_deploy' }
        ],
        requiredParts: ['command', 'engine', 'fuel', 'rover'],
        recommendedParts: ['cmd_probe', 'dish_antenna', 'sci_camera', 'sci_spectrometer'],
        scienceReward: 300,
        tips: [
            'Mars missions require significantly more delta-V than lunar missions',
            'Use a Hohmann transfer orbit for efficiency',
            'Heat shields are critical for Mars atmospheric entry',
            'Include a high-gain antenna for deep space communication'
        ],
        nasaRef: 'NASA\'s Mars Exploration Program has sent multiple rovers to Mars, including Spirit, Opportunity, Curiosity, and Perseverance. These missions have revolutionized our understanding of Mars\' geology and potential for past life.'
    },

    'sat-deploy': {
        id: 'sat-deploy',
        name: 'Satellite Deployment',
        icon: '',
        description: 'Deploy a communications satellite into Geostationary Earth Orbit (GEO) at 35,786 km altitude. The satellite must maintain position above a fixed point on Earth.',
        destination: 'GEO (35,786 km)',
        difficulty: { beginner: true, intermediate: true, advanced: true },
        budget: { beginner: 350000000, intermediate: 250000000, advanced: 150000000 },
        targetAltitude: 35786000,
        targetOrbitMin: 35000000,
        targetOrbitMax: 36500000,
        objectives: [
            { id: 'launch', text: 'Launch from Earth surface', type: 'launch' },
            { id: 'leo', text: 'Achieve parking orbit', type: 'orbit', minAlt: 180000, maxAlt: 500000 },
            { id: 'gto', text: 'Transfer to GTO', type: 'altitude', value: 35000000 },
            { id: 'geo', text: 'Circularize at GEO altitude', type: 'orbit', minAlt: 35000000, maxAlt: 36500000 },
            { id: 'deploy', text: 'Deploy communications satellite', type: 'payload', requires: ['satellite_bus', 'dish_antenna'] }
        ],
        requiredParts: ['command', 'engine', 'fuel'],
        recommendedParts: ['satellite_bus', 'dish_antenna', 'solar_panel_large'],
        scienceReward: 75,
        tips: [
            'GEO requires about 4,300 m/s delta-V from LEO',
            'Use a Hohmann transfer: burn at LEO perigee, then circularize at GEO',
            'GEO orbital period matches Earth\'s rotation (24 hours)',
            'Ensure adequate power generation for the satellite'
        ],
        nasaRef: 'Geostationary satellites are crucial for telecommunications, weather monitoring, and navigation. NASA\'s GOES satellites provide continuous weather imagery from geostationary orbit.'
    },

    'deep-space': {
        id: 'deep-space',
        name: 'Deep Space Exploration',
        icon: '',
        description: 'Send a deep space probe beyond the inner solar system. Design a spacecraft with scientific instruments capable of studying the outer planets.',
        destination: 'Deep Space',
        difficulty: { beginner: false, intermediate: false, advanced: true },
        budget: { advanced: 600000000 },
        objectives: [
            { id: 'launch', text: 'Launch from Earth surface', type: 'launch' },
            { id: 'escape', text: 'Achieve Earth escape velocity', type: 'escape' },
            { id: 'distance', text: 'Travel beyond 1 million km', type: 'distance', value: 1000000000 },
            { id: 'science', text: 'Collect scientific data', type: 'science', value: 100 },
            { id: 'comm', text: 'Maintain deep space communication', type: 'deep_comm' }
        ],
        requiredParts: ['command', 'engine', 'fuel'],
        recommendedParts: ['cmd_probe', 'dish_antenna', 'sci_magnetometer', 'engine_ion'],
        scienceReward: 500,
        tips: [
            'Ion thrusters provide enormous delta-V over time',
            'A high-gain dish antenna is essential for deep space communication',
            'Nuclear power (RTG) would be ideal but solar panels work near Earth',
            'Minimize mass to maximize delta-V'
        ],
        nasaRef: 'Voyager 1 and 2, launched in 1977, are the most distant human-made objects. New Horizons flew past Pluto in 2015. These missions demonstrate humanity\'s ability to explore the farthest reaches of our solar system.'
    },

    'sandbox': {
        id: 'sandbox',
        name: 'Custom Sandbox Mission',
        icon: '',
        description: 'Free-form sandbox mode with unlimited budget. Experiment with rocket designs, test vehicles, and explore freely without mission constraints.',
        destination: 'Anywhere',
        difficulty: { beginner: true, intermediate: true, advanced: true },
        budget: { beginner: 999999999, intermediate: 999999999, advanced: 999999999 },
        objectives: [
            { id: 'launch', text: 'Launch your spacecraft', type: 'launch' },
            { id: 'explore', text: 'Explore freely!', type: 'sandbox' }
        ],
        requiredParts: [],
        recommendedParts: [],
        scienceReward: 0,
        isSandbox: true,
        tips: [
            'No constraints - build whatever you want!',
            'Great for learning rocket construction',
            'Test designs before attempting real missions',
            'Experiment with different engine and fuel combinations'
        ],
        nasaRef: 'Space exploration has always been driven by curiosity and the desire to push boundaries. Every great mission starts with experimentation and testing.'
    }
};

