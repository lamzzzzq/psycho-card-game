# PsychoCardGame · Design System

> Design language: **Psy Light（暖纸牌桌 / 学术手稿）**
> Selected direction: `/card-lab/palette` 的 `暖紙米白` + `內容白·外框深`.
> Source of truth: `src/app/globals.css` tokens and shared `.psy-*` component classes.
> Previous dark system is archived in `docs/DARK_PSY_DESIGN_ARCHIVE.md`.

---

## 1. Intent

| Dimension | Direction |
| --- | --- |
| Mood | warm paper, tabletop study, psychology handout, low-saturation academic texture |
| Rhythm | clear surfaces, soft shadows, restrained copper accents, scan-friendly controls |
| Avoid | dark glass, neon contrast, saturated game UI, decorative blobs, card-heavy marketing sections |
| Reference | printed rules sheets, ivory playing cards, classroom tabletop, manuscript margins |

The app should now feel like a playable academic card table in warm daylight, not a late-night archive.

---

## 2. Color Tokens

Use `var(--psy-*)` for system colors. Do not introduce Tailwind gray scales or one-off page hexes unless the value is a data color such as a Big Five dimension color.

### 2.1 Base

| Token | Value | Use |
| --- | --- | --- |
| `--psy-bg` | `#f4edd9` | page base |
| `--psy-bg-soft` | `#ede5cd` | secondary page depth |
| `--psy-surface` | `#fdf9f0` | default panel |
| `--psy-surface-strong` | `#fffaf2` | stronger panel/input |
| `--psy-card` | `#eaddc4` | darker card shell |
| `--psy-card-2` | `#dccdae` | card shell depth |
| `--psy-card-content` | `#fdf8f1` | light card content |

### 2.2 Text

| Token | Value | Use |
| --- | --- | --- |
| `--psy-ink` | `#3a3020` | titles and primary text |
| `--psy-ink-soft` | `#6b5a3f` | body and secondary text |
| `--psy-muted` | `#9a8a68` | metadata, hints, disabled-copy context |

### 2.3 Borders and Accents

| Token | Value | Use |
| --- | --- | --- |
| `--psy-border` | `rgba(150,118,78,0.28)` | default warm outline |
| `--psy-border-strong` | `rgba(154,116,72,0.7)` | hover/active outline |
| `--psy-accent` | `#c39a52` | primary copper-gold |
| `--psy-accent-strong` | `#9a7448` | card lines and strong focus |
| `--psy-accent-soft` | `rgba(195,154,82,0.16)` | subtle fills |

### 2.4 Semantic

| Token | Value | Use |
| --- | --- | --- |
| `--psy-success` | `#6f8f55` | success/completion |
| `--psy-success-soft` | `rgba(111,143,85,0.18)` | success fill |
| `--psy-danger` | `#c9603f` | failure/destructive |
| `--psy-danger-soft` | `rgba(201,96,63,0.16)` | danger fill |

### 2.5 Dimension Colors

Big Five colors still come from `src/data/dimensions.ts`. They remain data markers only and should not become the page palette.

---

## 3. Typography

| Variable | Font | Use |
| --- | --- | --- |
| `--font-geist-sans` | Geist | UI, controls, body, numbers |
| `--font-geist-mono` | Geist Mono | counters and debug-like numeric text |
| `--font-serif-cn` | Noto Serif SC | headings, card names, ritual labels |

Rules:

- Use `.psy-serif` for page titles, card titles, and small ceremonial labels.
- Keep body text sans-serif with comfortable line height.
- Do not scale font size with viewport width.
- Keep letter spacing at `0` except small eyebrow labels.

---

## 4. Components

### `.psy-panel`

Warm ivory panel with a light copper outline and soft paper shadow. Use it for repeated panels, modals, cards, and framed tool areas.

### `.psy-etched`

Adds an inner warm line. Use for important panels and card-like objects. Avoid nesting cards inside cards.

### `.psy-btn`

Pill button with warm paper base. Hover lifts by 1px.

Modifiers:

| Class | Use |
| --- | --- |
| `.psy-btn-ghost` | secondary action on light surface |
| `.psy-btn-accent` | primary CTA, copper-gold fill |
| `.psy-btn-danger` | destructive or failure action |

### `.psy-input`

Light paper input with copper focus ring. Use for all text/numeric inputs.

### `.psy-tile`

Option tile for game settings and choices. Inactive state is raised paper; active state uses the darker card shell (`--psy-card`) and a stronger border.

### `.psy-chip`

Small metadata/status chip. Not a button.

### `.psy-scroll`

Light paper scrollbars with copper thumb.

---

## 5. Layout Rules

- Page background is always `--psy-page-bg`; do not cover the full viewport with a solid wrapper.
- Fixed mobile bottom bars should use a translucent ivory background and `env(safe-area-inset-bottom)`.
- Desktop pages should use centered, constrained work surfaces rather than marketing hero split sections.
- Mobile layouts must be explicitly checked; do not rely on desktop grids squeezing into 390px.
- Cards stay at stable dimensions with `aspect-ratio`, fixed tracks, or constrained widths.

---

## 6. Accessibility

- `:focus-visible` must remain visible and use the copper accent.
- Primary body text should use `--psy-ink-soft` or darker on warm paper.
- `--psy-muted` is for hints, metadata, and low-emphasis labels, not important button text.
- Maintain minimum touch target height through `.psy-btn` and `.psy-tile`.

---

## 7. Migration Notes

The first migration pass covers global tokens, shared primitives, `/`, `/lobby`, and `/assessment`. `/game`, `/tutorial`, PVP, rules, results, and stats should be migrated as follow-up passes using these tokens rather than copying the old dark layout.
