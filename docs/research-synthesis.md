# Research Synthesis: Testing Philosophy for Human-AI Development

**Sources:** Gemini, ChatGPT, Grok, Sonnet (Claude), Opus (Claude) — five independent research agents analyzing the same prompt against our TESTING-PHILOSOPHY.md.

---

## Context: The Problem and Our Current Stance

### The workflow

A solo developer builds React + Convex apps with AI coding agents (Claude, Cursor, etc.). The agents write most of the code and tests. The human writes specs, reviews everything, and approves or rejects.

**Tests are contracts.** They're how the human verifies the agent built what was intended. If the test descriptions are clear and the tests pass, the feature is correct. If the tests are wrong or meaningless, the feature is wrong — but nobody knows until it's too late.

### The problem

When agents generate numerous tests that are hard to read, the human gets fatigued. Starts approving in bulk. Days later, both tests and code have accumulated technical debt — overlapping coverage, mocked data that drifted from reality, tests that pass but don't actually verify the right thing. By then, it's unmanageable.

### Our current philosophy: Integration-First + MECE

We developed a testing philosophy with two core principles. Here's what they mean:

#### Integration-First

Most React testing tutorials teach two separate test types:
1. **Backend-only test** — test the API/query in isolation using a test harness
2. **Component test with mocks** — mock the data-fetching hook (`useQuery`), render the component, check the UI

The problem: these two tests overlap (both test data handling) but miss the integration (neither proves the component correctly calls the query and renders real data).

**Integration-first** means: write ONE test that renders the component against a real in-memory backend. The component calls `useQuery`, which hits a real Convex function, which returns real data, which the component renders. One test covers backend + component + data flow.

```tsx
// One integration test replaces both isolated tests
test("shows seeded data", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  renderWithConvex(<TodoList />, client);
  expect(await screen.findByText("Buy milk")).toBeInTheDocument();
});
```

Mocks are used only for states a real backend can't produce: loading spinners (transient) and error states.

#### MECE (Mutually Exclusive, Collectively Exhaustive)

MECE is a problem-decomposition principle from McKinsey consulting (Barbara Minto, 1960s): break a problem into **buckets** where no item belongs to two buckets and nothing falls outside all buckets.

**A McKinsey example:** To analyze a revenue decline, you decompose into "New Customer Revenue" + "Existing Customer Revenue." Every dollar belongs to exactly one bucket. Nothing is missed. Within each bucket, you analyze from multiple angles (pipeline, win rate, deal size) — but the *buckets themselves* don't overlap.

**Applied to testing, MECE operates at every level of decomposition:**

| Level                       | MECE buckets                                                                         | What it prevents                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Testing layers**          | Integration / Unit-Mock — each test belongs to exactly one layer                     | Same behavior tested in unit AND integration layer. E2E layer is an exception to this rule as we want a browser-based test that checks the happy paths in a way that an actual user will use the product |
| **Test approach per state** | Integration OR Mock — the decision tree assigns each state to exactly one approach   | Overlapping mock + integration tests for the same data-loaded state                                                                                                                                      |
| **Component states**        | Loading / Empty / With data — each visual state gets exactly one test                | Two tests covering the same "with data" state from different angles                                                                                                                                      |
| **Feature ownership**       | Each feature's tests live in one file — no duplicate test files for the same feature | Route-level tests that duplicate feature-level tests                                                                                                                                                     |

Within each bucket, you go deep — multiple assertions, multiple angles. That's not overlap. That's thoroughness within a single bucket.

**The component-level example:**

```tsx
function TodoList() {
  const todos = useQuery(api.todos.list);
  if (todos === undefined) return <div>Loading...</div>;       // State 1
  if (todos.length === 0) return <div>No todos yet</div>;      // State 2
  return <ul>{todos.map(t => <li key={t._id}>{t.text}</li>)}</ul>;  // State 3
}
```

3 states → 3 tests → 100% coverage → zero overlap. The loading state needs a mock (transient). The other two use integration tests (real backend, seeded or empty data). Each test can have multiple assertions verifying that one state thoroughly.

#### Three testing layers

| Layer                          | Purpose                                         | Speed | Volume                                  |
| ------------------------------ | ----------------------------------------------- | ----- | --------------------------------------- |
| **E2E (Playwright)**           | Happy paths — critical user journeys            | Slow  | Few (~10 smoke tests)                   |
| **Integration (this library)** | Happy paths + core failures — bulk of coverage  | Fast  | Most tests                              |
| **Unit/Mock**                  | Edge cases — transient states, error conditions | Fast  | Few (only what integration can't reach) |

#### 100% line coverage

Not perfectionism — protection for multi-agent development. When multiple agents work in parallel, any of them can silently break code another feature depends on. Every line with a test standing guard catches this immediately.

### What we want to know

Is this philosophy well-grounded? Where does it align with established testing literature? Where does it fight unnecessarily? What are we missing? Five research agents investigated these questions independently.

---

## How to Read This Document

For each key idea, I present:
- **What the agents found** — consensus and divergence across all five
- **What the experts say** — the actual positions from the literature
- **My recommendation** — a specific position with reasoning
- **⚠️ Open Questions** — where I think we need your judgment, not mine

---

## 1. Integration-First Approach

### What the agents found
**Universal agreement across all four agents.** This is the strongest consensus in the entire research.

### What the experts say
- **Kent Beck**: Canon TDD (Dec 2023) — "Write a list of test scenarios" first, behavioral analysis not implementation design. "Test as little as possible to reach a given level of confidence." His Test Desiderata lists 12 properties good tests should have, crucially including **Behavioral** (sensitive to behavior changes) and **Structure-insensitive** (not affected by refactors) — both support integration over mocked tests.
  - Source: https://tidyfirst.substack.com/p/canon-tdd, https://testdesiderata.com/
- **Kent C. Dodds**: "Write tests. Not too many. Mostly integration." The Testing Trophy puts integration as the widest layer.
- **Spotify**: Testing Honeycomb — integration tests are the bulk, unit tests only for isolated complex logic. "We spin up a database, populate it, start the service, and query the actual API."
- **DHH**: System tests over unit tests (2014), then reversed on system tests too (2024). Now: model tests + controller tests + ~10 smoke tests.
- **Martin Fowler**: Classicist school (Beck's original XP) uses real objects. Sociable tests > solitary tests for confidence.
- **James Shore**: "Testing Without Mocks" — the less you mock, the fewer tests you need. His "Overlapping Sociable Tests" pattern maps closely to your integration-first approach.
- **Gary Bernhardt**: "Functional Core, Imperative Shell" — pure logic gets unit tests, wiring gets integration tests. Zero mocks needed if architecture is right.

### The one counterargument
**Google's position** (70% Small / 20% Medium / 10% Large) still favors more unit tests. But Sonnet's research clarified: Google's "Small" tests are defined by *resource constraints* (no network, no DB), not by isolation philosophy. And Google's "Medium" tests run against real localhost databases — which is exactly what `feather-testing-convex` does with an in-memory Convex backend.

**Fowler's reconciliation (2021)**: The pyramid vs. trophy/honeycomb debate is largely semantic. Sociable unit tests and integration tests are often the same thing with different names.

### My recommendation
**Keep integration-first. It's not just supported — it IS the modern consensus.** Your approach is aligned with KCD, Spotify, DHH, Shore, and the Classicist school. The Google counterargument dissolves when you map their "Medium" category to your integration tests.

No changes needed here. This is the strongest pillar of your philosophy.

---

## 2. The MECE Framework

### What the agents found
All five agents support MECE as a concept. But there was an **apparent split on strictness** that turned out to be a misunderstanding:

- **Gemini**: "Your Killer App." No caveats.
- **ChatGPT**: "Too rigid. Some states need multiple perspectives. Suggestion: 'One primary test per state' (not strict exclusivity)."
- **Grok**: Supports it, notes "No major expert formalizes this — this is your original contribution."
- **Sonnet**: Supports it, frames it through equivalence partitioning (formal testing theory).
- **Opus**: Supports it, connects to Beck's "Test as little as possible to reach a given level of confidence."

### The misunderstanding: MECE is about buckets, not assertions

ChatGPT (and initially this synthesis) misread MECE as constraining *what a single test can assert*. That's not what MECE means.

**MECE in McKinsey consulting** (Barbara Minto, 1960s) is about decomposing a problem into **categories/buckets** where:
1. No item belongs to two buckets (Mutually Exclusive)
2. Nothing falls outside all buckets (Collectively Exhaustive)

The classic examples make this clear:
- **Revenue analysis**: "New Customer Revenue" + "Existing Customer Revenue" = MECE. Every dollar belongs to exactly one bucket. But *within* a bucket, you analyze from multiple angles (pipeline, win rate, deal size).
- **Customer segmentation**: "Price-driven", "Trend-driven", "Quality-driven", "Convenience-driven" = MECE by primary motivation. A customer might care about both, but you classify by *primary* driver.

**Applied to testing**: MECE operates at every level of the testing strategy, not just component states:

- **Testing layers**: Integration / Unit-Mock are MECE buckets — each test belongs to exactly one layer, and together they cover everything. This prevents the "same behavior tested at every layer" anti-pattern.
- **Test approach per state**: The decision tree assigns each state to exactly one approach (integration OR mock). This prevents overlapping mock + integration tests for the same data-loaded state.
- **Component states**: "Loading", "Empty", "With data" are MECE buckets — each state gets exactly one test.
- **Feature ownership**: Each feature's tests live in one place — no duplicate test files for the same behavior.

Within each bucket, you go deep — multiple assertions verifying different aspects of the same thing. A form submission test that asserts BOTH "UI shows success message" AND "backend mutation persisted" is testing ONE state from two angles. That's thoroughness within a bucket, not overlap between buckets.

ChatGPT's suggested fix — "One primary test per state (not strict exclusivity)" — was based on misreading MECE as constraining assertions within a test. MECE constrains buckets. Within a bucket, you analyze thoroughly. There was no real disagreement, just a definitional confusion.

### What the formal literature says
Sonnet found the connection: MECE maps to **equivalence partitioning** in formal testing theory — dividing the input/state space into equivalence classes where each class gets one representative test. This is well-established and uncontroversial in QA/testing literature. Opus connected it to Kent Beck's "test as little as possible to reach a given level of confidence" — minimum tests, maximum coverage.

### My recommendation
**Apply MECE at every level of the testing strategy. Within each bucket, go deep.**

This means:
- **Layers are MECE** — a behavior is tested at ONE layer (integration, mock), plus E2E for user-facing happy paths. ✅ Prevents the "layers" anti-pattern.
- **Component states are MECE** — each visual state gets exactly one test, using the approach the decision tree assigns. ✅ Prevents test explosion.
- **Feature ownership is MECE** — one test file per feature, no duplicates across directories. ✅ Prevents the route-test-copies-feature-test problem.
- **Within each bucket, assert thoroughly** — multiple assertions verifying different aspects of the same state/behavior. ✅ This is KCD's "Write Fewer, Longer Tests."

MECE and KCD are perfectly compatible. There's no tension to resolve — just a misunderstanding to avoid. **MECE constrains how you decompose the testing problem into non-overlapping buckets. Within each bucket, you verify thoroughly.**

---

## 3. 100% Code Coverage — THE BIG DISAGREEMENT

### What the agents found
This is the **most divergent topic** across all four agents:

- **Gemini**: "The '100% Coverage' Trap — agents will write nonsense tests to hit the line. Pivot to '100% Behavioral Coverage'."
- **ChatGPT**: "Experts don't enforce this strictly. But in your case, it makes sense due to AI agents modifying code."
- **Grok**: "Keep 100% via MECE (achievable without bloat)."
- **Sonnet**: "Community consensus: 100% coverage is harmful for application code, meaningful for library code." Cites KCD: "mandating 100% code coverage for applications is a really bad idea."

### What the experts actually say

**Kent C. Dodds** (the most direct quote):
> "I've heard managers and teams mandating 100% code coverage for applications. That's a really bad idea."
> 
> Exception: "Almost all of my open source projects have 100% code coverage. This is because most of my open source projects are smaller libraries and tools."

**KCD's real metric**: "Code Coverage < Use Case Coverage." A function can have 100% line coverage and zero use-case coverage if tests only call it with inputs that never trigger real user scenarios.

**Kent Beck**: Has moved away from 100% coverage, focuses on "confidence" instead.

**DHH**: Doesn't discuss coverage percentages — focuses on testing what matters.

### The tension specific to YOUR workflow
Your justification for 100% is unique and compelling — **it's not about perfectionism, it's about multi-agent protection:**

> "When multiple AI agents work on features in parallel, any one of them can silently modify, delete, or break code that another feature depends on."

This is a real problem that KCD, Beck, and DHH never faced. They work in human-only teams where changes are reviewed before merge. In your workflow, multiple agents modify code simultaneously, and coverage gaps become silent regression risks.

### But Gemini's warning is also real
> "Agents will write nonsense tests just to hit the line."

An agent told to achieve 100% coverage will generate `expect(result).toBeDefined()` for every uncovered branch. This achieves the metric while providing zero confidence. You've experienced this: "tests that pass but don't actually verify the right thing."

### My recommendation — THIS NEEDS YOUR INPUT

There are three defensible positions:

**Position A: Keep 100% line coverage** (current)
- Pro: Maximum protection for multi-agent workflows
- Pro: MECE naturally achieves it without bloat
- Con: Agents game the metric with meaningless assertions
- Con: Fights mainstream expert consensus
- Mitigation: Review checklist catches nonsense tests

**Position B: Target 100% use-case coverage, measure line coverage as a secondary indicator** (Sonnet/KCD-aligned)
- Pro: Aligns with expert consensus
- Pro: Forces meaningful tests (each test must map to a user-facing state)
- Con: "Use-case coverage" is harder to measure automatically than line coverage
- Con: Leaves code paths unprotected if you miss a use case
- Mitigation: Use line coverage as a smoke detector — if it drops below 90%, investigate

**Position C: 100% line coverage for the library, use-case coverage for applications** (Sonnet's literal recommendation)
- Pro: Matches KCD's own practice exactly
- Pro: Pragmatic split between library code and app code
- Con: Your app code IS where agents clash — the library code is less at risk
- Con: Two different standards add cognitive overhead

**My lean:** I'd suggest **Position A with Gemini's safeguard**: Keep 100% line coverage as the target, but add an explicit rule: **"Agents must never add `v8 ignore` comments — only the human can."** And add to the review checklist: "Every assertion must verify user-visible behavior, not just execute code." This preserves multi-agent protection while preventing metric gaming.

---

## 4. E2E Test Scope

### What the agents found
Agreement that E2E tests should cover happy paths, but **divergence on volume**:

- **Gemini**: E2E for critical user journeys. No specific cap.
- **ChatGPT**: "E2E for happy paths. Restrict aggressively."
- **Grok**: "Aggressively prune E2E to ~10 smoke tests max, per DHH 2024. Human exploratory testing fills gaps."
- **Sonnet**: "A few critical user flows — slow, expensive, high confidence."

### The DHH 2024-2025 bombshell (Grok + Opus found the details)
DHH reversed his position on system tests. Opus found the full story with sources:

**May 2024** — "System Tests Have Failed" (https://world.hey.com/dhh/system-tests-have-failed-d90af718):
> "System tests remain as slow, brittle, and full of false negatives as they did a decade ago."
> "I've wasted far more time getting system tests to work reliably than I have seen dividends from bugs caught."

**Late 2024** — HEY deletes 359 system tests. Results confirmed at Rails World 2025:
- Kept only **10 system tests** as smoke tests
- **Not a single bug slipped through** that the deleted tests would have caught
- Rails 8.1 formalized this: scaffold generator no longer creates system test files by default

Source: https://jonathanspooner.com/posts/dhh-killed-359-system-tests-and-rails-followed

**37signals test hierarchy today:**
- Model tests (most) — hit the database directly
- Controller/integration tests (middle) — full HTTP without browser
- ~10 smoke tests — Capybara, top-level flows
- Human QA testers — exploratory testing

**HEY's suite: ~30,000 assertions, runs in under 4 minutes on M4 Mac.**

This is a significant data point. The person who most vocally advocated for system-level testing now says they failed in practice at scale.

### My recommendation
**Your current position (E2E for happy paths + integration for everything else) is correct, and DHH's 2024 reversal strengthens it.** The integration layer you've built with `feather-testing-convex` is the exact replacement DHH is reaching for — fast, in-process tests that exercise real data flow without the brittleness of a full browser.

**Specific guidance:** Keep E2E test count in single digits per feature area. Use them as smoke tests for critical journeys (signup, checkout, onboarding). Everything else should be integration tests.

No changes needed to your philosophy doc. But worth adding a note about DHH's 2024 reversal as supporting evidence.

---

## 5. Rules vs. Principles for AI Agents

### What the agents found
**Strong consensus: prescriptive rules beat vague principles for AI agents.**

- **Gemini**: "Be Prescriptive. LLMs do not have 'judgment'; they have 'probability'."
- **ChatGPT**: "Rules > principles. LLMs don't apply judgment consistently."
- **Grok**: "Relax to principles for agent judgment." ← The lone dissenter
- **Sonnet**: "Specific rules are directly actionable. Vague principles are hard for an LLM to operationalize." Cites LLM4TDD paper: test quality determines implementation quality.

### Grok's counter-argument
> "Relax 'never mock useQuery for data display' to 'prefer integration; mock only if real backend can't produce the state reliably.' Agents produce better output with judgment."

### Why I disagree with Grok here
The LLM4TDD paper (arXiv:2312.04687) found the opposite: clearer specifications produce better implementations. An LLM given "prefer integration" has to make a judgment call every time about what "prefer" means. An LLM given "never mock useQuery for data display — use seed() instead" has zero ambiguity.

The empirical evidence from your own workflow confirms this: when you gave agents principles, they defaulted to their training data (mocked useQuery everywhere). When you gave them rules, they followed them.

### My recommendation
**Keep prescriptive rules. Provide the principles as rationale (so the agent understands WHY), but enforce the rules.**

Specific format in instructions:
```
RULE: Never mock useQuery for data display states. Use seed() with renderWithConvex instead.
WHY: Integration tests verify the full data flow (backend → useQuery → React render). 
     Mocks sever this connection and drift from reality.
```

The "WHY" helps the agent handle edge cases intelligently. The "RULE" prevents it from defaulting to training data.

---

## 6. Test Count / Test Budget

### What the agents found
- **Gemini**: "No test file should exceed 15 tests."
- **ChatGPT**: "Target 3–5 tests per component. Hard cap: 7."
- **Grok**: "~3 tests per component max."
- **Sonnet**: "Define a test budget per component. The agent fills slots in your pre-defined test matrix, not define the matrix itself."

### The interesting idea: Test Matrix
Sonnet's most original contribution: **the agent should fill a matrix you define, not define its own matrix.**

> "When the agent defines the matrix (prompted only with 'write tests for this component'), it defaults to structural coupling (one test per prop, one test per method), producing N×M tests. When you define the matrix first ('these are the 4 states this component can be in'), the agent fills 4 slots, you review 4 tests, and done."

This maps directly to Kent Beck's Canon TDD Step 1: "Write a list of the test scenarios you want to cover" — before writing any code.

### My recommendation
**Add the "Test Matrix" concept to your philosophy.** Before any component gets tests:

1. Human lists the visual states (the matrix)
2. Human classifies each: integration or mock
3. Agent writes one test per slot
4. Human reviews N tests where N is the number of states

This is your MECE framework operationalized as a workflow step. It's the anti-fatigue mechanism — the matrix constrains the agent's output to exactly what you expect to review.

**On specific numbers:** I'd avoid hard caps like "7 max" — some complex components legitimately have more states (a multi-step form wizard, a dashboard with many conditional sections). The constraint should be "one test per state" not "N tests per file." If a component has 12 states, that's a signal to decompose the component, not to leave states untested.

---

## 7. One Assertion Per Test

### What the agents found
**Universal agreement: harmful for component/integration tests, fine for pure functions.**

- All five agents cite KCD's "Write Fewer, Longer Tests" as the definitive argument
- All five identify this as the #1 source of test explosion in AI-generated code

### What KCD actually says
> "Making tests too short often leads to poor testing practices and way more tests."

His example: instead of 5 separate tests for loading → loaded → title → description → button, write one test that walks through the lifecycle with multiple assertions.

### How this connects to MECE (corrected understanding)
As discussed in Section 2, MECE constrains *how you decompose the testing problem into non-overlapping buckets* — at the layer level, the approach level, and the state level. Within each bucket, you go deep. MECE + KCD "Write Fewer, Longer Tests" are naturally compatible:

- **MECE** says: non-overlapping buckets at every level — layers, approaches, states, feature ownership
- **KCD** says: within each bucket, assert everything that matters — don't split into tiny one-assertion tests

### My recommendation
**Add explicitly to the philosophy doc: "Multiple assertions per test are encouraged — they verify different aspects of the same state."**

Your current MECE doc shows single-assertion tests in the examples. This inadvertently models the one-assertion-per-test anti-pattern. Consider updating the examples to show multi-assertion tests:

```tsx
// ✅ One test for the "with data" state — multiple assertions verifying it
test("shows seeded data", async ({ client, seed }) => {
  await seed("todos", { text: "Buy milk", completed: false });
  await seed("todos", { text: "Walk dog", completed: true });
  renderWithConvex(<TodoList />, client);
  
  expect(await screen.findByText("Buy milk")).toBeInTheDocument();
  expect(screen.getByText("Walk dog")).toBeInTheDocument();
  expect(screen.getByText("1 of 2 completed")).toBeInTheDocument();
});
```

---

## 8. Snapshot Testing

### What the agents found
**Universal agreement: large snapshot tests are harmful, especially in AI workflows.**

- **Sonnet**: "The testing equivalent of commenting out a failing test."
- **Gemini**: "Low-Signal Noise. Almost always approved without being read."
- **ChatGPT**: "Worst offender. Easy to approve blindly."

### KCD's nuance
Large component snapshots = bad. Small, targeted snapshots of specific values = sometimes useful (error message formats, CSS-in-JS objects).

### My recommendation
**Add "No snapshot tests" as an explicit rule in the philosophy doc.** This is one of those cases where the AI-workflow harm is so severe that even KCD's nuanced "sometimes useful" exception isn't worth the risk. An agent will always reach for `toMatchSnapshot()` if allowed.

---

## 9. Tests as Contracts — The Novel Framing

### What the agents found
This is where the research gets genuinely new — and Opus found the strongest sources.

- **Sonnet** found the closest analogs: Gojko Adzic's "Specification by Example" and Kent Beck's Canon TDD Step 1 ("Write a list of test scenarios").
- **Sonnet** found Dave Farley's "tests as falsification mechanisms" — and a crucial insight: **"A test the agent writes that the agent also made pass is a non-falsifying test."**
- **ChatGPT** framed it well: "You are using tests as specification (primary) and regression safety (secondary). This is valid but different from traditional testing."
- **Gemini**: "The description is the spec. The `test('description')` must be written by the human or strictly approved first."
- **Opus** found three 2025-2026 sources that directly validate this workflow — this is no longer an edge case, it's an emerging discipline.

### Opus's Critical Findings: The AI-Era Testing Literature

**1. Mark Seemann: AI-Generated Tests as Cargo-Cult Ceremony (Jan 2026)**
Source: https://blog.ploeh.dk/2026/01/26/ai-generated-tests-as-ceremony/

> "Having LLMs write unit tests strikes me as a process with little epistemological content."
> "Tests work best when you have seen them fail... When using LLMs to generate tests for existing code, you skip this step."
> "Instead of writing production code and asking LLMs to write tests, **why not write tests, and ask LLMs to implement the SUT?**"

This is the strongest theoretical argument for your workflow: human writes the test intent, AI writes the code.

**2. Microsoft Research: The Intent Gap (March 2026)**
Source: https://arxiv.org/abs/2603.17150

Shuvendu Lahiri at MSR published a landmark paper framing the core challenge:

> "The gap between informal natural language requirements and precise program behavior — the *intent gap* — has always plagued software engineering, but AI-generated code amplifies it to an unprecedented scale."

Your test descriptions ARE intent formalization. This is the exact thing Microsoft Research identifies as the grand challenge.

**3. Paul Duvall: ATDD-Driven AI Development (June 2025)**
Source: https://www.paulmduvall.com/atdd-driven-ai-development-how-prompting-and-tests-steer-the-code/

> "In the future, code will just be specifications, and tests are specifications. Our tests will be our code, and the actual code will be generated by AI."
> "Prompting is the new coding. In agentic development, my main job is to write clear, structured, and precise prompts/tests — one at a time."

**4. AI-Generated Tests Give False Confidence (htek.dev)**
Source: https://htek.dev/articles/tests-are-everything-agentic-ai/

> "AI writes fake tests that pass but test nothing... Research from multiple teams shows AI-generated tests achieve only 20% mutation scores on real-world code."

### The Farley + Seemann convergence
The most important theoretical finding across all five agents:

> A test the agent writes AND the agent also makes pass **cannot falsify the implementation**. It was written to match the implementation. It's a tautology.

Seemann's framing: "Having LLMs write unit tests strikes me as a process with little epistemological content." Farley's framing: tests are falsification mechanisms — they can only falsify behavior if they come from a source independent of the implementation.

This is why your workflow (human writes spec → agent implements → tests verify) works, and why "agent writes everything" fails. The spec MUST come from a source independent of the implementation.

### My recommendation
**Add a "Tests as Contracts" section to the philosophy doc.** Frame it around:

1. The human writes the test matrix (states + descriptions) — this is intent formalization (MSR)
2. The agent fills the matrix with test code — this is "write tests, ask LLMs to implement" (Seemann)
3. The test descriptions serve as the spec — if they're clear, the agent's implementation either matches or doesn't
4. Tests written by the same agent that wrote the implementation are non-falsifying (Farley/Seemann) — they should be reviewed with extra scrutiny
5. "Prompting is the new coding" (Duvall) — your spec-writing is the highest-leverage activity in the entire workflow

---

## 10. Mock-Heavy Testing

### What the agents found
**Universal agreement to minimize mocks.** 

The interesting additions from the research:

- **"Don't Mock What You Don't Own"** (Freeman & Pryce, GOOS): Only mock types you control. Since you own the Convex test backend, mocking it would violate this principle.
- **James Shore's "Testing Without Mocks"**: "The less you mock, the fewer tests you need."
- **Fowler's Classicist vs. Mockist**: Your approach is firmly Classicist (Kent Beck's school). The Mockist school (Dan North et al.) is the training data LLMs absorbed.

### My recommendation
**No changes needed.** Your "mocks only for transient states" rule is perfectly aligned with the Classicist school, KCD, Shore, and "Don't Mock What You Don't Own." The key addition from the research is the *terminology* — calling your approach "Classicist" connects it to the established literature.

---

## 11. Human Reviewer Fatigue — The Unsolved Problem

### What the agents found
- **Sonnet**: "Code review studies show defect detection drops sharply after 200–400 LOC or 60–90 minutes."
- **ChatGPT**: "Humans can meaningfully review ~5–9 chunks at once. After ~20–30 similar items → fatigue + rubber-stamping."
- **ChatGPT**: "Test count is the primary driver of review fatigue — not test complexity."
- **Gemini**: "The Reviewer's Paradox — beyond 200–400 lines of code, inspection rate drops by 50%."

### Opus found the hard numbers (this is the strongest evidence)

**The Cisco/SmartBear Study (2006)** — 2,500 reviews over 10 months:
- **200–400 lines** is the optimal review size
- At that size over 60–90 minutes: defect discovery rate is **70–90%**
- Above 500 LOC/hour: defect density drops *significantly*
- **Performance drops off after 60 minutes** — "reviewers simply wear out"
- Source: https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/

**The Cognitive Load Cliff (Baldawa, 2025)** — not a gradual slope, a CLIFF:
> "Reviews under 300 lines tend to get meaningful architectural feedback. Past 600 lines, comments shift almost entirely to style issues, typos, and obvious bugs. The reviewer isn't thinking deeply anymore."
- Working memory holds ~4 chunks (Cowan, 2001). Each additional file/function adds load until the cliff is hit.
- Source: https://rishi.baldawa.com/posts/pr-throughput/cognitive-load-cliff/

**Microsoft Research** (Bosu, Greiler, Bird) — 1.5 million review comments:
> "About one-third of code review comments weren't useful. The more files in a changeset, the lower the proportion of useful feedback."
- Source: https://michaelagreiler.com/wp-content/uploads/2019/02/Characteristics-Of-Useful-Comments.pdf

**LinearB 2025** — 6.1 million pull requests:
> "Elite teams average under 219 lines of code per PR."

### What this means concretely
If an AI generates 20 tests at 50 lines each = 1,000 lines, you are **3× past the cognitive cliff**. You WILL rubber-stamp. This isn't a personal failing — it's a biological constraint.

### The key insight ChatGPT contributed
> "No mainstream philosophy optimizes for human review scalability. They optimize for: debugging, confidence, maintainability. NOT for: reviewing 100 AI-generated tests. This is your gap."

This is correct. The entire testing literature assumes human-written tests reviewed by other humans. No expert has addressed the specific problem of one human reviewing AI-generated tests under fatigue pressure.

### My recommendation
**This is your original contribution to the testing literature.** Your MECE framework + test matrix + integration-first approach is a complete system designed to solve a problem nobody else has formalized: *how does a single human maintain quality control over AI-generated tests at scale?*

The answer your system provides:
1. **MECE** constrains test count (fewer tests to review)
2. **Test matrix** constrains test scope (human defines WHAT to test, agent fills HOW)
3. **Integration-first** reduces mock drift (less to verify per test)
4. **Prescriptive rules** reduce variation (every test looks similar, faster to scan)
5. **Test names as specs** enable review without reading code

Consider framing this explicitly in the philosophy doc as "Review-Optimized Testing" — a system designed for human-AI collaboration, not just for correctness.

---

## 12. Test Naming / Scanability

### What the agents found
Agreement across all four agents on the naming pattern:

**Best for scan-ability:**
```
test("shows error when email is invalid")
```

**Worse (too verbose):**
```
it("should display an error message when the user enters an invalid email format")
```

ChatGPT and Gemini both found that **reading test names alone should explain what the component does** — this is the "test as spec" principle.

### My recommendation
**Add a naming convention to the philosophy doc:**
- Start with what the user sees: "shows...", "hides...", "navigates to..."
- Include the condition: "...when email is invalid", "...after sign out"
- Keep under ~10 words
- Test names should read as a feature spec when listed together:

```
TodoList
  ✓ shows loading spinner
  ✓ shows empty state when no todos
  ✓ shows todo items when data exists
  ✓ marks todo as completed on click
```

---

## 13. Terminology Alignment

### What the agents suggested
- **Gemini**: Use "Sociable Component Test" instead of "Integration Test"
- **Grok**: Frame MECE as "sociable narrow integration tests" for literature alignment

### My recommendation
**Don't change the terminology.** "Integration test" is what KCD, Spotify, and your README already use. "Sociable Component Test" is technically more precise but nobody outside the Fowler readership uses it. Using unfamiliar terms increases friction with AI agents (they're trained on "integration test", not "sociable component test").

---

## 14. `v8 ignore` Governance

### What Gemini uniquely raised
> "Agents will start using `v8 ignore` to bypass your rules. You need a rule: 'Agents are never allowed to add `v8 ignore` comments; only humans can.'"

### My recommendation
**Add this as an explicit rule.** It's a small addition but it closes a real loophole. An agent told to achieve 100% coverage has two paths: write a meaningful test, or add `v8 ignore`. The second is easier. Block it.

---

## Summary: What to Keep, What to Add, What to Change

### ✅ Keep (validated by research)
1. Integration-first approach (universal expert consensus)
2. MECE framework at every level — layers, approaches, states, feature ownership (original, well-grounded)
3. Three testing layers (E2E → Integration → Mock)
4. Mocks only for transient/error states (Classicist school)
5. 100% coverage as multi-agent protection (unique justification)
6. Prescriptive rules for AI agents (LLM4TDD evidence)
7. Decision tree (clear, actionable)

### ➕ Add (new ideas from research)
1. **Test Matrix workflow** — human defines states first, agent fills slots (Sonnet/Beck Canon TDD)
2. **"Tests as Contracts" section** — the Farley falsification insight, spec-first workflow
3. **"Multiple assertions per test are encouraged"** — KCD's "Write Fewer, Longer Tests"
4. **"No snapshot tests" rule** — universal anti-pattern in AI workflows
5. **`v8 ignore` governance** — only humans can add these (Gemini's insight)
6. **Test naming convention** — short, outcome-focused, scannable as a spec
7. **"Review-Optimized Testing" framing** — your original contribution

### 🔄 Consider Changing (divergent views — needs your call)
1. **Coverage metric**: Keep 100% line coverage OR pivot to "100% use-case coverage" (see Position A/B/C in section 3)
2. **Test budget caps**: Add explicit caps (ChatGPT's "7 max") OR keep it implicit via MECE (my lean)
3. **DHH 2024 E2E reversal**: Add as supporting evidence OR leave it out to avoid confusion

---

## Key Sources Worth Reading Yourself

The highest-value primary sources from across all agents:

| Source                              | Why it matters                                                          | URL                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| KCD: Write Fewer, Longer Tests      | Directly refutes one-assertion-per-test                                 | https://kentcdodds.com/blog/write-fewer-longer-tests                                           |
| KCD: The Merits of Mocking          | The definitive "when to mock" guide                                     | https://kentcdodds.com/blog/the-merits-of-mocking                                              |
| Kent Beck: Canon TDD                | "Write a list of scenarios first" — validates your workflow             | https://tidyfirst.substack.com/p/canon-tdd                                                     |
| Kent Beck: Test Desiderata          | 12 properties of good tests — the tradeoffs framework                   | https://testdesiderata.com/                                                                    |
| Spotify: Testing Honeycomb          | Closest real-world analog to your approach                              | https://engineering.atspotify.com/2018/01/testing-of-microservices/                            |
| Fowler: Diverse Test Shapes (2021)  | The pyramid debate is semantic — focus on test quality instead          | https://martinfowler.com/articles/2021-test-shapes.html                                        |
| arXiv: LLM4TDD                      | Test quality determines AI implementation quality                       | https://arxiv.org/abs/2312.04687                                                               |
| Increment: Testing as Communication | Tests as documentation — from Stripe's engineering magazine             | https://increment.com/testing/testing-as-communication/                                        |
| James Shore: Testing Without Mocks  | "The less you mock, the fewer tests you need"                           | https://www.jamesshore.com/v2/projects/nullables/testing-without-mocks                         |
| Mark Seemann: AI Tests as Ceremony  | "Write tests, ask LLMs to implement the SUT" — epistemological argument | https://blog.ploeh.dk/2026/01/26/ai-generated-tests-as-ceremony/                               |
| MSR: The Intent Gap                 | Your test descriptions = intent formalization — THE grand challenge     | https://arxiv.org/abs/2603.17150                                                               |
| Paul Duvall: ATDD + AI              | "Prompting is the new coding" — tests as specs for AI                   | https://www.paulmduvall.com/atdd-driven-ai-development-how-prompting-and-tests-steer-the-code/ |
| DHH: System Tests Have Failed       | DHH reverses on E2E after a decade — validates integration-first        | https://world.hey.com/dhh/system-tests-have-failed-d90af718                                    |
| Cisco/SmartBear: Code Review Study  | Hard numbers: 200-400 LOC optimal, cliff after 60 min                   | https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/                   |
| Cognitive Load Cliff                | Not a slope — a cliff at ~600 LOC                                       | https://rishi.baldawa.com/posts/pr-throughput/cognitive-load-cliff/                            |
| htek.dev: AI Test False Confidence  | "AI-generated tests achieve only 20% mutation scores"                   | https://htek.dev/articles/tests-are-everything-agentic-ai/                                     |
