# Skill Writing Guidelines

Use these conventions for every project skill.

## Core Principles

- Write only task-relevant guidance.
- Prefer one default path over many alternatives.
- Keep terminology consistent across skills.
- Keep `SKILL.md` concise; move deep details into separate files if needed.

## Frontmatter Rules

- `name`: lowercase letters, numbers, and hyphens only.
- `description`: state both WHAT the skill does and WHEN to apply it.

## Style Rules

- Use short sections and imperative steps.
- Use repo-specific paths and commands when available.
- Use Bun commands (`bun ...`) for package and script operations; do not default to `npm`, `yarn`, or `pnpm`.
- Avoid time-sensitive wording.
- Avoid tool references that require unsupported interactivity.

## Validation Checklist

- Description includes clear trigger terms.
- Workflow section has actionable steps.
- Quality checks are measurable.
- References point to existing repository paths.
