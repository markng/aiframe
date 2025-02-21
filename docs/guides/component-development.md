# Component Development Guide

This guide covers everything you need to know about developing components in AIFrame, from basic concepts to advanced patterns.

## Table of Contents
1. [Component Basics](#component-basics)
2. [Intent Declaration](#intent-declaration)
3. [Component Implementation](#component-implementation)
4. [State Management](#state-management)
5. [Actions and Events](#actions-and-events)
6. [Rendering](#rendering)
7. [Advanced Patterns](#advanced-patterns)
8. [Testing Components](#testing-components)

## Component Basics

A component in AIFrame consists of two main parts:
1. An intent declaration that describes what the component does
2. An implementation that fulfills that intent

### Basic Component Structure

```typescript
import { Intent, ServerComponent, Request, Response } from 'aiframe';

// Intent Declaration
export const myComponentIntent: Intent = {
  name: 'myComponent',
  description: 'Description of what this component does',
  capabilities: ['capability1', 'capability2'],
  dataStructure: {
    // Component state structure
  },
  userActions: [
    // Available actions
  ]
};

// Component Implementation
export class MyComponent implements ServerComponent {
  intent = myComponentIntent;
  private state = {};

  async render(): Promise<string> {
    // Return HTML
  }

  async handleAction(req: Request, res: Response): Promise<void> {
    // Handle user actions
  }
}
```

## Intent Declaration

The intent declaration is a contract that describes your component's purpose and capabilities.

### Required Fields

```typescript
export const intent: Intent = {
  // Unique identifier for the component
  name: 'uniqueName',

  // Clear description of the component's purpose
  description: 'What this component does',

  // List of component capabilities
  capabilities: ['capability1', 'capability2'],

  // State structure definition
  dataStructure: {
    field1: 'string',
    field2: 'number',
    nested: {
      field: 'boolean'
    }
  },

  // Available user actions
  userActions: [
    {
      name: 'action1',
      method: 'POST',
      path: '/component/action1',
      description: 'What this action does',
      expectedOutcome: 'What happens when this action is taken'
    }
  ]
};
```

### Best Practices for Intent Declaration

✅ Do:
- Use clear, descriptive names
- List all capabilities
- Document all actions
- Define complete data structures

❌ Don't:
- Use vague descriptions
- Omit capabilities
- Leave actions undocumented
- Use ambiguous types

## Component Implementation

The implementation must fulfill the contract defined by the intent.

### Basic Implementation

```typescript
export class MyComponent implements ServerComponent {
  intent = myComponentIntent;
  
  // Initialize state matching dataStructure
  private state = {
    field1: '',
    field2: 0,
    nested: {
      field: false
    }
  };

  // Render component HTML
  async render(): Promise<string> {
    return `
      <div class="my-component">
        <h1>${this.state.field1}</h1>
        <div>${this.state.field2}</div>
        <div>${this.state.nested.field}</div>
        ${this.renderActions()}
      </div>
    `;
  }

  // Handle user actions
  async handleAction(req: Request, res: Response): Promise<void> {
    switch (req.path) {
      case '/component/action1':
        await this.handleAction1(req);
        break;
      default:
        throw new Error(`Unknown action: ${req.path}`);
    }
  }

  // Helper methods
  private renderActions(): string {
    return `
      <form action="/component/action1" method="post">
        <button type="submit">Action 1</button>
      </form>
    `;
  }

  private async handleAction1(req: Request): Promise<void> {
    // Implementation
  }
}
```

## State Management

AIFrame components manage their own state, which must match the declared dataStructure.

### State Initialization

```typescript
export class MyComponent implements ServerComponent {
  intent = myComponentIntent;
  
  // Initialize with default values
  private state = {
    count: 0,
    text: '',
    items: []
  };

  // Optional: Initialize from props
  constructor(props: ComponentProps) {
    super();
    this.state = {
      ...this.state,
      ...props.initialState
    };
  }
}
```

### State Updates

```typescript
export class MyComponent implements ServerComponent {
  private async updateState(newState: Partial<typeof this.state>): Promise<void> {
    this.state = {
      ...this.state,
      ...newState
    };
  }

  async handleAction(req: Request): Promise<void> {
    if (req.path === '/component/update') {
      await this.updateState({
        count: this.state.count + 1
      });
    }
  }
}
```

## Actions and Events

Components handle user interactions through actions defined in the intent.

### Action Handling

```typescript
export class MyComponent implements ServerComponent {
  async handleAction(req: Request, res: Response): Promise<void> {
    switch (req.path) {
      case '/component/increment':
        await this.handleIncrement(req);
        break;
      case '/component/submit':
        await this.handleSubmit(req);
        break;
      default:
        throw new Error(`Unknown action: ${req.path}`);
    }
  }

  private async handleIncrement(req: Request): Promise<void> {
    await this.updateState({
      count: this.state.count + 1
    });
  }

  private async handleSubmit(req: Request): Promise<void> {
    const formData = await req.formData();
    await this.updateState({
      text: formData.get('text') as string
    });
  }
}
```

## Rendering

Components render their state to HTML using the render method.

### Basic Rendering

```typescript
export class MyComponent implements ServerComponent {
  async render(): Promise<string> {
    return `
      <div class="my-component">
        ${this.renderHeader()}
        ${this.renderContent()}
        ${this.renderActions()}
      </div>
    `;
  }

  private renderHeader(): string {
    return `<h1>My Component</h1>`;
  }

  private renderContent(): string {
    return `
      <div class="content">
        <p>Count: ${this.state.count}</p>
        <p>Text: ${this.state.text}</p>
      </div>
    `;
  }

  private renderActions(): string {
    return `
      <div class="actions">
        <form action="/component/increment" method="post">
          <button type="submit">Increment</button>
        </form>
        <form action="/component/submit" method="post">
          <input type="text" name="text" value="${this.state.text}">
          <button type="submit">Submit</button>
        </form>
      </div>
    `;
  }
}
```

## Advanced Patterns

### Composition

```typescript
export class ParentComponent implements ServerComponent {
  private childComponent = new ChildComponent();

  async render(): Promise<string> {
    return `
      <div class="parent">
        <h1>Parent Component</h1>
        ${await this.childComponent.render()}
      </div>
    `;
  }
}
```

### Async Operations

```typescript
export class AsyncComponent implements ServerComponent {
  private async fetchData(): Promise<Data> {
    // Fetch data from API
  }

  async render(): Promise<string> {
    const data = await this.fetchData();
    return `
      <div class="async-component">
        ${this.renderData(data)}
      </div>
    `;
  }
}
```

## Testing Components

### Unit Testing

```typescript
describe('MyComponent', () => {
  let component: MyComponent;

  beforeEach(() => {
    component = new MyComponent();
  });

  it('should render initial state', async () => {
    const html = await component.render();
    expect(html).toContain('Count: 0');
  });

  it('should handle increment action', async () => {
    await component.handleAction({
      path: '/component/increment'
    } as Request);

    const html = await component.render();
    expect(html).toContain('Count: 1');
  });
});
```

### Integration Testing

```typescript
describe('MyComponent Integration', () => {
  let app: Application;

  beforeEach(() => {
    app = createApp({
      components: [new MyComponent()]
    });
  });

  it('should handle form submission', async () => {
    const response = await request(app)
      .post('/component/submit')
      .send({ text: 'Hello' });

    expect(response.status).toBe(200);
  });
});
```

## Next Steps

- [Advanced Component Patterns](advanced-components.md)
- [State Management](state-management.md)
- [Component Styling](styling.md)
- [Testing Guide](testing.md) 