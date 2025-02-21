# CogniFrame

CogniFrame is a server-side web framework optimized for AI-human collaboration, making it easy to build, maintain, and evolve web applications through seamless cooperation between AI agents and human developers.

What makes CogniFrame special:
- **AI-First Design**: Built from the ground up for AI-human collaboration
- **Self-Documenting**: Components describe their purpose and capabilities
- **Type-Safe**: Strong TypeScript integration for reliable code generation
- **Developer Friendly**: Clear structure and conventions that both AI and humans understand

## Quick Start

```bash
# Install the framework globally
npm install -g cogniframe

# Create a new project
create-cogniframe-app my-app

# Set up your project
cd my-app
npm install
cp .env.example .env
npm run dev
```

Visit http://localhost:3000 to see your application running!

## Prerequisites

- Node.js (v16.x or later)
- npm (v7.x or later)
- PostgreSQL or SQLite (optional, if using a database)
- Basic understanding of TypeScript and web development

## Creating a New Project

The framework provides a simple CLI tool to create new projects:

```bash
# Install CogniFrame globally
npm install -g cogniframe

# Create a new project
create-cogniframe-app my-app

# Enter the project directory
cd my-app

# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Start development server
npm run dev
```

During project creation, you'll be asked a few questions to customize your setup:
- Project name and description
- Database preference (PostgreSQL, SQLite, or none)
- Features to include
- Author information

## Project Setup

1. Set up your environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. If using a database:
   ```bash
   # For PostgreSQL
   createdb my_app_db
   npm run migrate:up

   # For SQLite
   # Update DATABASE_URL in .env
   ```

3. Start development:
   ```bash
   npm run dev   # Start development server
   npm run test  # Run tests
   npm run build # Build for production
   ```

## Basic Project Structure

```
my-app/
  ├── src/
  │   ├── components/     # Your application components
  │   ├── features/       # Feature implementations
  │   ├── templates/      # HTML templates
  │   └── server.ts       # Server configuration
  ├── tests/             # Test files
  ├── .env              # Environment configuration
  └── package.json      # Project dependencies
```

## Key Features

- **Intent-Based Architecture**: Components defined by their purpose
- **Server-Side Rendering**: Clean, type-safe HTML templates
- **Built-in Security**: CSRF protection and secure sessions
- **AI-Friendly Structure**: Clear organization for AI comprehension

## Documentation

For more detailed information, check out our documentation:

- [Getting Started Guide](docs/getting-started/README.md)
- [Core Concepts](docs/concepts/README.md)
- [API Reference](docs/api/README.md)
- [Contributing Guidelines](docs/contributing/README.md)

## Need Help?

- [Troubleshooting Guide](docs/guides/troubleshooting.md)
- [Open an Issue](https://github.com/markng/cogniframe/issues)
- [Community Discussions](https://github.com/markng/cogniframe/discussions)

## License

CogniFrame is [MIT licensed](LICENSE). 