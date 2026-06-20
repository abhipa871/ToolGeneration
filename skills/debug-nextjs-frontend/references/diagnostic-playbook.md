# Next.js Frontend Diagnostic Playbook

## Hydration Mismatch

Compare server HTML with the first client render. Look for time/random values, browser globals, locale differences, invalid nesting, extension-mutated markup, and client-only state read during render. Move nondeterministic work behind an effect or provide identical initial data.

## Stale or Duplicate State

Check unstable keys, stale closures, mutation, duplicated caches, effect dependencies, optimistic IDs, and development-only double invocation. Reduce the bug to a state transition sequence.

## Streaming Defects

Inspect status, headers, framing, buffering, decoding, abort propagation, and proxy behavior. Verify multibyte UTF-8 split across chunks. Ensure each stream event updates the intended message and terminal events finalize it exactly once.

## Routing and Cache Surprises

Identify whether data originates during build, request, server render, route handler, or client fetch. Check cache keys, revalidation, cookies/headers, dynamic behavior, and navigation prefetch. Change cache policy narrowly at the owner of the data.

## Layout Problems

Inspect computed styles and containing blocks. Check intrinsic minimum sizes, overflow ancestors, stacking contexts, viewport units, safe areas, long tokens, and font loading. Test keyboard focus and 200% zoom after fixing.

## Performance

Measure before optimizing. Distinguish server latency, stream time-to-first-token, React render cost, layout/paint cost, and bundle loading. Look for transcript-wide rerenders, expensive Markdown parsing per token, unbounded lists, and waterfalls.
