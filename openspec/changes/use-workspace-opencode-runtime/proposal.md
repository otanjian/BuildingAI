## Why now

The local OpenCode server is still launched from the removed global 1.17.13 binary, while the
workspace contains the intended 1.18.19 build. That mismatch makes runtime behavior differ from
the source code being tested, especially for interactive questions and session persistence.

## What changes

- Resolve the workspace OpenCode 1.18.19 build before PATH and legacy global installations.
- Restart an already-running server when it does not match the workspace runtime.
- Keep the existing OpenCode home/configuration directory untouched.
- Document and test the runtime selection contract.

## Non-goals

- Changing OpenCode model, authentication, or project configuration.
- Removing any OpenCode data under the user configuration or data directories.
- Automatically downloading a different OpenCode release.
