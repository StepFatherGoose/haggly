# Haggly Regression Checklist

## Functional checks
1. Open `/phrases.html` and confirm phrase cards render real translations on first load (no `[XX]` fallback prefixes for supported phrases).
2. On `/phrases.html`, translate a custom phrase and click the translated text; verify clipboard contains only translated text (no `🔊`).
3. On `/phrases.html`, click the speaker icon in custom result; verify text-to-speech plays and clipboard does not change.
4. On `/guides/facebook-marketplace.html`, verify there are no 404s for localization scripts (`/translations.js`, `/ui-strings.js`, `/localize.js`).

## Language coverage checks
1. On `/` and `/phrases.html`, verify both language selectors include: `th`, `tr`, `id`.
2. Verify selecting Thai/Turkish/Indonesian produces translations for built-in phrase cards.

## Accessibility checks
1. On `/phrases.html`, keyboard-tab to a phrase card and press `Enter`; verify it copies the translated text.
2. On `/phrases.html`, keyboard-tab to a phrase card and press `Space`; verify it copies the translated text.
3. Verify speaker button inside a phrase card still works and does not trigger card copy.

## Content consistency checks
1. On `/guides/facebook-marketplace.html`, verify language count messaging is `22 languages` in both body sections.
