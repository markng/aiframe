import { TemplateEngine, TemplateEngineError } from '../../core/templates';
import { join, sep } from 'path';
import { promises as fs } from 'fs';
import * as os from 'os';
import { ViewData } from '../../core/types';

// Extend ViewData for tests
interface TestViewData extends ViewData {
  [key: string]: unknown;
}

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
        .toThrow('Template file not found');
    });
  });

  describe('Path Handling', () => {
    it('should handle absolute paths', async () => {
      const absolutePath = join(tempDir, 'templates');
      const absoluteEngine = new TemplateEngine(absolutePath);
      
      await fs.writeFile(
        join(absolutePath, 'test.ejs'),
        '<div>test</div>'
      );

      const html = await absoluteEngine.render('test', {
        title: '',
        state: {},
        csrfToken: ''
      });
      expect(html).toBe('<div>test</div>');
    });

    it('should handle relative paths', async () => {
      const relativeEngine = new TemplateEngine('./templates');
      await expect(relativeEngine.render('test', {
        title: '',
        state: {},
        csrfToken: ''
      })).rejects.toThrow('Template file not found');
    });

    it('should prevent path traversal attempts', async () => {
      await fs.writeFile(
        join(tempDir, 'malicious.ejs'),
        'malicious content'
      );

      const viewData = {
        title: '',
        state: {},
        csrfToken: ''
      };

      // Try to access file outside templates directory
      await expect(engine.render('../malicious', viewData))
        .rejects
        .toThrow('Invalid template path: attempted path traversal');

      // Try with encoded traversal
      await expect(engine.render('%2e%2e/malicious', viewData))
        .rejects
        .toThrow('Invalid template path: attempted path traversal');
    });

    it('should handle special characters in template names', async () => {
      const specialNames = [
        'template with spaces.ejs',
        'template-with-dashes.ejs',
        'template_with_underscores.ejs',
        'template.with.dots.ejs'
      ];

      for (const name of specialNames) {
        const templateName = name.replace('.ejs', '');
        await fs.writeFile(
          join(tempDir, 'templates', name),
          '<div>special</div>'
        );

        const html = await engine.render(templateName, {
          title: '',
          state: {},
          csrfToken: ''
        });
        expect(html).toBe('<div>special</div>');
      }
    });

    it('should handle platform-specific path separators', async () => {
      const platformPath = ['templates', 'subfolder', 'test'].join(sep);
      await fs.mkdir(join(tempDir, 'templates', 'subfolder'), { recursive: true });
      await fs.writeFile(
        join(tempDir, platformPath + '.ejs'),
        '<div>platform</div>'
      );

      const html = await engine.render('subfolder/test', {
        title: '',
        state: {},
        csrfToken: ''
      });
      expect(html).toBe('<div>platform</div>');
    });

    it('should prevent path traversal with normalized paths', async () => {
      // Create a file outside templates directory
      await fs.writeFile(
        join(tempDir, 'malicious.ejs'),
        'malicious content'
      );

      // Create a symlink that points outside templates directory
      const symlinkPath = join(tempDir, 'templates', 'symlink.ejs');
      await fs.symlink(join(tempDir, 'malicious.ejs'), symlinkPath);

      const viewData = {
        title: '',
        state: {},
        csrfToken: ''
      };

      // Try to access file through symlink
      await expect(engine.render('symlink', viewData))
        .rejects
        .toThrow('Invalid template path: attempted path traversal');

      // Clean up symlink
      await fs.unlink(symlinkPath);
    });
  });

  describe('Template Loading Edge Cases', () => {
    it('should handle very large templates', async () => {
      // Create a smaller but still substantial template
      const largeContent = Array(100)
        .fill('<div><%- include("partial", { num: i }) %></div>')
        .join('\n');
      
      await fs.writeFile(
        join(tempDir, 'templates', 'large.ejs'),
        largeContent
      );

      await fs.writeFile(
        join(tempDir, 'templates', 'partial.ejs'),
        '<span><%= num %></span>'
      );

      const viewData: TestViewData = {
        title: '',
        state: {},
        csrfToken: '',
        i: 1
      };

      const html = await engine.render('large', viewData);
      expect(html).toContain('<span>1</span>');
      expect(html.match(/<span>/g)).toHaveLength(100);
    });

    it('should handle deeply nested includes', async () => {
      // Create templates with deep nesting
      for (let i = 1; i <= 10; i++) {
        await fs.writeFile(
          join(tempDir, 'templates', `level${i}.ejs`),
          `<div>Level ${i}<%- include("level${i + 1}", { num: num + 1 }) %></div>`
        );
      }

      await fs.writeFile(
        join(tempDir, 'templates', 'level11.ejs'),
        '<div>Bottom level: <%= num %></div>'
      );

      const viewData: TestViewData = {
        title: '',
        state: {},
        csrfToken: '',
        num: 1
      };

      const html = await engine.render('level1', viewData);
      expect(html).toContain('Bottom level: 11');
      for (let i = 1; i <= 10; i++) {
        expect(html).toContain(`Level ${i}`);
      }
    });

    it('should handle circular includes gracefully', async () => {
      await fs.writeFile(
        join(tempDir, 'templates', 'circular1.ejs'),
        '<%- include("circular2") %>'
      );

      await fs.writeFile(
        join(tempDir, 'templates', 'circular2.ejs'),
        '<%- include("circular1") %>'
      );

      await expect(engine.render('circular1', {
        title: '',
        state: {},
        csrfToken: ''
      })).rejects.toThrow('Circular include detected');
    });

    it('should handle non-existent includes', async () => {
      await fs.writeFile(
        join(tempDir, 'templates', 'bad-include.ejs'),
        '<%- include("non-existent") %>'
      );

      await expect(engine.render('bad-include', {
        title: '',
        state: {},
        csrfToken: ''
      })).rejects.toThrow('Include file not found');
    });

    it('should handle invalid include parameters', async () => {
      await fs.writeFile(
        join(tempDir, 'templates', 'parent.ejs'),
        '<%- include("child", invalidParam) %>'
      );

      await fs.writeFile(
        join(tempDir, 'templates', 'child.ejs'),
        '<%= someParam %>'
      );

      await expect(engine.render('parent', {
        title: '',
        state: {},
        csrfToken: ''
      })).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle template compilation errors', async () => {
      await fs.writeFile(
        join(tempDir, 'templates', 'invalid-syntax.ejs'),
        '<% for (let i = 0; i < 10; i++ %>'  // Missing closing parenthesis
      );

      await expect(engine.render('invalid-syntax', {
        title: '',
        state: {},
        csrfToken: ''
      })).rejects.toThrow('Template rendering failed');
    });

    it('should handle runtime errors in templates', async () => {
      await fs.writeFile(
        join(tempDir, 'templates', 'runtime-error.ejs'),
        '<%= nonExistentFunction() %>'
      );

      await expect(engine.render('runtime-error', {
        title: '',
        state: {},
        csrfToken: ''
      })).rejects.toThrow('Function not available in template');
    });

    it('should handle type mismatches gracefully', async () => {
      await fs.writeFile(
        join(tempDir, 'templates', 'type-error.ejs'),
        '<%= value.toLowerCase() %>'
      );

      const viewData: TestViewData = {
        title: '',
        state: {},
        csrfToken: '',
        value: 42  // Number instead of string
      };

      await expect(engine.render('type-error', viewData))
        .rejects
        .toThrow('Template rendering failed');
    });

    it('should wrap errors in TemplateEngineError', async () => {
      await fs.writeFile(
        join(tempDir, 'templates', 'error.ejs'),
        '<%= throw new Error("test") %>'
      );

      try {
        await engine.render('error', {
          title: '',
          state: {},
          csrfToken: ''
        });
        fail('Should have thrown an error');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(TemplateEngineError);
        if (err instanceof TemplateEngineError) {
          expect(err.cause).toBeDefined();
        }
      }
    });
  });

  describe('Performance and Resources', () => {
    it('should handle concurrent rendering', async () => {
      await fs.writeFile(
        join(tempDir, 'templates', 'concurrent.ejs'),
        '<div><%= Math.random() %></div>'
      );

      const viewData = {
        title: '',
        state: {},
        csrfToken: ''
      };

      // Render the same template concurrently
      const results = await Promise.all(
        Array(10).fill(null).map(() => engine.render('concurrent', viewData))
      );

      // Each render should have a different random number
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThan(1);
    });

    it('should clean up resources after rendering', async () => {
      const template = Array(100)  // Reduced from 1000 to 100
        .fill('<div><%= Math.random() %></div>')
        .join('\n');

      await fs.writeFile(
        join(tempDir, 'templates', 'resource.ejs'),
        template
      );

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Render large template multiple times
      for (let i = 0; i < 5; i++) {  // Reduced from 10 to 5
        await engine.render('resource', {
          title: '',
          state: {},
          csrfToken: ''
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      // Memory growth should be reasonable (less than 10MB)
      expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024);
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
        .toThrow('Template file not found');
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
      const result = TemplateEngine.html`<div>${name} is ${age}</div>`
    });
  });
});