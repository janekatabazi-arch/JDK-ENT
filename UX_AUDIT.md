# JDK Enterprises v27 — Frontend & Mobile UX Audit

## Scope
The v27 pass audits the current multi-page marketplace shell rather than adding another backend domain. The goal is consistency, mobile usability, accessibility, and regression-safe frontend hardening.

## Fixed in v27
- Added missing viewport metadata to legacy pages.
- Added a consistent browser theme color.
- Added keyboard-accessible skip navigation across pages.
- Fixed the shared menu bootstrap so pages using `.layout1` without `id="layout1"` still open the menu.
- Added keyboard activation and accessible labels for image-based menu/search controls.
- Added visible `:focus-visible` treatment for interactive controls.
- Added reduced-motion support.
- Added safe-area handling for mobile browser/device insets.
- Added a stable mobile viewport-height variable to reduce browser chrome jump issues.
- Consolidated touch targets around a 44px minimum interaction size.
- Improved mobile footer navigation overflow instead of crushing six tabs into the viewport.
- Tightened mobile product cards to a deliberate two-column shopping grid, with a one-column fallback on very narrow screens.
- Added native lazy image loading and async image decoding after initial above-the-fold imagery.
- Added `content-visibility` hints to repeated marketplace cards for long-page rendering efficiency.
- Prevented accidental form submission by untyped buttons discovered at runtime.

## Deliberate non-changes
- No commerce, payment, order, refund, review, or permission logic was moved into the browser.
- No Firebase security boundary was weakened.
- No page was replaced with a framework rewrite. The existing HTML/CSS/JavaScript architecture remains deployable as before.

## Next recommended gate
Run the release checks and emulator suite in CI, then test v27 on a real low/mid-range Android device at 360px and 412px widths. The next product phase should focus on launch content/data quality and deployment configuration, not another broad subsystem.
