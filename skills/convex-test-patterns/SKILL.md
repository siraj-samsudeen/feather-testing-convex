---
name: convex-test-patterns
description: Testing patterns, recipes, and decision guidance for Convex + React projects. Multi-user, data seeding, MECE, coverage, one-shot workarounds.
license: MIT
metadata:
  author: siraj-samsudeen
  version: "0.3"
---

# Convex Test Patterns

Recipes and decision guidance for testing Convex + React applications. Assumes testing is already set up (see `/setup-convex-testing`).

## When to Use

- Looking for how to test a specific scenario
- Deciding which test approach to use
- Setting up coverage
- Working around one-shot query limitations

## Quick Decision

- **How to seed data?** → [data-seeding.md](references/data-seeding.md)
- **Which test type?** → [test-strategy.md](references/test-strategy.md) — default: integration
- **Query not updating after mutation?** → [one-shot-workarounds.md](references/one-shot-workarounds.md) — assert backend directly
- **Setting up coverage?** → [coverage.md](references/coverage.md)

## Reference Files

Each file covers one focused topic:

| File | What it covers |
|------|---------------|
| [data-seeding.md](references/data-seeding.md) | `seed()` fixture, mutations, direct DB, multi-user data, explicit userId |
| [test-strategy.md](references/test-strategy.md) | Which test to write: integration vs unit vs backend, MECE design |
| [coverage.md](references/coverage.md) | Vitest coverage config, thresholds, npm scripts |
| [one-shot-workarounds.md](references/one-shot-workarounds.md) | Why queries don't re-run, how to assert after mutations, Layer 3 alternative |
