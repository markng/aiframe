import { PostgresAdapter, PostgresAdapterConfig } from '../../../core/persistence/postgres.adapter';

describe('PostgresAdapter', () => {
  let adapter: PostgresAdapter<any>;

  beforeEach(async () => {
    try {
      const config: PostgresAdapterConfig = {
        host: process.env.POSTGRES_HOST,
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        table: 'test_table'
      };
      adapter = new PostgresAdapter(config);
      await adapter.initialize();
    } catch (error) {
      console.error('Failed to initialize adapter:', error);
      throw error;
    }
  });

  afterEach(async () => {
    if (adapter) {
      try {
        await adapter.disconnect();
      } catch (error) {
        console.error('Failed to disconnect adapter:', error);
        throw error;
      }
    }
  });

  afterAll(async () => {
    if (adapter) {
      try {
        // Drop the test table using raw pool query
        const pool = adapter['pool'];
        if (pool) {
          await pool.query(`DROP TABLE IF EXISTS ${adapter['schema']}.${adapter['table']}`);
        }
        
        // Then disconnect and cleanup
        await adapter.disconnect();
        
        // Add a small delay to ensure all resources are cleaned up
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Failed to cleanup after tests:', error);
        throw error;
      }
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
  });

  it('should handle connection errors', async () => {
    const invalidConfig: PostgresAdapterConfig = {
      host: 'invalid-host',
      port: 5432,
      database: 'invalid-db',
      user: 'invalid-user',
      password: 'invalid-password',
      table: 'test_table'
    };
    
    const invalidAdapter = new PostgresAdapter(invalidConfig);
    try {
      await expect(invalidAdapter.initialize()).rejects.toThrow();
    } finally {
      await invalidAdapter.disconnect();
    }
  });

  it('should handle missing optional configuration', async () => {
    const minimalConfig: PostgresAdapterConfig = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'test_db',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      table: 'test_table'
    };
    
    const minimalAdapter = new PostgresAdapter(minimalConfig);
    try {
      await minimalAdapter.initialize();
      
      // Test basic operations with minimal config
      await minimalAdapter.save('test-key', { value: 'test' });
      const result = await minimalAdapter.load('test-key');
      expect(result).toEqual({ value: 'test' });
    } finally {
      await minimalAdapter.disconnect();
    }
  });

  it('should handle invalid filter conditions', async () => {
    const invalidFilter = null;
    const result = await adapter.query(invalidFilter);
    expect(result).toEqual([]);

    const invalidTypeFilter = 123;
    const result2 = await adapter.query(invalidTypeFilter);
    expect(result2).toEqual([]);
  });
}); 