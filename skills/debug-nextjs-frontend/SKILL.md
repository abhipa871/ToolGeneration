---
name: debug-nextjs-frontend
description: Diagnose and fix Next.js and React frontend defects. Use for hydration mismatches, rendering bugs, broken streaming UI, stale state, routing and caching surprises, server/client boundary violations, build failures, browser-only errors, accessibility regressions, performance problems, and flaky frontend tests.
---

# Debug Next.js Frontend

## Workflow

1. Reproduce the smallest failing user path and record exact expected versus actual behavior.
2. Inspect browser console/network evidence and terminal/build output. Preserve the first causal error, not only downstream noise.
3. Classify the failure: build/type, server render, hydration, client state, network/stream, styling/layout, cache, or performance.
4. Trace data from origin through serialization, rendering, effects, and user interaction.
5. Form one falsifiable hypothesis and run the cheapest discriminating check.
6. Add a focused regression test before or with the smallest root-cause fix.
7. Verify development and production builds when behavior could differ.
8. Re-run the original path plus adjacent loading, error, cancellation, and navigation states.

Read [references/diagnostic-playbook.md](references/diagnostic-playbook.md) for symptom-specific checks.

## Guardrails

- Diagnose before changing code; do not "fix" warnings by suppressing them.
- Do not broadly disable caching, SSR, strict mode, or lint rules to hide a defect.
- Treat intermittent bugs as ordering, identity, cancellation, or shared-state problems until disproven.
- Check framework/package versions before relying on version-sensitive behavior.
- Keep instrumentation temporary unless it provides durable observability.

## Report

State the root cause, supporting evidence, files changed, regression coverage, commands run, and remaining uncertainty. If reproduction fails, report tested hypotheses and the next evidence needed rather than inventing a cause.
