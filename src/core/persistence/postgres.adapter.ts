import { PersistenceAdapter } from '../types';
import { Pool, PoolConfig, QueryResult, PoolClient } from 'pg';

export interface PostgresAdapterConfig extends PoolConfig {
  table: string;
  keyColumn?: string;
  dataColumn?: string;
  schema?: string;
}

export class PostgresAdapter<T = unknown> implements PersistenceAdapter<T> {
  private pool: Pool;
  private readonly table: string;
  private readonly keyColumn: string;
  private readonly dataColumn: string;
  private readonly schema: string;
  private isInitialized = false;

  constructor(private config: PostgresAdapterConfig) {
    this.table = config.table;
    this.keyColumn = config.keyColumn || 'key';
    this.dataColumn = config.dataColumn || 'data';
    this.schema = config.schema || 'public';
    
    // Create connection pool
    const { table, keyColumn, dataColumn, schema, ...poolConfig } = config;
    this.pool = new Pool(poolConfig);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const client = await this.pool.connect();
    try {
      // Create schema if it doesn't exist
      await client.query(`
        CREATE SCHEMA IF NOT EXISTS ${this.schema};
      `);

      // Create table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.schema}.${this.table} (
          ${this.keyColumn} TEXT PRIMARY KEY,
          ${this.dataColumn} JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create updated_at trigger
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      await client.query(`
        DROP TRIGGER IF EXISTS update_${this.table}_updated_at 
        ON ${this.schema}.${this.table};
      `);

      await client.query(`
        CREATE TRIGGER update_${this.table}_updated_at
        BEFORE UPDATE ON ${this.schema}.${this.table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);

      this.isInitialized = true;
    } finally {
      client.release();
    }
  }

  async save(key: string, data: T, client?: Pool | PoolClient): Promise<void> {
    await this.initialize();

    const query = `
      INSERT INTO ${this.schema}.${this.table} (${this.keyColumn}, ${this.dataColumn})
      VALUES ($1, $2)
      ON CONFLICT (${this.keyColumn})
      DO UPDATE SET ${this.dataColumn} = $2, updated_at = CURRENT_TIMESTAMP;
    `;

    await (client || this.pool).query(query, [key, JSON.stringify(data)]);
  }

  async load(key: string, client?: Pool | PoolClient): Promise<T | null> {
    await this.initialize();

    const query = `
      SELECT ${this.dataColumn}
      FROM ${this.schema}.${this.table}
      WHERE ${this.keyColumn} = $1;
    `;

    const result = await (client || this.pool).query(query, [key]);
    if (result.rows.length === 0) return null;

    return result.rows[0][this.dataColumn];
  }

  async delete(key: string, client?: Pool | PoolClient): Promise<void> {
    await this.initialize();

    const query = `
      DELETE FROM ${this.schema}.${this.table}
      WHERE ${this.keyColumn} = $1;
    `;

    await (client || this.pool).query(query, [key]);
  }

  async query(filter: unknown, client?: Pool | PoolClient): Promise<T[]> {
    await this.initialize();

    // Convert filter to PostgreSQL JSONB query
    const conditions = this.buildJsonbConditions(filter);
    
    const query = `
      SELECT ${this.dataColumn}
      FROM ${this.schema}.${this.table}
      WHERE ${conditions.query};
    `;

    const result = await (client || this.pool).query(query, conditions.params);
    return result.rows.map(row => row[this.dataColumn]);
  }

  private buildJsonbConditions(filter: unknown): { query: string; params: unknown[] } {
    if (!filter || typeof filter !== 'object') {
      return { query: '1=1', params: [] };
    }

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(filter)) {
      conditions.push(`${this.dataColumn}->>'${key}' = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }

    return {
      query: conditions.length ? conditions.join(' AND ') : '1=1',
      params
    };
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
  }

  // Transaction support
  async withTransaction<R>(
    callback: (client: PoolClient) => Promise<R>
  ): Promise<R> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
} 