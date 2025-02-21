export interface GeneratorOptions {
  name: string;
  description?: string;
  author?: string;
  version?: string;
  features?: string[];
  database?: 'postgres' | 'mongodb' | 'none';
  targetDir?: string;
}

export interface TemplateData {
  name: string;
  description: string;
  author: string;
  version: string;
  features: string[];
  database: 'postgres' | 'mongodb' | 'none';
  year: number;
}

export interface GeneratorResult {
  path: string;
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
} 