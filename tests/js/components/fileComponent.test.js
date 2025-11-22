/**
 * Tests for fileComponent
 */

import { fileComponent } from '../../../src/difflicious/static/js/components/fileComponent.js';

describe('fileComponent', () => {
    let component;
    const filePath = 'src/test.js';
    let mockStore;

    beforeEach(() => {
        // Mock Alpine store
        mockStore = {
            isFileExpanded: jest.fn((filePath) => filePath === 'test.js'),
            toggleFile: jest.fn()
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

        component = fileComponent(filePath);
    });

    describe('initialization', () => {
        it('should create component with correct filePath', () => {
            expect(component.filePath).toBe(filePath);
        });

        it('should have init method', () => {
            expect(typeof component.init).toBe('function');
        });
    });

    describe('computed properties', () => {
        it('should get isExpanded from store', () => {
            mockStore.isFileExpanded = jest.fn(() => true);
            const comp = fileComponent('test.js');
            expect(comp.isExpanded).toBe(true);
        });

        it('should return collapse icon when expanded', () => {
            mockStore.isFileExpanded = jest.fn(() => true);
            const comp = fileComponent('test.js');
            expect(comp.toggleIcon).toBe('▼');
        });

        it('should return expand icon when collapsed', () => {
            mockStore.isFileExpanded = jest.fn(() => false);
            const comp = fileComponent('test.js');
            expect(comp.toggleIcon).toBe('▶');
        });
    });

    describe('methods', () => {
        it('should toggle file through store', () => {
            const comp = fileComponent('test.js');
            comp.toggle();

            expect(mockStore.toggleFile).toHaveBeenCalledWith('test.js');
        });
    });
});
