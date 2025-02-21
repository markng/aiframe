# Contributing to AIFrame

Thank you for your interest in contributing to AIFrame! This guide will help you understand our development process and how you can contribute effectively.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. All contributors are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

## Development Workflow

### 1. Setting Up Your Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/your-username/aiframe.git
cd aiframe

# Install dependencies
npm install

# Run tests to ensure everything is working
npm test
```

### 2. Branch Protection and PR Process

We use branch protection rules to maintain code quality:

1. **Main Branch Protection**
   - Pull request reviews required
   - Status checks must pass
   - Branches must be up to date
   - No bypass options

2. **Branch Naming Convention**
   ```
   feature/description-of-feature
   fix/issue-description
   docs/documentation-update
   refactor/refactoring-description
   test/test-addition-description
   chore/maintenance-task
   ```

3. **Pull Request Process**
   - Create feature branch
   - Make changes
   - Submit PR using template
   - Request reviews
   - Address feedback
   - Ensure checks pass
   - Squash and merge

### 3. Development Guidelines

- [Code Style Guide](style-guide.md)
- [Testing Guidelines](testing.md)
- [Documentation Guidelines](documentation.md)

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/__tests__/core/runtime.test.ts

# Run tests with coverage
npm test -- --coverage
```

## Documentation

- Keep documentation up to date
- Document new features
- Update examples
- Follow [Documentation Guidelines](documentation.md)

## Commit Messages

We use semantic commit messages:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Tests
- chore: Maintenance

Example:
```
feat(components): add support for async rendering

- Implement async rendering pipeline
- Add tests for async components
- Update documentation

Closes #123
```

## Pull Request Template

```markdown
## Description
[Describe your changes]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Added new tests
- [ ] All tests pass
- [ ] Manual testing completed

## Documentation
- [ ] Documentation updated
- [ ] Examples updated
- [ ] No documentation needed

## Additional Notes
[Any additional information]
```

## Getting Help

- [Open an issue](https://github.com/markng/aiframe/issues)
- [Join discussions](https://github.com/markng/aiframe/discussions)
- Contact maintainers

## Next Steps

- [Development Workflow](workflow.md)
- [Code Style Guide](style-guide.md)
- [Testing Guidelines](testing.md)
- [Documentation Guidelines](documentation.md) 