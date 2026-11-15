// ==========================================
// Mission Report Debriefing
// ==========================================

const MissionReport = {
    initialized: false,

    init() {
        if (!this.initialized) {
            this.bindEvents();
            this.initialized = true;
        }
    },

    bindEvents() {
        document.getElementById('btn-retry-mission')?.addEventListener('click', () => {
            Utils.showScreen('builder-screen');
            if (typeof Builder !== 'undefined') Builder.init();
        });

        document.getElementById('btn-new-mission-report')?.addEventListener('click', () => {
            Utils.showScreen('mission-select-screen');
            if (typeof MissionSelect !== 'undefined') MissionSelect.init();
        });

        document.getElementById('btn-main-menu')?.addEventListener('click', () => {
            Utils.showScreen('menu-screen');
            if (typeof Menu !== 'undefined') Menu.init();
        });
    },

    show(report) {
        this.init();

        const statusBadge = document.getElementById('report-status');
        if (statusBadge) {
            statusBadge.innerText = report.status;
            statusBadge.className = `report-badge ${report.status.toLowerCase()}`;
        }

        const container = document.getElementById('report-content');
        if (!container) return;

        let objectivesHtml = '';
        if (report.objectives) {
            Object.values(report.objectives).forEach(obj => {
                objectivesHtml += `
                    <div class="objective-result">
                        <span class="obj-status ${obj.completed ? 'pass' : 'fail'}">${obj.completed ? '✓' : '✕'}</span>
                        <span style="flex: 1; font-size: 0.85rem; color: ${obj.completed ? 'var(--text-primary)' : 'var(--text-muted)'};">${obj.text}</span>
                        <span style="font-size: 0.75rem; font-family: var(--font-mono); color: ${obj.completed ? 'var(--accent-green)' : 'var(--accent-red)'};">${obj.completed ? 'COMPLETED' : 'INCOMPLETE'}</span>
                    </div>
                `;
            });
        }

        container.innerHTML = `
            <div class="report-section report-score">
                <div class="score-value">${report.score}</div>
                <div class="score-label">MISSION PERFORMANCE RATING</div>
            </div>

            <div class="report-section">
                <h3>MISSION TELEMETRY</h3>
                <div class="report-stat"><span>Mission</span><span>${report.missionName}</span></div>
                <div class="report-stat"><span>Difficulty Tier</span><span>${report.difficulty.toUpperCase()}</span></div>
                <div class="report-stat"><span>Flight Duration</span><span>${Utils.formatTime(report.duration)}</span></div>
                <div class="report-stat"><span>Peak Altitude</span><span>${Utils.formatDistance(report.maxAltitude)}</span></div>
                <div class="report-stat"><span>Max Velocity</span><span>${Utils.formatVelocity(report.maxVelocity)}</span></div>
                <div class="report-stat"><span>Budget Spent</span><span>${Utils.formatMoney(report.cost)} / ${Utils.formatMoney(report.budget)}</span></div>
                <div class="report-stat"><span>Science Points Earned</span><span>+${report.scienceValue}</span></div>
                ${report.failureReason ? `<div class="report-stat" style="color: var(--accent-red);"><span>Incident Report</span><span>${report.failureReason}</span></div>` : ''}
            </div>

            <div class="report-section report-objectives">
                <h3>MISSION OBJECTIVES (${report.completedObjectives} / ${report.totalObjectives})</h3>
                ${objectivesHtml}
            </div>

            ${report.nasaRef ? `
            <div class="report-section" style="border-left: 3px solid var(--accent-cyan);">
                <h3 style="color: var(--accent-cyan);"> NASA SCIENTIFIC CONTEXT</h3>
                <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">${report.nasaRef}</p>
            </div>
            ` : ''}
        `;
    }
};

