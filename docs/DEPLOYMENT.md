# Deployment: GitHub Pages via GitHub Actions

This project ships with a GitHub Actions workflow at `.github/workflows/deploy.yml` that builds the Vite app and publishes the `dist/` artifact to GitHub Pages. Follow the steps below to align the repository settings with the workflow.

## Default branch

1. Ensure the repository's default branch is **`main`**. If necessary, rename the branch in GitHub and update any local clones to track `origin/main`.
2. The deployment workflow triggers on pushes to `main` and can also be run manually via **Run workflow**.

## GitHub Pages configuration

1. In **Settings → Pages**, set **Source** to **GitHub Actions**. No branch selection is required because the workflow uploads the site artifact directly.
2. Confirm that the **Environment** is `github-pages`; the `deploy` job in the workflow sets this environment and exposes the published URL.
3. Ensure **Pages** permissions include **write** access for GitHub Actions (already declared in the workflow).

Once configured, each push to `main` will build the project with `npm ci && npm run build`, upload the `dist/` output, and deploy it automatically to GitHub Pages.
