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

  describe('Basic Project Generation', () => {
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

    it('should handle missing optional fields', async () => {
      const options: GeneratorOptions = {
        name: 'minimal-app',
        targetDir: tempDir
      };

      const result = await generator.generate(options);
      const packageJson = JSON.parse(
        await fs.readFile(join(tempDir, 'package.json'), 'utf-8')
      );

      expect(packageJson.name).toBe('minimal-app');
      expect(packageJson.version).toBe('0.1.0'); // Default version
      expect(packageJson.description).toMatch(/web application built with AIFrame/);
      expect(packageJson.author).toBeTruthy(); // Should use system user
    });

    it('should validate project name', async () => {
      const invalidOptions: GeneratorOptions = {
        name: '@invalid/name',
        targetDir: tempDir
      };

      await expect(generator.generate(invalidOptions)).rejects.toThrow(/invalid project name/i);
    });
  });

  describe('Database Configuration', () => {
    it('should configure PostgreSQL', async () => {
      const options: GeneratorOptions = {
        name: 'pg-app',
        database: 'postgres',
        targetDir: tempDir
      };

      await generator.generate(options);

      // Check for PostgreSQL specific files
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

      // Check for database configuration file
      const dbConfig = await fs.readFile(join(tempDir, 'src/database.ts'), 'utf-8');
      expect(dbConfig).toContain('Pool');
      expect(dbConfig).toContain('process.env.POSTGRES_HOST');
    });

    it('should configure SQLite', async () => {
      const options: GeneratorOptions = {
        name: 'sqlite-app',
        database: 'sqlite',
        targetDir: tempDir
      };

      await generator.generate(options);

      // Check for SQLite specific files
      const files = await fs.readdir(tempDir);
      expect(files).toContain('.env.example');

      const envExample = await fs.readFile(join(tempDir, '.env.example'), 'utf-8');
      expect(envExample).toContain('SQLITE_FILE');

      // Check package.json for SQLite dependencies
      const packageJson = JSON.parse(
        await fs.readFile(join(tempDir, 'package.json'), 'utf-8')
      );
      expect(packageJson.dependencies).toHaveProperty('sqlite3');
      expect(packageJson.devDependencies).toHaveProperty('@types/sqlite3');

      // Check for database configuration file
      const dbConfig = await fs.readFile(join(tempDir, 'src/database.ts'), 'utf-8');
      expect(dbConfig).toContain('sqlite');
      expect(dbConfig).toContain('process.env.SQLITE_FILE');
    });
  });

  describe('Feature Generation', () => {
    it('should generate basic features', async () => {
      const options: GeneratorOptions = {
        name: 'feature-app',
        features: ['basic'],
        targetDir: tempDir
      };

      await generator.generate(options);

      // Check for basic feature files
      const componentsDir = join(tempDir, 'src/components');
      const files = await fs.readdir(componentsDir);
      expect(files).toContain('home.component.ts');

      const homeComponent = await fs.readFile(
        join(componentsDir, 'home.component.ts'),
        'utf-8'
      );
      expect(homeComponent).toContain('export class HomeComponent');
      expect(homeComponent).toContain('implements ServerComponent');
    });

    it('should handle custom features', async () => {
      const options: GeneratorOptions = {
        name: 'custom-app',
        features: ['basic', 'auth', 'api'],
        targetDir: tempDir
      };

      await generator.generate(options);

      // Check for feature-specific files and configurations
      const files = await fs.readdir(join(tempDir, 'src/features'));
      expect(files).toContain('auth');
      expect(files).toContain('api');

      // Check package.json for feature-specific dependencies
      const packageJson = JSON.parse(
        await fs.readFile(join(tempDir, 'package.json'), 'utf-8')
      );
      expect(packageJson.dependencies).toHaveProperty('express-session');
      expect(packageJson.dependencies).toHaveProperty('cookie-parser');
    });
  });

  describe('Error Handling', () => {
    it('should handle existing directory gracefully', async () => {
      const options: GeneratorOptions = {
        name: 'existing-app',
        targetDir: tempDir
      };

      // Create a file in the target directory
      await fs.writeFile(join(tempDir, 'existing-file.txt'), 'content');

      await expect(generator.generate(options)).rejects.toThrow(/directory not empty/i);
    });

    it('should handle file system errors', async () => {
      const options: GeneratorOptions = {
        name: 'error-app',
        targetDir: '/nonexistent/path'
      };

      await expect(generator.generate(options)).rejects.toThrow(/failed to create directory/i);
    });

    it('should handle invalid feature names', async () => {
      const options: GeneratorOptions = {
        name: 'invalid-feature-app',
        features: ['nonexistent'],
        targetDir: tempDir
      };

      await expect(generator.generate(options)).rejects.toThrow(/invalid feature/i);
    });
  });

  describe('Template Generation', () => {
    it('should generate all required templates', async () => {
      const options: GeneratorOptions = {
        name: 'template-app',
        targetDir: tempDir
      };

      await generator.generate(options);

      const templatesDir = join(tempDir, 'src/templates');
      const files = await fs.readdir(templatesDir);
      expect(files).toContain('layout.ejs');
      expect(files).toContain('error.ejs');
      expect(files).toContain('index.ejs');

      // Check template content
      const layout = await fs.readFile(join(templatesDir, 'layout.ejs'), 'utf-8');
      expect(layout).toContain('<!DOCTYPE html>');
      expect(layout).toContain('<%- body %>');
      expect(layout).toContain('<meta name="viewport"');
    });

    it('should customize templates based on features', async () => {
      const options: GeneratorOptions = {
        name: 'custom-template-app',
        features: ['auth'],
        targetDir: tempDir
      };

      await generator.generate(options);

      const templatesDir = join(tempDir, 'src/templates');
      const files = await fs.readdir(templatesDir);
      expect(files).toContain('login.ejs');
      expect(files).toContain('register.ejs');

      // Check auth-specific template content
      const login = await fs.readFile(join(templatesDir, 'login.ejs'), 'utf-8');
      expect(login).toContain('form');
      expect(login).toContain('csrf');
      expect(login).toContain('password');
    });
  });
}); 