import { Pool, PoolClient } from 'pg';
import { StateEvent, StateSnapshot } from '../types';

export class EventStore {
  private pool: Pool;
  private isInitialized = false;

  constructor(
    private readonly config: {
      host?: string;
      port?: number;
      database: string;
      user?: string;
      password?: string;
      schema?: string;
    }
  ) {
    this.pool = new Pool({
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database,
      user: config.user || 'postgres',
      password: config.password || 'postgres'
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const schema = this.config.schema || 'public';
    const client = await this.pool.connect();

    try {
      // Create schema if it doesn't exist
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);

      // Create events table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.events (
          id SERIAL PRIMARY KEY,
          stream_id TEXT NOT NULL,
          version INTEGER NOT NULL,
          type TEXT NOT NULL,
          data JSONB NOT NULL,
          metadata JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(stream_id, version)
        );
      `);

      // Create snapshots table
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${schema}.snapshots (
          stream_id TEXT PRIMARY KEY,
          version INTEGER NOT NULL,
          state JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_events_stream_version 
        ON ${schema}.events(stream_id, version);
      `);

      this.isInitialized = true;
    } finally {
      client.release();
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  async append(streamId: string, events: StateEvent[]): Promise<void> {
    await this.initialize();
    const schema = this.config.schema || 'public';

    // Get the current version
    const versionResult = await this.pool.query(
      `SELECT COALESCE(MAX(version), -1) as max_version 
       FROM ${schema}.events 
       WHERE stream_id = $1`,
      [streamId]
    );
    const startVersion = versionResult.rows[0].max_version + 1;

    // Insert events in a transaction
    await this.pool.query('BEGIN');
    try {
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const version = startVersion + i;

        await this.pool.query(
          `INSERT INTO ${schema}.events 
           (stream_id, version, type, data, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            streamId,
            version,
            event.type,
            event.data,
            { ...event.metadata, version }
          ]
        );
      }
      await this.pool.query('COMMIT');
    } catch (error) {
      await this.pool.query('ROLLBACK');
      throw error;
    }
  }

  async read(streamId: string, fromVersion = 0): Promise<StateEvent[]> {
    await this.initialize();
    const schema = this.config.schema || 'public';

    const result = await this.pool.query(
      `SELECT type, data, metadata
       FROM ${schema}.events
       WHERE stream_id = $1 AND version >= $2
       ORDER BY version ASC`,
      [streamId, fromVersion]
    );

    return result.rows.map(row => ({
      type: row.type,
      data: row.data,
      metadata: row.metadata
    }));
  }

  async getSnapshot(streamId: string): Promise<StateSnapshot | null> {
    await this.initialize();
    const schema = this.config.schema || 'public';

    const result = await this.pool.query(
      `SELECT state, version
       FROM ${schema}.snapshots
       WHERE stream_id = $1`,
      [streamId]
    );

    if (result.rows.length === 0) return null;

    return {
      state: result.rows[0].state,
      version: result.rows[0].version,
      timestamp: result.rows[0].created_at
    };
  }

  async saveSnapshot(streamId: string, snapshot: StateSnapshot): Promise<void> {
    await this.initialize();
    const schema = this.config.schema || 'public';

    await this.pool.query(
      `INSERT INTO ${schema}.snapshots (stream_id, version, state)
       VALUES ($1, $2, $3)
       ON CONFLICT (stream_id)
       DO UPDATE SET version = $2, state = $3, created_at = CURRENT_TIMESTAMP`,
      [streamId, snapshot.version, snapshot.state]
    );
  }
} 