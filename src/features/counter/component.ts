import { Request, Response } from 'express';
import { ServerComponent, ViewData } from '../../core/types';
import { counterIntent } from './intent';

interface CounterState {
  count: number;
}

export class CounterComponent implements ServerComponent {
  intent = counterIntent;
  private state: CounterState = { count: 0 };

  async render(data: ViewData): Promise<string> {
    return `
      <div class="counter">
        <h1>Counter Example</h1>
        <div class="counter-display">
          Count: ${this.state.count}
        </div>
        
        <form method="POST" action="/counter/increment">
          <input type="hidden" name="_csrf" value="${data.csrfToken}">
          <button type="submit">Increment</button>
        </form>
        
        <form method="POST" action="/counter/decrement">
          <input type="hidden" name="_csrf" value="${data.csrfToken}">
          <button type="submit">Decrement</button>
        </form>
        
        <form method="POST" action="/counter/reset">
          <input type="hidden" name="_csrf" value="${data.csrfToken}">
          <button type="submit">Reset</button>
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
      case 'decrement':
        this.state.count--;
        break;
      case 'reset':
        this.state.count = 0;
        break;
    }

    res.redirect('/');
  }

  getState(): CounterState {
    return { ...this.state };
  }
} 