/**
 * Tests for auto-reload module
 */

import { AutoReload } from '../../src/difflicious/static/js/modules/auto-reload.js';

describe('AutoReload', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.body.dataset.autoReload = 'true';

        AutoReload.eventSource = null;
        AutoReload.enabled = true;
        AutoReload.reconnectAttempts = 0;

        global.EventSource = jest.fn(() => ({
            addEventListener: jest.fn(),
            close: jest.fn()
        }));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('skips init when auto-reload disabled', () => {
        document.body.dataset.autoReload = 'false';
        AutoReload.init();

        expect(global.EventSource).not.toHaveBeenCalled();
        expect(document.getElementById('auto-reload-indicator')).toBeNull();
    });

    it('adds status indicator and updates text', () => {
        AutoReload.addStatusIndicator();
        AutoReload.updateStatusIndicator('connected');

        const indicator = document.getElementById('auto-reload-indicator');
        expect(indicator).not.toBeNull();
        expect(indicator.querySelector('.connection-status').textContent).toContain('Auto-reload');
    });

    it('handleConnectionError schedules reconnect', () => {
        jest.useFakeTimers();
        AutoReload.connect = jest.fn();
        AutoReload.eventSource = { close: jest.fn() };

        AutoReload.handleConnectionError();

        jest.runOnlyPendingTimers();
        expect(AutoReload.connect).toHaveBeenCalled();
    });

    it('click toggles enabled state', async() => {
        AutoReload.handleFileChange = jest.fn().mockResolvedValue();
        AutoReload.addStatusIndicator();

        const indicator = document.getElementById('auto-reload-indicator');
        indicator.dispatchEvent(new Event('click'));

        await new Promise(resolve => setTimeout(resolve, 0));
        expect(AutoReload.enabled).toBe(false);

        indicator.dispatchEvent(new Event('click'));
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(AutoReload.enabled).toBe(true);
        expect(AutoReload.handleFileChange).toHaveBeenCalled();
    });
});
