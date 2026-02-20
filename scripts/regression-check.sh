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

# 4) Phrases page must render only after translation deps are loaded
line_tr=$(rg -n "<script src=\"translations.js\"" phrases.html | cut -d: -f1)
line_ui=$(rg -n "<script src=\"ui-strings.js\"" phrases.html | cut -d: -f1)
line_loc=$(rg -n "<script src=\"localize.js\"" phrases.html | cut -d: -f1)
line_render=$(rg -n "renderPhrases\\(\\);" phrases.html | tail -n1 | cut -d: -f1)

if [[ -z "$line_tr" || -z "$line_ui" || -z "$line_loc" || -z "$line_render" ]]; then
  fail "Could not detect phrases script/render ordering"
fi

if [[ "$line_render" -gt "$line_tr" && "$line_render" -gt "$line_ui" && "$line_render" -gt "$line_loc" ]]; then
  pass "phrases.html renders after translation dependencies load"
else
  fail "phrases.html renders before translation dependencies are loaded"
fi

# 5) Custom result container should not copy via wrapper click
if rg -n "id=\"customResult\"[^\n]*onclick=" phrases.html >/dev/null; then
  fail "customResult container still has onclick copy handler"
else
  pass "customResult container click-copy conflict removed"
fi

# 6) Keyboard accessibility: phrase cards support keyboard activation
if rg -n "class=\"phrase-card\"[^\n]*role=\"button\"[^\n]*tabindex=\"0\"[^\n]*data-copy=" phrases.html >/dev/null && \
   rg -n "document.addEventListener\\('keydown'" phrases.html >/dev/null && \
   rg -n "event.key !== 'Enter' && event.key !== ' '" phrases.html >/dev/null && \
   rg -n "closest\\('\\.phrase-card\\[data-copy\\]'" phrases.html >/dev/null; then
  pass "phrase cards expose keyboard activation hooks"
else
  fail "phrase cards missing keyboard activation hooks"
fi

echo "All static regression checks passed."
