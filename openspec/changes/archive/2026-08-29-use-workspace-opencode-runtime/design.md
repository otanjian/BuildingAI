## Design

`start.sh` uses an explicit `OPENCODE_BIN` override first, then resolves the native compiled
binary under `OPENCODE_WORKSPACE_DIR/packages/opencode/dist`. The default workspace directory is
the sibling `../opencode` directory of the BuildingAI workspace, and it can be overridden through
the environment or root `.env`.

The selected binary is used by the existing PM2 `opencode-serve` process. Before returning early
for a healthy server, the launcher compares `/global/health` with the workspace package version;
when they differ, the managed process is restarted. OpenCode continues to inherit `HOME`, so its
model and authentication configuration remain in the existing user directories.

Rejected alternatives:

- Using PATH first: this caused the stale global 1.17.13 binary to win over the workspace build.
- Deleting `~/.config/opencode` or `~/.local/share/opencode`: this would destroy user configuration
  and session data and is unrelated to runtime selection.
- Downloading the latest release: the requested source of truth is the current workspace's 1.18.19.
