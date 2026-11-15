// ==========================================
// Local Leaderboard System
// ==========================================

const Leaderboard = {
    initialized: false,
    entries: [],

    init() {
        this.entries = Utils.loadData('leaderboard_entries') || this.getDefaultEntries();

        if (!this.initialized) {
            document.getElementById('btn-back-leaderboard')?.addEventListener('click', () => {
                Utils.showScreen('menu-screen');
            });
            this.initialized = true;
        }

        this.render();
    },

    getDefaultEntries() {
        return [
            { mission: 'Earth Observation Satellite', difficulty: 'beginner', score: 9540, status: 'SUCCESS', date: '2026-10-12', commander: 'Abhinav R Kurup' },
            { mission: 'Moon Landing', difficulty: 'intermediate', score: 9280, status: 'SUCCESS', date: '2026-10-13', commander: 'Sooraj DS' },
            { mission: 'Satellite Deployment', difficulty: 'beginner', score: 8850, status: 'SUCCESS', date: '2026-10-14', commander: 'Gopika' },
            { mission: 'Mars Rover Exploration', difficulty: 'advanced', score: 8640, status: 'SUCCESS', date: '2026-10-15', commander: 'Krishnaveni' },
            { mission: 'Deep Space Exploration', difficulty: 'advanced', score: 8120, status: 'SUCCESS', date: '2026-10-15', commander: 'Athira Raj' }
        ];
    },

    addEntry(entry) {
        if (!this.entries || this.entries.length === 0) {
            this.entries = Utils.loadData('leaderboard_entries') || this.getDefaultEntries();
        }
        this.entries.unshift({
            ...entry,
            commander: entry.commander || 'Player One',
            id: Utils.uid()
        });
        // Sort by score descending
        this.entries.sort((a, b) => b.score - a.score);
        if (this.entries.length > 30) this.entries.pop();
        Utils.saveData('leaderboard_entries', this.entries);
    },

    render() {
        const container = document.getElementById('leaderboard-content');
        if (!container) return;

        let rowsHtml = '';
        this.entries.forEach((entry, idx) => {
            const medal = idx === 0 ? ' ' : (idx === 1 ? ' ' : (idx === 2 ? ' ' : ''));
            rowsHtml += `
                <tr>
                    <td style="color: var(--accent-cyan); font-weight: bold;">${medal}#${idx + 1}</td>
                    <td>${entry.commander || 'Commander'}</td>
                    <td>${entry.mission}</td>
                    <td><span class="diff-btn" style="padding: 2px 8px; font-size: 0.65rem;">${entry.difficulty.toUpperCase()}</span></td>
                    <td style="color: var(--accent-green); font-weight: bold;">${entry.score}</td>
                    <td><span style="color: ${entry.status === 'SUCCESS' ? 'var(--accent-green)' : 'var(--accent-yellow)'};">${entry.status}</span></td>
                    <td style="color: var(--text-muted);">${entry.date}</td>
                </tr>
            `;
        });

        container.innerHTML = `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; overflow-x: auto;">
                <table class="leaderboard-table">
                    <thead>
                        <tr>
                            <th>RANK</th>
                            <th>COMMANDER</th>
                            <th>MISSION</th>
                            <th>DIFFICULTY</th>
                            <th>SCORE</th>
                            <th>STATUS</th>
                            <th>DATE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
                <button class="btn-sm" id="btn-clear-scores" style="color: var(--accent-red); border-color: rgba(239,68,68,0.4);">Reset Scores</button>
            </div>
        `;

        document.getElementById('btn-clear-scores')?.addEventListener('click', () => {
            Modal.show({
                title: 'Reset Leaderboard',
                content: 'Reset leaderboard scores to default entries?',
                buttons: [
                    { text: 'Cancel' },
                    {
                        text: 'Reset', primary: true, onClick: () => {
                            this.entries = this.getDefaultEntries();
                            Utils.saveData('leaderboard_entries', this.entries);
                            this.render();
                            Toast.show('Leaderboards reset', 'info');
                        }
                    }
                ]
            });
        });
    }
};

