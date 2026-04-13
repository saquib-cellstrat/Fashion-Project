---
name: app-router-workflow
description: Implement features using the repository's App Router structure. Use when creating or updating pages, layouts, route segments, and related UI flow under the app directory.
---

# App Router Workflow

## When to use

- The task adds or updates routes or page content.
- The task modifies layout composition in the `app/` directory.

## Required workflow

1. Map requested behavior to route segments under `app/`.
2. Update the smallest set of files needed (`page.tsx`, `layout.tsx`, styles).
3. Keep component boundaries clear and predictable.
4. Validate the route behavior with local run commands when appropriate.

## Quality checks

- Route structure is coherent and easy to navigate.
- Layout and page responsibilities remain separated.
- Styling changes do not unintentionally affect global scope.

## References

- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
