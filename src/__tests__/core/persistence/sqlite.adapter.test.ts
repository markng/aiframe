import { SQLiteAdapter } from '../../../core/persistence/sqlite.adapter';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as os from 'os';

describe('SQLiteAdapter', () => {
  let adapter: SQLiteAdapter<any>;
  let tempDir: string;
  let dbPath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(join(os.tmpdir(), 'aiframe-test-'));
    dbPath = join(tempDir, 'test.db');
    adapter = new SQLiteAdapter({
      filename: dbPath,
      table: 'test_table'
    });
  });

  afterEach(async () => {
    await adapter.disconnect();
    await fs.rm(tempDir, { recursive: true, force: true });
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
      await adapter.withTransaction(async (db) => {
        await adapter.save('tx-key1', { value: 1 });
        await adapter.save('tx-key2', { value: 2 });
      });

      const value1 = await adapter.load('tx-key1');
      const value2 = await adapter.load('tx-key2');
      expect(value1).toEqual({ value: 1 });
      expect(value2).toEqual({ value: 2 });
    });

    it('should rollback failed transactions', async () => {
      try {
        await adapter.withTransaction(async (db) => {
          await adapter.save('tx-key1', { value: 1 });
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