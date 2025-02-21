import { Request, Response } from 'express';
import { ServerComponent, Intent, ViewData } from '../../core/types';

export interface TestState {
  value: string;
  count: number;
}

export const testIntent: Intent = {
  name: 'test',
  description: 'A test component',
  capabilities: ['test'],
  dataStructure: {
    value: 'string',
    count: 'number'
  },
  userActions: [
    {
      name: 'increment',
      description: 'Increment the counter',
      method: 'POST',
      path: '/test/increment',
      expectedOutcome: 'Counter is incremented'
    },
    {
      name: 'setValue',
      description: 'Set a value',
      method: 'POST',
      path: '/test/value',
      parameters: [
        {
          name: 'value',
          type: 'string',
          description: 'The value to set',
          required: true
        }
      ],
      expectedOutcome: 'Value is updated'
    }
  ]
};

export class TestComponent implements ServerComponent {
  intent = testIntent;
  private state: TestState = {
    value: '',
    count: 0
  };

  async render(data: ViewData): Promise<string> {
    return `
      <div class="test-component">
        <h1>Test Component</h1>
        <p>Value: ${this.state.value}</p>
        <p>Count: ${this.state.count}</p>
        <form method="POST" action="/test/increment">
          <input type="hidden" name="_csrf" value="${data.csrfToken}">
          <button type="submit">Increment</button>
        </form>
        <form method="POST" action="/test/value">
          <input type="hidden" name="_csrf" value="${data.csrfToken}">
          <input type="text" name="value" value="${this.state.value}">
          <button type="submit">Set Value</button>
        </form>
      </div>
    `;
  }

  async handleAction(req: Request, res: Response): Promise<void> {
    const action = req.path.split('/').pop();

    switch (action) {
      case 'increment':
        this.state.count++;
        break;
      case 'value':
        this.state.value = req.body.value || '';
        break;
    }

    res.redirect('/');
  }

  getState(): TestState {
    return { ...this.state };
  }

  // Test helpers
  setState(state: Partial<TestState>): void {
    this.state = { ...this.state, ...state };
  }
} 