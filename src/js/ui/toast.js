// ==========================================
// Toast Notification Manager
// ==========================================

const Toast = {
    container: null,

    init() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    show(message, type = 'info', duration = 3500) {
        if (!this.container) this.init();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✓',
            error: '',
            warning: '',
            info: 'ℹ'
        };

        const icon = icons[type] || 'ℹ';

        toast.innerHTML = `
            <span style="font-size: 1.2rem;">${icon}</span>
            <span style="flex: 1; font-size: 0.9rem;">${message}</span>
        `;

        this.container.appendChild(toast);

        // Sound effect if available
        if (typeof Audio !== 'undefined' && Audio.play) {
            if (type === 'error') Audio.play('alert');
            else if (type === 'success') Audio.play('success');
            else Audio.play('click');
        }

        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
};

