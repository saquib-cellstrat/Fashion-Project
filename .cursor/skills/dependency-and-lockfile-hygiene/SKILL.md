---
name: dependency-and-lockfile-hygiene
description: Manage dependencies and lockfile updates safely for this Bun-based repository. Use when adding, updating, or auditing packages and when `bun.lock` changes appear.
---

# Dependency And Lockfile Hygiene

## When to use

- Dependencies are added, removed, or updated.
- `bun.lock` is modified and needs verification.

## Required workflow

1. Use package manager commands rather than manual lockfile edits.
2. Keep dependency changes scoped to the user request.
3. Review lockfile diff for unexpectedly broad changes.
4. Validate with lint/build when dependency changes may affect runtime.

## Quality checks

- `package.json` and `bun.lock` stay in sync.
- No unrelated dependency churn is introduced.
- Build/lint failures tied to dependency updates are addressed.

## References

- `package.json`
- `bun.lock`
