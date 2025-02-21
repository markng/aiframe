import { GeneratorOptions, GeneratorResult, TemplateData } from './types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export class AppGenerator {
  private readonly templates = new Map<string, string>();
  private readonly baseDir: string;

  constructor() {
    this.baseDir = join(__dirname, 'templates');
  }

  async generate(options: GeneratorOptions): Promise<GeneratorResult> {
    const targetDir = options.targetDir || options.name;
    const templateData = this.createTemplateData(options);
    
    // Create project directory
    await fs.mkdir(targetDir, { recursive: true });

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
      'tests'
    ];

    for (const dir of dirs) {
      await fs.mkdir(join(targetDir, dir), { recursive: true });
    }

    // Generate base files
    await this.generateTsConfig(targetDir);
    await this.generateReadme(targetDir, data);
    await this.generateMainServer(targetDir, data);
    await this.generateBaseComponent(targetDir);
    await this.generateBaseTemplate(targetDir);
    await this.generateEnvExample(targetDir, data);
    await this.generateJestConfig(targetDir);

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
        main: 'dist/server.js',
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

  private async generateBaseTemplate(targetDir: string): Promise<void> {
    const content = `<!DOCTYPE html>
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

    await fs.writeFile(join(targetDir, 'src/templates/layout.ejs'), content);
  }

  private async generateEnvExample(targetDir: string, data: TemplateData): Promise<void> {
    const content = `# Server Configuration
PORT=3000
NODE_ENV=development
SESSION_SECRET=your-secret-key

${data.database === 'postgres' ? `
# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=your_database
POSTGRES_USER=your_user
POSTGRES_PASSWORD=your_password
` : ''}

${data.database === 'mongodb' ? `
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/your_database
` : ''}
`;

    await fs.writeFile(join(targetDir, '.env.example'), content);
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
    } else if (data.database === 'mongodb') {
      const content = `import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database';
export const client = new MongoClient(uri);

export async function connect() {
  await client.connect();
  return client.db();
}`;

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
    } else if (data.database === 'mongodb') {
      deps['mongodb'] = '^6.13.1';
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
      'typescript': '^5.0.0',
      'ts-node-dev': '^2.0.0'
    };

    if (data.database === 'postgres') {
      deps['@types/pg'] = '^8.11.11';
    } else if (data.database === 'mongodb') {
      deps['@types/mongodb'] = '^4.0.6';
    }

    return deps;
  }

  private getScripts(data: TemplateData): Record<string, string> {
    const scripts: Record<string, string> = {
      'build': 'tsc',
      'dev': 'ts-node-dev --respawn --transpile-only src/server.ts',
      'start': 'node dist/server.js',
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
} 