/// <reference types="jest" />
import { JSDOM } from 'jsdom';
import { Intent, ServerComponent } from '../core/types';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidIntent(): R;
      toBeValidComponent(): R;
    }
  }
}

// Add DOM environment for testing
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;

// Custom matchers
expect.extend({
  toBeValidIntent(received: unknown): jest.CustomMatcherResult {
    const intent = received as Intent;
    const isValid = Boolean(
      received &&
      typeof received === 'object' &&
      typeof intent.name === 'string' &&
      typeof intent.description === 'string' &&
      Array.isArray(intent.capabilities) &&
      Array.isArray(intent.userActions) &&
      intent.userActions.every((action: any) =>
        action.name &&
        action.description &&
        action.method &&
        action.path &&
        action.expectedOutcome
      )
    );

    return {
      message: () =>
        `expected ${received} to be a valid Intent`,
      pass: isValid
    };
  },

  toBeValidComponent(received: unknown): jest.CustomMatcherResult {
    const component = received as ServerComponent;
    const isValid = Boolean(
      received &&
      typeof received === 'object' &&
      component.intent &&
      typeof component.render === 'function' &&
      typeof component.handleAction === 'function' &&
      typeof component.getState === 'function'
    );

    return {
      message: () =>
        `expected ${received} to be a valid Component`,
      pass: isValid
    };
  }
}); 