import { PostgresAdapter, PostgresAdapterConfig } from '../../../core/persistence/postgres.adapter';

describe('PostgresAdapter', () => {
  let adapter: PostgresAdapter<any>;
  const testConfig: PostgresAdapterConfig = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'test',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    table: 'test_table',
    schema: 'test_schema'
  };

  beforeAll(async () => {
    // Skip tests if database connection isn't available
    try {
      adapter = new PostgresAdapter(testConfig);
      await adapter.initialize();
    } catch (error) {
      console.warn('PostgreSQL not available, skipping tests');
      return;
    }
  });

  beforeEach(async () => {
    if (!adapter) {
      return;
    }
    // Clean up the test table
    try {
      await adapter.withTransaction(async (client) => {
        await client.query(`
          TRUNCATE TABLE ${testConfig.schema}.${testConfig.table};
        `);
      });
    } catch (error) {
      console.warn('Failed to clean test table:', error);
    }
  });

  afterAll(async () => {
    if (adapter) {
      await adapter.disconnect();
    }
  });

  describe('Basic CRUD Operations', () => {
    it('should save and load data', async () => {
      const testData = { name: 'test', value: 123 };
      await adapter.save('test-key', testData);
      
      const loaded = await adapter.load('test-key');
      expect(loaded).toEqual(testData);
    });

    it('should update existing data', async () => {
      const initialData = { name: 'test', value: 123 };
      const updatedData = { name: 'test', value: 456 };
      
      await adapter.save('test-key', initialData);
      await adapter.save('test-key', updatedData);
      
      const loaded = await adapter.load('test-key');
      expect(loaded).toEqual(updatedData);
    });

    it('should delete data', async () => {
      const testData = { name: 'test' };
      await adapter.save('test-key', testData);
      await adapter.delete('test-key');
      
      const loaded = await adapter.load('test-key');
      expect(loaded).toBeNull();
    });

    it('should handle non-existent keys', async () => {
      const loaded = await adapter.load('non-existent');
      expect(loaded).toBeNull();
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Insert test data
      await adapter.save('key1', { type: 'user', name: 'Alice', age: 30 });
      await adapter.save('key2', { type: 'user', name: 'Bob', age: 25 });
      await adapter.save('key3', { type: 'admin', name: 'Charlie', age: 35 });
    });

    it('should query by simple filter', async () => {
      const results = await adapter.query({ type: 'user' });
      expect(results).toHaveLength(2);
      expect(results.map(r => r.name)).toContain('Alice');
      expect(results.map(r => r.name)).toContain('Bob');
    });

    it('should handle complex filters', async () => {
      const results = await adapter.query({ type: 'user', age: 30 });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Alice');
    });

    it('should handle empty results', async () => {
      const results = await adapter.query({ type: 'non-existent' });
      expect(results).toHaveLength(0);
    });
  });

  describe('Transaction Support', () => {
    it('should handle successful transactions', async () => {
      await adapter.withTransaction(async (client) => {
        await adapter.save('tx-key1', { value: 1 }, client);
        await adapter.save('tx-key2', { value: 2 }, client);
      });

      const value1 = await adapter.load('tx-key1');
      const value2 = await adapter.load('tx-key2');
      expect(value1).toEqual({ value: 1 });
      expect(value2).toEqual({ value: 2 });
    });

    it('should rollback failed transactions', async () => {
      try {
        await adapter.withTransaction(async (client) => {
          await adapter.save('tx-key1', { value: 1 }, client);
          throw new Error('Test error');
        });
      } catch (error) {
        // Expected error
      }

      const value = await adapter.load('tx-key1');
      expect(value).toBeNull();
    });
  });
}); 