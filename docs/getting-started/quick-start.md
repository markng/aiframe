# Quick Start Guide

This guide will help you create your first AIFrame application in minutes. We'll create a simple counter application to demonstrate the basic concepts.

## Prerequisites

- Node.js (v16.x or later)
- npm (v7.x or later)
- Basic TypeScript knowledge

## Create a New Project

```bash
# Clone the starter template
git clone https://github.com/markng/aiframe-starter.git my-counter-app
cd my-counter-app

# Remove the template's git history and start fresh
rm -rf .git
git init

# Install dependencies
npm install
```

## Create Your First Component

Create a new file `src/components/Counter.ts`:

```typescript
import { Intent, ServerComponent, Request, Response } from 'aiframe';

// Define the component's intent
export const counterIntent: Intent = {
  name: 'counter',
  description: 'A simple counter that can be incremented',
  capabilities: ['increment'],
  dataStructure: {
    count: 'number'
  },
  userActions: [
    {
      name: 'increment',
      method: 'POST',
      path: '/counter/increment',
      description: 'Increase the counter by one'
    }
  ]
};

// Implement the component
export class CounterComponent implements ServerComponent {
  intent = counterIntent;
  private state = { count: 0 };

  async render(): Promise<string> {
    return `
      <div class="counter">
        <h1>My First Counter</h1>
        <div class="count">Count: ${this.state.count}</div>
        <form action="/counter/increment" method="post">
          <button type="submit">Increment</button>
        </form>
      </div>
    `;
  }

  async handleAction(req: Request, res: Response): Promise<void> {
    if (req.path === '/counter/increment') {
      this.state.count++;
    }
  }
}
```

## Register the Component

Update `src/app.ts`:

```typescript
import { createApp } from 'aiframe';
import { CounterComponent } from './components/Counter';

const app = createApp({
  components: [
    new CounterComponent()
  ]
});

app.listen(3000, () => {
  console.log('App running at http://localhost:3000');
});
```

## Run the Application

```bash
# Start the development server
npm run dev
```

Visit http://localhost:3000 in your browser. You should see your counter application running!

## What's Happening?

1. We created a component with:
   - An intent declaration that describes its purpose and capabilities
   - A render method that returns HTML
   - An action handler for processing user interactions

2. The component:
   - Displays the current count
   - Shows an increment button
   - Updates the count when clicked

## Next Steps

1. Try modifying the component:
   - Add a decrement button
   - Style the counter
   - Add a reset function

2. Learn more about:
   - [Intent-Based Architecture](../concepts/intent-based-architecture.md)
   - [Component Development](../guides/component-development.md)
   - [Styling Components](../guides/styling.md)

## Common Issues

### Component Not Showing
- Check that the component is registered in `app.ts`
- Ensure the server is running
- Check the browser console for errors

### Button Not Working
- Verify the form action matches the intent path
- Check that handleAction matches the path
- Look for errors in the server logs

## Getting Help

- [Documentation](../README.md)
- [GitHub Issues](https://github.com/markng/aiframe/issues)
- [Community Discussions](https://github.com/markng/aiframe/discussions)

## Complete Example

You can find the complete counter example in our [examples repository](https://github.com/markng/aiframe-examples/tree/main/counter).

## Next Steps

- [Installation Guide](installation.md) - Full installation options
- [Project Setup](project-setup.md) - Detailed project configuration
- [Core Concepts](../concepts/README.md) - Learn about AIFrame architecture 