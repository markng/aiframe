import { Pool } from 'pg';
import { Migration, MigrationOptions, MigrationRecord, MigrationResult } from './types';
import { promises as fs } from 'fs';
import { join } from 'path';

export class MigrationRunner {
  private readonly schema: string;
  private readonly table: string;
  private readonly migrationsDir: string;
  private isInitialized = false;

  constructor(
    private pool: Pool,
    options: MigrationOptions = {}
  ) {
    this.schema = options.schema || 'public';
    this.table = options.table || 'migrations';
    this.migrationsDir = options.migrationsDir || join(process.cwd(), 'migrations');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const client = await this.pool.connect();
    try {
      // Create schema if needed
      await client.query(`
        CREATE SCHEMA IF NOT EXISTS ${this.schema};
      `);

      // Create migrations table if needed
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schema}.${this.table} (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          timestamp BIGINT NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          batch INTEGER NOT NULL
        );
      `);

      this.isInitialized = true;
    } finally {
      client.release();
    }
  }

  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    await this.initialize();

    const result = await this.pool.query<MigrationRecord>(`
      SELECT 
        id,
        name,
        timestamp,
        applied_at as "appliedAt",
        batch
      FROM ${this.schema}.${this.table}
      ORDER BY timestamp ASC;
    `);

    return result.rows;
  }

  async loadMigrations(): Promise<Migration[]> {
    // Ensure migrations directory exists
    await fs.mkdir(this.migrationsDir, { recursive: true });

    const files = await fs.readdir(this.migrationsDir);
    const migrations: Migration[] = [];

    for (const file of files) {
      if (!file.endsWith('.js') && !file.endsWith('.ts')) continue;

      const path = join(this.migrationsDir, file);
      const migration = require(path);

      if (this.isValidMigration(migration)) {
        migrations.push(migration);
      }
    }

    return migrations.sort((a, b) => a.timestamp - b.timestamp);
  }

  private isValidMigration(migration: any): migration is Migration {
    return (
      migration &&
      typeof migration.id === 'string' &&
      typeof migration.name === 'string' &&
      typeof migration.timestamp === 'number' &&
      typeof migration.up === 'function' &&
      typeof migration.down === 'function'
    );
  }

  async up(): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];
    const appliedMigrations = await this.getAppliedMigrations();
    const migrations = await this.loadMigrations();
    
    // Get the latest batch number
    const latestBatch = appliedMigrations.length > 0
      ? Math.max(...appliedMigrations.map(m => m.batch))
      : 0;

    // Find migrations that haven't been applied
    const pendingMigrations = migrations.filter(
      migration => !appliedMigrations.find(am => am.id === migration.id)
    );

    for (const migration of pendingMigrations) {
      const startTime = Date.now();
      try {
        await this.pool.query('BEGIN');

        await migration.up(this.pool);

        // Record the migration
        await this.pool.query(`
          INSERT INTO ${this.schema}.${this.table}
          (id, name, timestamp, batch)
          VALUES ($1, $2, $3, $4);
        `, [migration.id, migration.name, migration.timestamp, latestBatch + 1]);

        await this.pool.query('COMMIT');

        results.push({
          id: migration.id,
          name: migration.name,
          status: 'success',
          duration: Date.now() - startTime
        });
      } catch (error) {
        await this.pool.query('ROLLBACK');
        results.push({
          id: migration.id,
          name: migration.name,
          status: 'error',
          error: error as Error,
          duration: Date.now() - startTime
        });
        break;
      }
    }

    return results;
  }

  async down(steps = 1): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];
    const appliedMigrations = await this.getAppliedMigrations();
    const migrations = await this.loadMigrations();

    // Get migrations to roll back (from latest batch)
    const latestBatch = Math.max(...appliedMigrations.map(m => m.batch));
    const migrationsToRollback = appliedMigrations
      .filter(m => m.batch === latestBatch)
      .slice(-steps)
      .reverse();

    for (const record of migrationsToRollback) {
      const migration = migrations.find(m => m.id === record.id);
      if (!migration) continue;

      const startTime = Date.now();
      try {
        await this.pool.query('BEGIN');

        await migration.down(this.pool);

        // Remove the migration record
        await this.pool.query(`
          DELETE FROM ${this.schema}.${this.table}
          WHERE id = $1;
        `, [migration.id]);

        await this.pool.query('COMMIT');

        results.push({
          id: migration.id,
          name: migration.name,
          status: 'success',
          duration: Date.now() - startTime
        });
      } catch (error) {
        await this.pool.query('ROLLBACK');
        results.push({
          id: migration.id,
          name: migration.name,
          status: 'error',
          error: error as Error,
          duration: Date.now() - startTime
        });
        break;
      }
    }

    return results;
  }

  async reset(): Promise<MigrationResult[]> {
    const appliedMigrations = await this.getAppliedMigrations();
    return this.down(appliedMigrations.length);
  }

  async status(): Promise<{
    applied: MigrationRecord[];
    pending: Migration[];
  }> {
    const appliedMigrations = await this.getAppliedMigrations();
    const allMigrations = await this.loadMigrations();

    const pending = allMigrations.filter(
      migration => !appliedMigrations.find(am => am.id === migration.id)
    );

    return {
      applied: appliedMigrations,
      pending
    };
  }
} 