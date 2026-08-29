---
name: skill-creator
description: Create, update, or package focused skills with concise instructions, accurate frontmatter, progressive disclosure, references, scripts, and validation. Use when a user wants a new skill or a substantial skill-body rewrite.
license: Complete terms in LICENSE.txt
---

# Skill Creator

Create one focused capability per skill. Assume the model already knows general concepts; add only project-specific or procedural information that changes execution.

## Authoring workflow

1. Define the capability, trigger phrases, inputs, tools, and expected output with one or two concrete examples.
2. Choose the narrowest scope and decide whether detail belongs in `SKILL.md`, `references/`, `scripts/`, or `assets/`.
3. For a new skill, run `scripts/init_skill.py <name> --path <parent>`; delete generated placeholders that are not needed.
4. Write YAML frontmatter with `name` and a specific `description` that says what the skill does and when it triggers. Keep the body imperative and concise.
5. Keep the body under 500 lines (prefer substantially less). Link references directly and load them only for the matching task.
6. Validate with `scripts/quick_validate.py <skill-dir>`. Run and test any added scripts.
7. Package only when distribution is requested: `scripts/package_skill.py <skill-dir> [output-dir]`.

## Structure

```text
skill-name/
  SKILL.md          # trigger-aware workflow and routing
  references/       # low-frequency detail, split by topic
  scripts/          # deterministic repeated operations
  assets/           # files used in generated output
```

Do not add README, changelog, installation, or duplicate quick-reference files unless the target runtime explicitly requires them. Avoid deep reference chains; link optional material from `SKILL.md`.

## Quality checks

- The description is specific and under 1024 characters.
- The body contains only non-obvious execution guidance; examples are minimal and realistic.
- Every local link resolves; every referenced script/resource exists.
- Trigger examples include at least one positive and one negative case.
- Existing design systems, user constraints, and local project conventions take precedence over generic preferences.

For runtime trigger/hook configuration, use `skill-developer`; `skill-writer` is a compatibility redirect to this skill.
