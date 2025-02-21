import { Intent } from '../../core/types';

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
      description: 'Increase the counter by one',
      method: 'POST',
      path: '/counter/increment',
      expectedOutcome: 'The counter value will increase by 1'
    },
    {
      name: 'decrement',
      description: 'Decrease the counter by one',
      method: 'POST',
      path: '/counter/decrement',
      expectedOutcome: 'The counter value will decrease by 1'
    },
    {
      name: 'reset',
      description: 'Reset the counter to zero',
      method: 'POST',
      path: '/counter/reset',
      expectedOutcome: 'The counter value will be set to 0'
    }
  ]
}; 