import ejs from 'ejs';
import path from 'path';
import { ViewData } from './types';

export class TemplateEngine {
  private readonly templatesDir: string;

  constructor(templatesDir: string) {
    this.templatesDir = templatesDir;
  }

  async render(template: string, data: ViewData): Promise<string> {
    const templatePath = path.join(this.templatesDir, `${template}.ejs`);
    return new Promise((resolve, reject) => {
      ejs.renderFile(templatePath, data, (err, str) => {
        if (err) reject(err);
        else resolve(str as string);
      });
    });
  }

  // Helper to create a safe HTML string (escapes content)
  static html(strings: TemplateStringsArray, ...values: unknown[]): string {
    return strings.reduce((result, str, i) => {
      const value = values[i - 1];
      const escapedValue = value === undefined ? '' : TemplateEngine.escape(value);
      return result + escapedValue + str;
    });
  }

  // Basic HTML escaping
  private static escape(value: unknown): string {
    const str = String(value);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
} 