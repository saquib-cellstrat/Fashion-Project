---
name: create-skill
description: Author project skills in a consistent directory structure with discoverable descriptions. Use when the user asks to create new skills, reorganize skills, or standardize AI task guidance.
---

# Create Skill

## When to use

- The user asks for a new reusable AI workflow.
- Existing skill docs are inconsistent and need normalization.

## Required workflow

1. Define the skill purpose and trigger terms.
2. Create a lowercase kebab-case skill directory.
3. Add `SKILL.md` with valid frontmatter and standard sections.
4. Link supporting docs only when needed for progressive disclosure.

## Quality checks

- `name` uses lowercase/hyphen format.
- `description` states what the skill does and when to apply it.
- The workflow is clear, concise, and repository-aware.

## References

- `.cursor/skills/README.md`
- `.cursor/skills/_shared/skill-template.md`
- `.cursor/skills/_shared/writing-guidelines.md`
