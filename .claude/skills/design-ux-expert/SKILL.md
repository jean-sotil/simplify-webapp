---
name: design-ux-expert
description: >
  Expert skill for creating stunning, production-quality Web UX designs using Claude Design
  (the visualize:read_me + visualize:show_widget toolchain). Use this skill proactively whenever
  the user asks to design, visualize, mock up, prototype, diagram, or illustrate ANYTHING
  visual — dashboards, landing pages, UI components, data charts, diagrams, forms, interactive
  explainers, flows, apps, posters, or any screen/interface. Also triggers on: "show me",
  "make it look like", "create a UI", "prototype", "wireframe", "design system", "UX",
  "user flow", "mockup", "chart this data", "visualize this", "make it interactive", "animate",
  or any request to explain something with a visual. This skill knows ALL the Claude Design
  rules deeply and always makes the best creative and technical decisions for remarkable output.
---

# Claude Design — Expert UX Skill

You are an elite Web UX designer. Before ANY visual output, call `visualize:read_me` with
**all relevant modules** for the task. Then call `visualize:show_widget` with exceptional code.

---

## Step 0 — Always Read First

```python
# MANDATORY before every show_widget call
visualize:read_me(modules=[...relevant...], platform="desktop"|"mobile")
```

Pick modules based on the task:

| Task                                                | Modules                 |
| --------------------------------------------------- | ----------------------- |
| Dashboard, form, card, settings UI                  | `mockup`, `interactive` |
| Process flow, architecture, how-X-works diagram     | `diagram`               |
| Data charts, analytics, maps                        | `chart`, `data_viz`     |
| Interactive explainer (sliders, toggles, live math) | `interactive`           |
| Illustration, generative art, poster                | `art`                   |
| Gathering user input before generating              | `elicitation`           |
| Anything combining multiple of the above            | load all relevant       |

---

## Step 1 — Choose the Right Visual Mode

### Decision Tree

```
Does the user want to understand a concept spatially?
  → Flowchart, illustrative diagram, or stepper (SVG or HTML)

Does the user want to see real data?
  → Chart.js chart or D3 choropleth (HTML)

Does the user want a UI interface/screen?
  → HTML mockup

Does the user want something beautiful/artistic?
  → SVG art or illustration

Does the user want to interact (sliders, toggles, live math)?
  → HTML interactive widget

Does the user want to input options/preferences?
  → HTML elicitation form
```

### SVG vs HTML

| Use SVG when                             | Use HTML when                              |
| ---------------------------------------- | ------------------------------------------ |
| Diagram / illustration / icon / art      | Interactive controls (sliders, buttons)    |
| Static explanation of structure          | Live computation or state changes          |
| One visual communicating one idea        | Multiple components (chart + cards + form) |
| Flowcharts, ER diagrams, structural maps | Dashboards, data tables, comparison cards  |

**Never mix modes** — pick one per tool call. SVG starts with `<svg`. HTML is everything else.

---

## Step 2 — Design System Fundamentals (Non-Negotiable)

These rules are ALWAYS enforced. Violating them produces broken or unprofessional output.

### The 5 Core Principles

1. **Seamless** — Widget should feel native to claude.ai, not embedded
2. **Flat** — No gradients (except one in illustrative SVG), no shadows, no glow, no blur
3. **Compact** — Essential info inline, explanation in prose OUTSIDE the tool call
4. **Dark mode mandatory** — Every color must work in both light and dark
5. **Accessible** — SVG needs `role="img"` + `<title>` + `<desc>`; HTML needs `.sr-only` h2

### Typography Rules

- Default: `Anthropic Sans` (auto-loaded) — `var(--font-sans)`
- Serif: only for editorial/blockquote — `var(--font-serif)`
- Weights: **400** (body) and **500** (headings/labels) ONLY. Never 600, 700.
- Sizes: 22px (h1), 18px (h2), 16px (h3), 16px (body), 14px (labels), 12px (captions/subtitles)
- SVG only: `class="t"` (14px body), `class="ts"` (12px subtitle), `class="th"` (14px 500)
- Sentence case everywhere — no Title Case, no ALL CAPS
- No mid-sentence bold. Use `code` style for names, not **bold**.

### Color System

Always use CSS variables (adapts to light/dark automatically):

```css
/* Backgrounds */
--color-background-primary    /* white surface */
--color-background-secondary  /* subtle surface */
--color-background-tertiary   /* page bg */
--color-background-info/danger/success/warning

/* Text */
--color-text-primary    /* black */
--color-text-secondary  /* muted */
--color-text-tertiary   /* hint */
--color-text-info/danger/success/warning

/* Borders */
--color-border-tertiary   /* default (0.15α) */
--color-border-secondary  /* hover (0.3α) */
--color-border-primary    /* emphasis (0.4α) */

/* Layout */
--border-radius-md   /* 8px */
--border-radius-lg   /* 12px preferred for cards */
--border-radius-xl   /* 16px */
```

**Hardcode hex only for:** physical-world colors in illustrations (sky, fire, skin) that should NOT invert in dark mode.

### 9-Ramp Color Palette (SVG diagrams)

Use `c-{ramp}` classes on SVG `<g>` or shape elements. Auto-handles dark mode.

| Class      | Use case                                |
| ---------- | --------------------------------------- |
| `c-purple` | Primary categories, AI/compute concepts |
| `c-teal`   | Secondary categories, data/pipeline     |
| `c-coral`  | Danger, heat, primary action emphasis   |
| `c-pink`   | User-facing, consumer, creative         |
| `c-gray`   | Neutral, structural, start/end nodes    |
| `c-blue`   | Info, informational concepts            |
| `c-green`  | Success, organic, nature, positive      |
| `c-amber`  | Warning, cost, budget, energy           |
| `c-red`    | Error, critical, high-risk              |

**Text on colored fills:** Use 800-stop for titles, 600-stop for subtitles in light mode. Opposite in dark. Never use black or CSS vars on colored fills.

### SVG Hardcoded Color Stops

| Ramp   | 50 (lightest fill) | 600 (stroke) | 800 (dark title) |
| ------ | ------------------ | ------------ | ---------------- |
| purple | #EEEDFE            | #534AB7      | #3C3489          |
| teal   | #E1F5EE            | #0F6E56      | #085041          |
| coral  | #FAECE7            | #993C1D      | #712B13          |
| blue   | #E6F1FB            | #185FA5      | #0C447C          |
| amber  | #FAEEDA            | #854F0B      | #633806          |
| gray   | #F1EFE8            | #5F5E5A      | #444441          |

---

## Step 3 — SVG Mastery

### SVG Setup Template (use every time)

```svg
<svg width="100%" viewBox="0 0 680 H" role="img">
  <title>One-sentence description</title>
  <desc>Expanded description for screen readers</desc>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5"
      markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke"
        stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </marker>
  </defs>
  <!-- content -->
</svg>
```

**viewBox is always `0 0 680 H`** — 680 is load-bearing. Never change it.
**Height H** = bottom-most element y + height + 40px buffer.
**Safe area**: x=40 to x=640, y=40 to y=(H-40).

### Pre-Built SVG Classes

```
class="t"       — 14px primary text
class="ts"      — 12px secondary/subtitle text
class="th"      — 14px 500-weight label
class="box"     — neutral styled rect (bg-secondary fill, border)
class="node"    — clickable group (hover + cursor pointer)
class="arr"     — arrow connector line (1.5px + open chevron)
class="leader"  — dashed thin leader line (0.5px, tertiary)
class="c-{ramp}"— colored node group (auto dark mode)
```

### Critical SVG Checks Before Finalizing

1. **viewBox height**: `max(y + height of all elements) + 40`
2. **No overlap**: every label and box must have clear air between them
3. **Box widths from text**: `width = max(title_chars × 8, subtitle_chars × 7) + 24`
4. **Arrows**: every `<path>` connector needs `fill="none"`
5. **text-anchor="end"** at x < 60 will clip — use `text-anchor="start"` instead
6. **All text has a class** (`t`, `ts`, `th`) — never unclassed text
7. **No negative x or y** coordinates
8. **Border strokes**: always `stroke-width="0.5"` for refinement

### SVG Text Placement

```svg
<!-- Always use dominant-baseline="central" for centered text in boxes -->
<text class="th" x="190" y="42" text-anchor="middle" dominant-baseline="central">
  Label text
</text>

<!-- Two-line box: title at 35% height, subtitle at 65% height -->
<text class="th" x="200" y="37" text-anchor="middle" dominant-baseline="central">Title</text>
<text class="ts" x="200" y="56" text-anchor="middle" dominant-baseline="central">Subtitle ≤5 words</text>
```

---

## Step 4 — Diagram Type Selection

Read `references/diagram-types.md` for complete guidance on all diagram types.

Quick routing:

- "How does X work?" (intuition) → **Illustrative diagram** (or HTML stepper if cyclical)
- "Show me the architecture/structure" → **Structural diagram**
- "What are the steps/flow?" → **Flowchart**
- "Database schema / ERD" → **Mermaid.js erDiagram** inside HTML
- "Explain X to me" (multi-stage) → **HTML stepper** with Next/Back

---

## Step 5 — HTML Widget Excellence

### Component Patterns

**Cards:**

```html
<div
  style="background:var(--color-background-primary);border-radius:var(--border-radius-lg);
  border:0.5px solid var(--color-border-tertiary);padding:1rem 1.25rem;"
>
  content
</div>
```

**Metric summary cards:**

```html
<div
  style="background:var(--color-background-secondary);border-radius:var(--border-radius-md);
  padding:1rem;text-align:center;"
>
  <p style="font-size:13px;color:var(--color-text-secondary);margin:0 0 4px">Label</p>
  <p style="font-size:24px;font-weight:500;margin:0">Value</p>
</div>
```

**Accessible icons (Tabler Outline only):**

```html
<i class="ti ti-NAME" style="font-size:20px" aria-hidden="true"></i>
<!-- Common: ti-home ti-user ti-chart-bar ti-settings ti-check ti-x ti-arrow-right -->
<!-- Never use -filled variants — they are not loaded -->
```

**Buttons:**

```html
<button type="button" onclick="sendPrompt('Follow-up question ↗')">Action ↗</button>
<!-- Pre-styled: transparent bg, 0.5px border, hover bg-secondary, active scale(0.98) -->
```

### Responsive Grid Pattern

```html
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">
  <!-- cards -->
</div>
```

### Charts (Chart.js)

```html
<div style="position:relative;width:100%;height:300px;">
  <canvas id="myChart" role="img" aria-label="Description of chart">Fallback text.</canvas>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>
<script>
  new Chart(document.getElementById('myChart'), {
    type: 'bar',
    data: { labels: [], datasets: [{ label: '', data: [] }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });
</script>
```

**Always:** unique canvas IDs, wrapper with explicit height, disable default legend, round all displayed numbers (`.toFixed()`), hardcoded hex colors (CSS vars don't resolve on canvas), `role="img"` + `aria-label`.

---

## Step 6 — UX Design Decision Framework

### The 5 Best-Decision Questions

Before writing any code, answer all five:

1. **What problem does this solve?** — Understand the real user need
2. **Who is the user?** — Expert vs beginner changes everything (density, labels, tooltips)
3. **What is the ONE thing they need to see first?** — Visual hierarchy priority
4. **What is the most likely next action?** — Wire `sendPrompt()` to it
5. **Does dark mode look perfect too?** — Always check mentally

### Hierarchy Principles

- **Primary information**: largest, highest contrast, centered or top-left
- **Secondary info**: smaller, muted `--color-text-secondary`
- **Actions**: right-aligned or bottom, `sendPrompt()` for Claude follow-ups
- **Empty states**: always handle — show a helpful placeholder, never blank

### Layout Patterns by Use Case

| Use Case                   | Layout Choice                                      |
| -------------------------- | -------------------------------------------------- |
| Data analytics             | Metric cards grid + chart below                    |
| Settings / preferences     | Left label, right control, full-width rows         |
| Comparison                 | Side-by-side cards, featured item with info-border |
| User profile / data record | Single card with avatar, dividers                  |
| Onboarding / wizard        | Stepper with progress dots                         |
| Dashboard                  | Top summary row + main chart + side detail         |

### Motion and Animation

Use only for:

- State transitions (toggle on/off, tab switching)
- Physical mechanisms in illustrative diagrams (convection, rotation)
- Load/reveal sequences

Rules:

```css
/* Only animate transform and opacity */
@keyframes reveal {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* Wrap in reduced-motion guard */
@media (prefers-reduced-motion: no-preference) {
  .animate {
    animation: reveal 0.3s ease forwards;
  }
}
```

Never animate layout properties (width, height, padding) — causes jank.
No physics engines in widgets.

---

## Step 7 — Forbidden Patterns (Avoid These)

| ❌ Wrong                       | ✅ Right                                  |
| ------------------------------ | ----------------------------------------- |
| `color: #333` hardcoded        | `color: var(--color-text-primary)`        |
| Gradient backgrounds           | Flat CSS variable fills                   |
| `font-weight: 700`             | `font-weight: 500`                        |
| `position: fixed` modals       | Normal-flow faux viewport div             |
| `display: none` hidden tabs    | Stepper/sequential HTML layout            |
| Title Case headings            | Sentence case                             |
| Emoji                          | Tabler outline icons (`ti-*`)             |
| Comments in code               | None (waste tokens, break streaming)      |
| Text outside SVG safe zone     | x=40–640, y=40–(H-40)                     |
| Arrow through another box      | L-shaped path detour                      |
| Unclassed SVG `<text>`         | Always `class="t"`, `"ts"`, or `"th"`     |
| All pills same visual format   | Vary: pills/cards/tiles per question type |
| Ring/circle for cyclical flows | HTML stepper with wrap-around Next        |
| Centered layout everywhere     | Mix flush-left editorial + centered UI    |
| `Inter` or `Arial` font        | `var(--font-sans)` (Anthropic Sans)       |

---

## Step 8 — Streaming Best Practices

Code order matters — useful content must appear early in the stream:

**HTML:** `<style>` (≤15 lines) → semantic HTML → `<script>` last
**SVG:** `<defs>` → shapes → text labels → annotations

Avoid during streaming:

- Gradients (flash during DOM diffs)
- `display: none` sections (stream invisibly)
- Multiple inline `<style>` blocks

---

## Step 9 — Elicitation Forms

Use when you need user preferences before generating. See `references/elicitation.md` for full patterns.

Quick rule: **Infer from context first**. Only ask what you cannot determine.

- Pills: short ≤4-word options
- Cards: options with icons + subtitles
- Tiles: visual format pickers
- Range sliders: quantities and scales
- Dates: `<input type="date" class="elicit-date">`
- File upload: with textarea fallback always

---

## Reference Files

- `references/diagram-types.md` — Deep guide on all diagram types with examples
- `references/elicitation.md` — Complete elicitation patterns and shell wiring
- `references/color-system.md` — Full 9-ramp palette with exact hex stops

---

## Quick Start Checklist

```
□ Called visualize:read_me with all relevant modules?
□ Chose SVG or HTML (not mixing)?
□ All colors use CSS vars or c-{ramp} classes?
□ Dark mode works mentally?
□ SVG viewBox height computed correctly?
□ No forbidden patterns (gradients, fixed pos, display:none tabs)?
□ All SVG text has class="t|ts|th"?
□ All chart canvases have role="img" + aria-label?
□ Prose explanation is OUTSIDE the tool call?
□ sendPrompt() wired to most likely next action?
□ Streaming order: style → HTML → script?
```

If any box is unchecked — fix before finalizing.
