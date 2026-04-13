---
name: update-cursor-settings
description: Update Cursor or VS Code settings in a controlled way. Use when the user requests editor preference changes such as formatting, autosave, tabs, theme, or language-specific settings.
---

# Update Cursor Settings

## When to use

- The user requests changes to IDE behavior or preferences.
- Settings require consistent team defaults in project context.

## Required workflow

1. Confirm target scope (workspace or user settings).
2. Apply only the requested settings with minimal side effects.
3. Preserve unrelated settings and existing customizations.
4. Validate JSON syntax and key correctness.

## Quality checks

- Settings keys are valid and non-duplicated.
- Value types are correct (boolean, string, number, object).
- Changes are limited to requested behavior.

## References

- `.cursor/skills/_shared/writing-guidelines.md`
