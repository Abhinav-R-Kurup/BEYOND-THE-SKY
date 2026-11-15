// ==========================================
// FLY BEYOND SKY - Main Game Controller
// NASA Space Apps Challenge 2026
// An INCREDIBLES Production
// Team: Abhinav R Kurup, Sooraj DS, Gopika, Krishnaveni, Athira Raj
// ==========================================

const Game = {
    init() {
        console.log(`
%c======================================================
  FLY BEYOND SKY
  An INCREDIBLES Production
  NASA Space Apps Challenge 2026
======================================================`, 'color: #06b6d4; font-weight: bold;');

        // Initialize Global UI Components
        if (typeof Toast !== 'undefined') Toast.init();
        if (typeof Modal !== 'undefined') Modal.init();
        if (typeof Settings !== 'undefined') Settings.init();

        // Unlock Web Audio on first user gesture
        const unlockAudio = () => {
            if (typeof Audio !== 'undefined') Audio.init();
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('keydown', unlockAudio);
        };
        window.addEventListener('click', unlockAudio);
        window.addEventListener('keydown', unlockAudio);

        // Start Cinematic Intro
        if (typeof Intro !== 'undefined') {
            Intro.init();
        } else {
            Utils.showScreen('menu-screen');
            if (typeof Menu !== 'undefined') Menu.init();
        }
    }
};

// Boot when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    Game.init();
    // Optional Three.js visual layer (graceful fallback to the 2D game if unavailable)
    try { const g = document.createElement('script'); g.src = 'src/js/aaa/glue.js'; document.head.appendChild(g); } catch (e) {}
});

