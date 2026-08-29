## Why

The project skills are useful but their activation and maintenance cost is higher than necessary. Three overlapping meta-skills repeat the same authoring guidance, PostgreSQL advanced reference material is loaded with routine schema work, and several instructions no longer match the repository. The current skill synchronizer also rewrites every target copy, which adds avoidable local latency. This is timely because the repository is actively using skills across multiple editors and has accumulated configuration drift.

## What Changes

- Consolidate overlapping skill-authoring guidance and narrow runtime/hook guidance to its own skill.
- Reduce the default body size of PostgreSQL and project-architecture skills; move low-frequency details behind references.
- Correct stale project paths, state-management terminology, AI SDK package information, and invalid local links.
- Make AI SDK guidance prefer the installed package and avoid unsolicited upgrades or network lookups.
- Add task branching to the web-artifact skill so simple or existing projects do not incur initialization and dependency-install costs.
- Make skill synchronization incremental, editor-scoped by default when requested, and safe to preview with a dry run.
- Add a lightweight skill lint command for stale links, oversized bodies, and common repository drift.

## Capabilities

### New Capabilities

- `skill-efficiency`: Lean skill loading, accurate references, and lower-cost synchronization behavior.

### Modified Capabilities

None. This is a documentation and developer-tooling optimization; it does not change product runtime behavior.

## Impact

- Affected files under `skills/` and `scripts/sync-skills.mjs`.
- New local validation command and tests for synchronization decisions.
- Existing skill names remain available unless an explicit compatibility redirect is needed; editor-generated copies are not committed.
- No application APIs, database schemas, or production dependencies change.

## Non-goals

- Rewriting domain guidance or changing the expected quality of generated code.
- Removing advanced reference material that remains useful for specialized requests.
- Changing OpenSpec workflows or application runtime behavior.
