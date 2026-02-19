# Haggly Deploy Runbook

## 1) Pre-deploy backup
Run from repo root:

```bash
./scripts/pre_deploy_backup.sh
```

This creates:
- `backups/<timestamp>/` with working/staged diffs and untracked snapshot
- backup branch `backup/<timestamp>`
- backup tag `backup-<timestamp>`

## 2) Staging gate checks
Run before deployment:

```bash
./scripts/staging_gate.sh
```

Must pass before shipping.

## 3) Deploy
Use your normal deploy method (GitHub Pages publish).

## 4) Post-deploy verification
Run against production:

```bash
./scripts/post_deploy_verify.sh haggly.io
```

This verifies:
- HTTP to HTTPS redirect
- `ads.txt`, `robots.txt`, `sitemap.xml` availability
- `ads.txt` publisher line
- homepage consent + social metadata

## 5) 48-72h monitoring
Check in AdSense and Search Console:
- AdSense: Page RPM, coverage, policy center
- Search Console: indexing/coverage and key URL inspection
- Conversion quality: only contact form submit events should count as conversion
