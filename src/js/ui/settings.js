// ==========================================
// Settings Manager
// ==========================================

const Settings = {
    initialized: false,
    config: {
        sound: true,
        volume: 0.5,
        particles: true,
        trajectory: true
    },

    init() {
        const saved = Utils.loadData('game_settings');
        if (saved) {
            this.config = { ...this.config, ...saved };
        }

        if (!this.initialized) {
            document.getElementById('btn-back-settings')?.addEventListener('click', () => {
                Utils.showScreen('menu-screen');
            });
            this.initialized = true;
        }

        this.applySettings();
        this.render();
    },

    applySettings() {
        if (typeof Audio !== 'undefined') {
            Audio.enabled = this.config.sound;
            Audio.volume = this.config.volume;
        }
    },

    save() {
        Utils.saveData('game_settings', this.config);
        this.applySettings();
    },

    render() {
        const container = document.getElementById('settings-content');
        if (!container) return;

        container.innerHTML = `
            <div class="settings-group">
                <h3>AUDIO & SOUND</h3>
                <div class="setting-item">
                    <div>
                        <div class="setting-label">Sound Effects</div>
                        <div class="setting-desc">Engine rumbles, staging explosions, and alerts</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="setting-sound" ${this.config.sound ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-item">
                    <div>
                        <div class="setting-label">Master Volume</div>
                        <div class="setting-desc">Audio playback intensity</div>
                    </div>
                    <input type="range" id="setting-volume" min="0" max="100" value="${Math.round(this.config.volume * 100)}" style="width: 140px;">
                </div>
            </div>

            <div class="settings-group">
                <h3>SIMULATION & VISUALS</h3>
                <div class="setting-item">
                    <div>
                        <div class="setting-label">Particle Effects</div>
                        <div class="setting-desc">Engine exhaust plumes and explosion sparks</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="setting-particles" ${this.config.particles ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>

                <div class="setting-item">
                    <div>
                        <div class="setting-label">Flight Trajectory Path</div>
                        <div class="setting-desc">Render orbital flight history trajectory line</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="setting-trajectory" ${this.config.trajectory ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>

            <div class="settings-group">
                <h3>DATA MANAGEMENT</h3>
                <div class="setting-item">
                    <div>
                        <div class="setting-label">Reset Game Data</div>
                        <div class="setting-desc">Clears saved rockets and mission history</div>
                    </div>
                    <button class="btn-sm" id="btn-reset-data" style="color: var(--accent-red); border-color: rgba(239,68,68,0.4);">Reset</button>
                </div>
            </div>
        `;

        // Bind events
        document.getElementById('setting-sound')?.addEventListener('change', (e) => {
            this.config.sound = e.target.checked;
            this.save();
        });

        document.getElementById('setting-volume')?.addEventListener('input', (e) => {
            this.config.volume = parseFloat(e.target.value) / 100;
            this.save();
        });

        document.getElementById('setting-particles')?.addEventListener('change', (e) => {
            this.config.particles = e.target.checked;
            this.save();
        });

        document.getElementById('setting-trajectory')?.addEventListener('change', (e) => {
            this.config.trajectory = e.target.checked;
            this.save();
        });

        document.getElementById('btn-reset-data')?.addEventListener('click', () => {
            Modal.show({
                title: 'Reset All Data',
                content: 'Are you sure you want to reset all saved spacecraft designs and mission records?',
                buttons: [
                    { text: 'Cancel' },
                    {
                        text: 'Clear All', primary: true, onClick: () => {
                            localStorage.removeItem('SMDS_saved_rockets');
                            localStorage.removeItem('SMDS_mission_history');
                            localStorage.removeItem('SMDS_autosave_rocket');
                            localStorage.removeItem('SMDS_autosave_rocket_v2');
                            Toast.show('All game data cleared', 'info');
                        }
                    }
                ]
            });
        });
    }
};

