import { Request, Response } from 'express';

export interface Intent {
  name: string;
  description: string;
  capabilities: string[];
  dataStructure: Record<string, unknown>;
  userActions: UserAction[];
}

export interface UserAction {
  name: string;
  description: string;
  method: 'GET' | 'POST';
  path: string;
  parameters?: ActionParameter[];
  expectedOutcome: string;
}

export interface ActionParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

export interface FeatureState<T = unknown> {
  intent: Intent;
  currentState: T;
  allowedTransitions: StateTransition[];
  history: StateChange[];
}

export interface StateTransition {
  from: string;
  to: string;
  via: UserAction;
}

export interface StateChange {
  timestamp: number;
  from: unknown;
  to: unknown;
  action: UserAction;
}

export interface ViewData {
  title: string;
  state: unknown;
  csrfToken: string;
  flash?: { type: string; message: string };
  message?: string;
}

export interface ServerComponent {
  intent: Intent;
  render: (data: ViewData) => Promise<string>;
  handleAction: (req: Request, res: Response) => Promise<void>;
  getState: () => unknown;
}

export interface Route {
  path: string;
  intent: Intent;
  component: ServerComponent;
  methods: ('GET' | 'POST')[];
} 