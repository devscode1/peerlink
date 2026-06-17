# Contributing to PeerLink

Thank you for considering contributing to PeerLink! We welcome all kinds of contributions, from bug reports and documentation improvements to new features and performance optimizations.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions. We're building a welcoming community.

## How to Contribute

### Reporting Bugs

Found a bug? Please help us fix it by reporting it:

1. **Check existing issues** - Search GitHub Issues to avoid duplicates
2. **Provide details**:
   - Clear, descriptive title
   - Step-by-step reproduction instructions
   - Expected vs. actual behavior
   - Environment (OS, device, app version)
   - Logs/screenshots if applicable

3. **Create GitHub Issue**:
   ```
   Title: [BUG] Brief description
   
   Environment:
   - OS: iOS 17 / Android 14
   - Device: iPhone 15 / Pixel 8
   - App version: 1.0.0
   
   Steps to reproduce:
   1. ...
   2. ...
   3. ...
   
   Expected: ...
   Actual: ...
   ```

### Suggesting Features

Have an idea to improve PeerLink?

1. **Search existing issues** - Check if someone already suggested it
2. **Create discussion** - Use GitHub Discussions first to gauge interest
3. **Create detailed issue**:
   ```
   Title: [FEATURE] Brief description
   
   Problem: What problem does this solve?
   
   Solution: Describe your proposed solution
   
   Alternatives: Other approaches considered
   
   Additional context: Links, mockups, references
   ```

### Submitting Code

#### Getting Started

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/react-chat.git
   cd react-chat
   ```

3. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Set up development environment**:
   ```bash
   npm install
   npm run dev:server &
   npm run dev:mobile
   ```

#### Development Guidelines

**Code Style:**
- Use **TypeScript** strictly (no `any` without justification)
- Follow **ESLint** and **Prettier** rules
- Use meaningful variable/function names
- Add comments for complex logic
- Keep functions small and focused (< 50 lines preferred)

**Commits:**
```bash
# Use conventional commits
git commit -m "feat: add file transfer pause/resume"
git commit -m "fix: connection timeout on weak network"
git commit -m "docs: update API documentation"
git commit -m "refactor: simplify message handling"

# Types: feat, fix, docs, style, refactor, test, chore
```

**Testing:**
- Write tests for new features
- Update existing tests if behavior changes
- Ensure all tests pass:
  ```bash
  npm test
  npm run type-check
  npm run lint
  ```

**Performance:**
- Profile before and after changes
- Avoid unnecessary re-renders
- Monitor memory usage
- Test on low-end devices when possible

**Security:**
- Never commit secrets or API keys
- Use environment variables
- Validate all user inputs
- Review security implications

#### Pull Request Process

1. **Before submitting**:
   - [ ] Code follows style guidelines
   - [ ] All tests passing (`npm test`)
   - [ ] No TypeScript errors (`npm run type-check`)
   - [ ] No linting warnings (`npm run lint`)
   - [ ] Commits are clean and descriptive
   - [ ] Branch is up to date with `main`

2. **Create Pull Request**:
   ```
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation
   - [ ] Performance improvement
   
   ## Related Issues
   Closes #123
   
   ## How to Test
   1. ...
   2. ...
   
   ## Screenshots/Videos (if applicable)
   
   ## Performance Impact
   - [ ] No impact
   - [ ] Minor improvement
   - [ ] Major improvement
   - [ ] Potential regression (specify)
   
   ## Security Considerations
   None / Describe any security implications
   ```

3. **Review process**:
   - Maintainers will review within 48 hours
   - Respond to feedback promptly
   - Push changes directly to your branch
   - No need to create new PR

4. **Merge**:
   - Maintainer will squash and merge when approved
   - Delete your branch after merge

### Improving Documentation

Documentation improvements are always welcome!

**To contribute documentation:**

1. Fork and create a branch
2. Edit `.md` files in `/docs`
3. Follow Markdown style guide
4. Test links and code examples
5. Submit PR with clear description

**Documentation to improve:**
- [README.md](./README.md) - Getting started
- [DEVELOPMENT.md](./docs/DEVELOPMENT.md) - Setup guide
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design
- Inline code comments

## Areas for Contribution

We especially welcome contributions in these areas:

### High Priority
- [ ] Performance optimizations
- [ ] Security improvements
- [ ] Bug fixes
- [ ] Documentation

### Medium Priority
- [ ] Platform-specific optimizations (iOS/Android)
- [ ] UI/UX improvements
- [ ] Testing improvements
- [ ] Accessibility features

### Future Features
- [ ] Group chat
- [ ] Voice/video calls
- [ ] Desktop client
- [ ] Message search
- [ ] Cloud sync

## Development Checklist

Before finalizing your PR:

```typescript
// Code Quality
- [ ] TypeScript strict mode passes
- [ ] ESLint passes
- [ ] Prettier formatting applied
- [ ] No console warnings/errors
- [ ] No dead code
- [ ] No hardcoded values

// Testing
- [ ] New tests written for features
- [ ] Existing tests still pass
- [ ] Edge cases covered
- [ ] Error handling tested

// Documentation
- [ ] Code comments added where needed
- [ ] README updated if necessary
- [ ] Types properly documented
- [ ] API changes documented

// Performance
- [ ] No unnecessary re-renders
- [ ] Memory leaks fixed
- [ ] Bundle size impact minimal
- [ ] Network requests optimized

// Security
- [ ] No secrets committed
- [ ] Input validation added
- [ ] Dependencies updated safely
- [ ] Security review completed
```

## Running Tests Locally

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# Specific workspace
npm test --workspace=mobile
```

## Performance Targets

When submitting performance-related changes, aim for:

| Metric | Target |
|--------|--------|
| Bundle size increase | < 50 KB |
| Memory usage (chat screen) | < 150 MB |
| P2P connection time | < 5 sec |
| Message latency | < 100 ms |
| Frame rate | > 55 FPS |

## Versioning

We follow **Semantic Versioning**:
- `MAJOR` - Breaking changes
- `MINOR` - New features (backward compatible)
- `PATCH` - Bug fixes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

We appreciate all contributions! Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Recognized in our community

## Questions?

- 📖 Check [README.md](./README.md)
- 📚 Read [DEVELOPMENT.md](./docs/DEVELOPMENT.md)
- 💬 Use [Discussions](https://github.com/yourorg/discussions)
- 📧 Email maintainers

---

**Thank you for helping make PeerLink better!** ❤️
