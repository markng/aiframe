import { TemplateEngine } from '../../core/templates';
import { join } from 'path';
import { promises as fs } from 'fs';
import * as os from 'os';

describe('TemplateEngine', () => {
  let engine: TemplateEngine;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(os.tmpdir(), 'aiframe-test-'));
    await fs.mkdir(join(tempDir, 'templates'), { recursive: true });
    engine = new TemplateEngine(join(tempDir, 'templates'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Constructor & Initialization', () => {
    it('should initialize with valid template directory', () => {
      expect(engine).toBeInstanceOf(TemplateEngine);
    });

    it('should handle non-existent directory gracefully', async () => {
      const nonExistentDir = join(tempDir, 'nonexistent');
      const invalidEngine = new TemplateEngine(nonExistentDir);
      
      const viewData = { title: 'Test', state: {}, csrfToken: 'test' };
      await expect(invalidEngine.render('test', viewData))
        .rejects
        .toThrow(/ENOENT/);
    });
  });

  describe('Template Rendering', () => {
    beforeEach(async () => {
      // Create test templates
      await fs.writeFile(
        join(tempDir, 'templates/basic.ejs'),
        '<div><%= title %></div>'
      );

      await fs.writeFile(
        join(tempDir, 'templates/nested.ejs'),
        '<div><%= state.user.name %> (<%= state.user.age %>)</div>'
      );

      await fs.writeFile(
        join(tempDir, 'templates/array.ejs'),
        '<ul><% items.forEach(item => { %><li><%= item %></li><% }); %></ul>'
      );

      await fs.writeFile(
        join(tempDir, 'templates/conditional.ejs'),
        '<div><% if (showTitle) { %><h1><%= title %></h1><% } %></div>'
      );

      await fs.writeFile(
        join(tempDir, 'templates/partial.ejs'),
        '<%- include("header", { subtitle: title }) %><div>Content</div>'
      );

      await fs.writeFile(
        join(tempDir, 'templates/header.ejs'),
        '<header><h1><%= subtitle %></h1></header>'
      );

      await fs.writeFile(
        join(tempDir, 'templates/invalid.ejs'),
        '<div><%= nonexistent.property %></div>'
      );
    });

    it('should render basic template with variables', async () => {
      const viewData = {
        title: 'Hello World',
        state: {},
        csrfToken: 'test'
      };

      const html = await engine.render('basic', viewData);
      expect(html).toBe('<div>Hello World</div>');
    });

    it('should render nested object properties', async () => {
      const viewData = {
        title: 'Test',
        state: {
          user: {
            name: 'John',
            age: 30
          }
        },
        csrfToken: 'test'
      };

      const html = await engine.render('nested', viewData);
      expect(html).toBe('<div>John (30)</div>');
    });

    it('should render arrays with iteration', async () => {
      const viewData = {
        title: 'Test',
        state: {},
        csrfToken: 'test',
        items: ['one', 'two', 'three']
      };

      const html = await engine.render('array', viewData);
      expect(html).toBe('<ul><li>one</li><li>two</li><li>three</li></ul>');
    });

    it('should handle conditional rendering', async () => {
      const viewData = {
        title: 'Conditional',
        state: {},
        csrfToken: 'test',
        showTitle: true
      };

      const html = await engine.render('conditional', viewData);
      expect(html).toBe('<div><h1>Conditional</h1></div>');

      const hiddenData = { ...viewData, showTitle: false };
      const hiddenHtml = await engine.render('conditional', hiddenData);
      expect(hiddenHtml).toBe('<div></div>');
    });

    it('should support template includes/partials', async () => {
      const viewData = {
        title: 'Welcome',
        state: {},
        csrfToken: 'test'
      };

      const html = await engine.render('partial', viewData);
      expect(html).toBe('<header><h1>Welcome</h1></header><div>Content</div>');
    });

    it('should handle missing templates gracefully', async () => {
      const viewData = {
        title: 'Test',
        state: {},
        csrfToken: 'test'
      };

      await expect(engine.render('nonexistent', viewData))
        .rejects
        .toThrow(/ENOENT/);
    });

    it('should handle template syntax errors', async () => {
      const viewData = {
        title: 'Test',
        state: {},
        csrfToken: 'test'
      };

      await expect(engine.render('invalid', viewData))
        .rejects
        .toThrow();
    });

    it('should handle missing required variables', async () => {
      const viewData = {
        title: '',
        state: {},
        csrfToken: 'test'
      };

      const html = await engine.render('basic', viewData);
      expect(html).toBe('<div></div>');
    });
  });

  describe('HTML Helper', () => {
    it('should handle string template literals', () => {
      const result = TemplateEngine.html`<div>Hello</div>`;
      expect(result).toBe('<div>Hello</div>');
    });

    it('should interpolate values safely', () => {
      const value = '<script>alert("xss")</script>';
      const result = TemplateEngine.html`<div>${value}</div>`;
      expect(result).toBe('<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>');
    });

    it('should handle multiple values', () => {
      const name = '<user>';
      const age = '25';
      const result = TemplateEngine.html`<div>${name} is ${age}</div>`;
      expect(result).toBe('<div>&lt;user&gt; is 25</div>');
    });

    it('should handle undefined values', () => {
      const value = undefined;
      const result = TemplateEngine.html`<div>${value}</div>`;
      expect(result).toBe('<div></div>');
    });

    it('should handle various data types', () => {
      const number = 42;
      const boolean = true;
      const object = { toString: () => '<obj>' };
      
      const result = TemplateEngine.html`${number}-${boolean}-${object}`;
      expect(result).toBe('42-true-&lt;obj&gt;');
    });
  });

  describe('HTML Escaping', () => {
    it('should escape HTML special characters in potential XSS attacks', () => {
      const attacks = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        '<img src="x" onerror="alert(\'xss\')">',
        '<a onclick="alert(\'xss\')">click me</a>'
      ];

      attacks.forEach(attack => {
        const result = TemplateEngine.html`${attack}`;
        // Verify all HTML special characters are escaped
        expect(result).not.toMatch(/<[^&]/);  // No unescaped < followed by non-&
        expect(result).not.toMatch(/[^&]>/);  // No unescaped > not preceded by &
        expect(result).not.toMatch(/[^&]"/);  // No unescaped " not preceded by &
        expect(result).not.toMatch(/[^&]'/);  // No unescaped ' not preceded by &
        // Note: This helper only escapes HTML special characters.
        // It does not remove or sanitize potentially dangerous attributes or protocols.
        // Additional sanitization should be handled separately.
      });
    });

    it('should document HTML escaping behavior', () => {
      const examples = [
        'javascript:alert("xss")',  // Protocol-based XSS not handled
        'data:text/html,<script>',  // Data URLs not handled
        'vbscript:msgbox("xss")'   // Other protocols not handled
      ];

      examples.forEach(example => {
        const result = TemplateEngine.html`${example}`;
        // Verify only HTML special characters are escaped
        const expected = example
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
        expect(result).toBe(expected);
        // Note: These strings remain dangerous if used in certain HTML attributes
        // Additional context-aware sanitization is required for full security
      });
    });

    it('should handle mixed content', () => {
      const text = 'Hello <World>';
      const html = '<div>Test</div>';
      const result = TemplateEngine.html`${text} ${html}`;
      expect(result).toBe('Hello &lt;World&gt; &lt;div&gt;Test&lt;/div&gt;');
    });

    it('should handle edge cases', () => {
      const cases = [
        '',                    // Empty string
        ' ',                   // Whitespace
        '\n\t',               // Special characters
        '\\',                 // Backslash
        '&amp;',             // Already escaped
        '&#x27;',            // HTML entities
        String.fromCharCode(0) // Null character
      ];

      cases.forEach(testCase => {
        const result = TemplateEngine.html`${testCase}`;
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });
  });
}); 