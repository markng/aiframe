#!/usr/bin/env node
import { AppGenerator } from './generator';
import { GeneratorOptions } from './types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('Welcome to cogniframe App Generator!\n');

  const options: GeneratorOptions = {
    name: '',
    description: '',
    author: '',
    version: '0.1.0',
    features: ['basic'],
    database: 'none'
  };

  // Get project name
  options.name = await question('Project name: ');
  if (!options.name) {
    console.error('Project name is required');
    process.exit(1);
  }

  // Get description
  options.description = await question('Description (optional): ');

  // Get author
  options.author = await question('Author (optional): ');

  // Get database preference
  const dbChoice = await question('Database (postgres/sqlite/none) [none]: ');
  if (dbChoice === 'postgres' || dbChoice === 'sqlite') {
    options.database = dbChoice;
  }

  // Get features
  const featuresInput = await question('Features (comma-separated) [basic]: ');
  if (featuresInput) {
    options.features = featuresInput.split(',').map(f => f.trim());
  }

  rl.close();

  console.log('\nGenerating project...\n');

  const generator = new AppGenerator();
  try {
    const result = await generator.generate(options);

    console.log(`
Project created successfully!

Location: ${result.path}

Next steps:
1. cd ${options.name}
2. npm install
3. cp .env.example .env
4. npm run dev

Happy coding! 🚀
`);
  } catch (error) {
    console.error('Failed to generate project:', error);
    process.exit(1);
  }
}

main().catch(console.error); 