import { Intent } from '../../types';

export const indexIntent: Intent = {
  name: 'system:index',
  description: 'System component that provides the default landing page and framework documentation',
  capabilities: ['viewDocs', 'listComponents'],
  dataStructure: {
    registeredComponents: 'Record<string, Intent>',
    environment: 'string',
    frameworkVersion: 'string'
  },
  userActions: [
    {
      name: 'viewDocs',
      description: 'View the framework documentation',
      method: 'GET',
      path: '/docs',
      expectedOutcome: 'Display framework documentation'
    },
    {
      name: 'listComponents',
      description: 'List all registered components',
      method: 'GET',
      path: '/',
      expectedOutcome: 'Display list of registered components and their intents'
    }
  ]
}; 