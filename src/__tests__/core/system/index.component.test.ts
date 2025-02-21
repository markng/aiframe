import { IndexComponent } from '../../../core/system/components/index.component';
import { Runtime } from '../../../core/runtime';
import { join } from 'path';
import { Request, Response } from 'express';
import { TestComponent } from '../../utils/test-component';
import { readFileSync } from 'fs';

describe('IndexComponent', () => {
  let runtime: Runtime;
  let component: IndexComponent;
  let testComponent: TestComponent;
  let originalEnv: string | undefined;
  let packageVersion: string;

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    // Read package version once for all tests
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '../../../../package.json'), 'utf-8')
    );
    packageVersion = packageJson.version;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  beforeEach(() => {
    runtime = new Runtime(join(__dirname, '../../../templates'));
    component = new IndexComponent(runtime);
    testComponent = new TestComponent();
  });

  describe('Intent', () => {
    it('should have valid intent', () => {
      expect(component.intent).toBeValidIntent();
      expect(component.intent.name).toBe('system:index');
      expect(component.intent.capabilities).toContain('viewDocs');
      expect(component.intent.capabilities).toContain('listComponents');
    });
  });

  describe('State Management', () => {
    it('should initialize with correct state', () => {
      const state = component.getState();
      expect(state.environment).toBe('development');
      expect(state.frameworkVersion).toBe(packageVersion);
      expect(state.registeredComponents).toBeInstanceOf(Map);
    });

    it('should list registered components', () => {
      runtime.registerComponent('test', testComponent);
      const state = component.getState();
      expect(state.registeredComponents.get('test')).toBe(testComponent);
    });
  });

  describe('Rendering', () => {
    it('should render welcome page', async () => {
      const viewData = {
        title: 'AIFrame',
        state: component.getState(),
        csrfToken: 'test-token'
      };

      const html = await component.render(viewData);
      expect(html).toContain('Welcome to AIFrame');
      expect(html).toContain('Quick Start');
      expect(html).toContain(`v${packageVersion}`);
    });

    it('should show registered components', async () => {
      runtime.registerComponent('test', testComponent);
      
      const viewData = {
        title: 'AIFrame',
        state: component.getState(),
        csrfToken: 'test-token'
      };

      const html = await component.render(viewData);
      expect(html).toContain('Registered Components');
      expect(html).toContain(testComponent.intent.name);
      expect(html).toContain(testComponent.intent.description);
    });
  });

  describe('Action Handling', () => {
    it('should redirect to docs', async () => {
      const req = {
        path: '/docs'
      } as Request;

      const res = {
        redirect: jest.fn()
      } as unknown as Response;

      await component.handleAction(req, res);
      expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining('github.com'));
    });

    it('should redirect to home for unknown actions', async () => {
      const req = {
        path: '/unknown'
      } as Request;

      const res = {
        redirect: jest.fn()
      } as unknown as Response;

      await component.handleAction(req, res);
      expect(res.redirect).toHaveBeenCalledWith('/');
    });
  });
}); 