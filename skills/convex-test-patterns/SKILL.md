---
name: convex-test-patterns
description: Testing patterns, recipes, and decision guidance for Convex + React projects. Multi-user, data seeding, MECE, coverage, one-shot workarounds.
---

# Convex Test Patterns

Recipes and decision guidance for testing Convex + React applications. Assumes testing is already set up (see `/setup-convex-testing`).

## When to Use

- Looking for how to test a specific scenario
- Deciding which test approach to use
- Setting up coverage
- Working around one-shot query limitations

## Reference Files

Each file covers one focused topic:

| File | What it covers |
|------|---------------|
| [data-seeding.md](data-seeding.md) | `seed()` fixture, mutations, direct DB, multi-user data, explicit userId |
| [test-strategy.md](test-strategy.md) | Which test to write: integration vs unit vs backend, MECE design |
| [coverage.md](coverage.md) | Vitest coverage config, thresholds, npm scripts |
| [one-shot-workarounds.md](one-shot-workarounds.md) | Why queries don't re-run, how to assert after mutations, Layer 3 alternative |
