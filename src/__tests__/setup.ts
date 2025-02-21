/// <reference types="jest" />
import { JSDOM } from 'jsdom';
import { Intent, ServerComponent } from '../core/types';
import { Pool } from 'pg';
import * as path from 'path';
import * as fs from 'fs/promises';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidIntent(): R;
      toBeValidComponent(): R;
    }
  }
}

// Configure test environment
process.env.POSTGRES_HOST = process.env.POSTGRES_HOST || 'localhost';
process.env.POSTGRES_PORT = process.env.POSTGRES_PORT || '5432';
process.env.POSTGRES_DB = process.env.POSTGRES_DB || 'test_db';
process.env.POSTGRES_USER = process.env.POSTGRES_USER || 'postgres';
process.env.POSTGRES_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres';
process.env.SQLITE_FILE = process.env.SQLITE_FILE || ':memory:';

// Create test database
beforeAll(async () => {
  // Connect to default database to create test database
  const rootPool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: 'postgres' // Connect to default database
  });

  try {
    // Check if database exists
    const result = await rootPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.POSTGRES_DB]
    );

    if (result.rowCount === 0) {
      // Create test database if it doesn't exist
      await rootPool.query(`CREATE DATABASE ${process.env.POSTGRES_DB}`);
    }
  } catch (error: any) {
    // Log error but don't throw - the database might already exist
    console.warn('Database setup warning:', error.message);
  } finally {
    await rootPool.end();
  }

  // Set up test templates directory
  const templatesDir = path.join(__dirname, '..', 'templates');
  try {
    await fs.mkdir(templatesDir, { recursive: true });
    // Create test template files
    await fs.writeFile(
      path.join(templatesDir, 'index.ejs'),
      `<h1>Welcome to AIFrame</h1>
      <div class="quick-start">
        <h2>Quick Start</h2>
        <p>Create your first component in three easy steps...</p>
      </div>
      <% if (Array.from(state.registeredComponents.entries())
          .filter(([name]) => !name.startsWith('system:')).length > 0) { %>
        <div class="registered-components">
          <h2>Registered Components</h2>
          <div class="components-grid">
            <% Array.from(state.registeredComponents.entries())
              .filter(([name]) => !name.startsWith('system:'))
              .forEach(([name, component]) => { %>
                <div class="component-card">
                  <div class="component-header">
                    <h3><%= component.intent.name %></h3>
                  </div>
                  <p class="component-description"><%= component.intent.description %></p>
                </div>
            <% }); %>
          </div>
        </div>
      <% } %>
      <div class="version-info">
        <span class="version">v<%- state.frameworkVersion %></span>
      </div>`
    );
  } catch (error) {
    console.error('Error setting up test templates:', error);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Clean up test templates
  try {
    await fs.rm(path.join(__dirname, 'templates'), { recursive: true, force: true });
  } catch (error) {
    console.error('Error cleaning up test templates:', error);
  }
});

// Add DOM environment for testing
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window as unknown as Window & typeof globalThis;

// Add global test timeout
jest.setTimeout(10000); // 10 seconds

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