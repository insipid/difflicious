/**
 * Auto-reload module for detecting file changes and refreshing the page
 * Uses Server-Sent Events (SSE) to receive file change notifications
 */

import { DiffState } from './state.js';

let DEBUG = false;

export function setDebug(value) {
    DEBUG = value;
}

export const AutoReload = {
    eventSource: null,
    enabled: true,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,

    init() {
        // Check environment variable
        const autoReloadEnabled = document.body.dataset.autoReload !== 'false';
        if (!autoReloadEnabled || !this.enabled) {
            if (DEBUG) console.log('Auto-reload disabled');
            return;
        }

        // Check if SSE is supported
        if (typeof EventSource === 'undefined') {
            console.warn('SSE not supported, auto-reload disabled');
            return;
        }

        // Only add indicator if it doesn't exist yet
        if (!document.getElementById('auto-reload-indicator')) {
            this.addStatusIndicator();
        }

        // Reset reconnection attempts when manually re-enabling
        this.reconnectAttempts = 0;

        this.connect();
    },

    connect() {
        if (DEBUG) console.log('Connecting to auto-reload stream...');

        this.updateStatusIndicator('connecting');
        this.eventSource = new EventSource('/api/watch');

        this.eventSource.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'connected') {
                if (DEBUG) console.log('Auto-reload connected');
                this.reconnectAttempts = 0;
                this.updateStatusIndicator('connected');
            } else if (data.type === 'change') {
                this.handleFileChange();
            }
        });

        this.eventSource.addEventListener('error', (error) => {
            console.error('SSE connection error:', error);
            this.updateStatusIndicator('error');
            this.handleConnectionError();
        });
    },

    async handleFileChange() {
        if (DEBUG) console.log('File change detected, refreshing...');

        // Save current state before reload
        DiffState.saveState();

        // Save scroll position
        const scrollY = window.scrollY;
        sessionStorage.setItem('difflicious-scroll-position', scrollY.toString());

        // Simple approach: full page reload
        // State will be restored via localStorage
        window.location.reload();
    },

    handleConnectionError() {
        this.eventSource?.close();

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

            if (DEBUG) console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(), delay);
        } else {
            console.error('Max reconnection attempts reached. Auto-reload disabled.');
        }
    },

    disconnect() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            if (DEBUG) console.log('Auto-reload disconnected');
        }
        this.updateStatusIndicator('disabled');
    },

    addStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'auto-reload-indicator';
        indicator.className = 'fixed bottom-4 right-4 px-2 py-1 text-xs rounded opacity-50 hover:opacity-100 transition-opacity';
        indicator.style.cssText = 'background: var(--surface-secondary); color: var(--text-secondary); pointer-events: auto; cursor: pointer; z-index: 1000;';
        indicator.innerHTML = '<span class="connection-status">🟡 Auto-reload</span>';
        indicator.title = 'Click to disable auto-reload';

        // Toggle on click
        indicator.addEventListener('click', () => {
            if (this.enabled) {
                this.disconnect();
                this.enabled = false;
                indicator.style.opacity = '0.3';
                indicator.title = 'Click to enable auto-reload';
            } else {
                this.enabled = true;
                indicator.style.opacity = '0.5';
                indicator.title = 'Click to disable auto-reload';
                // Reload page to catch any changes made while disabled
                this.handleFileChange();
            }
        });

        document.body.appendChild(indicator);
    },

    updateStatusIndicator(status) {
        const indicator = document.getElementById('auto-reload-indicator');
        if (!indicator) return;

        const statusText = indicator.querySelector('.connection-status');
        if (!statusText) return;

        const statusMessages = {
            'connected': '🟢 Auto-reload',
            'connecting': '🟡 Auto-reload',
            'error': '🔴 Auto-reload',
            'disabled': '⚫ Auto-reload'
        };

        statusText.textContent = statusMessages[status] || status;
    }
};
