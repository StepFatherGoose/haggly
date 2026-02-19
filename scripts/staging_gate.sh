#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

failures=0
checks=0

pass() {
  checks=$((checks + 1))
  echo "PASS: $1"
}

fail() {
  checks=$((checks + 1))
  failures=$((failures + 1))
  echo "FAIL: $1"
}

all_html=(*.html guides/*.html)

# 1) Inline event handlers should be gone.
if rg -n '\son[a-z]+=' "${all_html[@]}" >/tmp/haggly_inline_handlers.txt 2>/dev/null; then
  fail "Inline event handler attributes remain (see /tmp/haggly_inline_handlers.txt)"
else
  pass "No inline event handler attributes found"
fi

# 2) Conversion event should only fire on contact form submit.
conversion_matches="$(rg -n "gtag\\('event', 'conversion'" "${all_html[@]}" || true)"
if [[ -n "$conversion_matches" ]] && [[ "$(printf "%s\n" "$conversion_matches" | wc -l)" -eq 1 ]] && [[ "$conversion_matches" == contact.html:* ]]; then
  pass "Conversion event is scoped to contact form only"
else
  fail "Conversion event scope is unexpected"
  if [[ -n "$conversion_matches" ]]; then
    printf "%s\n" "$conversion_matches"
  fi
fi

# 3) Consent script should be included on every page.
missing_consent=0
for f in "${all_html[@]}"; do
  if ! rg -q '<script src="/consent.js"></script>' "$f"; then
    echo "  missing consent include: $f"
    missing_consent=1
  fi
done
if [[ "$missing_consent" -eq 0 ]]; then
  pass "consent.js included on all HTML pages"
else
  fail "One or more pages are missing consent.js include"
fi

# 4) OG and Twitter metadata should exist on every page.
missing_social=0
for f in "${all_html[@]}"; do
  if ! rg -q '<meta property="og:title"' "$f"; then
    echo "  missing og:title: $f"
    missing_social=1
  fi
  if ! rg -q '<meta name="twitter:card"' "$f"; then
    echo "  missing twitter:card: $f"
    missing_social=1
  fi
done
if [[ "$missing_social" -eq 0 ]]; then
  pass "OG/Twitter metadata found on all pages"
else
  fail "Social metadata is incomplete"
fi

# 5) Required monetization/support files should exist.
required=(ads.txt consent.js robots.txt sitemap.xml social-card.svg)
missing_required=0
for f in "${required[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "  missing file: $f"
    missing_required=1
  fi
done
if [[ "$missing_required" -eq 0 ]]; then
  pass "Required monetization/support files exist"
else
  fail "Missing required monetization/support files"
fi

# 6) ads.txt should contain this publisher record.
if rg -q '^google\.com, pub-6632867015737384, DIRECT, f08c47fec0942fa0$' ads.txt; then
  pass "ads.txt contains expected publisher record"
else
  fail "ads.txt does not contain expected publisher record"
fi

# 7) Broken local links check.
broken_links="$(
  for f in "${all_html[@]}"; do
    grep -oE '(href|src)="[^"]+"' "$f" | sed -E 's/^(href|src)="//; s/"$//' | while read -r p; do
      case "$p" in
        http:*|https:*|mailto:*|tel:*|data:*|javascript:*|\#*|\?*) continue ;;
        /) continue ;;
        /*) target=".$p" ;;
        *) target="$(dirname "$f")/$p" ;;
      esac
      target="${target%%\?*}"
      target="${target%%\#*}"
      [[ -e "$target" ]] || echo "$f -> $p (missing: $target)"
    done
  done | sort -u
)"
if [[ -z "$broken_links" ]]; then
  pass "No broken local links found"
else
  fail "Broken local links found"
  printf "%s\n" "$broken_links"
fi

echo
echo "Checks run: $checks"
if [[ "$failures" -eq 0 ]]; then
  echo "Result: PASS"
  exit 0
fi

echo "Result: FAIL ($failures failed checks)"
exit 1
