#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

cat <<'CHECKLIST'
Haggly Manual Smoke Checklist (Local)

Prereq
1. Serve locally (example): python3 -m http.server 8080
2. Open: http://localhost:8080/

Core flow checks
1. Home (/)
- Generate phrases in Negotiation Generator with sample prices.
- Verify Copy (📋) copies translated phrase.
- Verify Listen (🔊) speaks phrase.

2. Phrases (/phrases.html)
- Confirm phrase cards render real translations on first load (no [XX] prefixes for supported pairs).
- Use keyboard: tab to phrase card, press Enter and Space; both should copy text.
- In Custom Phrase, translate text then click translated output; verify clipboard contains only translation.
- Click Custom Phrase speaker icon; verify speech plays and clipboard is unchanged.

3. Guide page pathing (/guides/facebook-marketplace.html)
- Open DevTools Network tab.
- Reload page and confirm no 404s for:
  - /translations.js
  - /ui-strings.js
  - /localize.js

Language coverage checks
1. On / and /phrases.html, verify both selectors include:
- Thai (th)
- Turkish (tr)
- Indonesian (id)

Responsive checks
1. Mobile viewport (390x844)
- /, /phrases.html, /guide.html: nav wraps without overlap.
- Buttons remain tappable and visible.

2. Desktop viewport (1440px wide)
- No clipped text in cards/buttons; spacing looks consistent.

Regression safety
1. Run static checks:
- ./scripts/regression-check.sh

2. If all pass, mark release-ready.
CHECKLIST
