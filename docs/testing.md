# Testing Guide

This guide covers best practices for testing AIFrame applications, both locally and in CI/CD environments.

## Test Configuration

### Jest Configuration
- Keep Jest configuration in `package.json` under the `jest` key
- Avoid creating separate `jest.config.js` files
- Use explicit configuration in test commands:
  ```json
  {
    "scripts": {
      "test": "jest --config=package.json --coverage --coverageReporters='text-summary'"
    }
  }
  ```

### Environment Variables
- Use environment variables for test configuration
- Document all required variables
- Provide sensible defaults
- Example configuration:
  ```typescript
  const config = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'test_db',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres'
  };
  ```

## Database Testing

### Connection Management
- Initialize database connections properly
- Clean up connections after tests
- Use connection pools wisely
- Handle cleanup in both success and error cases

### Example Test Setup
```typescript
describe('DatabaseTests', () => {
  let adapter: DatabaseAdapter;

  beforeEach(async () => {
    adapter = new DatabaseAdapter(config);
    await adapter.initialize();
  });

  afterEach(async () => {
    await adapter.disconnect();
  });

  afterAll(async () => {
    // Clean up test data
    await adapter.cleanup();
  });
});
```

### Transaction Handling
- Use transactions for test isolation
- Clean up transaction resources
- Handle rollbacks properly
- Consider using a test transaction wrapper

## CI/CD Considerations

### Workflow Setup
- Keep CI workflows simple and focused
- Remove unnecessary steps
- Use matrix testing when needed
- Clean up generated files:
  ```yaml
  - name: Remove generated files
    run: |
      find . -name "jest.config.js" -delete
      find . -name "jest.config.ts" -delete
  ```

### Environment Setup
- Configure test databases properly
- Set up service containers
- Handle health checks
- Example PostgreSQL setup:
  ```yaml
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_PASSWORD: postgres
        POSTGRES_USER: postgres
        POSTGRES_DB: test_db
      ports:
        - 5432:5432
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  ```

## Best Practices

1. **Resource Cleanup**
   - Clean up all resources after tests
   - Handle edge cases in cleanup
   - Use proper teardown order

2. **Configuration Management**
   - Keep configuration centralized
   - Use explicit over implicit config
   - Document all configuration options

3. **Error Handling**
   - Test error cases thoroughly
   - Handle cleanup in error scenarios
   - Log relevant error information

4. **Test Isolation**
   - Use fresh database state for each test
   - Clean up between tests
   - Avoid test interdependencies 