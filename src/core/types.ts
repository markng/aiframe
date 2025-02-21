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

export interface PersistenceAdapter<T = unknown> {
  save(key: string, data: T): Promise<void>;
  load(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  query(filter: unknown): Promise<T[]>;
}

export interface EventStore {
  append(streamId: string, events: StateEvent[]): Promise<void>;
  read(streamId: string, fromVersion?: number): Promise<StateEvent[]>;
  getSnapshot(streamId: string): Promise<StateSnapshot | null>;
  saveSnapshot(streamId: string, snapshot: StateSnapshot): Promise<void>;
}

export interface StateEvent {
  type: string;
  data: unknown;
  metadata: {
    timestamp: number;
    version: number;
    userId?: string;
  };
}

export interface StateSnapshot {
  state: unknown;
  version: number;
  timestamp: number;
}

export interface ServerComponent {
  intent: Intent;
  render: (data: ViewData) => Promise<string>;
  handleAction: (req: Request, res: Response) => Promise<void>;
  getState: () => unknown;
  persistState?: () => Promise<void>;
  loadState?: () => Promise<void>;
}

export interface Route {
  path: string;
  intent: Intent;
  component: ServerComponent;
  methods: ('GET' | 'POST')[];
} 