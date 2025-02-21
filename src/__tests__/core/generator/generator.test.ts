import { AppGenerator } from '../../../core/generator/generator';
import { GeneratorOptions } from '../../../core/generator/types';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as os from 'os';

describe('AppGenerator', () => {
  let generator: AppGenerator;
  let tempDir: string;

  beforeEach(async () => {
    generator = new AppGenerator();
    tempDir = await fs.mkdtemp(join(os.tmpdir(), 'aiframe-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should generate a basic project structure', async () => {
    const options: GeneratorOptions = {
      name: 'test-app',
      description: 'Test application',
      author: 'Test Author',
      version: '0.1.0',
      features: ['basic'],
      database: 'none',
      targetDir: tempDir
    };

    const result = await generator.generate(options);

    // Check if essential files were created
    const files = await fs.readdir(tempDir);
    expect(files).toContain('package.json');
    expect(files).toContain('tsconfig.json');
    expect(files).toContain('.gitignore');
    expect(files).toContain('README.md');
    expect(files).toContain('src');

    // Check package.json content
    const packageJson = JSON.parse(
      await fs.readFile(join(tempDir, 'package.json'), 'utf-8')
    );
    expect(packageJson.name).toBe('test-app');
    expect(packageJson.version).toBe('0.1.0');
    expect(packageJson.description).toBe('Test application');
    expect(packageJson.author).toBe('Test Author');

    // Check src directory structure
    const srcFiles = await fs.readdir(join(tempDir, 'src'));
    expect(srcFiles).toContain('server.ts');
    expect(srcFiles).toContain('components');
    expect(srcFiles).toContain('templates');
  });

  it('should generate a project with postgres database', async () => {
    const options: GeneratorOptions = {
      name: 'test-app-pg',
      description: 'Test application with PostgreSQL',
      author: 'Test Author',
      version: '0.1.0',
      features: ['basic'],
      database: 'postgres',
      targetDir: tempDir
    };

    await generator.generate(options);

    // Check for database-specific files
    const files = await fs.readdir(tempDir);
    expect(files).toContain('.env.example');

    const envExample = await fs.readFile(join(tempDir, '.env.example'), 'utf-8');
    expect(envExample).toContain('POSTGRES_HOST');
    expect(envExample).toContain('POSTGRES_PORT');
    expect(envExample).toContain('POSTGRES_DB');

    // Check package.json for postgres dependencies
    const packageJson = JSON.parse(
      await fs.readFile(join(tempDir, 'package.json'), 'utf-8')
    );
    expect(packageJson.dependencies).toHaveProperty('pg');
    expect(packageJson.devDependencies).toHaveProperty('@types/pg');
  });
}); 