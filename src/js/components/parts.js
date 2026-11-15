// ==========================================
// Rocket Parts Catalog
// ==========================================

const PARTS_CATALOG = [
    // === COMMAND MODULES ===
    {
        id: 'cmd_pod_1',
        name: 'Mercury Capsule',
        category: 'command',
        icon: '',
        description: 'Basic single-seat command capsule. Minimal but reliable.',
        mass: 1200,
        cost: 8000000,
        width: 18,
        height: 22,
        crew: 1,
        powerUse: 50,
        heatShield: true,
        attributes: { crew: 1, heatShield: 'Basic' }
    },
    {
        id: 'cmd_pod_2',
        name: 'Gemini Capsule',
        category: 'command',
        icon: '',
        description: 'Two-seat command module with improved systems.',
        mass: 2500,
        cost: 15000000,
        width: 22,
        height: 26,
        crew: 2,
        powerUse: 80,
        heatShield: true,
        attributes: { crew: 2, heatShield: 'Standard' }
    },
    {
        id: 'cmd_pod_3',
        name: 'Apollo Command Module',
        category: 'command',
        icon: '',
        description: 'Advanced three-seat command module. Deep space rated.',
        mass: 5560,
        cost: 35000000,
        width: 26,
        height: 30,
        crew: 3,
        powerUse: 120,
        heatShield: true,
        attributes: { crew: 3, heatShield: 'Advanced', deepSpace: true }
    },
    {
        id: 'cmd_probe',
        name: 'Probe Core',
        category: 'command',
        icon: '',
        description: 'Unmanned command module. Lightweight automated control.',
        mass: 200,
        cost: 5000000,
        width: 12,
        height: 14,
        crew: 0,
        powerUse: 30,
        heatShield: false,
        attributes: { unmanned: true, computer: 'Basic AI' }
    },

    // === STRUCTURAL ===
    {
        id: 'struct_adapter_1',
        name: 'Stage Adapter S',
        category: 'structural',
        icon: '',
        description: 'Small interstage adapter for connecting rocket stages.',
        mass: 150,
        cost: 200000,
        width: 18,
        height: 8,
        attributes: { type: 'Adapter' }
    },
    {
        id: 'struct_adapter_2',
        name: 'Stage Adapter L',
        category: 'structural',
        icon: '',
        description: 'Large interstage adapter with payload fairing attachment.',
        mass: 350,
        cost: 500000,
        width: 24,
        height: 10,
        attributes: { type: 'Adapter', fairingMount: true }
    },
    {
        id: 'struct_fairing',
        name: 'Payload Fairing',
        category: 'structural',
        icon: '',
        description: 'Aerodynamic fairing to protect payloads during ascent.',
        mass: 800,
        cost: 1500000,
        width: 28,
        height: 35,
        attributes: { type: 'Fairing', dragReduction: 0.6 }
    },
    {
        id: 'struct_decoupler',
        name: 'Decoupler',
        category: 'structural',
        icon: '',
        description: 'Explosive bolts for stage separation.',
        mass: 50,
        cost: 100000,
        width: 18,
        height: 5,
        isDecoupler: true,
        attributes: { type: 'Decoupler', force: '500 N' }
    },
    {
        id: 'struct_truss',
        name: 'Structural Truss',
        category: 'structural',
        icon: '',
        description: 'Lightweight framework for satellite construction.',
        mass: 100,
        cost: 300000,
        width: 20,
        height: 15,
        attributes: { type: 'Truss' }
    },

    // === FUEL TANKS ===
    {
        id: 'fuel_small',
        name: 'Small Fuel Tank',
        category: 'fuel',
        icon: '',
        description: 'Compact liquid fuel tank for upper stages.',
        mass: 500,
        cost: 1000000,
        width: 18,
        height: 20,
        fuelCapacity: 2000,
        dryMass: 200,
        attributes: { fuel: '2,000 L', type: 'Liquid Hydrogen/LOX' }
    },
    {
        id: 'fuel_medium',
        name: 'Medium Fuel Tank',
        category: 'fuel',
        icon: '',
        description: 'Standard fuel tank for main rocket stages.',
        mass: 2000,
        cost: 3000000,
        width: 22,
        height: 35,
        fuelCapacity: 8000,
        dryMass: 800,
        attributes: { fuel: '8,000 L', type: 'Liquid Hydrogen/LOX' }
    },
    {
        id: 'fuel_large',
        name: 'Large Fuel Tank',
        category: 'fuel',
        icon: '',
        description: 'Heavy-lift fuel tank for first stages and boosters.',
        mass: 5000,
        cost: 8000000,
        width: 26,
        height: 50,
        fuelCapacity: 20000,
        dryMass: 2000,
        attributes: { fuel: '20,000 L', type: 'Liquid Hydrogen/LOX' }
    },
    {
        id: 'fuel_huge',
        name: 'Super Heavy Tank',
        category: 'fuel',
        icon: '',
        description: 'Massive fuel tank for heavy-lift launch vehicles.',
        mass: 12000,
        cost: 15000000,
        width: 30,
        height: 70,
        fuelCapacity: 50000,
        dryMass: 5000,
        attributes: { fuel: '50,000 L', type: 'Liquid Hydrogen/LOX' }
    },
    {
        id: 'fuel_rcs',
        name: 'RCS Fuel Tank',
        category: 'fuel',
        icon: '',
        description: 'Small monopropellant tank for reaction control system.',
        mass: 100,
        cost: 500000,
        width: 10,
        height: 12,
        fuelCapacity: 300,
        dryMass: 50,
        attributes: { fuel: '300 L', type: 'Hydrazine' }
    },

    // === ENGINES ===
    {
        id: 'engine_small',
        name: 'Merlin Lite',
        category: 'engine',
        icon: '',
        description: 'Efficient upper stage engine with good specific impulse.',
        mass: 470,
        cost: 5000000,
        width: 14,
        height: 16,
        thrust: 350000,     // 350 kN
        isp: 311,            // seconds
        fuelRate: 115,       // kg/s
        powerUse: 10,
        attributes: { thrust: '350 kN', Isp: '311 s', type: 'Liquid' }
    },
    {
        id: 'engine_medium',
        name: 'RS-25',
        category: 'engine',
        icon: '',
        description: 'High-performance main engine. Space Shuttle heritage.',
        mass: 3177,
        cost: 25000000,
        width: 20,
        height: 22,
        thrust: 2090000,    // 2090 kN
        isp: 366,
        fuelRate: 583,
        powerUse: 20,
        attributes: { thrust: '2,090 kN', Isp: '366 s', type: 'Liquid' }
    },
    {
        id: 'engine_large',
        name: 'F-1 Engine',
        category: 'engine',
        icon: '',
        description: 'Massive first-stage engine. Saturn V heritage. Enormous thrust.',
        mass: 8400,
        cost: 40000000,
        width: 26,
        height: 28,
        thrust: 6770000,    // 6770 kN
        isp: 263,
        fuelRate: 2627,
        powerUse: 25,
        attributes: { thrust: '6,770 kN', Isp: '263 s', type: 'Liquid' }
    },
    {
        id: 'engine_vacuum',
        name: 'RL-10 Vacuum',
        category: 'engine',
        icon: '',
        description: 'High-efficiency vacuum engine. Optimal for space maneuvers.',
        mass: 277,
        cost: 12000000,
        width: 16,
        height: 18,
        thrust: 110000,
        isp: 465,
        fuelRate: 24,
        powerUse: 8,
        attributes: { thrust: '110 kN', Isp: '465 s', type: 'Cryogenic' }
    },
    {
        id: 'engine_ion',
        name: 'Ion Thruster',
        category: 'engine',
        icon: '',
        description: 'Ultra-efficient electric propulsion. Very low thrust but extreme Isp.',
        mass: 50,
        cost: 20000000,
        width: 10,
        height: 12,
        thrust: 1,           // Very low
        isp: 3100,
        fuelRate: 0.001,
        powerUse: 2000,
        attributes: { thrust: '0.001 kN', Isp: '3,100 s', type: 'Electric' }
    },

    // === BOOSTERS ===
    {
        id: 'booster_srb_s',
        name: 'Small SRB',
        category: 'booster',
        icon: '',
        description: 'Small solid rocket booster for additional liftoff thrust.',
        mass: 3000,
        cost: 4000000,
        width: 12,
        height: 40,
        thrust: 1500000,
        isp: 242,
        fuelCapacity: 2500,
        dryMass: 500,
        burnTime: 30,
        fuelRate: 83,
        attributes: { thrust: '1,500 kN', burnTime: '30 s', type: 'Solid' }
    },
    {
        id: 'booster_srb_l',
        name: 'Large SRB',
        category: 'booster',
        icon: '',
        description: 'Heavy solid rocket booster. Space Shuttle SRB class.',
        mass: 12000,
        cost: 12000000,
        width: 16,
        height: 60,
        thrust: 5000000,
        isp: 242,
        fuelCapacity: 10000,
        dryMass: 2000,
        burnTime: 60,
        fuelRate: 167,
        attributes: { thrust: '5,000 kN', burnTime: '60 s', type: 'Solid' }
    },

    // === UTILITY ===
    {
        id: 'solar_panel',
        name: 'Solar Panel Array',
        category: 'utility',
        icon: '',
        type: 'solar_panel',
        description: 'Deployable solar panels for electrical power generation.',
        mass: 80,
        cost: 2000000,
        width: 14,
        height: 10,
        powerGen: 500,
        powerUse: 0,
        attributes: { power: '500 W', type: 'Photovoltaic' }
    },
    {
        id: 'solar_panel_large',
        name: 'Large Solar Array',
        category: 'utility',
        icon: '',
        type: 'solar_panel',
        description: 'High-output solar panel array for power-hungry missions.',
        mass: 200,
        cost: 5000000,
        width: 18,
        height: 12,
        powerGen: 2000,
        powerUse: 0,
        attributes: { power: '2,000 W', type: 'Photovoltaic' }
    },
    {
        id: 'battery',
        name: 'Battery Pack',
        category: 'utility',
        icon: '',
        description: 'Lithium-ion battery for power storage.',
        mass: 50,
        cost: 500000,
        width: 10,
        height: 8,
        powerStorage: 1000,
        powerUse: 0,
        attributes: { storage: '1,000 Wh', type: 'Li-Ion' }
    },
    {
        id: 'reaction_wheel',
        name: 'Reaction Wheel',
        category: 'utility',
        icon: '',
        description: 'Attitude control system for precise spacecraft orientation.',
        mass: 30,
        cost: 1000000,
        width: 10,
        height: 8,
        powerUse: 25,
        rotationBonus: 1.5,
        attributes: { torque: '15 Nm', type: 'CMG' }
    },
    {
        id: 'rcs_thruster',
        name: 'RCS Thruster Block',
        category: 'utility',
        icon: '',
        description: 'Reaction control thrusters for fine attitude adjustments.',
        mass: 20,
        cost: 800000,
        width: 8,
        height: 8,
        powerUse: 10,
        rotationBonus: 2.0,
        attributes: { thrust: '1 kN', type: 'Monopropellant' }
    },
    {
        id: 'computer',
        name: 'Flight Computer',
        category: 'utility',
        icon: '',
        description: 'Onboard guidance and navigation computer.',
        mass: 25,
        cost: 3000000,
        width: 10,
        height: 8,
        powerUse: 40,
        attributes: { type: 'Digital', guidance: 'Inertial + GPS' }
    },
    {
        id: 'landing_legs',
        name: 'Landing Legs',
        category: 'utility',
        icon: '',
        description: 'Deployable landing legs for surface operations.',
        mass: 150,
        cost: 1500000,
        width: 22,
        height: 12,
        powerUse: 5,
        providesLanding: true,
        attributes: { type: 'Deployable', maxLoad: '5,000 kg' }
    },

    // === SCIENCE ===
    {
        id: 'sci_camera',
        name: 'Science Camera',
        category: 'science',
        icon: '',
        description: 'High-resolution imaging system for observation and mapping.',
        mass: 30,
        cost: 4000000,
        width: 10,
        height: 10,
        powerUse: 35,
        scienceValue: 15,
        attributes: { resolution: '0.5 m/px', spectrum: 'Visible + IR' }
    },
    {
        id: 'sci_spectrometer',
        name: 'Spectrometer',
        category: 'science',
        icon: '',
        description: 'Measures chemical composition of surfaces and atmospheres.',
        mass: 25,
        cost: 6000000,
        width: 10,
        height: 10,
        powerUse: 45,
        scienceValue: 25,
        attributes: { type: 'Mass Spectrometer', range: 'UV to IR' }
    },
    {
        id: 'sci_magnetometer',
        name: 'Magnetometer',
        category: 'science',
        icon: '',
        description: 'Measures magnetic fields around planets and moons.',
        mass: 10,
        cost: 2000000,
        width: 8,
        height: 8,
        powerUse: 15,
        scienceValue: 10,
        attributes: { sensitivity: '0.01 nT', type: 'Fluxgate' }
    },
    {
        id: 'sci_radar',
        name: 'Ground Penetrating Radar',
        category: 'science',
        icon: '',
        description: 'Subsurface radar for geological surveys.',
        mass: 40,
        cost: 8000000,
        width: 12,
        height: 10,
        powerUse: 60,
        scienceValue: 30,
        attributes: { depth: '100 m', frequency: '100 MHz' }
    },
    {
        id: 'sci_thermometer',
        name: 'Thermal Sensor Suite',
        category: 'science',
        icon: '',
        description: 'Temperature measurement and thermal mapping.',
        mass: 15,
        cost: 1500000,
        width: 8,
        height: 8,
        powerUse: 20,
        scienceValue: 8,
        attributes: { range: '-270°C to 500°C', accuracy: '±0.1°C' }
    },

    // === PAYLOAD ===
    {
        id: 'antenna',
        name: 'Omni Antenna',
        category: 'payload',
        icon: '',
        type: 'antenna',
        description: 'Omnidirectional antenna for short-range communication.',
        mass: 5,
        cost: 500000,
        width: 8,
        height: 14,
        powerUse: 10,
        commRange: 500000,
        attributes: { range: '500,000 km', type: 'Omnidirectional' }
    },
    {
        id: 'dish_antenna',
        name: 'High-Gain Dish',
        category: 'payload',
        icon: '',
        type: 'dish_antenna',
        description: 'High-gain parabolic antenna for deep-space communication.',
        mass: 50,
        cost: 5000000,
        width: 18,
        height: 16,
        powerUse: 40,
        commRange: 5000000000,
        attributes: { range: '5 billion km', type: 'Parabolic', band: 'X-Band' }
    },
    {
        id: 'satellite_bus',
        name: 'Satellite Bus',
        category: 'payload',
        icon: '',
        description: 'Standard satellite platform with integrated systems.',
        mass: 300,
        cost: 15000000,
        width: 16,
        height: 14,
        powerUse: 60,
        powerGen: 200,
        scienceValue: 5,
        attributes: { type: 'Standard Bus', lifespan: '15 years' }
    },
    {
        id: 'rover',
        name: 'Surface Rover',
        category: 'payload',
        icon: '',
        description: 'Mobile exploration rover with science instruments.',
        mass: 900,
        cost: 50000000,
        width: 18,
        height: 14,
        powerUse: 100,
        powerGen: 150,
        scienceValue: 50,
        attributes: { type: 'Mobile Rover', speed: '0.14 km/h', instruments: 7 }
    },
    {
        id: 'lander',
        name: 'Lunar Lander',
        category: 'payload',
        icon: '',
        description: 'Dedicated landing vehicle for surface operations.',
        mass: 2000,
        cost: 30000000,
        width: 22,
        height: 20,
        powerUse: 80,
        thrust: 45000,
        isp: 311,
        fuelCapacity: 1000,
        dryMass: 1500,
        fuelRate: 15,
        providesLanding: true,
        attributes: { type: 'Landing Module', thrust: '45 kN' }
    },

    // === NASA SLS BLOCK 1 / ORION (Artemis) — values from NASA SLS Reference Guide / fact sheets unless marked (approx.) ===
    {
        id: 'sls_core', name: 'SLS Core Stage', category: 'fuel', icon: '',
        description: 'NASA SLS core stage: 64.6 m tall, 8.4 m diameter, 988 t of LH2/LOX (NASA). Dry mass approximated from NASA fueled mass.',
        mass: 1088000, cost: 500000000, width: 44, height: 340, fuelCapacity: 988000, dryMass: 100000,
        attributes: { propellant: '988 t LH2/LOX', height: '64.6 m', diameter: '8.4 m' }
    },
    {
        id: 'sls_rs25', name: 'RS-25 x4 Engine Section', category: 'engine', icon: '',
        description: 'Four RS-25 engines (NASA: ~8,896 kN core max thrust, 480 s burn). Isp is an effective average of sea-level 366 s and vacuum 452 s (approx.).',
        mass: 14000, cost: 400000000, width: 40, height: 22, thrust: 8896000, isp: 441, fuelRate: 2058, powerUse: 0,
        attributes: { thrust: '8,896 kN (4 engines)', Isp: '~441 s eff.', type: 'LH2/LOX staged combustion' }
    },
    {
        id: 'sls_srb', name: 'Five-Segment SRB', category: 'booster', icon: '',
        description: 'SLS solid rocket booster: 54.1 m, 3.7 m dia, 726 t filled (NASA). Average thrust/Isp/propellant mass approximated; burns ~126 s then separates.',
        mass: 726000, cost: 100000000, width: 19, height: 285, thrust: 13190000, isp: 269, fuelCapacity: 630000, dryMass: 96000, burnTime: 126, fuelRate: 5000,
        attributes: { thrust: '~13,190 kN avg (approx.)', burnTime: '126 s', type: 'Solid PBAN/AP/Al' }
    },
    {
        id: 'sls_lvsa', name: 'Launch Vehicle Stage Adapter', category: 'structural', icon: '',
        description: 'Cone-shaped adapter joining the 8.4 m core stage to the 5.1 m ICPS. Mass approximated.',
        mass: 9000, cost: 20000000, width: 44, height: 36, attributes: { type: 'Adapter' }
    },
    {
        id: 'sls_icps', name: 'ICPS Propellant Stage', category: 'fuel', icon: '',
        description: 'Interim Cryogenic Propulsion Stage tankage: 13.7 m x 5.1 m, 32.7 t fueled / 3.7 t unfueled (NASA). Uses one RL10 engine.',
        mass: 32700, cost: 150000000, width: 27, height: 72, fuelCapacity: 29000, dryMass: 3700,
        attributes: { propellant: '29 t LH2/LOX', height: '13.7 m', diameter: '5.1 m' }
    },
    {
        id: 'sls_orion', name: 'Orion Crew Vehicle', category: 'command', icon: '',
        description: 'Orion crew module + European Service Module, 4 astronauts. Mass approximated (~26.5 t). Orion is NOT a lunar lander.',
        mass: 26500, cost: 1000000000, width: 27, height: 34, crew: 4, powerUse: 400, powerGen: 11000, heatShield: true,
        attributes: { crew: 4, heatShield: 'Avcoat ablative', type: 'Crew vehicle' }
    },
    {
        id: 'sls_las', name: 'Launch Abort System', category: 'structural', icon: '',
        description: 'Tower with abort motors protecting Orion on ascent. Mass approximated; jettisoned with the first stage in this simulation.',
        mass: 7300, cost: 50000000, width: 12, height: 46, attributes: { type: 'Abort tower' }
    },
    {
        id: 'hls_lander', name: 'Artemis-style Lunar Lander', category: 'payload', icon: '',
        description: 'Simplified lunar surface lander inspired by NASA Artemis Human Landing System requirements: descent engine, 4 landing legs, tanks, solar panels, antenna, science package. Not an exact NASA design.',
        mass: 14000, cost: 900000000, width: 36, height: 44, powerUse: 300, powerGen: 2000, scienceValue: 80,
        thrust: 180000, isp: 360, fuelCapacity: 9000, dryMass: 5000, fuelRate: 51, providesLanding: true,
        attributes: { type: 'Lunar Lander', thrust: '180 kN (approx.)', legs: 4 }
    },
    {
        id: 'hls_descent', name: 'Lander Descent Engine', category: 'engine', icon: '',
        description: 'Throttle-capable hypergolic-class descent engine for the lander (approx. 180 kN, Isp 360 s; game values, not an exact NASA engine).',
        mass: 700, cost: 40000000, width: 18, height: 14, thrust: 180000, isp: 360, fuelRate: 51, powerUse: 5,
        attributes: { thrust: '180 kN (approx.)', Isp: '360 s' }
    }
];

// Parts accessor
const Parts = {
    getAll() { return PARTS_CATALOG; },
    getById(id) { return PARTS_CATALOG.find(p => p.id === id); },
    getByCategory(cat) { 
        if (cat === 'all') return PARTS_CATALOG;
        return PARTS_CATALOG.filter(p => p.category === cat); 
    },
    search(query) {
        const q = query.toLowerCase();
        return PARTS_CATALOG.filter(p => 
            p.name.toLowerCase().includes(q) || 
            p.description.toLowerCase().includes(q)
        );
    }
};

