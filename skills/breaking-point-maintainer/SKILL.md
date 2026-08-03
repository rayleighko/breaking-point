---
name: breaking-point-maintainer
description: Implement, review, or extend Breaking Point labs, simulations, Scenario schemas, local-lab tooling, documentation, and project architecture while preserving deterministic behavior and learning contracts. Use for any repository change that adds a lab, changes an engine or challenge, modifies shared frontend infrastructure, prepares a contribution, or needs a verified handoff.
---

# Breaking Point Maintainer

Preserve the educational contract and produce repeatable evidence for every repository change.

## Workflow

1. Find the repository root and read `AGENTS.md` completely.
2. Classify the task as content, engine, challenge, frontend, local lab, infrastructure, or documentation.
3. Read only the contracts routed by `AGENTS.md`; read `references/change-matrix.md` for the required evidence.
4. State objective, scope, constraints, acceptance criteria, and evidence before editing.
5. Inspect the nearest implementation and tests. Preserve stable public contracts unless the request requires migration.
6. Implement the smallest coherent change. Keep model, orchestration, and presentation separated.
7. Run the nearest checks, then `pnpm quality`. Add engine and challenge evidence when applicable.
8. For user-visible changes, use `review-learning-ux` and verify the rendered browser state.
9. Report outcome, changed contracts, exact evidence, limitations, and next decision.

## Non-negotiable rules

- Never describe a browser model as a production benchmark.
- Never change engine behavior without rerunning engine tests.
- Never publish a challenge until a script proves the naive solution fails and intended solution passes.
- Never invent source support for technical claims; prefer primary documentation.
- Never move local component state into Zustand without a demonstrated cross-component consumer.
- Never add a generic UI abstraction before two concrete uses establish the shared contract.
- Never claim a check passed unless it was executed in the current change state.

## Contribution output

Prepare a handoff that a human contributor can understand without reading the agent conversation. Include the user-visible
result, affected files/contracts, verification commands, browser observations, rejected alternatives, and remaining risks.
