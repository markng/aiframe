import { Database, RunResult } from 'sqlite3';
import { PersistenceAdapter } from '../types';

export interface SQLiteAdapterConfig {
  filename: string;
  table: string;
  keyColumn?: string;
  dataColumn?: string;
}

interface DataRow {
  [key: string]: unknown;
}

export class SQLiteAdapter<T = unknown> implements PersistenceAdapter<T> {
  private db: Database;
  private readonly table: string;
  private readonly keyColumn: string;
  private readonly dataColumn: string;
  private isInitialized = false;

  constructor(private config: SQLiteAdapterConfig) {
    this.table = config.table;
    this.keyColumn = config.keyColumn || 'key';
    this.dataColumn = config.dataColumn || 'data';
    this.db = new Database(config.filename);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await new Promise<void>((resolve, reject) => {
      // Create table if it doesn't exist
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS ${this.table} (
          ${this.keyColumn} TEXT PRIMARY KEY,
          ${this.dataColumn} TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TRIGGER IF NOT EXISTS ${this.table}_updated_at
        AFTER UPDATE ON ${this.table}
        BEGIN
          UPDATE ${this.table} 
          SET updated_at = CURRENT_TIMESTAMP
          WHERE ${this.keyColumn} = NEW.${this.keyColumn};
        END;
      `, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    this.isInitialized = true;
  }

  async save(key: string, data: T): Promise<void> {
    await this.initialize();

    return new Promise<void>((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO ${this.table} (${this.keyColumn}, ${this.dataColumn})
        VALUES (?, ?);
      `);

      stmt.run(key, JSON.stringify(data), (err: Error | null) => {
        stmt.finalize();
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async load(key: string): Promise<T | null> {
    await this.initialize();

    return new Promise<T | null>((resolve, reject) => {
      const stmt = this.db.prepare(`
        SELECT ${this.dataColumn}
        FROM ${this.table}
        WHERE ${this.keyColumn} = ?;
      `);

      stmt.get(key, (err: Error | null, row: DataRow | undefined) => {
        stmt.finalize();
        if (err) reject(err);
        else resolve(row ? JSON.parse(row[this.dataColumn] as string) : null);
      });
    });
  }

  async delete(key: string): Promise<void> {
    await this.initialize();

    return new Promise<void>((resolve, reject) => {
      const stmt = this.db.prepare(`
        DELETE FROM ${this.table}
        WHERE ${this.keyColumn} = ?;
      `);

      stmt.run(key, (err: Error | null) => {
        stmt.finalize();
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async query(filter: unknown): Promise<T[]> {
    await this.initialize();

    // Convert filter to SQLite query conditions
    const { conditions, params } = this.buildQueryConditions(filter);

    return new Promise<T[]>((resolve, reject) => {
      const stmt = this.db.prepare(`
        SELECT ${this.dataColumn}
        FROM ${this.table}
        WHERE ${conditions};
      `);

      stmt.all(...params, (err: Error | null, rows: DataRow[]) => {
        stmt.finalize();
        if (err) reject(err);
        else resolve(rows.map(row => JSON.parse(row[this.dataColumn] as string)));
      });
    });
  }

  private buildQueryConditions(filter: unknown): { conditions: string; params: unknown[] } {
    if (!filter || typeof filter !== 'object') {
      return { conditions: '1=1', params: [] };
    }

    const conditions: string[] = [];
    const params: unknown[] = [];

    for (const [key, value] of Object.entries(filter)) {
      conditions.push(`json_extract(${this.dataColumn}, '$.${key}') = ?`);
      params.push(value);
    }

    return {
      conditions: conditions.length ? conditions.join(' AND ') : '1=1',
      params
    };
  }

  async disconnect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.close((err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Transaction support
  async withTransaction<R>(
    callback: (db: Database) => Promise<R>
  ): Promise<R> {
    await this.initialize();

    return new Promise<R>((resolve, reject) => {
      this.db.exec('BEGIN', async (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          const result = await callback(this.db);
          this.db.exec('COMMIT', (err: Error | null) => {
            if (err) reject(err);
            else resolve(result);
          });
        } catch (error) {
          this.db.exec('ROLLBACK', () => {
            reject(error);
          });
        }
      });
    });
  }
} 