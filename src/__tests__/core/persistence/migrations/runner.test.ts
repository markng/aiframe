import { MigrationRunner } from '../../../../core/persistence/migrations/runner';
import { Migration } from '../../../../core/persistence/migrations/types';
import { Pool } from 'pg';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MigrationRunner', () => {
  let runner: MigrationRunner;
  let pool: Pool;
  let migrationsDir: string;
  let isDbAvailable = false;

  beforeAll(async () => {
    // Create a unique temp directory for migrations
    migrationsDir = join(tmpdir(), `aiframe-test-${Date.now()}`);
    await fs.mkdir(migrationsDir, { recursive: true });

    // Create test migrations
    await createTestMigration('001-create-users', 1);
    await createTestMigration('002-add-email', 2);
    await createTestMigration('003-add-roles', 3);

    // Connect to test database
    pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'test',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres'
    });

    try {
      await pool.query('SELECT 1');
      isDbAvailable = true;

      runner = new MigrationRunner(pool, {
        schema: 'test_migrations',
        table: 'test_migrations',
        migrationsDir
      });

      // Initialize schema
      await pool.query('DROP SCHEMA IF EXISTS test_migrations CASCADE');
    } catch (error) {
      console.warn('PostgreSQL not available, skipping tests');
    }
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
    await fs.rm(migrationsDir, { recursive: true, force: true });
  });

  async function createTestMigration(name: string, version: number): Promise<void> {
    const timestamp = Date.now() + version;
    const content = `
      module.exports = {
        id: 'test-${version}',
        name: '${name}',
        timestamp: ${timestamp},
        async up(client) {
          await client.query(\`
            -- Migration ${version} up
            SELECT ${version} as version;
          \`);
        },
        async down(client) {
          await client.query(\`
            -- Migration ${version} down
            SELECT ${version} as version;
          \`);
        }
      };
    `;

    const path = join(migrationsDir, `${name}.js`);
    await fs.writeFile(path, content);
  }

  beforeEach(() => {
    if (!isDbAvailable) {
      return;
    }
  });

  describe('Initialization', () => {
    it('should create migrations table', async () => {
      if (!isDbAvailable) {
        return;
      }
      await runner.initialize();

      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'test_migrations'
        AND table_name = 'test_migrations';
      `);

      expect(result.rows).toHaveLength(1);
    });
  });

  describe('Migration Operations', () => {
    beforeEach(async () => {
      await runner.initialize();
      await pool.query(`
        TRUNCATE TABLE test_migrations.test_migrations;
      `);
    });

    it('should apply migrations in order', async () => {
      const results = await runner.up();
      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'success')).toBe(true);

      const applied = await runner.getAppliedMigrations();
      expect(applied).toHaveLength(3);
      expect(applied.map(m => m.name)).toEqual([
        '001-create-users',
        '002-add-email',
        '003-add-roles'
      ]);
    });

    it('should rollback migrations', async () => {
      // First apply all migrations
      await runner.up();

      // Rollback one migration
      const results = await runner.down(1);
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('003-add-roles');

      const applied = await runner.getAppliedMigrations();
      expect(applied).toHaveLength(2);
    });

    it('should reset all migrations', async () => {
      // First apply all migrations
      await runner.up();

      // Reset everything
      const results = await runner.reset();
      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'success')).toBe(true);

      const applied = await runner.getAppliedMigrations();
      expect(applied).toHaveLength(0);
    });

    it('should report migration status', async () => {
      // Apply first two migrations
      await runner.up();
      await runner.down(1);

      const status = await runner.status();
      expect(status.applied).toHaveLength(2);
      expect(status.pending).toHaveLength(1);
      expect(status.pending[0].name).toBe('003-add-roles');
    });
  });

  describe('Error Handling', () => {
    it('should rollback failed migrations', async () => {
      // Create a failing migration
      const timestamp = Date.now() + 4;
      const content = `
        module.exports = {
          id: 'test-4',
          name: '004-fail',
          timestamp: ${timestamp},
          async up(client) {
            throw new Error('Test error');
          },
          async down(client) {
            await client.query('SELECT 1');
          }
        };
      `;

      const failingPath = join(migrationsDir, '004-fail.js');
      await fs.writeFile(failingPath, content);

      const results = await runner.up();
      expect(results.find(r => r.name === '004-fail')?.status).toBe('error');

      const applied = await runner.getAppliedMigrations();
      expect(applied.find(m => m.name === '004-fail')).toBeUndefined();
    });
  });
}); 