# CogniFrame

CogniFrame is a server-side web framework optimized for AI-human collaboration, making it easy to build, maintain, and evolve web applications through seamless cooperation between AI agents and human developers.

What makes CogniFrame special:
- **AI-First Design**: Built from the ground up for AI-human collaboration
- **Self-Documenting**: Components describe their purpose and capabilities
- **Type-Safe**: Strong TypeScript integration for reliable code generation
- **Developer Friendly**: Clear structure and conventions that both AI and humans understand

## Quick Start

```bash
# Create a new project using the starter template
git clone https://github.com/markng/cogniframe-starter.git my-app
cd my-app
rm -rf .git
git init
npm install
npm run dev
```

Visit http://localhost:3000 to see your application running!

## Prerequisites

- Node.js (v16.x or later)
- npm (v7.x or later)
- PostgreSQL or MongoDB (optional, if using a database)
- Basic understanding of TypeScript and web development

## Creating a New Project

There are two ways to create a new CogniFrame project:

### 1. Using the Starter Template (Recommended for Most Users)

The starter template provides a pre-configured project structure with examples. This is the best choice if you want to:
- Get started quickly with a working example
- Learn CogniFrame best practices from example code
- Have a production-ready project structure
- Start with common features pre-configured

```bash
git clone https://github.com/markng/cogniframe-starter.git my-app
cd my-app
rm -rf .git  # Remove template's git history
git init     # Start fresh git history
npm install
```

### 2. Using the Local Generator (For Advanced Users)

The local generator gives you more control over your project setup. Choose this if you want to:
- Customize your project structure from scratch
- Have minimal dependencies
- Understand the framework internals
- Contribute to CogniFrame development

```bash
# Clone the CogniFrame repository
git clone https://github.com/markng/cogniframe.git
cd cogniframe

# Install and build the framework
npm install
npm run build

# Create and set up your project
mkdir ../my-app
cd ../my-app
node ../cogniframe/dist/core/generator/cli.js
```

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

   # For MongoDB
   # Update MONGODB_URI in .env
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