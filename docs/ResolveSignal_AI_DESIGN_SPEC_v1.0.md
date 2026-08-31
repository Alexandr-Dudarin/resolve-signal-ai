# ResolveSignal AI — DESIGN_SPEC v1.0

**Status:** Approved visual/product UI baseline  
**Date:** 2026-08-30  
**Visual direction:** Hybrid Intelligence  
**Purpose:** design source of truth for the initial implementation and Work handoff.

---

## 1. Design goal

ResolveSignal AI should look like **real production B2B SaaS software first, and an AI product second**.

The interface must be:

- clear;
- calm;
- high-signal;
- data-oriented;
- professional;
- easy to understand without onboarding;
- visually distinctive in AI/Agent areas without becoming a neon “AI startup” concept.

The primary demo surface is the Feedback Details page. The second key surface is Agent Activity in V2.

---

## 2. Visual concept — Hybrid Intelligence

Hybrid Intelligence combines two visual modes:

### Product/data mode
Used for:
- navigation;
- dashboard;
- tables;
- forms;
- filters;
- CRM cases.

Style:
- light background;
- white surfaces;
- soft neutral borders;
- dark slate text;
- restrained shadows;
- generous spacing.

### AI/Agent mode
Used selectively for:
- AI Analysis;
- confidence/model metadata where shown;
- agent timeline;
- tool/action status;
- AI processing states.

Style:
- indigo/violet accent;
- optional dark/slightly tinted panel in a few high-value places;
- soft accent glow/border, never excessive neon;
- clearer sense of “active intelligence”.

Do not make every card look AI-specific.

---

## 3. Initial design tokens

These are implementation starting values and can be tuned after the first real screen is rendered.

```css
:root {
  --rs-bg: #f6f8fb;
  --rs-surface: #ffffff;
  --rs-surface-muted: #f0f3f7;
  --rs-surface-strong: #e9eef5;

  --rs-text: #182230;
  --rs-text-secondary: #475467;
  --rs-text-muted: #667085;
  --rs-text-subtle: #98a2b3;

  --rs-border: #dce3ea;
  --rs-border-strong: #cbd5e1;

  --rs-accent: #4f46e5;
  --rs-accent-hover: #4338ca;
  --rs-accent-soft: #eef2ff;
  --rs-accent-ring: rgba(79, 70, 229, 0.18);

  --rs-ai-surface: #151827;
  --rs-ai-surface-soft: #1d2133;
  --rs-ai-text: #f8fafc;
  --rs-ai-text-muted: #cbd5e1;
  --rs-ai-accent: #8b5cf6;
  --rs-ai-accent-secondary: #22d3ee;

  --rs-positive: #15803d;
  --rs-positive-soft: #ecfdf3;

  --rs-neutral: #667085;
  --rs-neutral-soft: #f2f4f7;

  --rs-warning: #b54708;
  --rs-warning-soft: #fffaeb;

  --rs-critical: #b42318;
  --rs-critical-soft: #fef3f2;

  --rs-info: #175cd3;
  --rs-info-soft: #eff8ff;

  --rs-shadow-sm: 0 1px 2px rgba(16, 24, 40, 0.05);
  --rs-shadow-md: 0 8px 24px rgba(16, 24, 40, 0.08);
  --rs-shadow-dropdown: 0 18px 42px rgba(16, 24, 40, 0.14);

  --rs-radius-sm: 8px;
  --rs-radius-md: 12px;
  --rs-radius-lg: 16px;
  --rs-radius-xl: 20px;

  --rs-scrollbar-thumb: #cbd5e1;
  --rs-scrollbar-thumb-hover: #98a2b3;
}
```

Token names may be refined, but components must consume tokens rather than hard-coded page-specific colors.

---

## 4. Typography

Recommended initial family:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Do not spend Phase 0 on custom font infrastructure.

Suggested scale:

- page title: 28–32px / 600–700;
- section title: 18–20px / 600;
- card metric: 28–36px / 650–700;
- body: 14–16px / 400–500;
- labels: 12–14px / 500–600;
- table metadata: 12–14px;
- monospace only for IDs/API/tool names when useful.

Prefer sentence case over ALL CAPS except tiny technical tags where justified.

---

## 5. Spacing and geometry

Use an 8px-based spacing rhythm.

Common values:
- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48

Target:
- desktop sidebar: ~240–256px;
- main content max width: fluid; avoid narrow blog-like layouts;
- page horizontal padding: 28–32px desktop;
- tablet: 20–24px;
- mobile: 16px;
- card radius: 14–16px;
- form control radius: 10–12px;
- control height: ~42–46px;
- minimum interactive target: preserve usable touch target.

---

## 6. Application shell

Desktop:

```text
┌─────────────────────────────────────────────────────────┐
│ Sidebar │ Top area / page header                        │
│         ├───────────────────────────────────────────────┤
│ Logo    │                                               │
│         │ Main content                                  │
│ Home    │                                               │
│ Feedback│                                               │
│ Cases   │                                               │
│ Agent   │                                               │
│ API     │                                               │
└─────────┴───────────────────────────────────────────────┘
```

Sidebar:
- light or very subtly tinted;
- logo/product name at top;
- icon + text navigation;
- clear active item with accent-soft background;
- no decorative clutter.

Mobile/tablet:
- responsive navigation may become drawer/sheet;
- do not preserve a full fixed 250px sidebar on narrow screens.

---

## 7. Dashboard

Primary metric cards:
- Total feedback
- Negative
- Critical
- Awaiting review

Cards:
- clean white surface;
- tiny label;
- large metric;
- optional subtle trend/supporting info;
- status/accent colors only where semantically useful.

Below metrics:
- recent feedback list/table;
- sentiment/severity summary;
- avoid adding charts merely to fill space.

A chart is allowed only if it communicates actual useful data.

---

## 8. Feedback list

Desktop:
- table-first layout.

Columns may include:
- customer/author;
- rating;
- category;
- severity;
- status;
- source;
- created date.

Top controls:
- search;
- Status select;
- Severity select;
- Category select;
- Source select;
- “Add feedback” primary action.

Status/severity should be represented with restrained pills/badges.

Mobile:
- table may switch to stacked cards/rows if horizontal scrolling becomes poor.
- preserve ability to filter and identify severity quickly.

---

## 9. Feedback details — hero demo screen

Recommended content hierarchy:

```text
Feedback #FDB-184                       Status / actions

Original feedback
---------------------------------------------------------
★☆☆☆☆
“Money was charged twice and support has not responded…”

AI Analysis
---------------------------------------------------------
Sentiment   Negative
Severity    Critical
Category    Payment

Summary
Customer reports a duplicate charge and no support reply.

Detected problems
• Duplicate payment
• Support unavailable

Suggested replies
---------------------------------------------------------
[Reply card / editable text / approve / reject]

Agent Activity (V2)
---------------------------------------------------------
✓ Feedback received
✓ AI analysis completed
✓ Reply generated
✓ Case #103 created
● Notifying manager…
```

AI Analysis can use a subtle accent/tinted treatment.

Agent Activity may be the strongest Hybrid Intelligence surface, including a dark or deep-tinted panel if it improves readability and distinction.

---

## 10. Status semantics

### Sentiment
- positive → green
- neutral → gray
- negative → red/critical family
- mixed → amber or muted indigo depending context

### Severity
- low → neutral/soft green
- medium → amber
- high → orange/red
- critical → red

Do not rely on color alone. Always include readable text labels.

---

## 11. Buttons

Primary:
- accent indigo background;
- white text;
- clear hover/focus.

Secondary:
- white/surface background;
- border;
- dark text.

Destructive:
- only for genuinely destructive actions;
- red family.

Ghost:
- icon/text utility actions.

Buttons should not all be primary.

---

## 12. Forms

Forms use:
- clear field labels;
- optional supporting text;
- explicit errors below the field;
- consistent 42–46px control height;
- visible focus ring;
- no placeholder-only labeling.

Inputs/textarea/select:
- surface background;
- neutral border;
- accent focus;
- disabled state visibly distinct.

---

## 13. Reused Select component

The existing custom select is approved as the behavioral base.

Move to:

```text
apps/web/src/shared/ui/select/
```

Preferred naming:
- `Select.tsx`
- `Select.module.css`
- `Select.copy.ts`
- `index.ts`

Retain:
- controlled `value`;
- options with `description`, `disabled`, and `kind: "group"`;
- keyboard navigation;
- selected/highlighted behavior;
- `Home`, `End`, `Escape`, Enter/Space;
- touch/pen selection protection;
- outside close;
- scroll-to-selected/highlighted;
- filter/form/full layouts if useful;
- dropdown alignment/trigger-width behavior.

Adapt:
- remove `variant: "admin" | "public"`;
- all styles use `--rs-*` tokens;
- remove references to legacy `--admin-*` and `--color-*`;
- replace text defaults with English:
  - `Select value`
  - `No options`
  or context-specific copy from caller;
- add an actual disabled root style only if needed, or remove the unused class;
- preserve reduced-motion support;
- keep accessibility attributes;
- add component tests for keyboard navigation and selection.

Visual target:
- 44–46px trigger;
- 10–12px radius;
- neutral border;
- indigo focus ring;
- dropdown 12–14px radius;
- `--rs-shadow-dropdown`;
- highlighted option uses `--rs-accent-soft`;
- selected option may use accent text/weight;
- scrollbar uses shared ResolveSignal scrollbar tokens.

---

## 14. Reused Checkbox component

Move to:

```text
apps/web/src/shared/ui/checkbox/
```

Preferred naming:
- `Checkbox.tsx`
- `Checkbox.module.css`
- `index.ts`

Retain:
- native input;
- controlled checked state;
- children/description;
- disabled;
- required;
- `ariaLabel`;
- sm/md sizes if still useful;
- focus-visible;
- reduced motion.

Adapt:
- remove `variant: "admin" | "public"`;
- use `--rs-*` tokens;
- remove unused `rootChecked` composition unless a real checked-root style is introduced;
- remove unused variables such as hover accent if not consumed;
- align checkbox accent with `--rs-accent`;
- use semantic critical/warning colors only for contextual validation, not normal checked state.

---

## 15. Shared scrollbar

The custom dropdown already contains a usable thin scrollbar treatment. Extract it into a reusable ResolveSignal pattern.

Suggested global utility:

```css
.rs-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--rs-scrollbar-thumb) transparent;
}

.rs-scrollbar::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.rs-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.rs-scrollbar::-webkit-scrollbar-thumb {
  min-height: 36px;
  border: 2px solid transparent;
  border-radius: 999px;
  background: var(--rs-scrollbar-thumb);
  background-clip: padding-box;
}

.rs-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--rs-scrollbar-thumb-hover);
  background-clip: padding-box;
}
```

Use on:
- custom select dropdown;
- agent activity panels if scrollable;
- long side panels/modals;
- selected internal overflow surfaces.

Do not force it onto every browser/page scrollbar unless it remains comfortable and accessible.

---

## 16. Accessibility baseline

- semantic HTML first;
- keyboard usable;
- visible `:focus-visible`;
- text labels for status, not color only;
- AA-level contrast target;
- `prefers-reduced-motion`;
- native inputs where practical;
- no clickable `div` when a button/link is appropriate;
- sensible touch targets;
- table alternative or responsive treatment on small screens.

---

## 17. Motion

Motion should be subtle and functional:

- dropdown fade/translate: ~150–180ms;
- button/card interaction: ~150–180ms;
- agent processing activity may use a restrained pulse/progress state;
- no continuous decorative animation;
- reduced motion disables nonessential transitions.

---

## 18. Loading / empty / error states

Every major screen must account for:

### Loading
- skeleton or restrained loading state;
- avoid layout jump where practical.

### Empty
- explanation + next action;
- e.g. “No feedback yet” + Add feedback.

### Error
- specific human-readable failure;
- retry when safe;
- never expose raw stack traces to UI.

### AI processing
Use clear staged state:
- Analyzing…
- Generating reply…
- Failed / Retry

V2 agent:
- queued
- running
- completed
- failed
- partially completed where relevant.

---

## 19. Demo-mode visual requirement

The demo should highlight the critical feedback example.

A visitor should immediately see:
- the raw customer complaint;
- `Critical`;
- `Payment`;
- concise AI summary;
- detected issues;
- suggested reply.

V2 additionally makes Agent Activity visually obvious.

---

## 20. Design anti-patterns

Avoid:
- neon gradients everywhere;
- glassmorphism on every surface;
- excessive shadows;
- over-rounded “toy” UI;
- huge marketing typography inside the app;
- charts without a decision-making purpose;
- icon-only actions with unclear meaning;
- random colors not mapped to tokens/status semantics;
- copying the old project’s `admin/public` theme naming into ResolveSignal.

---

## 21. Reference screenshot handoff

When a visual reference screenshot is supplied to Work:

- treat it as **directional**, not a pixel-perfect source;
- preserve ResolveSignal tokens and information architecture in this spec;
- do not copy branding/content from the reference;
- prioritize hierarchy, density, spacing, card/table treatment, and the light SaaS + distinct AI-area balance.

This `DESIGN_SPEC.md` is authoritative if the reference screenshot conflicts with product requirements.
