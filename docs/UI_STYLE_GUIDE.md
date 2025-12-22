# UI/UX Style Guide

The interface is temporarily a lightweight shell that highlights rebuild placeholders. The style choices keep the UI readable
while signaling that major systems are stubbed out.

## Palette
- **Background:** `#020617` (slate/void backdrop)
- **Accents:** Cyan (`text-cyan-400/500`) for interactive elements and status badges.
- **Neutrals:** Slate grays for cards and body text.

## Typography
- Use the default sans-serif stack with heavier weights for headings.
- Uppercase, wide tracking labels reinforce the "in-progress" status of placeholder screens.

## Components in use
- **Phase list buttons:** Rounded cards with subtle borders to show status (pending, active, done).
- **Placeholder panels:** Glassy cyan borders and rounded corners; include clear headings and short guidance bullets.
- **HUD overlay:** Text-first stat badges for score, hull, and lives with polite `aria-live` announcements and a visible hull
  meter. When effects are unavailable, the sr-only summary keeps the HUD readable.
- **Menu targets:** Circular hit areas arranged on the `MENU_Z` plane; each target should pair its 3D affordance with a text
  label for keyboard/screen reader fallback.

As new features land, evolve this guide to cover the rebuilt calibration, ready/menu, HUD, and gameplay overlays.
