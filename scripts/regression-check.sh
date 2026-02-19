#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

pass() { printf "[PASS] %s\n" "$1"; }
fail() { printf "[FAIL] %s\n" "$1"; exit 1; }

# 1) No stale language-count messaging
if rg -n "18 languages" guides/facebook-marketplace.html >/dev/null; then
  fail "Found stale '18 languages' copy in guides/facebook-marketplace.html"
else
  pass "Language-count copy is consistent (22 languages)"
fi

# 2) Script paths on guide page are absolute
for p in "/translations.js" "/ui-strings.js" "/localize.js"; do
  if ! rg -n "<script src=\"${p//\//\\/}\"" guides/facebook-marketplace.html >/dev/null; then
    fail "Missing ${p} on guides/facebook-marketplace.html"
  fi
done
pass "Guide page uses absolute localization script paths"

# 3) Selector language parity on index/phrases pages
for f in index.html phrases.html; do
  for lang in th tr id; do
    count=$(rg -o "value=\"${lang}\"" "$f" | wc -l | tr -d ' ')
    if [[ "$count" -lt 2 ]]; then
      fail "$f missing ${lang} in one or both selectors"
    fi
  done
done
pass "Both selectors include th/tr/id on index and phrases pages"

# 4) Phrases page loads translation deps before inline app script
line_tr=$(rg -n "<script src=\"translations.js\"" phrases.html | cut -d: -f1)
line_ui=$(rg -n "<script src=\"ui-strings.js\"" phrases.html | cut -d: -f1)
line_loc=$(rg -n "<script src=\"localize.js\"" phrases.html | cut -d: -f1)
line_inline=$(rg -n "^const PHRASES = \\{" phrases.html | cut -d: -f1)

if [[ -z "$line_tr" || -z "$line_ui" || -z "$line_loc" || -z "$line_inline" ]]; then
  fail "Could not detect script load order in phrases.html"
fi

if [[ "$line_tr" -lt "$line_inline" && "$line_ui" -lt "$line_inline" && "$line_loc" -lt "$line_inline" ]]; then
  pass "phrases.html script load order is correct"
else
  fail "phrases.html loads dependency scripts after inline app script"
fi

# 5) Custom result container should not copy via wrapper click
if rg -n "id=\"customResult\"[^\n]*onclick=" phrases.html >/dev/null; then
  fail "customResult container still has onclick copy handler"
else
  pass "customResult container click-copy conflict removed"
fi

# 6) Keyboard accessibility: phrase cards support keyboard activation
if rg -n "class=\"phrase-card\"[^\n]*role=\"button\"[^\n]*tabindex=\"0\"[^\n]*onkeydown=\"copyOnKey\(" phrases.html >/dev/null; then
  pass "phrase cards expose keyboard activation hooks"
else
  fail "phrase cards missing keyboard activation hooks"
fi

echo "All static regression checks passed."
