# Color System — Complete Reference

## CSS Variable Hierarchy

Always prefer CSS variables in HTML. Only hardcode hex in SVG diagrams (for `c-{ramp}` color classes)
or physical-world illustrations that should NOT invert in dark mode.

### Background Variables

```css
--color-background-primary     /* white / dark: near-black */
--color-background-secondary   /* light gray / dark: dark gray */
--color-background-tertiary    /* page background */
--color-background-info        /* blue tint */
--color-background-success     /* green tint */
--color-background-warning     /* amber tint */
--color-background-danger      /* red tint */
```

### Text Variables

```css
--color-text-primary     /* black / dark: white — body text */
--color-text-secondary   /* muted — labels, captions */
--color-text-tertiary    /* hint — placeholders, subtle */
--color-text-info        /* blue — links, informational */
--color-text-success     /* green */
--color-text-warning     /* amber */
--color-text-danger      /* red */
```

### Border Variables

```css
--color-border-tertiary   /* 0.15α — default subtle borders */
--color-border-secondary  /* 0.3α — hover state borders */
--color-border-primary    /* 0.4α — emphasis borders */
--color-border-info       /* blue border */
--color-border-success    /* green border */
--color-border-warning    /* amber border */
--color-border-danger     /* red border */
```

### Typography Variables

```css
--font-sans    /* Anthropic Sans — default for all UI */
--font-serif   /* serif — editorial/blockquote only */
--font-mono    /* monospace — code */
```

### Layout Variables

```css
--border-radius-md   /* 8px */
--border-radius-lg   /* 12px — preferred for cards */
--border-radius-xl   /* 16px */
```

---

## 9-Ramp Palette (Full Hex Table)

Use these in SVG via `c-{ramp}` class on `<g>` or shape elements.

| Ramp   | Class      | 50      | 100     | 200     | 400     | 600     | 800     | 900     |
| ------ | ---------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- |
| Purple | `c-purple` | #EEEDFE | #CECBF6 | #AFA9EC | #7F77DD | #534AB7 | #3C3489 | #26215C |
| Teal   | `c-teal`   | #E1F5EE | #9FE1CB | #5DCAA5 | #1D9E75 | #0F6E56 | #085041 | #04342C |
| Coral  | `c-coral`  | #FAECE7 | #F5C4B3 | #F0997B | #D85A30 | #993C1D | #712B13 | #4A1B0C |
| Pink   | `c-pink`   | #FBEAF0 | #F4C0D1 | #ED93B1 | #D4537E | #993556 | #72243E | #4B1528 |
| Gray   | `c-gray`   | #F1EFE8 | #D3D1C7 | #B4B2A9 | #888780 | #5F5E5A | #444441 | #2C2C2A |
| Blue   | `c-blue`   | #E6F1FB | #B5D4F4 | #85B7EB | #378ADD | #185FA5 | #0C447C | #042C53 |
| Green  | `c-green`  | #EAF3DE | #C0DD97 | #97C459 | #639922 | #3B6D11 | #27500A | #173404 |
| Amber  | `c-amber`  | #FAEEDA | #FAC775 | #EF9F27 | #BA7517 | #854F0B | #633806 | #412402 |
| Red    | `c-red`    | #FCEBEB | #F7C1C1 | #F09595 | #E24B4A | #A32D2D | #791F1F | #501313 |

### Light/Dark Mode Quick Reference

```
Light mode: 50 fill + 600 stroke + 800 title + 600 subtitle
Dark mode:  800 fill + 200 stroke + 100 title + 200 subtitle
```

### Text on Colored Backgrounds

Text on any colored fill MUST use same-ramp stops (never black, gray, or CSS vars):

| Fill      | Title text    | Subtitle text |
| --------- | ------------- | ------------- |
| Purple 50 | #3C3489 (800) | #534AB7 (600) |
| Teal 50   | #085041 (800) | #0F6E56 (600) |
| Coral 50  | #712B13 (800) | #993C1D (600) |
| Blue 50   | #0C447C (800) | #185FA5 (600) |
| Amber 50  | #633806 (800) | #854F0B (600) |
| Gray 50   | #444441 (800) | #5F5E5A (600) |

---

## Color Meaning Rules

### By semantic role

| Meaning             | Ramp   | Example use                 |
| ------------------- | ------ | --------------------------- |
| Primary/AI/compute  | Purple | API nodes, model layers     |
| Data/pipeline       | Teal   | Data flows, ETL             |
| Warning/cost/energy | Amber  | Budget nodes, CPU load      |
| Error/critical      | Red    | Error states, danger        |
| Success/organic     | Green  | Healthy states, nature      |
| Info/informational  | Blue   | Info nodes, links           |
| Neutral/structural  | Gray   | Start/end nodes, containers |
| Consumer/creative   | Pink   | User-facing features        |
| Danger/heat         | Coral  | Hot zones, deprecated       |

### Don't rainbow-cycle colors

❌ Wrong: step 1 = purple, step 2 = teal, step 3 = coral, step 4 = pink (decorative)
✅ Right: group nodes by category (all API nodes = purple, all data stores = teal)

---

## Chart.js Colors (Hardcoded Hex Required)

Chart.js canvas cannot resolve CSS variables. Use these palettes:

### Primary series

```js
'#534AB7'; // purple 600
'#0F6E56'; // teal 600
'#854F0B'; // amber 600
'#185FA5'; // blue 600
'#3B6D11'; // green 600
'#993C1D'; // coral 600
```

### Light fills (area charts, backgrounds)

```js
'rgba(83, 74, 183, 0.15)'; // purple
'rgba(15, 110, 86, 0.15)'; // teal
'rgba(133, 79, 11, 0.15)'; // amber
```

### Neutral

```js
'#888780'; // gray 400 — neutral/baseline series
'#B4B2A9'; // gray 200 — very subtle
```

---

## Dark Mode Mandatory Checklist

Before finalizing any widget:

1. Every `color:` uses `var(--color-text-*)` — never hardcoded hex
2. Every `background:` uses `var(--color-background-*)` — never hardcoded hex
3. Every `border-color:` uses `var(--color-border-*)` — never hardcoded hex
4. SVG `c-{ramp}` classes handle dark mode automatically ✓
5. Physical-world illustration colors (sky, fire, earth) — hardcoded hex is OK, will not invert ✓
6. Chart.js hardcoded hex — canvas cannot resolve vars, dark mode handled manually if needed ✓

Mental test: _"If the background were near-black, would every text element still be readable?"_
