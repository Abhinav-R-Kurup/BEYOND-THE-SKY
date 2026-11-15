// ==========================================
// Collaborative Team Planning Mode
// Roles: Commander, Engineer, Science, Comm
// ==========================================

const TeamMode = {
    initialized: false,
    team: {
        commander: 'Abhinav R Kurup',
        engineer: 'Sooraj DS',
        science: 'Gopika',
        comm: 'Krishnaveni'
    },

    roles: [
        {
            id: 'commander',
            title: 'MISSION COMMANDER',
            icon: '',
            defaultName: 'Abhinav R Kurup',
            desc: 'Responsible for overall mission flight profile, go/no-go launch decision, staging timing, and abort criteria.',
            checklist: [
                'Verify mission objectives and flight trajectory plan',
                'Monitor flight phases and staging sequence',
                'Final authority on abort protocols'
            ]
        },
        {
            id: 'engineer',
            title: 'LEAD ROCKET ENGINEER',
            icon: '',
            defaultName: 'Sooraj DS',
            desc: 'Designs the launch vehicle, calculates TWR and Delta-V, balances stages, and monitors propellant consumption and atmospheric heating.',
            checklist: [
                'Ensure liftoff TWR &gt; 1.3 for stable ascent',
                'Verify total &Delta;v meets mission requirements (&gt; 9,000 m/s for orbit)',
                'Confirm decouplers and staging are correctly wired'
            ]
        },
        {
            id: 'science',
            title: 'SCIENCE OFFICER',
            icon: '',
            defaultName: 'Gopika',
            desc: 'Selects scientific payloads, cameras, spectrometers, and magnetometers to maximize mission scientific return and research data.',
            checklist: [
                'Equip appropriate sensors for destination (LEO, Moon, Mars)',
                'Ensure power generation (solar/batteries) covers sensor draws',
                'Plan data collection sequence at orbital target'
            ]
        },
        {
            id: 'comm',
            title: 'COMMUNICATIONS OFFICER',
            icon: '',
            defaultName: 'Krishnaveni',
            desc: 'Verifies antenna ranges, dish azimuth alignment, telemetry downlink rates, and uninterrupted link to NASA Deep Space Network (DSN).',
            checklist: [
                'Verify antenna range exceeds maximum orbital altitude',
                'Confirm flight computer guidance systems are online',
                'Monitor telemetry downlink signal strength'
            ]
        }
    ],

    init() {
        if (!this.initialized) {
            document.getElementById('btn-back-team')?.addEventListener('click', () => {
                Utils.showScreen('menu-screen');
            });
            this.initialized = true;
        }

        this.render();
    },

    render() {
        const container = document.getElementById('team-setup-container');
        if (!container) return;

        let cardsHtml = '';
        this.roles.forEach(role => {
            const currentName = this.team[role.id] || role.defaultName;
            cardsHtml += `
                <div class="team-role-card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div class="team-role-title">${role.icon} ${role.title}</div>
                        <span style="font-size: 0.75rem; color: var(--accent-green); font-family: var(--font-mono);">READINESS: READY</span>
                    </div>
                    <div class="team-role-desc">${role.desc}</div>
                    <div style="margin-bottom: 12px;">
                        <label style="font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 4px;">Assigned Crew Member</label>
                        <input type="text" class="team-role-input" id="team-name-${role.id}" value="${currentName}">
                    </div>
                    <div style="background: rgba(15,23,42,0.6); padding: 10px; border-radius: 6px;">
                        <div style="font-size: 0.75rem; font-weight: bold; color: var(--accent-cyan); margin-bottom: 6px;">ROLE BRIEFING & CHECKLIST:</div>
                        <ul style="padding-left: 20px; font-size: 0.8rem; color: var(--text-secondary);">
                            ${role.checklist.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        });

        container.innerHTML = `
            <div style="margin-bottom: 24px; text-align: center;">
                <p style="color: var(--text-secondary); max-width: 600px; margin: 0 auto;">Assign team members to mission control roles. Collaborative teamwork ensures optimal rocket design, telemetry management, and successful objective completion.</p>
            </div>
            ${cardsHtml}
            <button class="team-start-btn" id="btn-team-launch"> PROCEED TO MISSION SELECTION</button>
        `;

        // Bind crew inputs
        this.roles.forEach(role => {
            document.getElementById(`team-name-${role.id}`)?.addEventListener('input', (e) => {
                this.team[role.id] = e.target.value;
            });
        });

        // Launch button
        document.getElementById('btn-team-launch')?.addEventListener('click', () => {
            if (typeof Audio !== 'undefined') Audio.play('click');
            Toast.show(`Flight Crew Ready! Commander: ${this.team.commander}`, 'success');
            Utils.showScreen('mission-select-screen');
            if (typeof MissionSelect !== 'undefined') MissionSelect.init();
        });
    }
};

