import { Runtime } from '../../core/runtime';
import { TestComponent, testIntent } from '../utils/test-component';
import { join } from 'path';
import { Request, Response } from 'express';

describe('Runtime', () => {
  let runtime: Runtime;
  let component: TestComponent;

  beforeEach(() => {
    runtime = new Runtime(join(__dirname, '../templates'));
    component = new TestComponent();
  });

  describe('Component Management', () => {
    it('should register and retrieve components', () => {
      runtime.registerComponent('test', component);
      
      const retrieved = runtime.getComponent('test');
      expect(retrieved).toBe(component);
    });

    it('should return undefined for unknown components', () => {
      const unknown = runtime.getComponent('unknown');
      expect(unknown).toBeUndefined();
    });

    it('should get all registered components', () => {
      runtime.registerComponent('test1', component);
      const component2 = new TestComponent();
      runtime.registerComponent('test2', component2);

      const components = runtime.getComponents();
      expect(components.size).toBe(2);
      expect(components.get('test1')).toBe(component);
      expect(components.get('test2')).toBe(component2);
    });
  });

  describe('Intent-based Component Lookup', () => {
    beforeEach(() => {
      runtime.registerComponent('test', component);
    });

    it('should find components by intent name', () => {
      const found = runtime.findComponentsByIntent({ name: 'test' });
      expect(found).toHaveLength(1);
      expect(found[0]).toBe(component);
    });

    it('should find components by capability', () => {
      const found = runtime.findComponentsByIntent({ capabilities: ['test'] });
      expect(found).toHaveLength(1);
      expect(found[0]).toBe(component);
    });

    it('should return empty array when no matches found', () => {
      const found = runtime.findComponentsByIntent({ name: 'nonexistent' });
      expect(found).toHaveLength(0);
    });
  });

  describe('Component Rendering', () => {
    it('should render component with view data', async () => {
      const viewData = {
        title: 'Test',
        state: { value: 'test', count: 1 },
        csrfToken: 'test-token'
      };

      const html = await runtime.render(component, viewData);
      expect(html).toContain('Test Component');
      expect(html).toContain('test-token');
    });
  });

  describe('Action Handling', () => {
    it('should handle component actions', async () => {
      const req = {
        path: '/test/increment',
        body: {}
      } as Request;

      const res = {
        redirect: jest.fn()
      } as unknown as Response;

      await runtime.handleAction(component, req, res);
      
      expect(component.getState().count).toBe(1);
      expect(res.redirect).toHaveBeenCalledWith('/');
    });
  });

  describe('State History', () => {
    it('should maintain state change history', () => {
      const history = runtime.getStateHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });
}); 