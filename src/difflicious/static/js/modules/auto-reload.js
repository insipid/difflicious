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

        // Save current state and scroll position
        DiffState.saveState();
        const scrollY = window.scrollY;

        try {
            // Fetch the current page content
            const currentUrl = window.location.href;
            const response = await fetch(currentUrl, {
                headers: { 'Accept': 'text/html' }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Extract the main content area
            const newMain = doc.querySelector('main');
            const currentMain = document.querySelector('main');

            if (newMain && currentMain) {
                // Replace the content
                currentMain.innerHTML = newMain.innerHTML;

                // Re-initialize Alpine.js components for the new content
                if (window.Alpine) {
                    window.Alpine.initTree(currentMain);
                }

                // Restore scroll position
                window.scrollTo(0, scrollY);

                if (DEBUG) console.log('Content refreshed successfully');
            } else {
                // Fallback to full page reload if we can't find the content
                if (DEBUG) console.warn('Could not find main content, falling back to full reload');
                sessionStorage.setItem('difflicious-scroll-position', scrollY.toString());
                window.location.reload();
            }
        } catch (error) {
            console.error('Error refreshing content:', error);
            // Fallback to full page reload on error
            sessionStorage.setItem('difflicious-scroll-position', scrollY.toString());
            window.location.reload();
        }
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
                // Reconnect to SSE stream to resume monitoring
                this.init();
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
