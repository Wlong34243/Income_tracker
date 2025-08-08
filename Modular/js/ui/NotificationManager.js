// js/ui/NotificationManager.js
// Global notification system for the application

export class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.init();
    }

    init() {
        // Create notification container
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 3000) {
        const id = Date.now().toString();
        const notification = {
            id,
            message,
            type,
            duration
        };

        this.notifications.push(notification);
        this.render(notification);

        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }

        return id;
    }

    render(notification) {
        const colors = {
            success: {
                bg: 'bg-green-500',
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>`
            },
            error: {
                bg: 'bg-red-500',
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>`
            },
            warning: {
                bg: 'bg-yellow-500',
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>`
            },
            info: {
                bg: 'bg-blue-500',
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>`
            }
        };

        const config = colors[notification.type] || colors.info;

        const element = document.createElement('div');
        element.id = `notification-${notification.id}`;
        element.className = `${config.bg} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 transform transition-all duration-300 translate-x-0 opacity-100`;
        element.innerHTML = `
            <div class="flex-shrink-0">${config.icon}</div>
            <div class="flex-1">${notification.message}</div>
            <button onclick="notificationManager.remove('${notification.id}')" class="flex-shrink-0 hover:opacity-75">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        `;

        // Add entrance animation
        element.style.animation = 'slideInRight 0.3s ease-out';

        this.container.appendChild(element);
    }

    remove(id) {
        const element = document.getElementById(`notification-${id}`);
        if (element) {
            // Add exit animation
            element.style.animation = 'slideOutRight 0.3s ease-out';
            element.style.animationFillMode = 'forwards';
            
            setTimeout(() => {
                element.remove();
                this.notifications = this.notifications.filter(n => n.id !== id);
            }, 300);
        }
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    clear() {
        this.notifications.forEach(n => this.remove(n.id));
    }
}

// Create singleton instance
export const notificationManager = new NotificationManager();
window.notificationManager = notificationManager;

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);