#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-haggly.io}"
BASE_HTTPS="https://${DOMAIN}"
BASE_HTTP="http://${DOMAIN}"

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

check_status_200() {
  local url="$1"
  local code
  code="$(curl -sS -o /dev/null -w "%{http_code}" "$url" || true)"
  if [[ "$code" == "200" ]]; then
    pass "$url returns 200"
  else
    fail "$url expected 200 but got $code"
  fi
}

# 1) HTTP should redirect to HTTPS.
http_headers="$(curl -sSI "$BASE_HTTP/" || true)"
if printf "%s\n" "$http_headers" | tr -d '\r' | rg -qi '^location: https://'; then
  pass "HTTP redirects to HTTPS"
else
  fail "HTTP redirect to HTTPS not detected"
fi

# 2) Core endpoints should be available.
check_status_200 "$BASE_HTTPS/"
check_status_200 "$BASE_HTTPS/ads.txt"
check_status_200 "$BASE_HTTPS/robots.txt"
check_status_200 "$BASE_HTTPS/sitemap.xml"

# 3) robots.txt should reference sitemap.
robots_content="$(curl -sS "$BASE_HTTPS/robots.txt" || true)"
if printf "%s\n" "$robots_content" | rg -q "Sitemap: ${BASE_HTTPS}/sitemap.xml"; then
  pass "robots.txt contains sitemap reference"
else
  fail "robots.txt missing sitemap reference"
fi

# 4) ads.txt should contain expected publisher record.
ads_content="$(curl -sS "$BASE_HTTPS/ads.txt" || true)"
if printf "%s\n" "$ads_content" | rg -q '^google\.com, pub-6632867015737384, DIRECT, f08c47fec0942fa0$'; then
  pass "ads.txt contains expected publisher record"
else
  fail "ads.txt publisher record missing or incorrect"
fi

# 5) Homepage should contain consent include and social metadata.
home_html="$(curl -sS "$BASE_HTTPS/" || true)"
if printf "%s\n" "$home_html" | rg -q '<script src="/consent.js"></script>'; then
  pass "Homepage includes consent.js"
else
  fail "Homepage missing consent.js include"
fi

if printf "%s\n" "$home_html" | rg -q '<meta property="og:title"'; then
  pass "Homepage includes og:title"
else
  fail "Homepage missing og:title"
fi

if printf "%s\n" "$home_html" | rg -q '<meta name="twitter:card"'; then
  pass "Homepage includes twitter:card"
else
  fail "Homepage missing twitter:card"
fi

echo
echo "Checks run: $checks"
if [[ "$failures" -eq 0 ]]; then
  echo "Result: PASS"
  exit 0
fi

echo "Result: FAIL ($failures failed checks)"
exit 1
