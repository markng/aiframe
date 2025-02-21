# AIFrame

A server-side web framework optimized for AI-human collaboration. AIFrame is designed to make it easy for AI agents to understand, modify, and maintain web applications while working alongside human developers.

## Key Features

- **Intent-Based Architecture**: Components are defined by their intent, making it clear what each piece of the application does
- **Server-Side Rendering**: Clean, simple HTML generation with type-safe templates
- **Built-in Security**: CSRF protection and secure session handling
- **AI-Friendly Structure**: Clear organization and metadata for AI comprehension

## Project Structure

```
/src
  /core              # Framework core
    /types.ts        # Type definitions
    /runtime.ts      # Framework runtime
    /templates.ts    # Template engine
  /features          # Application features
    /_manifests      # Intent definitions
    /_templates      # Feature templates
  /templates         # Global templates
  /server.ts         # Server setup
```

## Component Example

Components in AIFrame are defined by their intent and implementation:

```typescript
// Intent definition
export const counterIntent: Intent = {
  name: 'counter',
  description: 'A simple counter that can be incremented or decremented',
  capabilities: ['increment', 'decrement', 'reset'],
  dataStructure: {
    count: 'number'
  },
  userActions: [
    {
      name: 'increment',
      method: 'POST',
      path: '/counter/increment',
      description: 'Increase the counter by one',
      expectedOutcome: 'The counter value will increase by 1'
    }
    // ... other actions
  ]
};

// Component implementation
export class CounterComponent implements ServerComponent {
  intent = counterIntent;
  private state = { count: 0 };

  async render(data: ViewData): Promise<string> {
    return `
      <div class="counter">
        <h1>Counter Example</h1>
        <div class="counter-display">Count: ${this.state.count}</div>
        <!-- ... action forms ... -->
      </div>
    `;
  }

  async handleAction(req: Request, res: Response): Promise<void> {
    // ... handle actions ...
  }
}
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Visit http://localhost:3000

## Development

- `npm run build` - Build the TypeScript code
- `npm run dev` - Start development server with hot reload
- `npm test` - Run tests
- `npm start` - Start production server

## Why AIFrame?

AIFrame is designed to make web development more accessible to AI agents by:

1. **Clear Intent**: Every component explicitly declares what it does and how it can be used
2. **Type Safety**: TypeScript throughout ensures reliable code generation
3. **Predictable Structure**: Consistent organization makes it easy to locate and modify code
4. **Metadata Rich**: Additional context helps AI understand the codebase
5. **Security First**: Built-in security features prevent common vulnerabilities

## Contributing

This framework is in early development. Contributions and suggestions are welcome!

### Running Tests

The test suite includes both unit tests and integration tests. Some tests require a PostgreSQL database.

1. Set up PostgreSQL for integration tests:
   ```bash
   # Create a test database and user
   createdb aiframe_test
   createuser -s postgres  # Create superuser if it doesn't exist
   ```

2. Configure test environment:
   ```bash
   # Create .env.test file
   cat > .env.test << EOL
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=aiframe_test
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   EOL
   ```

3. Run the tests:
   ```bash
   # Run all tests
   npm test

   # Run specific test file
   npm test -- src/__tests__/core/runtime.test.ts

   # Run tests with coverage
   npm test -- --coverage
   ```

Note: If PostgreSQL is not available, database-related tests will be skipped.

## Creating a New Application

### Prerequisites
- Node.js (v16.x or later)
- npm (v7.x or later)
- PostgreSQL or MongoDB (optional, if using a database)

### Installation

1. Create a new directory for your project and initialize it:
   ```bash
   mkdir my-app
   cd my-app
   git init
   ```

2. Install AIFrame from GitHub:
   ```bash
   npm install markng/aiframe
   ```

3. Initialize a new AIFrame application:
   ```bash
   npx create-aiframe-app
   ```

   Or clone the starter template:
   ```bash
   git clone https://github.com/markng/aiframe-starter.git .
   rm -rf .git  # Remove the template's git history
   git init     # Start fresh git history
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Set up your environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

6. If using a database, set up your database configuration:
   ```bash
   # For PostgreSQL
   createdb my_app_db
   npm run migrate:up

   # For MongoDB
   # Ensure MongoDB is running and update MONGODB_URI in .env
   ```

7. Start the development server:
   ```bash
   npm run dev
   ```

8. Visit http://localhost:3000 to see your application running!

### Project Structure

After creation, your project will have the following structure:
```
my-app/
  ├── src/
  │   ├── components/     # Application components
  │   ├── features/       # Feature implementations
  │   ├── templates/      # EJS templates
  │   ├── public/         # Static assets
  │   └── server.ts       # Server entry point
  ├── tests/             # Test files
  ├── migrations/        # Database migrations (if using a database)
  ├── .cursor/
  │   └── rules/         # AI development rules
  ├── .env.example       # Environment variables template
  ├── package.json       # Project configuration
  ├── tsconfig.json      # TypeScript configuration
  └── README.md          # Project documentation
```

### Next Steps

1. Create your first component:
   ```bash
   # Create files manually or use the component generator (coming soon)
   src/features/hello/intent.ts
   src/features/hello/component.ts
   ```

2. Register your component in `src/server.ts`:
   ```typescript
   import { HelloComponent } from './features/hello/component';
   
   const hello = new HelloComponent();
   runtime.registerComponent('hello', hello);
   ```

3. Add a template in `src/templates/hello.ejs`

4. Start developing!

For more detailed guides and examples, check out:
- [Component Development Guide](https://github.com/markng/aiframe/wiki/Component-Development) (coming soon)
- [Database Integration](https://github.com/markng/aiframe/wiki/Database-Integration) (coming soon)
- [Deployment Guide](https://github.com/markng/aiframe/wiki/Deployment) (coming soon) 