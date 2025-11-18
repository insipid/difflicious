/**
 * Tests for groupComponent
 */

import { groupComponent } from '../../../src/difflicious/static/js/components/groupComponent.js';

describe('groupComponent', () => {
    let component;
    const groupKey = 'staged';
    let mockStore;

    beforeEach(() => {
        // Mock Alpine store
        mockStore = {
            isGroupExpanded: jest.fn((groupKey) => groupKey === 'staged'),
            toggleGroup: jest.fn()
        };

        global.window = global.window || {};
        global.window.Alpine = {
            store: jest.fn((name) => {
                if (name === 'diff') {
                    return mockStore;
                }
                return {};
            })
        };

        component = groupComponent(groupKey);
    });

    describe('initialization', () => {
        it('should create component with correct groupKey', () => {
            expect(component.groupKey).toBe(groupKey);
        });

        it('should have init method', () => {
            expect(typeof component.init).toBe('function');
        });
    });

    describe('computed properties', () => {
        it('should get isExpanded from store', () => {
            mockStore.isGroupExpanded = jest.fn(() => true);
            const comp = groupComponent('staged');
            expect(comp.isExpanded).toBe(true);
        });

        it('should return collapse icon when expanded', () => {
            mockStore.isGroupExpanded = jest.fn(() => true);
            const comp = groupComponent('staged');
            expect(comp.toggleIcon).toBe('▼');
        });

        it('should return expand icon when collapsed', () => {
            mockStore.isGroupExpanded = jest.fn(() => false);
            const comp = groupComponent('staged');
            expect(comp.toggleIcon).toBe('▶');
        });
    });

    describe('methods', () => {
        it('should toggle group through store', () => {
            const comp = groupComponent('unstaged');
            comp.toggle();

            expect(mockStore.toggleGroup).toHaveBeenCalledWith('unstaged');
        });
    });
});
