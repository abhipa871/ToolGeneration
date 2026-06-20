# Next.js Chat UI Patterns

## Boundaries

Prefer Server Components for initial conversation/model data and small Client Components for the composer, scrolling, selection, and stream lifecycle. Keep transport logic in a hook or client service rather than JSX. Keep provider response shapes outside components.

## State Model

Track request state explicitly: `idle`, `submitting`, `streaming`, `complete`, `cancelled`, or `error`. Give optimistic user and assistant messages stable IDs. Reconcile server IDs without replacing the entire transcript. Use an `AbortController` for Stop.

## Transcript Behavior

- Auto-scroll only when the reader is already near the bottom.
- Preserve position when older messages are prepended.
- Announce completion and errors without announcing every token.
- Render partial code fences and Markdown defensively.
- Virtualize only after measuring a real long-thread problem.

## Composer Behavior

Support keyboard submission with an accessible multiline input; retain a discoverable way to insert a newline. Disable duplicate sends while preserving editable text on failure. Make attachment constraints and token/context limits visible before submission.

## Responsive Layout

Use a dismissible drawer for the conversation list on small screens and a persistent sidebar where space permits. Keep the composer reachable above mobile safe areas. Test long model names, long unbroken output, code blocks, and zoomed text.

## Test Scenarios

Test send, stop, retry, regenerate, edit/resubmit, provider switch, route change during streaming, reload persistence, failed Markdown, and unauthorized conversation access.
