import { TemplateEngine } from '../../core/templates';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

describe('TemplateEngine', () => {
  const templatesDir = join(__dirname, '../templates');
  let engine: TemplateEngine;

  beforeAll(() => {
    // Create test templates
    mkdirSync(templatesDir, { recursive: true });
    writeFileSync(
      join(templatesDir, 'test.ejs'),
      '<div><%= title %><%= state.value %></div>'
    );
  });

  beforeEach(() => {
    engine = new TemplateEngine(templatesDir);
  });

  describe('Template Rendering', () => {
    it('should render a template with view data', async () => {
      const viewData = {
        title: 'Test',
        state: { value: 'Hello' },
        csrfToken: 'test-token'
      };

      const html = await engine.render('test', viewData);
      expect(html).toBe('<div>TestHello</div>');
    });

    it('should handle missing templates gracefully', async () => {
      const viewData = {
        title: 'Test',
        state: null,
        csrfToken: 'test-token'
      };

      await expect(engine.render('nonexistent', viewData))
        .rejects
        .toThrow();
    });
  });

  describe('HTML Escaping', () => {
    it('should escape HTML in template strings', () => {
      const result = TemplateEngine.html`<div>${'<script>alert("xss")</script>'}</div>`;
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should handle undefined values', () => {
      const value = undefined;
      const result = TemplateEngine.html`<div>${value}</div>`;
      expect(result).toBe('<div></div>');
    });

    it('should handle multiple values', () => {
      const result = TemplateEngine.html`
        <div>
          ${'"quoted"'}
          ${'<tagged>'}
          ${"'apostrophe'"}
        </div>
      `;
      expect(result).toContain('&quot;quoted&quot;');
      expect(result).toContain('&lt;tagged&gt;');
      expect(result).toContain('&#039;apostrophe&#039;');
    });
  });
}); 