// js/settings/SettingsManager.js - Refactored
// Manages application settings logic, decoupled from the DOM.

export class SettingsManager {
    constructor(geminiService, categoryManager) {
        if (!geminiService || !categoryManager) {
            throw new Error("SettingsManager requires both GeminiService and CategoryManager.");
        }
        this.geminiService = geminiService;
        this.categoryManager = categoryManager;
        this.uiManager = null; // To be set by UIManager
    }

    init(uiManager) {
        this.uiManager = uiManager;
    }

    // This method is now in UIManager, which calls this class's methods
    addSettingsButton() {
        // This logic is now owned by UIManager to prevent this service
        // from directly manipulating the DOM.
    }

    open() {
        if (this.uiManager) {
            this.uiManager.renderSettingsModal(); // UIManager handles rendering
            // Any logic to load data for the modal would go here.
        } else {
            console.error("UIManager not initialized in SettingsManager.");
        }
    }

    saveGeminiKey(key) {
        if (!key || key.trim() === '' || key.includes('•')) {
            this.uiManager?.showNotification('Please enter a valid, full API key.', 'error');
            return false;
        }
        this.geminiService.setApiKey(key.trim());
        this.uiManager?.showNotification('API key saved successfully!', 'success');
        return true;
    }

    async testGeminiKey() {
        const apiKey = this.geminiService.getApiKey();
        if (!apiKey) {
            this.uiManager?.showNotification('Please save an API key first.', 'error');
            return;
        }

        this.uiManager?.showNotification('Testing API connection...', 'info');
        try {
            const isConnected = await this.geminiService.testConnection();
            if (isConnected) {
                this.uiManager?.showNotification('Gemini API connection successful!', 'success');
            } else {
                // The service itself should throw a more specific error
                this.uiManager?.showNotification('API test failed. Check the console for details.', 'error');
            }
        } catch (error) {
            this.uiManager?.showNotification(`API test failed: ${error.message}`, 'error');
        }
    }

    exportData() {
        try {
            const dataToExport = {
                version: '2.0',
                exportDate: new Date().toISOString(),
                categories: this.categoryManager.categories,
                // We intentionally do not export API keys for security.
            };
            const dataStr = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `finance-data-export-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.uiManager?.showNotification('Data exported successfully!', 'success');
        } catch (error) {
            this.uiManager?.showNotification(`Export failed: ${error.message}`, 'error');
        }
    }
}
