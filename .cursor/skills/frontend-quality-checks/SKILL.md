---
name: frontend-quality-checks
description: Run lightweight quality gates for frontend changes in this project. Use after UI, routing, or TypeScript updates to ensure lint and build confidence before completion.
---

# Frontend Quality Checks

## When to use

- A task edits files under `app/`.
- A task changes TypeScript, styles, or Next.js rendering behavior.

## Required workflow

1. Run `bun run lint` for static checks.
2. For substantial changes, run `bun run build` to catch framework/runtime issues.
3. Report errors with concise context and fix regressions introduced by the change.
4. Keep checks proportional to scope to avoid unnecessary delays.

## Quality checks

- Lint passes on changed areas.
- Build errors introduced by the change are resolved.
- User-facing behavior is unchanged unless intentionally modified.

## References

- `package.json`
- `README.md`
