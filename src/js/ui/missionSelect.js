// ==========================================
// Mission Select Screen
// ==========================================

const MissionSelect = {
    currentDifficulty: 'beginner',
    initialized: false,

    init() {
        if (!this.initialized) {
            this.bindEvents();
            this.initialized = true;
        }
        this.renderMissions();
    },

    bindEvents() {
        // Back to menu
        const backBtn = document.getElementById('btn-back-menu');
        if (backBtn) {
            backBtn.onclick = () => {
                if (typeof Audio !== 'undefined') Audio.play('click');
                Utils.showScreen('menu-screen');
            };
        }

        // Difficulty selector
        const diffBtns = document.querySelectorAll('.difficulty-selector .diff-btn');
        diffBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                diffBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentDifficulty = btn.dataset.diff;
                if (typeof Audio !== 'undefined') Audio.play('click');
                this.renderMissions();
            });
        });
    },

    renderMissions() {
        const container = document.getElementById('mission-cards-container');
        if (!container) return;

        container.innerHTML = '';

        const missions = Object.values(MISSION_DATA);

        missions.forEach(mission => {
            // Check difficulty eligibility
            const isAvailable = mission.difficulty[this.currentDifficulty] !== false;

            const card = document.createElement('div');
            card.className = `mission-card ${!isAvailable ? 'disabled' : ''}`;
            if (!isAvailable) {
                card.style.opacity = '0.4';
                card.style.filter = 'grayscale(1)';
                card.style.cursor = 'not-allowed';
            }

            const budgetVal = typeof mission.budget === 'object'
                ? (mission.budget[this.currentDifficulty] || mission.budget['beginner'] || 300000000)
                : mission.budget;

            card.innerHTML = `
                <div class="mission-card-icon">${mission.icon}</div>
                <div class="mission-card-title">${mission.name}</div>
                <div class="mission-card-desc">${mission.description}</div>
                <div class="mission-card-meta">
                    <span class="mission-meta-tag destination"> ${mission.destination}</span>
                    <span class="mission-meta-tag budget"> ${Utils.formatMoney(budgetVal)}</span>
                    <span class="mission-meta-tag"> +${mission.scienceReward} Science</span>
                </div>
            `;

            if (isAvailable) {
                card.addEventListener('mouseenter', () => {
                    if (typeof Audio !== 'undefined') Audio.play('hover');
                });

                card.addEventListener('click', () => {
                    if (typeof Audio !== 'undefined') Audio.play('click');
                    MissionMgr.startMission(mission.id, this.currentDifficulty);
                    Utils.showScreen('builder-screen');
                    if (typeof Builder !== 'undefined') {
                        Builder.init();
                    }
                    if (typeof Toast !== 'undefined') {
                        Toast.show(`Mission Selected: ${mission.name}`, 'info');
                    }
                });
            } else {
                card.addEventListener('click', () => {
                    if (typeof Toast !== 'undefined') {
                        Toast.show(`This mission requires higher difficulty tier!`, 'warning');
                    }
                });
            }

            container.appendChild(card);
        });
    }
};

