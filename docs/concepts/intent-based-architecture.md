# Intent-Based Architecture

AIFrame's intent-based architecture is a unique approach to web development that makes applications easier to understand, maintain, and modify, especially when working with AI agents.

## What is Intent-Based Architecture?

Intent-based architecture is a design pattern where components explicitly declare their purpose, capabilities, and expected behaviors before implementation. This declaration serves as a contract between the component and its users (both human and AI).

## Core Concepts

### 1. Intent Declaration

Every component in AIFrame starts with an intent declaration:

```typescript
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
```

### 2. Component Implementation

The implementation must fulfill the intent's contract:

```typescript
export class CounterComponent implements ServerComponent {
  intent = counterIntent;
  private state = { count: 0 };

  async render(data: ViewData): Promise<string> {
    return `
      <div class="counter">
        <h1>Counter Example</h1>
        <div class="counter-display">Count: ${this.state.count}</div>
        <!-- Action forms -->
      </div>
    `;
  }

  async handleAction(req: Request, res: Response): Promise<void> {
    switch (req.path) {
      case '/counter/increment':
        this.state.count++;
        break;
      // ... other actions
    }
  }
}
```

## Benefits

### 1. Clear Purpose
- Every component's purpose is explicitly stated
- No guessing about component functionality
- Easy to understand component relationships

### 2. AI-Friendly
- AI agents can understand component purpose
- Clear contracts for modifications
- Explicit documentation of capabilities

### 3. Type Safety
- Intent declarations are type-checked
- Implementation must match intent
- Runtime validation available

### 4. Documentation
- Self-documenting components
- Generated API documentation
- Clear user action descriptions

### 5. Testing
- Test cases derived from intent
- Clear expected outcomes
- Behavior verification

## Best Practices

### 1. Writing Intent Declarations

✅ Do:
- Be specific about component purpose
- List all capabilities
- Document expected outcomes
- Define clear data structures

❌ Don't:
- Use vague descriptions
- Omit capabilities
- Leave outcomes undefined
- Use ambiguous types

### 2. Implementation Guidelines

✅ Do:
- Implement all declared capabilities
- Follow type definitions
- Handle all declared actions
- Validate against intent

❌ Don't:
- Add undeclared capabilities
- Ignore type safety
- Skip action handlers
- Bypass intent validation

### 3. Component Organization

✅ Do:
- Group related intents
- Use consistent naming
- Separate concerns
- Document relationships

❌ Don't:
- Mix unrelated functionality
- Use inconsistent names
- Tightly couple components
- Skip documentation

## Examples

### Basic Counter Component

```typescript
// Intent Declaration
export const counterIntent: Intent = {
  name: 'counter',
  description: 'A simple counter component',
  capabilities: ['increment', 'decrement'],
  dataStructure: {
    count: 'number'
  },
  userActions: [
    {
      name: 'increment',
      method: 'POST',
      path: '/counter/increment',
      description: 'Increase counter by one'
    }
  ]
};

// Implementation
export class CounterComponent implements ServerComponent {
  intent = counterIntent;
  state = { count: 0 };

  async render() {
    return `<div>${this.state.count}</div>`;
  }

  async handleAction(req: Request) {
    if (req.path === '/counter/increment') {
      this.state.count++;
    }
  }
}
```

### Form Component

```typescript
// Intent Declaration
export const formIntent: Intent = {
  name: 'userForm',
  description: 'User registration form',
  capabilities: ['submit', 'validate'],
  dataStructure: {
    username: 'string',
    email: 'string'
  },
  userActions: [
    {
      name: 'submit',
      method: 'POST',
      path: '/form/submit',
      description: 'Submit user registration'
    }
  ]
};

// Implementation follows...
```

## Next Steps

- [Component Guide](../guides/component-development.md)
- [Type System](types.md)
- [Testing Guide](../guides/testing.md)
- [Examples](../examples/README.md) 