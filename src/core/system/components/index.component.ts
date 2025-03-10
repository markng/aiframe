import { Request, Response } from 'express';
import { ServerComponent, ViewData } from '../../types';
import { indexIntent } from './index.intent';
import { Runtime } from '../../runtime';
import { readFileSync } from 'fs';
import { join } from 'path';

interface IndexState {
  registeredComponents: Map<string, ServerComponent>;
  environment: string;
  frameworkVersion: string;
}

export class IndexComponent implements ServerComponent {
  intent = indexIntent;
  private state: IndexState;

  constructor(private runtime: Runtime) {
    // Read package.json for version using absolute path
    const packagePath = join(process.cwd(), 'package.json');
    console.log('[IndexComponent] Reading package.json from:', packagePath);
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    console.log('[IndexComponent] Package version:', packageJson.version);

    this.state = {
      registeredComponents: runtime.getComponents(),
      environment: process.env.NODE_ENV || 'development',
      frameworkVersion: packageJson.version
    };
    console.log('[IndexComponent] State initialized with version:', this.state.frameworkVersion);
  }

  async render(data: ViewData): Promise<string> {
    // Update components before rendering
    this.state.registeredComponents = this.runtime.getComponents();
    
    return this.runtime.renderTemplate('index', {
      ...data,
      state: this.state
    });
  }

  async handleAction(req: Request, res: Response): Promise<void> {
    // Handle docs viewing if needed
    if (req.path === '/docs') {
      res.redirect('https://github.com/markng/aiframe#readme');
      return;
    }
    res.redirect('/');
  }

  getState(): IndexState {
    // Update components before returning state
    this.state.registeredComponents = this.runtime.getComponents();
    return {
      ...this.state,
      registeredComponents: new Map(this.state.registeredComponents)
    };
  }
} 