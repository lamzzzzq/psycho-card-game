# Dark Psy Design Archive

This file preserves the previous dark visual system before the 2026-07-09 light-system migration.

## Identity

- Name: Psy
- Mood: late-night study, introspection, old psychology manuscripts, low saturation, copper-gold details.
- Primary surface language: dark blue-black background, glass panels, etched copper borders, warm cream text.

## Core Tokens

```css
:root {
  --psy-bg: #07111b;
  --psy-bg-soft: #0f1c28;
  --psy-surface: rgba(13, 24, 36, 0.78);
  --psy-surface-strong: rgba(15, 27, 40, 0.94);
  --psy-card: rgba(20, 31, 46, 0.92);
  --psy-card-2: rgba(24, 39, 56, 0.92);
  --psy-border: rgba(179, 141, 92, 0.34);
  --psy-border-strong: rgba(207, 167, 112, 0.56);
  --psy-ink: #ecdfc8;
  --psy-ink-soft: #bda988;
  --psy-muted: #8c7c66;
  --psy-accent: #c89b5d;
  --psy-accent-soft: rgba(200, 155, 93, 0.16);
  --psy-success: #8fc787;
  --psy-success-soft: rgba(143, 199, 135, 0.18);
  --psy-danger: #dc6a4f;
  --psy-danger-soft: rgba(220, 106, 79, 0.18);
  --psy-shadow: 0 20px 60px rgba(0, 0, 0, 0.34);
}
```

## Component Conventions

- `.psy-panel`: dark translucent panel, copper border, heavy shadow, backdrop blur.
- `.psy-etched`: inner cream/copper line inset by 8px.
- `.psy-btn`: rounded pill, dark base, copper border, raised hover.
- `.psy-btn-accent`: copper-gold filled CTA.
- `.psy-btn-ghost`: transparent dark secondary action.
- `.psy-input`: dark field with copper focus ring.
- `.psy-tile`: dark raised option tile, active state presses inward with gold glow.
- `.psy-chip`: low-contrast copper tag.
- `PsyOverlayPanel`: dark blurred overlay panel for modals and mobile sheets.

## Restoration Notes

If the dark system is restored later, use this file together with earlier Git history around `src/app/globals.css`, `DESIGN.md`, and shared components. The light migration selected `暖紙米白` with `內容白·外框深` as the new default, so any restoration should be deliberate rather than incidental.
