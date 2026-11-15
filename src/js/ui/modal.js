// ==========================================
// Modal Dialog System
// ==========================================

const Modal = {
    overlay: null,
    content: null,

    init() {
        this.overlay = document.getElementById('modal-overlay');
        this.content = document.getElementById('modal-content');
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.hide();
            });
        }
    },

    show({ title = 'Alert', content = '', buttons = [] }) {
        if (!this.overlay || !this.content) this.init();
        if (!this.overlay || !this.content) return;

        let buttonsHtml = '';
        if (buttons.length > 0) {
            buttonsHtml = `<div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px;">`;
            buttons.forEach((btn, idx) => {
                const btnClass = btn.primary ? 'menu-btn primary' : 'menu-btn';
                buttonsHtml += `<button class="${btnClass}" id="modal-btn-${idx}" style="padding: 8px 18px; font-size: 0.9rem;">${btn.text}</button>`;
            });
            buttonsHtml += `</div>`;
        }

        this.content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 16px;">
                <h3 style="font-family: var(--font-display); color: var(--accent-cyan); font-size: 1.1rem; letter-spacing: 1px;">${title}</h3>
                <button class="btn-close" id="modal-btn-close" style="width: 28px; height: 28px; font-size: 0.9rem;">✕</button>
            </div>
            <div style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6;">
                ${content}
            </div>
            ${buttonsHtml}
        `;

        // Wire close button
        const closeBtn = document.getElementById('modal-btn-close');
        if (closeBtn) closeBtn.onclick = () => this.hide();

        // Wire custom buttons
        buttons.forEach((btn, idx) => {
            const el = document.getElementById(`modal-btn-${idx}`);
            if (el) {
                el.onclick = () => {
                    if (btn.onClick) btn.onClick();
                    this.hide();
                };
            }
        });

        this.overlay.classList.remove('hidden');
    },

    hide() {
        if (this.overlay) {
            this.overlay.classList.add('hidden');
        }
    }
};

