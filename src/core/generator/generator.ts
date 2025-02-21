import { GeneratorOptions, GeneratorResult, TemplateData } from './types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const VALID_FEATURES = ['basic', 'auth', 'api'];
const VALID_NAME_REGEX = /^[a-z0-9-]+$/;

export class AppGenerator {
  private readonly templates = new Map<string, string>();
  private readonly baseDir: string;

  constructor() {
    this.baseDir = join(__dirname, 'templates');
  }

  async generate(options: GeneratorOptions): Promise<GeneratorResult> {
    // Validate project name
    if (!VALID_NAME_REGEX.test(options.name)) {
      throw new Error('Invalid project name. Use only lowercase letters, numbers, and hyphens.');
    }

    const targetDir = options.targetDir || options.name;
    const templateData = this.createTemplateData(options);
    
    // Check if directory exists and is not empty
    try {
      const stats = await fs.stat(targetDir);
      if (stats.isDirectory()) {
        const files = await fs.readdir(targetDir);
        if (files.length > 0) {
          throw new Error('Directory not empty');
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    try {
      // Create project directory
      await fs.mkdir(targetDir, { recursive: true });
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to create directory: ${err.message}`);
    }

    // Validate features
    if (options.features) {
      const invalidFeatures = options.features.filter(f => !VALID_FEATURES.includes(f));
      if (invalidFeatures.length > 0) {
        throw new Error(`Invalid features: ${invalidFeatures.join(', ')}`);
      }
    }

    // Generate project structure
    const files = await this.generateProjectStructure(targetDir, templateData);

    // Generate package.json
    const dependencies = this.getDependencies(templateData);
    const devDependencies = this.getDevDependencies(templateData);
    const scripts = this.getScripts(templateData);

    await this.generatePackageJson(targetDir, {
      name: templateData.name,
      version: templateData.version,
      description: templateData.description,
      author: templateData.author,
      dependencies,
      devDependencies,
      scripts
    });

    // Initialize git repository
    try {
      execSync('git init', { cwd: targetDir });
      await this.generateGitignore(targetDir);
    } catch (error) {
      console.warn('Failed to initialize git repository:', error);
    }

    return {
      path: targetDir,
      files,
      dependencies,
      devDependencies,
      scripts
    };
  }

  private createTemplateData(options: GeneratorOptions): TemplateData {
    return {
      name: options.name,
      description: options.description || `A web application built with AIFrame`,
      author: options.author || process.env.USER || 'unknown',
      version: options.version || '0.1.0',
      features: options.features || ['basic'],
      database: options.database || 'none',
      year: new Date().getFullYear()
    };
  }

  private async generateProjectStructure(
    targetDir: string,
    data: TemplateData
  ): Promise<string[]> {
    const files: string[] = [];

    // Create basic directory structure
    const dirs = [
      'src/components',
      'src/features',
      'src/templates',
      'src/public',
      'src/public/css',
      'src/public/js',
      'migrations',
      'tests',
      '.cursor/rules'
    ];

    for (const dir of dirs) {
      await fs.mkdir(join(targetDir, dir), { recursive: true });
    }

    // Generate base files
    await this.generateTsConfig(targetDir);
    await this.generateReadme(targetDir, data);
    await this.generateMainServer(targetDir, data);
    await this.generateBaseComponent(targetDir);
    await this.generateBaseTemplates(targetDir, data);
    await this.generateEnvExample(targetDir, data);
    await this.generateJestConfig(targetDir);
    await this.generateCursorRules(targetDir, data);

    // Generate feature-specific files
    if (data.features?.includes('auth')) {
      await this.generateAuthFeature(targetDir);
    }

    if (data.features?.includes('api')) {
      await this.generateApiFeature(targetDir);
    }

    // Generate database configuration if needed
    if (data.database !== 'none') {
      await this.generateDatabaseConfig(targetDir, data);
    }

    return files;
  }

  private async generatePackageJson(
    targetDir: string,
    data: {
      name: string;
      version: string;
      description: string;
      author: string;
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
    }
  ): Promise<void> {
    const content = JSON.stringify(
      {
        name: data.name,
        version: data.version,
        description: data.description,
        author: data.author,
        main: 'dist/server.ts',
        scripts: data.scripts,
        dependencies: data.dependencies,
        devDependencies: data.devDependencies
      },
      null,
      2
    );

    await fs.writeFile(join(targetDir, 'package.json'), content);
  }

  private async generateTsConfig(targetDir: string): Promise<void> {
    const content = JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          lib: ['dom', 'es2020'],
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          outDir: './dist',
          rootDir: './src',
          declaration: true,
          sourceMap: true
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist', 'tests']
      },
      null,
      2
    );

    await fs.writeFile(join(targetDir, 'tsconfig.json'), content);
  }

  private async generateGitignore(targetDir: string): Promise<void> {
    const content = `
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build output
dist/
build/

# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.iml
*.iws

# OS
.DS_Store
Thumbs.db
`;

    await fs.writeFile(join(targetDir, '.gitignore'), content.trim());
  }

  private async generateReadme(targetDir: string, data: TemplateData): Promise<void> {
    const content = `# ${data.name}

${data.description}

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

4. Visit http://localhost:3000

## Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm start\` - Start production server
- \`npm test\` - Run tests

## Features

${data.features.map(f => `- ${f}`).join('\n')}

## Database

${data.database === 'none' 
  ? 'No database configured.' 
  : `Using ${data.database} for data persistence.`}

## License

Copyright © ${data.year} ${data.author}
`;

    await fs.writeFile(join(targetDir, 'README.md'), content);
  }

  private async generateMainServer(targetDir: string, data: TemplateData): Promise<void> {
    const content = `import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import path from 'path';
import { Runtime } from 'aiframe';

const app = express();
const port = process.env.PORT || 3000;

// Initialize framework runtime
const runtime = new Runtime(path.join(__dirname, 'templates'));

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'development-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(csrf({ cookie: true }));

// Set up EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

app.listen(port, () => {
  console.log(\`Server running at http://localhost:\${port}\`);
});
`;

    await fs.writeFile(join(targetDir, 'src/server.ts'), content);
  }

  private async generateBaseComponent(targetDir: string): Promise<void> {
    const content = `import { ServerComponent, ViewData } from 'aiframe';
import { Request, Response } from 'express';

export const homeIntent = {
  name: 'home',
  description: 'Home page component',
  capabilities: ['view'],
  dataStructure: {},
  userActions: [
    {
      name: 'view',
      description: 'View the home page',
      method: 'GET',
      path: '/',
      expectedOutcome: 'Display the home page'
    }
  ]
};

export class HomeComponent implements ServerComponent {
  intent = homeIntent;

  async render(data: ViewData): Promise<string> {
    return \`
      <div class="home">
        <h1>Welcome</h1>
        <p>Your new AIFrame application is ready!</p>
      </div>
    \`;
  }

  async handleAction(req: Request, res: Response): Promise<void> {
    res.redirect('/');
  }

  getState(): unknown {
    return {};
  }
}
`;

    await fs.writeFile(join(targetDir, 'src/components/home.component.ts'), content);
  }

  private async generateBaseTemplates(targetDir: string, data: TemplateData): Promise<void> {
    const templatesDir = join(targetDir, 'src/templates');

    // Layout template
    const layoutTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %></title>
    <link rel="stylesheet" href="/css/main.css">
</head>
<body>
    <% if (flash) { %>
        <div class="flash flash-<%= flash.type %>">
            <%= flash.message %>
        </div>
    <% } %>
    
    <%- body %>

    <script src="/js/main.js"></script>
</body>
</html>`;

    // Error template
    const errorTemplate = `<%- include('layout', {
  title: 'Error',
  body: \`
    <div class="error-page">
      <h1>Error</h1>
      <p><%= message %></p>
      <% if (error && process.env.NODE_ENV === 'development') { %>
        <pre><%= error.stack %></pre>
      <% } %>
      <a href="/" class="button">Return Home</a>
    </div>
  \`
}) %>`;

    // Index template
    const indexTemplate = `<%- include('layout', {
  title: 'Welcome',
  body: \`
    <div class="welcome">
      <h1>Welcome to <%= name %></h1>
      <p><%= description %></p>
    </div>
  \`
}) %>`;

    await fs.writeFile(join(templatesDir, 'layout.ejs'), layoutTemplate);
    await fs.writeFile(join(templatesDir, 'error.ejs'), errorTemplate);
    await fs.writeFile(join(templatesDir, 'index.ejs'), indexTemplate);

    if (data.features?.includes('auth')) {
      const loginTemplate = `<%- include('layout', {
  title: 'Login',
  body: \`
    <div class="auth-form">
      <h1>Login</h1>
      <form method="POST" action="/auth/login">
        <input type="hidden" name="_csrf" value="<%= csrfToken %>">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required>
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  \`
}) %>`;

      const registerTemplate = `<%- include('layout', {
  title: 'Register',
  body: \`
    <div class="auth-form">
      <h1>Register</h1>
      <form method="POST" action="/auth/register">
        <input type="hidden" name="_csrf" value="<%= csrfToken %>">
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required>
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required>
        </div>
        <button type="submit">Register</button>
      </form>
    </div>
  \`
}) %>`;

      await fs.writeFile(join(templatesDir, 'login.ejs'), loginTemplate);
      await fs.writeFile(join(templatesDir, 'register.ejs'), registerTemplate);
    }
  }

  private async generateAuthFeature(targetDir: string): Promise<void> {
    const authDir = join(targetDir, 'src/features/auth');
    await fs.mkdir(authDir, { recursive: true });

    // Auth component
    const authComponent = `import { ServerComponent, ViewData } from '../../core/types';
import { Request, Response } from 'express';
import { authIntent } from './intent';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AuthComponent implements ServerComponent {
  intent = authIntent;

  async render(data: ViewData): Promise<string> {
    return data.template === 'login' ? 
      await runtime.renderTemplate('login', data) :
      await runtime.renderTemplate('register', data);
  }

  async handleAction(req: Request, res: Response): Promise<void> {
    // Implementation
  }

  getState(): unknown {
    return {};
  }
}`;

    // Auth intent
    const authIntent = `import { Intent } from '../../core/types';

export const authIntent: Intent = {
  name: 'auth',
  description: 'Authentication and authorization component',
  capabilities: ['login', 'register', 'logout'],
  dataStructure: {
    user: 'User | null'
  },
  userActions: [
    {
      name: 'login',
      description: 'Log in to the application',
      method: 'POST',
      path: '/auth/login',
      expectedOutcome: 'User is authenticated'
    },
    {
      name: 'register',
      description: 'Register a new user account',
      method: 'POST',
      path: '/auth/register',
      expectedOutcome: 'New user account is created'
    },
    {
      name: 'logout',
      description: 'Log out from the application',
      method: 'POST',
      path: '/auth/logout',
      expectedOutcome: 'User is logged out'
    }
  ]
};`;

    await fs.writeFile(join(authDir, 'component.ts'), authComponent);
    await fs.writeFile(join(authDir, 'intent.ts'), authIntent);
  }

  private async generateApiFeature(targetDir: string): Promise<void> {
    const apiDir = join(targetDir, 'src/features/api');
    await fs.mkdir(apiDir, { recursive: true });

    // API component
    const apiComponent = `import { ServerComponent, ViewData } from '../../core/types';
import { Request, Response } from 'express';
import { apiIntent } from './intent';

export class ApiComponent implements ServerComponent {
  intent = apiIntent;

  async render(data: ViewData): Promise<string> {
    return '';  // API endpoints don't render HTML
  }

  async handleAction(req: Request, res: Response): Promise<void> {
    // Implementation
  }

  getState(): unknown {
    return {};
  }
}`;

    // API intent
    const apiIntent = `import { Intent } from '../../core/types';

export const apiIntent: Intent = {
  name: 'api',
  description: 'RESTful API endpoints',
  capabilities: ['crud'],
  dataStructure: {},
  userActions: [
    {
      name: 'create',
      description: 'Create a new resource',
      method: 'POST',
      path: '/api/:resource',
      expectedOutcome: 'New resource is created'
    },
    {
      name: 'read',
      description: 'Read a resource',
      method: 'GET',
      path: '/api/:resource/:id',
      expectedOutcome: 'Resource data is returned'
    },
    {
      name: 'update',
      description: 'Update a resource',
      method: 'PUT',
      path: '/api/:resource/:id',
      expectedOutcome: 'Resource is updated'
    },
    {
      name: 'delete',
      description: 'Delete a resource',
      method: 'DELETE',
      path: '/api/:resource/:id',
      expectedOutcome: 'Resource is deleted'
    }
  ]
};`;

    await fs.writeFile(join(apiDir, 'component.ts'), apiComponent);
    await fs.writeFile(join(apiDir, 'intent.ts'), apiIntent);
  }

  private async generateEnvExample(targetDir: string, data: TemplateData): Promise<void> {
    const envTemplate = (data: TemplateData) => `
# Server Configuration
PORT=3000
NODE_ENV=development

${data.database === 'postgres' ? `
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=${data.name}_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
` : ''}
${data.database === 'sqlite' ? `
# SQLite Configuration
SQLITE_FILE=./${data.name}.db
` : ''}
`;

    await fs.writeFile(join(targetDir, '.env.example'), envTemplate(data));
  }

  private async generateJestConfig(targetDir: string): Promise<void> {
    const content = `/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};`;

    await fs.writeFile(join(targetDir, 'jest.config.js'), content);
  }

  private async generateDatabaseConfig(targetDir: string, data: TemplateData): Promise<void> {
    if (data.database === 'postgres') {
      const content = `import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});`;

      await fs.writeFile(join(targetDir, 'src/database.ts'), content);
    } else if (data.database === 'sqlite') {
      const content = `import { PersistenceFactory } from './core/persistence/factory';

export const dbConfig = {
  type: 'sqlite' as const,
  filename: process.env.SQLITE_FILE || './${data.name}.db'
};`;

      await fs.writeFile(join(targetDir, 'src/database.ts'), content);
    }
  }

  private getDependencies(data: TemplateData): Record<string, string> {
    const deps: Record<string, string> = {
      'aiframe': '^0.1.0',
      'express': '^4.18.2',
      'express-session': '^1.17.3',
      'cookie-parser': '^1.4.6',
      'csurf': '^1.11.0',
      'ejs': '^3.1.9'
    };

    if (data.database === 'postgres') {
      deps['pg'] = '^8.13.3';
    } else if (data.database === 'sqlite') {
      deps['sqlite3'] = '^5.1.7';
    }

    if (data.features?.includes('auth')) {
      deps['bcrypt'] = '^5.1.1';
      deps['jsonwebtoken'] = '^9.0.2';
    }

    if (data.features?.includes('api')) {
      deps['cors'] = '^2.8.5';
      deps['helmet'] = '^7.1.0';
    }

    return deps;
  }

  private getDevDependencies(data: TemplateData): Record<string, string> {
    const deps: Record<string, string> = {
      '@types/express': '^4.17.21',
      '@types/express-session': '^1.17.10',
      '@types/cookie-parser': '^1.4.6',
      '@types/csurf': '^1.11.5',
      '@types/ejs': '^3.1.5',
      '@types/jest': '^29.5.14',
      '@types/node': '^20.0.0',
      'jest': '^29.5.0',
      'ts-jest': '^29.1.0',
      'ts-node-dev': '^2.0.0',
      'typescript': '^5.0.0'
    };

    if (data.database === 'postgres') {
      deps['@types/pg'] = '^8.11.11';
    } else if (data.database === 'sqlite') {
      deps['@types/sqlite3'] = '^3.1.11';
    }

    if (data.features?.includes('auth')) {
      deps['@types/bcrypt'] = '^5.0.2';
      deps['@types/jsonwebtoken'] = '^9.0.5';
    }

    if (data.features?.includes('api')) {
      deps['@types/cors'] = '^2.8.17';
    }

    return deps;
  }

  private getScripts(data: TemplateData): Record<string, string> {
    const scripts: Record<string, string> = {
      'build': 'tsc',
      'dev': 'ts-node-dev --respawn --transpile-only src/server.ts',
      'start': 'node dist/server.ts',
      'test': 'jest'
    };

    if (data.database === 'postgres') {
      scripts['migrate'] = 'aiframe-migrate';
      scripts['migrate:create'] = 'aiframe-migrate create';
      scripts['migrate:up'] = 'aiframe-migrate up';
      scripts['migrate:down'] = 'aiframe-migrate down';
    }

    return scripts;
  }

  private async generateCursorRules(targetDir: string, data: TemplateData): Promise<void> {
    // Framework Usage Rule
    const frameworkRule = `description: AIFrame Application Guidelines
A guide to building applications with AIFrame.

patterns: ["**/*.ts", "**/*.tsx"]

rules:
  - Follow the component-based architecture
  - Create intent files for all components
  - Use TypeScript with strict mode
  - Handle errors gracefully
  - Document component purposes
  - Write comprehensive tests

Getting Started:
  - Create components in src/components/
  - Define intents in src/features/
  - Add templates in src/templates/
  - Write tests in tests/

@file src/server.ts
@file README.md`;

    // Components Rule
    const componentsRule = `description: AIFrame Component Development
Guidelines for creating and modifying application components.

patterns: ["src/components/**/*.ts", "src/features/**/*.ts"]

rules:
  - Implement ServerComponent interface
  - Create intent file for each component
  - Keep component state immutable
  - Handle all errors gracefully
  - Use proper type definitions
  - Follow naming conventions

Component Structure:
  - intent: Describes purpose and capabilities
  - render: Returns HTML string
  - handleAction: Processes user actions
  - getState: Returns current state

@file src/components/home.component.ts`;

    // Database Rule
    const databaseRule = `description: AIFrame Database Usage
Guidelines for database operations in your application.

patterns: ["src/core/persistence/**/*.ts", "migrations/**/*.ts"]

rules:
  - Use provided adapter interfaces
  - Handle database errors properly
  - Use migrations for schema changes
  - Include rollback functionality
  - Use transactions when needed
  - Keep database logic isolated

@file src/core/persistence/types.ts
${data.database === 'postgres' ? '@file src/core/persistence/postgres.adapter.ts' : ''}
${data.database === 'sqlite' ? '@file src/core/persistence/sqlite.adapter.ts' : ''}`;

    // Templates Rule
    const templatesRule = `description: AIFrame Template Development
Guidelines for working with templates in your application.

patterns: ["src/templates/**/*.ejs"]

rules:
  - Extend the base layout template
  - Escape all user-generated content
  - Include CSRF tokens in forms
  - Keep logic in components
  - Follow HTML5 standards
  - Maintain accessibility

@file src/templates/layout.ejs`;

    // Testing Rule
    const testingRule = `description: AIFrame Testing Guidelines
Rules for testing your application.

patterns: ["tests/**/*.test.ts", "**/*.test.ts"]

rules:
  - Test all components
  - Cover success and error cases
  - Mock external dependencies
  - Use test utilities
  - Follow AAA pattern
  - Test intent implementations

@file tests/setup.ts
@file jest.config.js`;

    await fs.writeFile(join(targetDir, '.cursor/rules/framework.mdc'), frameworkRule);
    await fs.writeFile(join(targetDir, '.cursor/rules/components.mdc'), componentsRule);
    await fs.writeFile(join(targetDir, '.cursor/rules/database.mdc'), databaseRule);
    await fs.writeFile(join(targetDir, '.cursor/rules/templates.mdc'), templatesRule);
    await fs.writeFile(join(targetDir, '.cursor/rules/testing.mdc'), testingRule);
  }
} 