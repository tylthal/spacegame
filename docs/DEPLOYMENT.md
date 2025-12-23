# Deployment: GitHub Pages via GitHub Actions

This project ships with a GitHub Actions workflow at `.github/workflows/deploy.yml` that builds the Vite app and publishes the `dist/` artifact to GitHub Pages. Follow the steps below to align the repository settings with the workflow.

## Default branch

1. Ensure the repository's default branch is **`main`**. If necessary, rename the branch in GitHub and update any local clones to track `origin/main`.
2. The deployment workflow triggers on pushes to `main` and can also be run manually via **Run workflow**.

## GitHub Pages configuration

1. In **Settings → Pages**, set **Source** to **GitHub Actions**. No branch selection is required because the workflow uploads the site artifact directly.
2. Confirm that the **Environment** is `github-pages`; the `deploy` job in the workflow sets this environment and exposes the published URL.
3. Ensure **Pages** permissions include **write** access for GitHub Actions (already declared in the workflow).

Once configured, each push to `main` will run `npm ci`, lint, execute the test suite, run the smoke check (which builds the site), upload the `dist/` output, and deploy it automatically to GitHub Pages.

## CI pipeline and smoke coverage

The deployment workflow now includes the following guardrails:

1. `npm run lint` — Type-checks the code and ensures the TypeScript build remains clean.
2. `npm run test:ci` — Runs the Vitest suite in thread-pooled mode for determinism and speed.
3. `npm run smoke` — Builds the Vite site, launches `npm run preview` on a loopback port, and performs a health check against the landing page content. Set `SMOKE_PREVIEW_PORT` to override the default `4173` during local or CI runs.

The `smoke` script exits non-zero if the preview server fails to start or the expected landing content (`Spacegame rebuild shell`) is missing, providing a fast regression signal on the published artifact.

## MediaPipe and asset handling

MediaPipe assets are currently stubbed out while the rebuilt input stack remains in-memory only. No large binary assets are shipped with the deploy bundle, keeping CI/GitHub Pages runs lightweight. If external MediaPipe bundles return in a future phase, prefer runtime fetches over bundling, or gate large assets behind Git LFS with appropriate CI configuration (e.g., enabling `GIT_LFS_SKIP_SMUDGE=1` for builds that do not need full asset hydration).
