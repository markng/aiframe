import { PersistenceAdapter } from '../types';
import { Pool, PoolConfig, QueryResult, PoolClient } from 'pg';

export interface PostgresAdapterConfig extends PoolConfig {
  table: string;
  keyColumn?: string;
  dataColumn?: string;
  schema?: string;
}

export class PostgresAdapter<T = unknown> implements PersistenceAdapter<T> {
  private pool?: Pool;
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

  private ensurePool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool is not initialized');
    }
    return this.pool;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const client = await this.ensurePool().connect();
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
      DO UPDATE SET
        ${this.dataColumn} = $2,
        updated_at = CURRENT_TIMESTAMP;
    `;

    // If we're in a transaction, we must use the transaction's client
    if (client && !('options' in client)) {
      await client.query(query, [key, data]);
    } else {
      await this.ensurePool().query(query, [key, data]);
    }
  }

  async load(key: string, client?: Pool | PoolClient): Promise<T | null> {
    await this.initialize();

    const query = `
      SELECT ${this.dataColumn}
      FROM ${this.schema}.${this.table}
      WHERE ${this.keyColumn} = $1;
    `;

    // If we're in a transaction, we must use the transaction's client
    let result;
    if (client && !('options' in client)) {
      result = await client.query(query, [key]);
    } else {
      result = await this.ensurePool().query(query, [key]);
    }

    return result.rows.length > 0 ? result.rows[0][this.dataColumn] : null;
  }

  async delete(key: string, client?: Pool | PoolClient): Promise<void> {
    await this.initialize();

    const query = `
      DELETE FROM ${this.schema}.${this.table}
      WHERE ${this.keyColumn} = $1;
    `;

    // If we're in a transaction, we must use the transaction's client
    if (client && !('options' in client)) {
      await client.query(query, [key]);
    } else {
      await this.ensurePool().query(query, [key]);
    }
  }

  async query(filter: unknown, client?: Pool | PoolClient): Promise<T[]> {
    await this.initialize();

    // Return empty array for invalid filters
    if (filter === null || typeof filter !== 'object' || Array.isArray(filter)) {
      return [];
    }

    // Convert filter to PostgreSQL JSONB query
    const conditions = this.buildJsonbConditions(filter);
    
    const query = `
      SELECT ${this.dataColumn}
      FROM ${this.schema}.${this.table}
      WHERE ${conditions.query};
    `;

    // If we're in a transaction, we must use the transaction's client
    let result;
    if (client && !('options' in client)) {
      result = await client.query(query, conditions.params);
    } else {
      result = await this.ensurePool().query(query, conditions.params);
    }

    return result.rows.map(row => row[this.dataColumn]);
  }

  async disconnect(): Promise<void> {
    if (!this.pool) return;
    
    try {
      // Clean up any lingering transactions
      const client = await this.pool.connect();
      try {
        await client.query('ROLLBACK');
        await client.query('DISCARD ALL');
        await client.query('DEALLOCATE ALL');
      } catch (error) {
        // Ignore cleanup errors
        console.warn('Error during connection cleanup:', error);
      } finally {
        client.release();
      }
      
      // Wait for any in-progress operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // End the pool with a timeout
      const endPromise = this.pool.end();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Pool end timeout')), 5000);
      });
      await Promise.race([endPromise, timeoutPromise]);
      
      // Reset state
      this.isInitialized = false;
      this.pool = undefined;
    } catch (error) {
      console.error('Error during disconnect:', error);
      throw error;
    }
  }

  async withTransaction<R>(
    callback: (client: PoolClient) => Promise<R>
  ): Promise<R> {
    const client = await this.ensurePool().connect();
    try {
      console.log('Starting transaction');
      await client.query('BEGIN');
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
      
      // Wait for any in-progress transactions to complete
      await client.query('SELECT pg_sleep(0.1)');
      
      const result = await callback(client);
      console.log('Transaction successful, committing');
      await client.query('COMMIT');
      return result;
    } catch (error) {
      console.log('Transaction failed, rolling back', error);
      try {
        console.log('Executing ROLLBACK');
        const rollbackResult = await client.query('ROLLBACK');
        console.log('ROLLBACK result:', rollbackResult);
        
        // Add a small delay to ensure rollback completes
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Clean up any lingering data
        console.log('Cleaning up transaction data');
        await client.query('DISCARD ALL');
        
        console.log('Executing DEALLOCATE ALL');
        const deallocateResult = await client.query('DEALLOCATE ALL');
        console.log('DEALLOCATE ALL result:', deallocateResult);
      } catch (rollbackError) {
        // If rollback fails, we still want to release the client and throw the original error
        console.error('Failed to rollback transaction:', rollbackError);
      }
      throw error;
    } finally {
      console.log('Releasing client');
      client.release();
    }
  }

  private buildJsonbConditions(filter: unknown): { query: string; params: unknown[] } {
    if (!filter || typeof filter !== 'object' || Array.isArray(filter)) {
      // Return a condition that matches nothing
      return { query: '1=0', params: [] };
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
      query: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
      params
    };
  }
} 