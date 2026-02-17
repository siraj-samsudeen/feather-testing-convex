# Coverage Setup

## Install

```bash
npm install -D @vitest/coverage-v8
```

## Vitest Config

```typescript
// vitest.config.ts — add coverage section
export default defineConfig({
  // ... existing config
  test: {
    // ... existing test config
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.test.{ts,tsx}",
        "**/*.config.{ts,js}",
        "convex/_generated/",
      ],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
```

## npm Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## .gitignore

```
coverage/
```

## Run

```bash
npm run test:coverage
```

## Recommendations

- Target **100% coverage** on production files — achievable with integration tests
- Exclude generated code (`convex/_generated/`), config files, and test helpers
- Integration tests often give backend coverage for free — check before writing separate backend tests
- Use `/feather:setup-tdd-guard` to enforce coverage via pre-commit hooks
