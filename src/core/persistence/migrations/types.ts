import { Pool } from 'pg';

export interface Migration {
  id: string;
  name: string;
  timestamp: number;
  up: (client: Pool) => Promise<void>;
  down: (client: Pool) => Promise<void>;
}

export interface MigrationRecord {
  id: string;
  name: string;
  timestamp: number;
  appliedAt: Date;
  batch: number;
}

export interface MigrationOptions {
  schema?: string;
  table?: string;
  migrationsDir?: string;
}

export interface MigrationResult {
  id: string;
  name: string;
  status: 'success' | 'error';
  error?: Error;
  duration: number;
} 