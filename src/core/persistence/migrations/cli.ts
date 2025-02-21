#!/usr/bin/env node
import { Pool } from 'pg';
import { MigrationRunner } from './runner';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

interface CliOptions {
  command: 'create' | 'up' | 'down' | 'status' | 'reset';
  name?: string;
  steps?: number;
  config?: string;
}

async function main() {
  const options = parseArgs();
  const config = await loadConfig(options.config);
  const pool = new Pool(config.database);
  const runner = new MigrationRunner(pool, config.migrations);

  try {
    switch (options.command) {
      case 'create':
        await createMigration(options.name || 'migration');
        break;
      
      case 'up':
        const upResults = await runner.up();
        console.log('Applied migrations:');
        for (const result of upResults) {
          console.log(
            `${result.status === 'success' ? '✓' : '✗'} ${result.name} (${result.duration}ms)`
          );
          if (result.error) {
            console.error(result.error);
          }
        }
        break;

      case 'down':
        const downResults = await runner.down(options.steps);
        console.log('Rolled back migrations:');
        for (const result of downResults) {
          console.log(
            `${result.status === 'success' ? '✓' : '✗'} ${result.name} (${result.duration}ms)`
          );
          if (result.error) {
            console.error(result.error);
          }
        }
        break;

      case 'reset':
        const resetResults = await runner.reset();
        console.log('Reset all migrations:');
        for (const result of resetResults) {
          console.log(
            `${result.status === 'success' ? '✓' : '✗'} ${result.name} (${result.duration}ms)`
          );
          if (result.error) {
            console.error(result.error);
          }
        }
        break;

      case 'status':
        const status = await runner.status();
        console.log('Applied migrations:');
        for (const migration of status.applied) {
          console.log(`✓ ${migration.name} (applied at ${migration.appliedAt})`);
        }
        console.log('\nPending migrations:');
        for (const migration of status.pending) {
          console.log(`- ${migration.name}`);
        }
        break;
    }
  } finally {
    await pool.end();
  }
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    command: 'status'
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--name':
        options.name = args[++i];
        break;
      case '--steps':
        options.steps = parseInt(args[++i], 10);
        break;
      case '--config':
        options.config = args[++i];
        break;
      default:
        if (!args[i].startsWith('-')) {
          options.command = args[i] as CliOptions['command'];
        }
    }
  }

  return options;
}

async function loadConfig(configPath = 'aiframe.config.json') {
  const path = join(process.cwd(), configPath);
  try {
    const content = await fs.readFile(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return {
      database: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'aiframe',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres'
      },
      migrations: {
        schema: 'public',
        table: 'migrations',
        migrationsDir: join(process.cwd(), 'migrations')
      }
    };
  }
}

async function createMigration(name: string) {
  const timestamp = Date.now();
  const id = createHash('sha256')
    .update(`${timestamp}-${name}`)
    .digest('hex')
    .slice(0, 8);
    
  const filename = `${timestamp}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ts`;
  const path = join(process.cwd(), 'migrations', filename);

  const content = `import { Migration } from '../src/core/persistence/migrations/types';
import { Pool } from 'pg';

const migration: Migration = {
  id: '${id}',
  name: '${name}',
  timestamp: ${timestamp},

  async up(client: Pool): Promise<void> {
    // Add your migration code here
    await client.query(\`
      -- Your SQL here
    \`);
  },

  async down(client: Pool): Promise<void> {
    // Add your rollback code here
    await client.query(\`
      -- Your rollback SQL here
    \`);
  }
};

export = migration;
`;

  await fs.mkdir(join(process.cwd(), 'migrations'), { recursive: true });
  await fs.writeFile(path, content, 'utf-8');
  console.log(`Created migration: ${filename}`);
}

main().catch(console.error); 