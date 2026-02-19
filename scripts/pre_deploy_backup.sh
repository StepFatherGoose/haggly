#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

TS="$(date -u +'%Y%m%d-%H%M%S')"
BACKUP_DIR="$ROOT/backups/$TS"
mkdir -p "$BACKUP_DIR"

BRANCH_NAME="backup/$TS"
TAG_NAME="backup-$TS"

CURRENT_BRANCH="$(git branch --show-current || true)"
HEAD_SHA="$(git rev-parse --short HEAD)"

git status --short > "$BACKUP_DIR/status.txt"
git diff > "$BACKUP_DIR/working.diff"
git diff --cached > "$BACKUP_DIR/staged.diff"
git ls-files --others --exclude-standard > "$BACKUP_DIR/untracked.txt"

if [[ -s "$BACKUP_DIR/untracked.txt" ]]; then
  tar -czf "$BACKUP_DIR/untracked.tar.gz" -T "$BACKUP_DIR/untracked.txt"
fi

git branch "$BRANCH_NAME" HEAD
git tag -a "$TAG_NAME" -m "Pre-deploy backup snapshot $TS" HEAD

cat > "$BACKUP_DIR/README.txt" <<EOF
Created: $TS (UTC)
Branch at backup time: ${CURRENT_BRANCH:-unknown}
HEAD: $HEAD_SHA
Backup branch: $BRANCH_NAME
Backup tag: $TAG_NAME

Artifacts:
- status.txt: git status snapshot
- working.diff: unstaged changes
- staged.diff: staged changes
- untracked.txt: untracked file list
- untracked.tar.gz: untracked file archive (if present)
EOF

echo "Backup completed."
echo "  Directory: $BACKUP_DIR"
echo "  Branch:    $BRANCH_NAME"
echo "  Tag:       $TAG_NAME"
