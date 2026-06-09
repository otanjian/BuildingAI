# public/web Assets

`public/web` contains the packaged web client that is served by the API in deployments that ship static assets with the repository.

This directory is intentionally unignored in `.gitignore`, so asset hash churn is expected after `pnpm build:web`. To keep reviews manageable:

- Only update `public/web` when publishing a new packaged frontend.
- Prefer committing source changes separately from regenerated assets.
- If deployment switches to build-from-source, remove the `!/public/web/` exception from `.gitignore` and delete the tracked generated files in a dedicated cleanup commit.
