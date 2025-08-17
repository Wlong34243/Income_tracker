export class ErrorBoundary {
    static init() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error caught:', event.error);
            this.handleError(event.error);
            event.preventDefault();
        });

        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleError(event.reason);
            event.preventDefault();
        });
    }

    static handleError(error) {
        // Log to console with full stack
        console.group('🔴 Error Details');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        console.groupEnd();

        // Show user-friendly notification
        if (window.app?.uiManager) {
            const message = this.getUserMessage(error);
            window.app.uiManager.showNotification(message, 'error');
        }

        // Auto-attempt recovery for known issues
        this.attemptRecovery(error);
    }

    static getUserMessage(error) {
        const message = error.message?.toLowerCase() || '';

        if (message.includes('firebase')) {
            return 'Connection issue. Retrying...';
        }
        if (message.includes('date')) {
            return 'Date format issue detected. Run fix() in console.';
        }
        if (message.includes('category')) {
            return 'Category error. Rebuilding categories...';
        }

        return 'An error occurred. Check console for details.';
    }

    static attemptRecovery(error) {
        const message = error.message?.toLowerCase() || '';

        // Auto-fix date issues
        if (message.includes('invalid date') && window.devTools) {
            console.log('Auto-fixing date formats...');
            window.devTools.fixDateFormats();
        }

        // Reload on critical Firebase errors
        if (message.includes('firebase') && message.includes('auth')) {
            console.log('Auth error detected, reloading in 3 seconds...');
            setTimeout(() => location.reload(), 3000);
        }
    }
}
