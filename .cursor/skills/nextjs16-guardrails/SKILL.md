---
name: nextjs16-guardrails
description: Apply safe Next.js 16 conventions for code changes in this repository. Use when editing framework-related code, routing behavior, rendering boundaries, or Next.js APIs.
---

# Next.js 16 Guardrails

## When to use

- A task modifies Next.js APIs, routing, or rendering behavior.
- A task changes app structure under `app/` or framework config.

## Required workflow

1. Read relevant Next.js documentation from `node_modules/next/dist/docs/` before implementing framework-sensitive changes.
2. Prefer App Router patterns used in this repository.
3. Avoid assumptions from older Next.js versions.
4. Keep changes minimal and aligned with existing project structure.

## Quality checks

- Changes are compatible with `next@16.2.0`.
- Updated code follows App Router conventions.
- No deprecated or legacy-only patterns are introduced.

## References

- `AGENTS.md`
- `package.json`
- `app/layout.tsx`
- `app/page.tsx`
