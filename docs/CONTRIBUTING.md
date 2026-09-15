# Contributing to Businesstalk24

Thank you for your interest in contributing to the Businesstalk24 Platform UI! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on the code, not the person
- Help others learn and grow
- Report inappropriate behavior

## Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/business-talk-UI.git
   cd business-talk-UI
   ```
3. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```
5. **Start developing**:
   ```bash
   npm run dev
   ```

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow the existing project structure
- Use `'use client'` for client components
- Use `'use server'` for server actions
- Follow ESLint configuration

### Naming Conventions
- Components: PascalCase (e.g., `UserProfile.tsx`)
- Files: kebab-case (e.g., `user-sidebar.tsx`)
- Functions: camelCase (e.g., `getUserData()`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)
- Types/Interfaces: PascalCase (e.g., `UserProfile`)

### File Organization
```
component-name/
├── index.ts           # Export
├── component.tsx      # Main component
├── use-hook.ts        # Custom hooks
├── service.ts         # API calls
├── types.ts           # TypeScript types
└── component.test.tsx # Tests
```

### Component Best Practices

```typescript
'use client'

import type { FC, ReactNode } from 'react'
import { useCallback, useState } from 'react'

interface MyComponentProps {
  title: string
  children?: ReactNode
  onAction?: () => void
}

/**
 * MyComponent - Brief description
 * 
 * @param title - Component title
 * @param children - Component content
 * @param onAction - Callback when action occurs
 */
export const MyComponent: FC<MyComponentProps> = ({ 
  title, 
  children, 
  onAction 
}) => {
  const [state, setState] = useState(false)

  const handleClick = useCallback(() => {
    setState(true)
    onAction?.()
  }, [onAction])

  return (
    <div>
      <h1>{title}</h1>
      {children}
      <button onClick={handleClick}>Action</button>
    </div>
  )
}

MyComponent.displayName = 'MyComponent'
```

## Commit Messages

Follow conventional commits:

```
type(scope): subject

body

footer
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Testing
- `chore`: Build, dependencies, etc.

**Examples**:
```bash
git commit -m "feat(auth): add Google OAuth integration"
git commit -m "fix(dashboard): correct sidebar width on mobile"
git commit -m "docs: update README with new features"
```

## Testing

### Running Tests
```bash
npm run test
npm run test:watch
npm run test:coverage
```

### Writing Tests
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('renders title correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('calls onAction when button is clicked', () => {
    const onAction = jest.fn()
    render(<MyComponent title="Test" onAction={onAction} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onAction).toHaveBeenCalled()
  })
})
```

## Linting & Formatting

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format code with Prettier
npm run format
```

## Pull Request Process

1. **Update your branch** with latest main
2. **Run tests** and ensure they pass
3. **Build the project**: `npm run build`
4. **Create a pull request** with:
   - Clear title describing the change
   - Detailed description of what changed and why
   - Screenshots/videos for UI changes
   - Reference related issues: `Fixes #123`

5. **PR Template**:
   ```markdown
   ## Description
   Brief description of the changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update

   ## Testing
   - [ ] I have tested this locally
   - [ ] Tests pass
   - [ ] No breaking changes

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex logic
   - [ ] Documentation updated
   - [ ] No new warnings generated
   ```

## Common Tasks

### Adding a New Page
1. Create directory: `src/app/(section)/page-name/`
2. Create `page.tsx` in the directory
3. Export default component
4. Update navigation if needed

### Adding a New Component
1. Create `src/components/section/ComponentName.tsx`
2. Export named component
3. Add TypeScript types/interfaces
4. Add JSDoc comments
5. Create tests in `ComponentName.test.tsx`

### Adding a New Redux Slice
1. Create `src/redux/slices/featureName.ts`
2. Define state interface
3. Create reducers and async thunks
4. Export actions and reducer as default
5. Add to store in `src/redux/store.ts`

### Adding Form Validation
1. Add schema in `src/lib/validations.ts`
2. Use with `useForm` from `react-hook-form`
3. Import and use in component

## Documentation

- Update README.md for major changes
- Add JSDoc comments to functions and components
- Update API documentation if endpoints change
- Document configuration in comments

## Reporting Issues

Use GitHub Issues with:
- Clear title
- Detailed description
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Screenshots/videos if applicable
- Environment information

## Questions?

- Check existing issues and discussions
- Review the documentation
- Join our community channels
- Contact the maintainers

## License

By contributing, you agree your code will be licensed under the same license as the project.

---

Thank you for contributing to Businesstalk24! 🎉
