---
name: skill-developer
description: Configure, test, and debug skill activation rules, hooks, frontmatter, and progressive disclosure. Use for skill-rules.json, trigger patterns, hook behavior, false positives, or activation performance—not routine skill authoring.
---

# Skill Runtime Developer

This skill covers activation/runtime concerns only. For creating or rewriting a skill body, use `skill-creator`.

## Fast workflow

1. Confirm the runtime and actual configuration path; `.claude` files may be supplied externally and are not assumed to exist in this repository.
2. Inspect the rule/hook implementation before changing patterns.
3. Prefer `suggest` for domain guidance; reserve blocking enforcement for security, integrity, or repeatable runtime failures.
4. Make triggers specific enough to avoid matching ordinary words; test positive, negative, and repeated-session cases.
5. Keep session state and skip controls explicit, documented, and easy to disable for a single task.
6. Measure hook latency and avoid reading full skill bodies during prompt-time matching.

## References

Load only the topic needed:

- Trigger syntax and matching: [TRIGGER_TYPES.md](TRIGGER_TYPES.md)
- Rules schema: [SKILL_RULES_REFERENCE.md](SKILL_RULES_REFERENCE.md)
- Hook behavior/performance: [HOOK_MECHANISMS.md](HOOK_MECHANISMS.md)
- Debugging: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Reusable patterns: [PATTERNS_LIBRARY.md](PATTERNS_LIBRARY.md)

Do not assume a hook exists because an example mentions it; verify the file and runtime first.
