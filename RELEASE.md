# Haggly Release Workflow (Local -> Live)

## Prerequisites
- You are in the repo root:
  - `/home/hp-elitebook/.openclaw/workspace/haggly-active`
- You have GitHub remote configured as `origin`.

## 1) Verify Current Branch
```bash
git branch --show-current
```
Expected: `main`

## 2) Run Local Regression Checks
```bash
./scripts/regression-check.sh
./scripts/manual-smoke-checklist.sh
```

## 3) Inspect Local State
```bash
git status
git log --oneline -n 5
```

## 4) Push Code + Safety Tag
```bash
git push origin main
git push origin codex-cleanup-baseline-2026-02-19
```

## 5) Verify Production
- `https://haggly.io/`
- `https://haggly.io/phrases.html`
- `https://haggly.io/guides/facebook-marketplace.html`

Check:
- Phrases render on first load (no placeholder fallback text).
- `th` / `tr` / `id` are present in both language selectors.
- No 404 for `/translations.js`, `/ui-strings.js`, `/localize.js` on the FB guide page.

## Optional: One-Command Release Block
```bash
git branch --show-current && \
./scripts/regression-check.sh && \
./scripts/manual-smoke-checklist.sh && \
git push origin main && \
git push origin codex-cleanup-baseline-2026-02-19
```
