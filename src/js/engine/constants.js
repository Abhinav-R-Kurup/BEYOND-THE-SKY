// ==========================================
// FLY BEYOND SKY - Constants
// An INCREDIBLES Production
// ==========================================

const CONSTANTS = {
    // Physics
    G: 6.674e-11,                    // Gravitational constant
    SCALE: 1e-4,                     // Meters to pixels
    TIME_STEP: 1/60,                 // Physics timestep
    EARTH_MASS: 5.972e24,            // kg
    EARTH_RADIUS: 6.371e6,           // meters
    EARTH_SURFACE_GRAVITY: 9.807,    // m/s^2
    MOON_MASS: 7.342e22,
    MOON_RADIUS: 1.737e6,
    MOON_DISTANCE: 3.844e8,          // meters from Earth
    MARS_MASS: 6.417e23,
    MARS_RADIUS: 3.3895e6,
    KARMAN_LINE: 100000,             // meters (100km)
    LEO_ALTITUDE: 400000,            // meters (400km)
    GEO_ALTITUDE: 35786000,          // meters
    ATM_HEIGHT: 100000,              // meters atmospheric height

    // Simulation scale (simplified for gameplay)
    SIM_SCALE: 0.00001,              // Scale factor for rendering
    PIXELS_PER_KM: 0.5,             // Rendering scale
    
    // Game scale factors (these make gameplay feel right)
    GRAVITY_SCALE: 9.807,            // Surface gravity in sim units
    THRUST_SCALE: 1.0,
    DRAG_COEFFICIENT: 0.5,
    
    // Rendering
    STAR_COUNT: 300,
    PARTICLE_MAX: 500,
    
    // Budget
    DEFAULT_BUDGET: 500000000,       // $500M
    
    // Time warp multipliers
    TIME_WARPS: [0.25, 1, 5, 20],
    
    // Colors
    COLORS: {
        space: '#0a0e17',
        earth: '#1a6bc4',
        earthAtm: 'rgba(100, 180, 255, 0.15)',
        moon: '#c0c0c0',
        mars: '#c1440e',
        sun: '#ffd700',
        trajectory: 'rgba(6, 182, 212, 0.6)',
        orbit: 'rgba(59, 130, 246, 0.4)',
        thrust: '#ff6b35',
        explosion: '#ff4444',
        exhaust: '#ffaa33',
    },
    
    // Part categories
    CATEGORIES: {
        command: { name: 'Command', icon: '', color: '#06b6d4' },
        structural: { name: 'Structure', icon: '', color: '#64748b' },
        fuel: { name: 'Fuel Tanks', icon: '', color: '#f97316' },
        engine: { name: 'Engines', icon: '', color: '#ef4444' },
        booster: { name: 'Boosters', icon: '', color: '#dc2626' },
        utility: { name: 'Utility', icon: '', color: '#eab308' },
        science: { name: 'Science', icon: '', color: '#a855f7' },
        payload: { name: 'Payload', icon: '', color: '#22c55e' },
    }
};

