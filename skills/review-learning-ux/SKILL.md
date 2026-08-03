---
name: review-learning-ux
description: Review and improve Breaking Point pages, labs, simulations, interactions, responsive layouts, accessibility, feedback, and error recovery as a Korean learning experience. Use whenever user-facing Astro, React, MDX, CSS, Canvas, navigation, forms, challenge flows, or visualization behavior is created or changed, and when visual polish must be evaluated against usability and learning outcomes.
---

# Review Learning UX

Evaluate whether a learner can understand what to do, act, interpret the result, recover from error, and retain the concept.

## Workflow

1. Read `AGENTS.md`, `docs/FRONTEND_GUIDELINES.md`, and `references/learning-ux-checklist.md`.
2. Identify the learner, their immediate question, the primary action, and the intended insight.
3. Inspect the rendered page before changing it. Use DOM state for semantics and screenshots for visual relationships.
4. Review the happy path, invalid input, running/loading state, completion state, and recovery path.
5. Verify keyboard labels, reduced motion behavior, readable contrast, 375px overflow, and Canvas alternative text.
6. Check that animation stops or reduces when offscreen and that large inputs are bounded.
7. Prefer an existing token or UI primitive. Add a primitive only when a repeated interaction contract exists.
8. Re-run browser checks after the change and report observations, not aesthetic claims.

## Decision priority

Prioritize task comprehension, feedback, error prevention, recovery, accessibility, responsive behavior, performance, and
visual polish in that order. Reject decoration that competes with simulation meaning or increases cognitive load.

## Evidence

Report the URL, viewport, action performed, visible state after the action, overflow result, console errors, and any limitation
that could not be tested. Do not approve a user-visible change from source review alone.
