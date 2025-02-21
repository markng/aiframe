import ejs from 'ejs';
import path from 'path';
import { promises as fs } from 'fs';
import { ViewData } from './types';

export class TemplateEngineError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'TemplateEngineError';
  }
}

export class TemplateEngine {
  private readonly templatesDir: string;

  constructor(templatesDir: string) {
    this.templatesDir = path.normalize(templatesDir);
  }

  async render(template: string, data: ViewData): Promise<string> {
    // Check for path traversal before normalization
    if (template.includes('..') || template.includes('%2e%2e')) {
      throw new TemplateEngineError('Invalid template path: attempted path traversal');
    }

    const normalizedPath = path.normalize(path.join(this.templatesDir, `${template}.ejs`));
    
    try {
      // Resolve any symlinks to their real paths
      const realPath = await fs.realpath(normalizedPath);
      const realTemplatesDir = await fs.realpath(this.templatesDir);
      
      // Check if the resolved path is within templates directory
      if (!realPath.startsWith(realTemplatesDir)) {
        throw new TemplateEngineError('Invalid template path: attempted path traversal');
      }

      return new Promise((resolve, reject) => {
        ejs.renderFile(realPath, data, (err, str) => {
          if (err) {
            // Wrap EJS errors with consistent messaging
            if (err.message.includes('ENOENT')) {
              reject(new TemplateEngineError('Template file not found', err));
            } else if (err.message.includes('Could not find the include file')) {
              reject(new TemplateEngineError('Include file not found', err));
            } else if (err.message.includes('is not defined')) {
              reject(new TemplateEngineError('Function not available in template', err));
            } else if (err.message.includes('include') && err.message.includes('circular')) {
              reject(new TemplateEngineError('Circular include detected', err));
            } else {
              reject(new TemplateEngineError('Template rendering failed', err));
            }
          } else {
            resolve(str as string);
          }
        });
      });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new TemplateEngineError('Template file not found');
      }
      throw err;
    }
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