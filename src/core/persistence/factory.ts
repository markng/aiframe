import { PersistenceAdapter } from '../types';
import { MongoAdapter } from './mongo.adapter';
import { PostgresAdapter, PostgresAdapterConfig } from './postgres.adapter';

export type AdapterType = 'mongodb' | 'postgres';

export interface AdapterConfig {
  type: AdapterType;
  uri?: string;
  database?: string;
  collection?: string;
  table?: string;
  schema?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
}

export class PersistenceFactory {
  private static instances = new Map<string, PersistenceAdapter>();

  static async createAdapter<T = unknown>(
    name: string,
    config: AdapterConfig
  ): Promise<PersistenceAdapter<T>> {
    if (this.instances.has(name)) {
      return this.instances.get(name) as PersistenceAdapter<T>;
    }

    let adapter: PersistenceAdapter<T>;

    switch (config.type) {
      case 'mongodb': {
        if (!config.uri || !config.database || !config.collection) {
          throw new Error('Missing required MongoDB configuration');
        }

        adapter = new MongoAdapter<T>(
          config.uri,
          config.database,
          config.collection
        );
        break;
      }

      case 'postgres': {
        if (!config.database) {
          throw new Error('Missing required PostgreSQL configuration');
        }

        const pgConfig: PostgresAdapterConfig = {
          host: config.host || 'localhost',
          port: config.port || 5432,
          database: config.database,
          user: config.user || 'postgres',
          password: config.password || 'postgres',
          table: config.table || name,
          schema: config.schema || 'public'
        };

        adapter = new PostgresAdapter<T>(pgConfig);
        break;
      }

      default:
        throw new Error(`Unsupported adapter type: ${config.type}`);
    }

    this.instances.set(name, adapter);
    return adapter;
  }

  static async getAdapter<T = unknown>(name: string): Promise<PersistenceAdapter<T> | undefined> {
    return this.instances.get(name) as PersistenceAdapter<T> | undefined;
  }

  static async removeAdapter(name: string): Promise<void> {
    const adapter = this.instances.get(name);
    if (adapter) {
      if ('disconnect' in adapter) {
        await (adapter as any).disconnect();
      }
      this.instances.delete(name);
    }
  }

  static async removeAll(): Promise<void> {
    for (const [name] of this.instances) {
      await this.removeAdapter(name);
    }
  }
} 