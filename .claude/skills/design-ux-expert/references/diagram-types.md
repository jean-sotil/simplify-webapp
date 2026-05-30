# Diagram Types — Complete Reference

## Routing Decision

Ask: is the user trying to **document** (reference diagram) or **understand** (intuition diagram)?

| User says                              | Type         | Approach                        |
| -------------------------------------- | ------------ | ------------------------------- |
| "How does X work?"                     | Illustrative | Draw the mechanism              |
| "Walk me through the process"          | Flowchart    | Boxes + arrows, sequential      |
| "What's the architecture / structure?" | Structural   | Containment diagram             |
| "Show me the DB schema / ERD"          | ERD          | Mermaid.js `erDiagram`          |
| "Explain the X cycle"                  | HTML Stepper | Stage-by-stage with Next button |
| "How does gradient descent work?"      | Illustrative | Ball rolling down loss surface  |
| "What happens when I hit submit?"      | Flowchart    | Request lifecycle               |

**Default to Illustrative** for "explain how X works" — it's the more ambitious and more effective choice. Don't chicken out into a flowchart because it's safer.

---

## Flowchart

**When:** Sequential steps, decisions, request lifecycles, approval workflows.

**Rules:**

- Max 4-5 nodes per diagram. If more → split into multiple diagrams with prose between.
- Single direction: all top-down OR all left-right. Never mix.
- Box width formula: `max(title_chars × 8, subtitle_chars × 7) + 24`
- Single-line box height: 44px. Two-line box height: 56px.
- Minimum 60px gap between boxes, 24px padding inside.
- Arrows: never cross through another box — use L-shaped detour path.
- Labels on arrows: almost never needed. If meaning isn't obvious, put it in the subtitle.
- Neutral start/end: `class="box"`. Semantic colored nodes: `class="c-{ramp}"`.

**Clickable node template:**

```svg
<g class="node c-teal" onclick="sendPrompt('Tell me more about X')">
  <rect x="100" y="20" width="200" height="44" rx="8" stroke-width="0.5"/>
  <text class="th" x="200" y="42" text-anchor="middle" dominant-baseline="central">Node title</text>
</g>
```

**Two-line node:**

```svg
<g class="node c-blue" onclick="sendPrompt('Tell me more about Y')">
  <rect x="100" y="20" width="200" height="56" rx="8" stroke-width="0.5"/>
  <text class="th" x="200" y="38" text-anchor="middle" dominant-baseline="central">Title</text>
  <text class="ts" x="200" y="56" text-anchor="middle" dominant-baseline="central">Short subtitle ≤5 words</text>
</g>
```

**Arrow connector:**

```svg
<line x1="200" y1="76" x2="200" y2="120" class="arr" marker-end="url(#arrow)"/>
```

**L-shaped detour (when direct arrow would cross a box):**

```svg
<path d="M x1 y1 L x1 ymid L x2 ymid L x2 y2" class="arr" fill="none" marker-end="url(#arrow)"/>
```

**Feedback loops:** Use `↻ returns to start` text near cycle point. Never draw a ring layout.

---

## Structural Diagram

**When:** "Things inside other things" — architecture, file systems, VPC/subnets, cell biology.

**Containers:**

- Outermost: rx=20-24, lightest fill (50-stop), 0.5px stroke
- Inner regions: rx=8-12, medium fill (100-200 stop), distinct ramp from parent
- 20px minimum padding inside every container
- Max 2-3 nesting levels

**Color for nesting:** Parent and child must use DIFFERENT ramps (same ramp gives identical fills, no hierarchy). Example: Green for outer container → Teal for inner desk → Amber for different-function zone.

**External inputs/outputs:** Sit outside container rect with arrows pointing in/out. Short labels (1-3 words).

---

## Illustrative Diagram

**When:** Building intuition. Physical things get cross-sections. Abstract things get spatial metaphors.

**Philosophy:** Draw the mechanism, not a diagram _about_ the mechanism. The spatial arrangement carries the meaning; labels annotate.

### Spatial Metaphors for Abstract Concepts

| Concept               | Metaphor                                        |
| --------------------- | ----------------------------------------------- |
| Transformer attention | Token row + fanning lines with opacity = weight |
| Gradient descent      | Ball rolling down contour surface               |
| Hash table            | Funnel dropping items into buckets              |
| Call stack            | Stack of frames growing/shrinking vertically    |
| Embeddings            | Dots clustering in 2D space                     |
| Cache hierarchy       | Nested circles (L1 inside L2 inside RAM)        |
| TCP handshake         | Two endpoints passing numbered envelopes        |
| Recursion             | Mirror reflecting smaller mirror infinitely     |

### Key Differences from Flowchart

- Shapes are freeform: `<path>`, `<ellipse>`, `<circle>`, `<polygon>`, curved lines
- Layout follows the subject's geometry, not a grid
- Color encodes intensity (warm = active/hot, cool = dormant/cold)
- Layering and overlap OK for shapes — never for labels
- Leader lines: 0.5px dashed, `class="leader"`, pointing from label to shape
- One `<linearGradient>` permitted (for continuous physical property — temperature, pressure)
- Small shape-based indicators allowed: triangles for flames, circles for particles, wavy lines for steam

### Label Placement Rules

- Labels go OUTSIDE the drawn object in the margin
- Reserve ≥140px horizontal margin on the label side
- Default: right-side labels with `text-anchor="start"` (left-side clips easily)
- Use `class="leader"` dashed line from label to relevant part
- 8px minimum clear air between any label and any stroke

### Interactive vs Static

- Static = SVG (fast, no controls needed)
- Interactive = HTML with inline SVG + controls around it
- Rule: if the real system has a control (thermostat, input, rate), give the diagram that control

---

## ERD / Database Schema

**Always use Mermaid.js** — never hand-draw ERDs in SVG.

```html
<div id="erd"></div>
<script type="module">
  import mermaid from 'https://esm.sh/mermaid@11/dist/mermaid.esm.min.mjs';
  const dark = matchMedia('(prefers-color-scheme: dark)').matches;
  await document.fonts.ready;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    fontFamily: '"Anthropic Sans", sans-serif',
    themeVariables: {
      darkMode: dark,
      fontSize: '13px',
      fontFamily: '"Anthropic Sans", sans-serif',
      lineColor: dark ? '#9c9a92' : '#73726c',
      textColor: dark ? '#c2c0b6' : '#3d3d3a',
    },
  });
  const { svg } = await mermaid.render(
    'erd-svg',
    `erDiagram
  USERS ||--o{ POSTS : writes
  USERS { uuid id PK; string email; timestamp created_at }
  POSTS { uuid id PK; uuid user_id FK; string title }`,
  );
  document.getElementById('erd').innerHTML = svg;
</script>
```

---

## HTML Stepper

**When:** Cyclical flows (event loop, Krebs cycle, GC), multi-stage processes that need per-stage detail.

**Never draw cycles as rings in SVG** — stepper is always better.

```html
<h2 class="sr-only">Step-by-step explanation of X</h2>
<div id="stepper">
  <div style="display:flex;gap:6px;margin-bottom:1.5rem;justify-content:center" id="dots"></div>
  <div id="panels"></div>
  <div style="display:flex;justify-content:space-between;margin-top:1.5rem">
    <button type="button" onclick="step(-1)">← Back</button>
    <button type="button" onclick="step(1)">Next →</button>
  </div>
</div>
<script>
  const stages = [
    { title: 'Stage 1', content: 'Description of what happens here' },
    { title: 'Stage 2', content: 'Description of what happens here' },
  ];
  let cur = 0;
  function render() {
    const s = stages[cur];
    document.getElementById('panels').innerHTML =
      `<div style="padding:1rem;background:var(--color-background-secondary);border-radius:var(--border-radius-lg)">
      <p style="font-weight:500;margin:0 0 8px">${s.title}</p>
      <p style="margin:0;color:var(--color-text-secondary)">${s.content}</p>
    </div>`;
    document.getElementById('dots').innerHTML = stages
      .map(
        (_, i) =>
          `<span style="width:8px;height:8px;border-radius:50%;background:${
            i === cur ? 'var(--color-text-primary)' : 'var(--color-border-primary)'
          }"></span>`,
      )
      .join('');
  }
  function step(d) {
    cur = (cur + d + stages.length) % stages.length;
    render();
  }
  render();
</script>
```

---

## Multi-Diagram Composition

For complex topics:

1. Draw overview/intuition diagram first (show_widget call 1)
2. Write prose between diagrams explaining the transition
3. Draw detailed/reference diagram second (show_widget call 2)

Rules:

- Always write prose between consecutive diagram calls — never stack back-to-back
- Promise only what you deliver — if you say "three diagrams", include all three calls
- Use prose to guide attention: "Here's how X flows at the high level → Now let's zoom in on Y"
