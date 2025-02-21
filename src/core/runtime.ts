import { ServerComponent, FeatureState, Intent, StateChange, UserAction, ViewData } from './types';
import { TemplateEngine } from './templates';
import { Request, Response } from 'express';

export class Runtime {
  private components: Map<string, ServerComponent> = new Map();
  private stateHistory: StateChange[] = [];
  private templateEngine: TemplateEngine;

  constructor(templatesDir: string) {
    this.templateEngine = new TemplateEngine(templatesDir);
  }

  registerComponent(name: string, component: ServerComponent) {
    this.components.set(name, component);
  }

  getComponent(name: string): ServerComponent | undefined {
    return this.components.get(name);
  }

  getComponents(): Map<string, ServerComponent> {
    return new Map(this.components);
  }

  // Server-side rendering
  async render(component: ServerComponent, data: ViewData): Promise<string> {
    return component.render(data);
  }

  // Template rendering
  async renderTemplate(template: string, data: ViewData): Promise<string> {
    return this.templateEngine.render(template, data);
  }

  // Handle component actions
  async handleAction(
    component: ServerComponent,
    req: Request,
    res: Response
  ): Promise<void> {
    await component.handleAction(req, res);
  }

  // Get state history for analysis
  getStateHistory(): StateChange[] {
    return [...this.stateHistory];
  }

  // Intent-based component lookup
  findComponentsByIntent(intent: Partial<Intent>): ServerComponent[] {
    return Array.from(this.components.values()).filter(component => {
      const matchesName = !intent.name || component.intent.name === intent.name;
      const matchesCapability = !intent.capabilities || 
        intent.capabilities.every(cap => 
          component.intent.capabilities.includes(cap)
        );
      return matchesName && matchesCapability;
    });
  }
} 