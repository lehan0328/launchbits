---
name: launchbits-design-system
description: >
  Visual design system and styling guide for the Launchbits frontend.
  Covers color palette, typography, spacing, component patterns (buttons, cards,
  tables, tags, forms), and layout conventions. Triggers when building new UI,
  adding components, or modifying styles.
---

# Launchbits Design System

## Design Philosophy

Launchbits follows a **Google corp-tool aesthetic** inspired by Ariane/Launch:
- Clean, flat surfaces with subtle `#dadce0` borders (never heavy shadows)
- Dense information hierarchy — professional, not playful
- Status communicated through semantic colors, not icons
- Brand accent is **Indigo `#4F46E5`** — not Google Blue, not arbitrary purple

## Color Palette

### Brand & Action Colors
| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#4F46E5` | All accent colors, links, active states, CTAs |
| `--color-primary-hover` | `#4338CA` | Hover on primary elements |
| `--color-primary-container` | `#EEF2FF` | Light indigo background (selected states, CTA bg) |

> **CRITICAL**: Never use `#1a73e8` (Google Blue). All accents must be Indigo.

### Text Colors
| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `#202124` | Body text, headings (never pure `#000`) |
| `--text-secondary` / `#5f6368` | Grey-700 | Secondary labels, metadata |
| `--text-tertiary` / `#80868b` | Grey-600 | Tertiary info, timestamps, muted text |

### Status Colors (3-part system: bg + text + border)
| Status | Background | Text | Border |
|---|---|---|---|
| Draft | `#f8f9fa` | `#3c4043` | `#dadce0` |
| In Review | `#EEF2FF` | `#4338CA` | `#A5B4FC` |
| Approved | `#e6f4ea` | `#137333` | `#1e8e3e` |
| Blocked/Denied | `#fce8e6` | `#c5221f` | `#d93025` |
| Warning/Exception | `#fef7e0` | `#b06000` | `#f9ab00` |
| FYI | `#f1f3f4` | `#5f6368` | `#dadce0` |

### Surfaces & Borders
| Token | Value | Usage |
|---|---|---|
| `--bg-page` | `#ffffff` | Page background |
| `--bg-surface` | `#ffffff` | Card surfaces |
| `--bg-surface-secondary` | `#f8f9fa` | Sidebar, table header bg, section bg |
| `--bg-surface-container` | `#f1f3f4` | Input backgrounds, muted zones |
| `--bg-surface-hover` | `rgba(60,64,67,0.04)` | Row/item hover |
| `--bg-surface-active` | `rgba(79,70,229,0.08)` | Active nav item bg |
| `--border-default` | `#dadce0` | Card borders, section dividers |
| `--border-subtle` | `#e8eaed` | Table row borders, hairlines |

## Typography

| Token | Value | Usage |
|---|---|---|
| `--font-heading` | `Inter` | Headings, labels, buttons, card titles |
| `--font-body` | `Inter` | Body text, table cells, nav links |
| `--font-code` | `Roboto Mono` | Launch IDs, code, monospace |

### Type Scale
| Class / Context | Size | Weight |
|---|---|---|
| Page title (`.page-title`) | 22px | 400 |
| Section header (`.section-divider-title`) | 17px | 700 |
| Page subtitle (`.page-subtitle`) | 18px | 500 |
| Card title (`.card-title`) | 14px | 500 |
| Body text | 14px | 400 |
| Table header (`.data-table th`) | 12px | 600, uppercase |
| Small text (`.text-sm`) | 14px | 400 |
| Extra small (`.text-xs`) | 12px | 400 |
| Tag (`.tag`) | 11px | 500 |
| Label (`.questionnaire-label`, `.nav-label`) | 11px | 500, uppercase |

> **CRITICAL**: Never use `'Google Sans'`. Always use `var(--font-heading)` or `var(--font-body)`.

## Spacing System

8px grid using CSS custom properties:
| Token | Value |
|---|---|
| `--sp-1` | 4px |
| `--sp-2` | 8px |
| `--sp-3` | 12px |
| `--sp-4` | 16px |
| `--sp-5` | 20px |
| `--sp-6` | 24px |
| `--sp-8` | 32px |
| `--sp-10` | 40px |

Utility classes: `mt-2` (8px), `mt-3` (12px), `mt-4` (16px), `mt-8` (32px), `mb-2`, `mb-3`, `mb-4`, `mb-6` (24px).

## Component Patterns

### Buttons

```html
<!-- Primary (indigo filled) -->
<button class="btn btn-primary">Submit</button>

<!-- Secondary (outlined) -->
<button class="btn btn-secondary">Cancel</button>

<!-- Ghost (no border) -->
<button class="btn btn-ghost">Back</button>

<!-- Small variant -->
<button class="btn btn-primary btn-sm">Small</button>

<!-- Status-semantic (use sparingly) -->
<button class="btn btn-success">Approve</button>
<button class="btn btn-warning">Needs Work</button>
<button class="btn btn-danger">Deny</button>
```

**Rules:**
- Default height: 36px. Small: 28px. Large: 40px.
- Font: `var(--font-heading)`, weight 500.
- Border radius: `var(--radius-sm)` (6px) — never fully rounded on action buttons.
- Primary is always Indigo, never blue/green/red for primary CTAs.

### Cards

```html
<div class="card">
  <div class="card-title">Card Title</div>
  <div class="card-subtitle">Optional subtitle</div>
</div>

<!-- Clickable card -->
<div class="card card-clickable">...</div>
```

**Rules:**
- White background, `1px solid #dadce0` border, `10px` radius.
- Default padding: `16px 24px`.
- Hover: border lightens to `#bdc1c6`. Clickable cards get indigo border on hover.
- Never use heavy box-shadows on cards — this is a flat, corp-tool aesthetic.

### Status Tags (Badges)

```html
<span class="tag tag-draft">Draft</span>
<span class="tag tag-in-review">In Review</span>
<span class="tag tag-approved">Approved</span>
<span class="tag tag-launched">Launched</span>
<span class="tag tag-exception">Exception</span>
<span class="tag tag-cancelled">Cancelled</span>
```

**Rules:**
- Pill-shaped (`border-radius: 999px`), height 20px, font 11px.
- Always use the 3-part token system (bg + text + border).
- Use `statusTagClass()` from `utils.ts` to map status enums → CSS classes.

### Status Dots

```html
<span class="status-dot dot-gray"></span>
<span class="status-dot dot-blue"></span>
<span class="status-dot dot-green"></span>
<span class="status-dot dot-orange"></span>
<span class="status-dot dot-red"></span>
```

Default: 8px circle. Large: add `.status-dot--lg` (10px).

### Data Tables

```html
<table class="data-table">
  <thead>
    <tr>
      <th class="col-checkbox">...</th>
      <th class="col-id">ID</th>
      <th class="col-title">Title</th>
      <th class="col-status">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="col-checkbox">...</td>
      <td class="col-id">104</td>
      <td class="col-title">Feature Name</td>
      <td class="col-status">...</td>
    </tr>
  </tbody>
</table>
```

**Rules:**
- Always use the `DataTable` component — never create raw `<table>` elements.
- Headers: 12px, weight 600, uppercase, letter-spacing 0.4px.
- Rows: 52px height, `#e8eaed` bottom border, hover bg `#f8f9fa`.
- ID column: indigo color, linked to detail page.
- Checkbox accent: `var(--color-primary)`.

### Forms

```html
<div class="form-group">
  <label class="form-label">Field Name <span class="form-required">*</span></label>
  <div class="form-hint">Helper text</div>
  <input type="text" class="form-input" placeholder="..." />
</div>

<!-- Choice groups (checkbox/radio) -->
<div class="choice-group">
  <label class="choice-item selected">
    <input type="checkbox" checked />
    <div>
      <div class="choice-label">Option Label</div>
      <div class="choice-description">Description</div>
    </div>
  </label>
</div>
```

**Rules:**
- Labels: 13px, weight 500.
- Inputs: `#f1f3f4` background, `#dadce0` border, focus ring is `var(--color-primary)`.
- Required asterisk: `var(--color-red)`.
- Choice items: bordered boxes with hover/selected states using indigo accent.

### Section Headers (Table Dividers)

```html
<div class="section-divider">
  <div class="section-divider-left">
    <span class="section-divider-title">Owned by you</span>
    <span class="section-divider-count">All 4 Launches</span>
  </div>
  <a class="section-view-all">View All</a>
</div>
```

Use the `SectionHeader` component from `DataTable.tsx`.

### Readiness Banners

```html
<div class="readiness-banner ready">...</div>
<div class="readiness-banner blocked">...</div>
<div class="readiness-banner warning">...</div>
<div class="readiness-banner draft">...</div>
```

Used on the launch detail page to show launch readiness status.

### Empty States

```html
<div class="empty-state">
  <div class="empty-state-title">Title</div>
  <p class="text-secondary text-sm">Description</p>
</div>
```

Center-aligned, muted text, optional icon above.

## Layout Patterns

### Content Width
| Context | Max Width | Token |
|---|---|---|
| Default pages | 1600px | `--content-max-width` |
| Detail page | 1344px | `--content-max-width-detail` |
| Forms | 600px | `--content-max-width-form` |

### Detail Page Grid
Two-column layout: main content (fluid) + sidebar (320px fixed).
```css
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
}
```

## Anti-Patterns (DO NOT)

1. **No hardcoded hex colors** — use design token variables
2. **No Google Sans** — use `var(--font-heading)` / `var(--font-body)`
3. **No Google Blue `#1a73e8`** — use `var(--color-primary)` (Indigo)
4. **No heavy drop shadows** — this is a flat corp-tool, use `var(--shadow-sm)` only when elevation is needed
5. **No inline `style={{}}` for repeated patterns** — create a CSS class
6. **No raw `<table>` elements** — use the `DataTable` component
7. **No ad-hoc font sizes** — stick to the type scale above
8. **No rounded buttons** — pill radius is only for tags/badges
9. **No bright/saturated accent colors** — muted, professional palette only
10. **No custom status color schemes** — always use the 3-part status token system
