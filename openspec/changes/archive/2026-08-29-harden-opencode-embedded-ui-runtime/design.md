## Context

See proposal.md for motivation. BuildingAI starts a binary from the sibling OpenCode workspace, but
the launcher currently compares only package/runtime version strings. Development builds receive
timestamp versions, so two binaries with different embedded assets can still look acceptable to the
launcher. OpenCode also intentionally falls back to `app.opencode.ai` when no embedded Web bundle is
available, which keeps health green while bypassing all local embed-only behavior.

The OpenCode workspace contains substantial unrelated uncommitted work. The recovery must not reset,
stash, commit, or rewrite that work, and a build must be reproducible from its current contents.

## Goals / Non-Goals

**Goals:**

- Distinguish process health from BuildingAI Web UI compatibility.
- Detect a missing embedded bundle before stopping a compatible runtime.
- Detect binary replacement and relevant source drift after a controlled build.
- Keep the build and validation path usable from the BuildingAI repository.

**Non-Goals:**

- Automatically build arbitrary dirty source during normal startup.
- Require direct OpenCode installations to use BuildingAI's embed presentation.
- Restore earlier native-panel experiments that were superseded by the iframe design.
- Modify persisted OpenCode sessions or panel preferences.

## Decisions

### Use an explicit HTML contract marker

Add a stable `buildingai-embed-shell-v1` meta marker to the OpenCode application HTML. The marker is
present both in the built browser HTML and as literal data inside a correctly embedded executable.
The launcher checks the executable before launch and the served HTML after launch.

Alternative: search minified JavaScript for `buildingaiEmbed`. Rejected because minification can
rename or eliminate implementation details; an explicit contract is intentional and stable.

### Attest the controlled build with content fingerprints

A BuildingAI-owned build wrapper invokes OpenCode's normal single-platform build without the
`--skip-embed-web-ui` option. After build, it verifies the marker and writes a sidecar attestation
containing the binary SHA-256 and a deterministic source SHA-256 for runtime source files. Startup
recomputes and compares both values.

The source fingerprint covers tracked and untracked, non-ignored runtime/build inputs while excluding
generated output, dependency directories, caches, and test reports. This is stricter than a Git HEAD
check and therefore protects uncommitted customization.

Alternative: trust file modification times. Rejected because checkouts and copied artifacts can
preserve or rewrite timestamps without preserving contents.

### Fail closed without mutating source

If preflight fails, the launcher prints the exact controlled rebuild command and returns failure. It
does not stop an existing process until the selected replacement binary has passed preflight. A
post-launch HTML mismatch also fails readiness rather than silently accepting upstream fallback.

Alternative: rebuild automatically from `start.sh`. Rejected because normal startup should not run a
long build or implicitly consume an arbitrary dirty workspace.

### Identify the active process by binary content, not only by version

After a successful managed start, record the selected binary version and SHA-256 in `.run`. A later
start treats the process as reusable only when health, Web UI compatibility, reported version, and
the recorded binary fingerprint all match. This avoids both repeated restarts of a healthy
timestamped development build and false matches between different binaries that report the same
version. When replacing PM2's managed process, explicitly release only the configured OpenCode port
before checking availability because PM2 deletion can complete before the child socket closes.

## Risks / Trade-offs

- [Relevant source changes intentionally make startup fail until rebuilt] → Emit the one-command
  rebuild instruction and keep the fingerprint input set documented and deterministic.
- [Scanning source adds startup latency] → Hash only runtime/build inputs and avoid generated and
  dependency directories.
- [A contract marker can remain while behavior later regresses] → Retain the existing focused embed
  behavior tests and browser verification; the marker proves artifact identity, not every UI detail.
- [Build succeeds while a long-running OpenCode turn exists] → Build does not touch the process;
  restart only after the existing session-status endpoint reports idle.
- [PM2 reports deletion before the old socket closes] → Release the managed OpenCode port before
  starting the verified replacement so the restart cannot stop halfway on a transient port conflict.

## Migration Plan

1. Add and test the contract marker and integrity helpers.
2. Build the current sibling workspace through the controlled wrapper and produce an attestation.
3. Confirm active OpenCode sessions are idle, restart the managed process, and validate served HTML.
4. Browser-verify the representative BuildingAI route has neither duplicate shell area.

Rollback restores the previously attested executable if available. No database or session migration
is required.
