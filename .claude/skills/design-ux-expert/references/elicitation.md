# Elicitation — Complete Reference

## Philosophy

**Infer first.** Check conversation and attachments before rendering a form. Only ask what you cannot determine from context. One-question forms beat five-question forms where four answers are already in the chat.

If you can infer everything → skip the form entirely, proceed directly.

---

## Form Shell

```html
<form class="elicit">
  <div class="elicit-header">
    <!-- FIXED chrome — emit byte-for-byte, do not modify the SVG path -->
    <svg viewBox="0 0 20 20" fill="currentColor">
      <path
        d="M11.586 2a1.5 1.5 0 0 1 1.06.44l2.914 2.914a1.5 1.5 0 0 1 .44 1.06V16.5a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.492-1.347L4 16.5v-13A1.5 1.5 0 0 1 5.5 2zM5.5 3a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V7h-2.5A1.5 1.5 0 0 1 11 5.5V3zm7.04 10.304a.5.5 0 0 1 .92.392c-.295.69-.871 1.304-1.66 1.304-.487 0-.892-.234-1.2-.574-.309.34-.713.574-1.2.574-.486 0-.892-.233-1.2-.574-.31.34-.714.574-1.2.574a.5.5 0 0 1 0-1c.212 0 .52-.18.74-.696l.034-.067a.5.5 0 0 1 .886.067c.221.516.528.696.74.696.213 0 .52-.18.74-.696l.035-.067a.5.5 0 0 1 .885.067c.22.516.527.696.74.696s.519-.18.74-.696m0-4a.5.5 0 0 1 .92.392c-.295.69-.871 1.304-1.66 1.304-.487 0-.892-.234-1.2-.574-.309.34-.713.574-1.2.574-.486 0-.892-.233-1.2-.574-.31.34-.714.574-1.2.574a.5.5 0 0 1 0-1c.212 0 .52-.18.74-.696l.034-.067a.5.5 0 0 1 .886.067c.221.516.528.696.74.696.213 0 .52-.18.74-.696l.035-.067a.5.5 0 0 1 .885.067c.22.516.527.696.74.696s.519-.18.74-.696M12 5.5a.5.5 0 0 0 .5.5h2.293L12 3.207z"
      />
    </svg>
    <span>Subject details</span>
    <!-- "[subject] details" — thing the skill produces -->
  </div>
  <div class="elicit-body">
    <!-- .elicit-group blocks -->
  </div>
  <div class="elicit-footer">
    <button type="button" class="elicit-skip">Skip</button>
    <button type="button" class="elicit-submit">Continue</button>
  </div>
</form>
```

- Header title always: `"[subject] details"` — "Dashboard details", "Chart details", "Design details"
- `type="button"` on all buttons — prevents browser treating them as submit
- Zero onclick handlers, zero `<script>` — the shell handles all wiring via class + data-\* attributes

---

## Input Format Selection

| Content                        | Format                                    |
| ------------------------------ | ----------------------------------------- |
| Short labels, ≤4 words         | Plain pills                               |
| Options with icons + subtitles | Cards                                     |
| Output format / layout pickers | Preview tiles                             |
| Dates                          | `<input type="date" class="elicit-date">` |
| Quantities / scales / ratings  | `<input type="range">`                    |
| Free text / paste              | `<textarea class="elicit-textarea">`      |
| File uploads                   | Dropzone + textarea fallback              |

**Rule:** Vary formats across the form. 3+ choice groups → at least one must be cards or tiles.

---

## Plain Pills

For short text-only options (role, side, yes/no):

```html
<div class="elicit-group">
  <label class="elicit-question">Which side are you on?</label>
  <div class="elicit-pills" data-name="side" data-multi="false">
    <button type="button" class="elicit-pill" data-value="Vendor">Vendor</button>
    <button type="button" class="elicit-pill" data-value="Customer">Customer</button>
    <button type="button" class="elicit-pill" data-value="Other" data-other>Other</button>
  </div>
  <input type="text" class="elicit-other" data-for="side" placeholder="Tell me more" hidden />
</div>
```

- `data-multi="true"` for multi-select, `"false"` for single
- `data-other` on the last pill reveals the paired `elicit-other` input
- Never set background/border inline on pills — breaks selection state CSS

---

## Cards

For options with icons + subtitles:

```html
<div class="elicit-pills" data-name="chart_type" data-multi="false">
  <button
    type="button"
    class="elicit-pill"
    data-value="bar"
    style="border-radius:12px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start;
    text-align:left;min-width:180px;box-shadow:0 1px 2px rgba(0,0,0,0.04)"
  >
    <i class="ti ti-chart-bar" style="font-size:20px" aria-hidden="true"></i>
    <span>
      <span style="font-size:13px;font-weight:500">Bar chart</span><br />
      <span style="font-size:11px;color:var(--color-text-tertiary)">Categories & comparisons</span>
    </span>
  </button>
  <button
    type="button"
    class="elicit-pill"
    data-value="line"
    style="border-radius:12px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start;
    text-align:left;min-width:180px;box-shadow:0 1px 2px rgba(0,0,0,0.04)"
  >
    <i class="ti ti-trending-up" style="font-size:20px" aria-hidden="true"></i>
    <span>
      <span style="font-size:13px;font-weight:500">Line chart</span><br />
      <span style="font-size:11px;color:var(--color-text-tertiary)">Trends over time</span>
    </span>
  </button>
</div>
```

---

## Preview Tiles

For output format pickers (doc, slides, table):

```html
<div class="elicit-pills" data-name="output_format" data-multi="false">
  <button
    type="button"
    class="elicit-pill"
    data-value="dashboard"
    style="width:110px;border-radius:12px;padding:14px 10px;display:flex;
    flex-direction:column;align-items:center;gap:8px;box-shadow:0 1px 2px rgba(0,0,0,0.04)"
  >
    <svg
      width="48"
      height="36"
      viewBox="0 0 48 36"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <rect x="2" y="2" width="20" height="14" rx="2" />
      <rect x="26" y="2" width="20" height="14" rx="2" />
      <rect x="2" y="20" width="44" height="14" rx="2" />
    </svg>
    <span style="font-size:13px;font-weight:500">Dashboard</span>
  </button>
</div>
```

---

## Range Slider

For quantities and scales:

```html
<div class="elicit-group">
  <label class="elicit-question">How detailed should this be?</label>
  <div style="display:flex;align-items:center;gap:12px;margin-top:8px">
    <span style="font-size:12px;color:var(--color-text-secondary)">Overview</span>
    <input type="range" data-name="detail_level" min="1" max="5" step="1" style="flex:1" />
    <span style="font-size:12px;color:var(--color-text-secondary)">Deep dive</span>
  </div>
</div>
```

---

## File Upload

Include when skill needs data/documents. Always pair with textarea fallback:

```html
<div class="elicit-group">
  <label class="elicit-question">Upload your data file (or paste it below):</label>
  <div class="elicit-files" data-name="data_file">
    <label class="elicit-dropzone">
      <!-- FIXED chrome — emit byte-for-byte -->
      <svg viewBox="0 0 20 20" fill="currentColor">
        <path
          d="M16.5 13a.5.5 0 0 1 .5.5v2a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15.5v-2a.5.5 0 0 1 1 0v2a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 1 .5-.5M10 3a.5.5 0 0 1 .374.168l4 4.5.059.082a.5.5 0 0 1-.732.65l-.075-.068L10.5 4.814V13.5a.5.5 0 0 1-1 0V4.814L6.374 8.332a.5.5 0 0 1-.748-.664l4-4.5.08-.071A.5.5 0 0 1 10 3"
        />
      </svg>
      <span>Choose file</span>
      <input type="file" multiple />
    </label>
  </div>
  <textarea
    class="elicit-textarea"
    data-name="data_text"
    placeholder="or paste CSV/data here"
  ></textarea>
</div>
```

---

## Color Story

- **Default:** Blue for all selection states (auto via `.elicit-pill[aria-pressed="true"]`)
- **Semantic accents only:** `data-accent="warning"` (amber), `data-accent="danger"` (red), `data-accent="success"` (green)
- Never set background/border inline on pills — breaks selection state
- Selected state is always blue, even on accented pills

---

## After Submit

Answers arrive as: `"Subject details — Field: Value · Field: Value · Field: (N chars — see below)"`

Parse and proceed to generate the visual.
