# Re-Prompt — Professional UI Design Specification

## Praxeti Neo-Brutalist System

---

## 1. Color System

```css
:root {
  /* ── Praxeti Core Palette ──────────────────────── */
  --praxeti-white:   #f6f7ed;
  --spring:          #DBE64C;
  --midnight-mirage: #001f3f;
  --mantis:          #74c365;
  --book-green:      #00804c;
  --nuit-blanche:    #1e488f;
  --alert-red:       #e63946;

  /* ── Semantic Roles ────────────────────────────── */
  --bg:              var(--praxeti-white);
  --text:            var(--midnight-mirage);
  --accent:          var(--spring);
  --accent-2:        var(--mantis);
  --action:          var(--book-green);
  --surface:         var(--nuit-blanche);
  --border-col:      var(--midnight-mirage);

  /* ── Neo-Brutalist Tokens ──────────────────────── */
  --border:          4px solid var(--midnight-mirage);
  --border-thin:     2px solid var(--midnight-mirage);
  --shadow:          6px 6px 0px var(--midnight-mirage);
  --shadow-accent:   6px 6px 0px var(--spring);
  --shadow-green:    6px 6px 0px var(--mantis);
  --radius:          0px;

  /* ── Spacing ────────────────────────────────────── */
  --sp-1:  8px;
  --sp-2:  16px;
  --sp-3:  24px;
  --sp-4:  40px;
  --sp-5:  64px;
}
```

---

## 2. Typography

| Role        | Font               | Size   | Weight |
|-------------|--------------------|--------|--------|
| H1 / Hero   | Space Grotesk      | 48px   | 800    |
| H2 / Panel  | Space Grotesk      | 32px   | 700    |
| H3 / Label  | Space Grotesk      | 24px   | 700    |
| Body        | Inter              | 16px   | 500    |
| Mono / Code | JetBrains Mono     | 13px   | 400    |
| Badge       | Inter              | 10px   | 800    |

```css
body    { font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 500; }
h1, h2, h3 { font-family: 'Space Grotesk', sans-serif; text-transform: uppercase; letter-spacing: -0.02em; }
```

---

## 3. ASCII Wireframe — Full Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  NAV BAR                                                    [HC] [A+] [A-]│
│  Re-Prompt                               [MODE INDICATOR]  [RESET ENGINE] │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  HERO INPUT PANEL                                                        │
│  ┌── MODE TABS ────────────────────────────────────────────────────────┐│
│  │ [IDEA REFINEMENT] [PRODUCT PLANNING] [PRD GENERATION]               ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌── INPUT TEXTAREA ───────────────────────────────────────────────────┐│
│  │                                                                      ││
│  │  Describe your product, idea, or concept...                          ││
│  │                                                                      ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  [● ANALYZE]   [PLAN]  [CHATGPT]  [COPILOT]  [TEST-SCAFFOLD]           │
└─────────────────────────────────────────────────────────────────────────┘

▼ STEP 2: CONTEXT SYNC  ──────────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────┐
│  CLARIFICATION INPUTS                                                    │
│  ┌── QUESTION CARD ─────────────────────────┐  ┌── QUESTION CARD ─────┐│
│  │ PARAM_01                                  │  │ PARAM_02             ││
│  │ [question text]                           │  │ [question text]      ││
│  │ ┌──────────────────────────────────────┐ │  │ ┌─────────────────┐  ││
│  │ │ Your answer...                       │ │  │ │ Your answer...  │  ││
│  │ └──────────────────────────────────────┘ │  │ └─────────────────┘  ││
│  └───────────────────────────────────────────┘  └──────────────────────┘│
│                                                                          │
│                          [● SYNTHESIZE ALL]                              │
└─────────────────────────────────────────────────────────────────────────┘

▼ STEP 3: RESULTS WORKSPACE ──────────────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────┐
│  PANEL 1 — MODE OUTPUT                                      [COPY] [EXPORT]│
│  ┌── §1 REFINED DOMAIN SPECIFICATION ──────────────────────────────────┐│
│  │  [body text]                                                         ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌── §2 ASSUMPTIONS ─────────────────────────────── ┐                   │
│  │  [assumption] ............ [likelihood] [-2pts]   │                   │
│  └────────────────────────────────────────────────── ┘                   │
│  ┌── §3 CORE FEATURES ──────────────────────────────────────────────── ┐│
│  │  [TRACEABLE] Feature Name     80%                                    ││
│  │  [ASSUMPTION] Feature Name    63%                                    ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌── §4 NON-FUNCTIONAL REQUIREMENTS ───────────────────────────────── ─┐│
│  │  [PERFORMANCE]  Must handle 10k rps    [HIGH]                        ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌── §5 TECH ARCHITECTURE ─────────────────────────────────────────────┐│
│  │  [FRONTEND][BACKEND][AI][STORAGE][DEPLOY]                            ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐  ┌──────────────────────────────────────┐
│  PANEL 2 — CONFIDENCE        │  │  PANEL 3 — VALIDATION                │
│                              │  │                                       │
│  CLARITY     ████████░░  80% │  │  CONSISTENCY    PASS                 │
│  VIABILITY   ██████░░░░  60% │  │  DOMAIN DC      87.3%                │
│  NOVELTY     ███████░░░  70% │  │  DRIFT EVENTS   0                    │
│              ─────────────── │  │  LLM CALLS      2                    │
│  FINAL SCORE       75 / 100  │  │  AUTO PASS/FAIL 12 / 1               │
└──────────────────────────────┘  └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  PANEL 4 — GENERATED PROMPTS                                             │
│  ┌── CHATGPT ───────────────────────────────────┐  [COPY] [PREVIEW →]  │
│  │  [prompt text]                               │                        │
│  └──────────────────────────────────────────────┘                        │
│  ┌── COPILOT ───────────────────────────────────┐  [COPY] [PREVIEW →]  │
│  │  [prompt text]                               │                        │
│  └──────────────────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────┐
│  SIMULATION REPORT                     │
│  THRESHOLD  CONSISTENCY  DELTA  SCORE  │
│  0.70       90.0%        +1.5   76.5   │
│  0.55       88.0%        -0.5   74.5   │
│  0.45       82.0%        -5.0   70.0   │
│                    [RE-RUN SIMULATION] │
└────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  ACTION BAR                                                              │
│  [EXPORT MD]   [EXPORT PDF]   [RESET ENGINE]                            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Rules

### Cards / Panels

```css
.panel {
  background:   var(--praxeti-white);
  border:       var(--border);          /* 4px solid #001f3f */
  box-shadow:   var(--shadow);          /* 6px 6px 0px #001f3f */
  border-radius: 0;
  padding:      var(--sp-3);
  margin-bottom: var(--sp-4);
}

.panel:hover {
  transform:   translate(-2px, -2px);
  box-shadow:  8px 8px 0px var(--midnight-mirage);
}
```

### Buttons

```css
/* Primary — Analyze / Synthesize */
.btn-primary {
  background:  var(--spring);
  color:       var(--midnight-mirage);
  border:      var(--border);
  box-shadow:  var(--shadow);
  padding:     16px 32px;
  font-weight: 800;
  font-size:   14px;
  letter-spacing: 1px;
  border-radius: 0;
}

/* Secondary — Tools */
.btn-secondary {
  background:  var(--mantis);
  color:       var(--midnight-mirage);
  border:      var(--border);
  box-shadow:  var(--shadow-green);
}

/* Execute — Book Green */
.btn-execute {
  background:  var(--book-green);
  color:       var(--praxeti-white);
  border:      var(--border);
  box-shadow:  var(--shadow);
}

/* Hover */
.btn-primary:hover, .btn-secondary:hover, .btn-execute:hover {
  transform:   translate(-2px, -2px);
  box-shadow:  8px 8px 0px var(--midnight-mirage);
}

/* Click */
.btn-primary:active {
  transform:   translate(2px, 2px);
  box-shadow:  3px 3px 0px var(--midnight-mirage);
}

/* Disabled */
.btn:disabled {
  opacity: 0.35;
  transform: none !important;
  cursor: not-allowed;
}
```

### Mode Selector Tabs

```css
.tabs { display: flex; border-bottom: var(--border); }

.tab {
  padding:     12px 24px;
  font-weight: 800;
  font-size:   12px;
  letter-spacing: 2px;
  text-transform: uppercase;
  border: var(--border);
  border-bottom: none;
  background:  var(--praxeti-white);
  color:       var(--midnight-mirage);
  cursor: pointer;
  margin-right: -4px;
  transition:  all 0.12s ease;
}

.tab--active {
  background:     var(--spring);
  border-bottom:  4px solid var(--midnight-mirage);
  position:       relative;
  z-index:        1;
}

.tab:hover:not(.tab--active) {
  background: rgba(219, 230, 76, 0.3);
}
```

### Input / Textarea

```css
.input-field {
  background:   var(--praxeti-white);
  border:       var(--border);
  box-shadow:   var(--shadow);
  color:        var(--midnight-mirage);
  padding:      20px;
  font-size:    18px;
  font-weight:  600;
  resize:       none;
  border-radius: 0;
  outline:      none;
  width:        100%;
}

.input-field:focus {
  outline:         3px solid var(--spring);
  outline-offset: -3px;
  box-shadow:      var(--shadow-accent);
}
```

### Section Labels

```css
.section-label {
  font-size:      10px;
  font-weight:    800;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom:  var(--sp-2);
  color:          var(--midnight-mirage);
  opacity:        0.5;
}
```

### Validation Badges

```css
.badge            { padding: 2px 10px; border-radius: 0; font-size: 9px; font-weight: 800; letter-spacing: 1px; display: inline-block; border: 1px solid; }
.badge--traceable { background: rgba(116,195,101,0.15); color: var(--book-green);   border-color: var(--book-green);   }
.badge--assumption{ background: rgba(219,230,76,0.2);   color: #7a830a;             border-color: var(--spring);       }
.badge--speculative{ background: rgba(230,57,70,0.1);   color: var(--alert-red);    border-color: var(--alert-red);    }
```

### Confidence Bars

```css
.conf-bar         { height: 6px; border: 1px solid var(--midnight-mirage); background: rgba(0,31,63,0.08); margin-top: 6px; }
.conf-fill        { height: 100%; }
.conf-fill--clarity   { background: var(--mantis); }
.conf-fill--viability { background: var(--spring); }
.conf-fill--novelty   { background: var(--nuit-blanche); }
```

### Navigation Bar

```css
.navbar {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  padding:         0 var(--sp-4);
  height:          60px;
  border-bottom:   var(--border);
  background:      var(--midnight-mirage);
  position:        sticky;
  top:             0;
  z-index:         100;
}

.navbar-brand {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 800;
  font-size:   20px;
  color:       var(--spring);
  letter-spacing: -0.02em;
}

.navbar-controls { display: flex; gap: var(--sp-2); align-items: center; }
```

---

## 5. Layout Architecture

### Grid System

```css
.layout {
  max-width:  1280px;
  margin:     0 auto;
  padding:    0 var(--sp-4);
}

.results-grid {
  display:               grid;
  grid-template-columns: 1fr;
  gap:                   var(--sp-4);
}

.confidence-row {
  display:               grid;
  grid-template-columns: 1fr 1fr;
  gap:                   var(--sp-3);
}

@media (max-width: 900px) {
  .confidence-row { grid-template-columns: 1fr; }
}
```

### Panel Stacking Order

| # | Panel                   | Size        | Color Signal     |
|---|-------------------------|-------------|------------------|
| 1 | Mode Output             | Full-width  | Spring accent    |
| 2 | Confidence Breakdown    | Half-width  | Mantis bars      |
| 3 | Validation Logic        | Half-width  | Midnight headers |
| 4 | Generated Prompts       | Full-width  | Book Green btns  |
| 5 | Simulation Report       | Full-width  | Nuit Blanche     |
| 6 | Action Bar              | Full-width  | Button row       |

---

## 6. Execution Status Indicators

```css
.status-dot {
  width:  10px; height: 10px;
  border-radius: 0;
  display: inline-block;
}

.status-dot--idle    { background: rgba(0,31,63,0.2); }
.status-dot--running { background: var(--spring); animation: pulse 0.8s infinite; }
.status-dot--ok      { background: var(--mantis); }
.status-dot--error   { background: var(--alert-red); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
```

---

## 7. Navigation Bar Content

```
┌──────────────────────────────────────────────────────────────────────┐
│ ◈ RE-PROMPT          ● READY          [HC]  [A+]  [A-]  [RESET]    │
│  [IDEA]  [PLANNING]  [PRD]                                           │
└──────────────────────────────────────────────────────────────────────┘
```

- **Left**: Logo `◈ RE-PROMPT` in spring yellow on midnight bg
- **Center**: Execution status dot + label (`● READY / ◌ PROCESSING`)
- **Right**: Accessibility controls + reset button

---

## 8. AI Platform Quality Checklist

| Feature                          | Implementation                          |
|----------------------------------|-----------------------------------------|
| Execution status indicator       | Animated `status-dot` in navbar         |
| Confidence score visualization   | Color-coded bars + numeric scores       |
| Validation logic transparency    | Traced badges per feature               |
| Structured results panels        | Stacked brutalist card grid             |
| Prompt export tools              | Copy + Export MD / Export PDF buttons  |
| Mode-aware results rendering     | Separate renderers per intent mode      |

---

> [!NOTE]
> This spec is the source of truth for all UI implementation work. All colors, spacing, and components must reference the CSS variables defined in Section 1. No hardcoded hex values inside components.

---

## 9. Motion System (Micro-Interaction Rules)

### Motion Tokens

```css
:root {
  --motion-fast: 120ms;
  --motion-base: 180ms;
  --motion-slow: 260ms;
}
```

### Global Transition Rule

Applied once on `*` � all components inherit motion automatically. No per-component `transition` declarations needed.

```css
* {
  transition:
    transform  var(--motion-fast) ease,
    background var(--motion-fast) ease,
    box-shadow var(--motion-fast) ease,
    opacity    var(--motion-base) ease;
}
```

### Interaction Timing Table

| Interaction        | Duration                 | Property              |
|--------------------|--------------------------|-----------------------|
| Button hover       | `--motion-fast` (120ms)  | transform, box-shadow |
| Button click       | `--motion-fast` (120ms)  | transform             |
| Panel hover lift   | `--motion-fast` (120ms)  | transform, box-shadow |
| Panel expand       | `--motion-base` (180ms)  | height, opacity       |
| Mode tab switch    | `--motion-base` (180ms)  | background, color     |
| Step transition    | `--motion-slow` (260ms)  | opacity, transform    |
| Skeleton shimmer   | `1200ms` infinite        | background-position   |
| Status dot pulse   | `800ms` infinite         | opacity               |

### Per-Interaction Rules

```css
/* Panel expansion � collapsible result sections */
.panel--collapsible {
  overflow:   hidden;
  max-height: 0;
  opacity:    0;
  transition: max-height var(--motion-base) ease, opacity var(--motion-base) ease;
}
.panel--collapsible.open {
  max-height: 2000px;
  opacity:    1;
}

/* Step view transition */
.step-view {
  opacity:   0;
  transform: translateY(24px);
  transition: opacity var(--motion-slow) ease, transform var(--motion-slow) ease;
}
.step-view.active {
  opacity:   1;
  transform: translateY(0);
}
```

---

## 10. Empty State System

All panels render a structured empty state instead of a blank surface. Empty states use identical border, padding, and typography tokens as live panels � no layout shift.

### Empty State Component

```css
.empty-state {
  border:         var(--border);
  box-shadow:     var(--shadow);
  padding:        var(--sp-4);
  background:     var(--praxeti-white);
  text-align:     center;
  display:        flex;
  flex-direction: column;
  align-items:    center;
  gap:            var(--sp-2);
}

.empty-state__icon  { font-size: 32px; opacity: 0.2; }
.empty-state__title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700; font-size: 11px;
  letter-spacing: 3px; text-transform: uppercase;
  color: var(--midnight-mirage); opacity: 0.45;
}
.empty-state__body  {
  font-size: 14px; font-weight: 500;
  color: var(--midnight-mirage); opacity: 0.35;
  max-width: 280px; line-height: 1.5;
}
```

### Panel Empty State Registry

| Panel             | Icon | Title                  | Body                                                    |
|-------------------|------|------------------------|---------------------------------------------------------|
| Mode Output       | `?`  | NO ANALYSIS YET        | Enter an idea above and press ANALYZE to begin.         |
| Validation        | `?`  | AWAITING SYNTHESIS     | Validation results appear after Synthesize runs.        |
| Generated Prompts | `//` | NO PROMPTS GENERATED   | Complete the analysis flow to generate tool prompts.    |
| Simulation Report | `?`  | SIMULATION NOT RUN     | Click RE-RUN SIMULATION after synthesis completes.      |

### Empty State ASCII

```
+------------------------------------------+
�                                          �
�              ?                           �
�        NO ANALYSIS YET                   �
�   Enter an idea above and press          �
�   ANALYZE to begin.                      �
�                                          �
+------------------------------------------+
```

---

## 11. Loading State System (Skeleton)

Skeleton states replace panel content during analysis and synthesis. They preserve structural layout to prevent layout shift on data arrival.

### Skeleton Component

```css
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(0, 31, 63, 0.06) 0%,
    rgba(0, 31, 63, 0.14) 50%,
    rgba(0, 31, 63, 0.06) 100%
  );
  background-size: 800px 100%;
  animation: shimmer 1.2s infinite linear;
  border-radius: 0;
}

@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
```

### Skeleton Variants

```css
.skeleton--line       { height: 14px; margin-bottom: var(--sp-1); width: 100%; }
.skeleton--line-med   { width: 80%; }
.skeleton--line-short { width: 55%; }
.skeleton--block      { height: 80px; margin-bottom: var(--sp-2); width: 100%; }
.skeleton--stat       { height: 48px; width: 80px; display: inline-block; }
.skeleton--badge      { height: 20px; width: 70px; display: inline-block; }
```

### Skeleton Activation Rules

| Trigger                  | Panels Replaced                                       |
|--------------------------|-------------------------------------------------------|
| ANALYZE clicked          | Mode Output, Confidence, Validation                   |
| SYNTHESIZE ALL clicked   | Mode Output, Confidence, Validation, Prompts          |
| RE-RUN SIMULATION        | Simulation Report only                                |

Skeletons clear when the API responds. On error, the skeleton is replaced by an error state (Section 12).

---

## 12. Error State System

Error panels are structurally identical to live panels. Only border and shadow color change to `--alert-red`. Layout must not collapse.

### Error Component

```css
.panel--error {
  border:     4px solid var(--alert-red);
  box-shadow: 6px 6px 0px var(--alert-red);
  background: var(--praxeti-white);
  padding:    var(--sp-3);
}

.error-header {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 800; font-size: 11px;
  letter-spacing: 3px; text-transform: uppercase;
  color: var(--alert-red);
  margin-bottom: var(--sp-2);
}
.error-header::before { content: '?  '; }

.error-body {
  font-size: 14px; font-weight: 500;
  color: var(--midnight-mirage); opacity: 0.75;
  line-height: 1.5; margin-bottom: var(--sp-2);
}

.error-detail {
  font-family: monospace; font-size: 12px;
  background: rgba(230, 57, 70, 0.06);
  border-left: 3px solid var(--alert-red);
  padding: var(--sp-1) var(--sp-2);
  color: var(--alert-red);
  margin-bottom: var(--sp-2);
}

.btn-error-detail {
  background: transparent; border: var(--border-thin);
  color: var(--midnight-mirage);
  padding: 8px 18px; font-weight: 800; font-size: 11px;
  letter-spacing: 1px; cursor: pointer;
  box-shadow: 3px 3px 0px var(--midnight-mirage);
}
.btn-error-detail:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0px var(--midnight-mirage);
}
```

### Error Panel ASCII

```
+-- ? VALIDATION ERROR ------------------------------------+  ? alert-red border
�                                                          �
� Mode mismatch detected.                                  �
� Technical architecture not allowed in IDEA mode.         �
�                                                          �
� SCHEMA: PRODUCT_PLANNING required                        �  ? error-detail (mono)
�                                                          �
� [VIEW DETAILS]                                           �
+----------------------------------------------------------+  ? alert-red shadow
```

### Error Type Registry

| Error Type       | Panel          | Header                 | Detail               |
|------------------|----------------|------------------------|----------------------|
| API failure      | Mode Output    | ENGINE ERROR           | HTTP status + msg    |
| Mode mismatch    | Mode Output    | VALIDATION ERROR       | Schema diff          |
| Rate limit       | Navbar banner  | RATE LIMIT             | Retry countdown      |
| Synthesis failed | Prompts Panel  | SYNTHESIS ERROR        | Error message        |
| Network timeout  | Active panel   | CONNECTION TIMEOUT     | Retry button         |

---

## 13. Keyboard Shortcut System

All primary actions expose keyboard shortcuts. Shortcuts are displayed inline on button labels using a `kbd` element styled to match the brutalist system.

### Shortcut Registry

| Shortcut                   | Action                        | Context          |
|----------------------------|-------------------------------|------------------|
| `Ctrl + Enter`             | Run Analyze                   | Step 1 active    |
| `Ctrl + Shift + Enter`     | Run Synthesize                | Step 2 active    |
| `Ctrl + Shift + C`         | Copy all generated prompts    | Step 3 active    |
| `Ctrl + M`                 | Export Markdown               | Step 3 active    |
| `Ctrl + P`                 | Export PDF / Print            | Step 3 active    |
| `Ctrl + R`                 | Reset engine state            | Global           |
| `Ctrl + /`                 | Toggle shortcut help overlay  | Global           |
| `Tab`                      | Cycle mode tabs               | Step 1           |
| `Escape`                   | Dismiss overlays / errors     | Global           |

### `kbd` Badge Component

```css
kbd {
  display:       inline-block;
  padding:       1px 6px;
  margin-left:   var(--sp-1);
  font-family:   monospace;
  font-size:     10px;
  font-weight:   700;
  color:         var(--midnight-mirage);
  background:    var(--praxeti-white);
  border:        1px solid var(--midnight-mirage);
  box-shadow:    2px 2px 0px var(--midnight-mirage);
  vertical-align: middle;
  opacity:       0.55;
}
```

### Button with Shortcut � Rendered Layout

```
+--------------------------------------------------+
�  ? ANALYZE   [Ctrl+Enter]                        �
+--------------------------------------------------+

+--------------------------------------------------+
�  ? SYNTHESIZE ALL   [Ctrl+Shift+Enter]           �
+--------------------------------------------------+
```

### Shortcut Help Overlay � `Ctrl + /`

```
+-- KEYBOARD SHORTCUTS --------------------------------------+
� ANALYZE          Ctrl+Enter          Run intent analysis    �
� SYNTHESIZE       Ctrl+Shift+Enter    Run full synthesis     �
� COPY PROMPTS     Ctrl+Shift+C        Copy all outputs       �
� EXPORT MD        Ctrl+M              Save as Markdown       �
� RESET            Ctrl+R              Clear all state        �
� CLOSE            Escape              Dismiss overlay        �
+------------------------------------------------------------+
```

```css
.shortcut-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 31, 63, 0.6);
  z-index: 9000;
  display: flex; justify-content: center; align-items: center;
}

.shortcut-panel {
  background: var(--praxeti-white);
  border:     var(--border);
  box-shadow: var(--shadow);
  padding:    var(--sp-4);
  min-width:  480px;
}

.shortcut-row {
  display: grid;
  grid-template-columns: 1fr auto 1.2fr;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-1) 0;
  border-bottom: 1px solid rgba(0, 31, 63, 0.1);
  font-size: 13px; font-weight: 600;
}
.shortcut-row:last-child { border-bottom: none; }
```

---

> [!IMPORTANT]
> Sections 9�13 extend this spec without modifying existing sections. All new CSS references only variables from Section 1. Respect `prefers-reduced-motion`:
>
> ```css
> @media (prefers-reduced-motion: reduce) {
>   * { transition: none !important; animation: none !important; }
> }
> ```

---

## 14. Beginner Onboarding Hero

A collapsible hero section shown to first-time users. Appears **above** the Hero Input Panel. Auto-collapses after analysis runs. Re-openable via a "HOW IT WORKS" button in the navbar.

### ASCII Layout

```
+-------------------------------------------------------------------------+
�  ? RE-PROMPT                                                            �
�  Deterministic Semantic Reasoning Engine                                �
�                                                                         �
�  Turn vague ideas into structured reasoning outputs.                   �
�  Re-Prompt analyzes your idea, clarifies missing context, and          �
�  generates structured outputs: concepts, plans, PRDs, and AI prompts.  �
�                                                                         �
�  HOW IT WORKS -------------------------------------------------------- �
�                                                                         �
�  +-----------------+  +-----------------+  +-----------------+        �
�  �  01             �  �  02             �  �  03             �        �
�  �  Enter your     �  �  Answer         �  �  Review         �        �
�  �  idea in the    �  �  clarification  �  �  structured     �        �
�  �  input box.     �  �  questions.     �  �  outputs.       �        �
�  +-----------------+  +-----------------+  +-----------------+        �
�                                                                         �
�  [ START ANALYSIS ]                                                     �
+-------------------------------------------------------------------------+
```

### CSS

```css
/* -- Hero Wrapper ---------------------------------------- */
.hero-onboarding {
  border:         var(--border);
  box-shadow:     var(--shadow);
  padding:        var(--sp-5);
  margin-bottom:  var(--sp-5);
  background:     var(--midnight-mirage);
  color:          var(--praxeti-white);
  overflow:       hidden;
  transition:     max-height var(--motion-slow) ease, opacity var(--motion-slow) ease;
  max-height:     800px;
  opacity:        1;
}

.hero-onboarding.collapsed {
  max-height: 0;
  opacity:    0;
  padding:    0;
  border:     none;
  box-shadow: none;
}

/* -- Title ----------------------------------------------- */
.hero-onboarding__eyebrow {
  font-size:      11px;
  font-weight:    800;
  letter-spacing: 4px;
  text-transform: uppercase;
  color:          var(--spring);
  margin-bottom:  var(--sp-1);
}

.hero-onboarding__title {
  font-family:    'Space Grotesk', sans-serif;
  font-weight:    800;
  font-size:      clamp(2rem, 5vw, 3rem);
  letter-spacing: -0.03em;
  color:          var(--praxeti-white);
  margin-bottom:  var(--sp-2);
  line-height:    1;
}

/* -- Description ----------------------------------------- */
.hero-onboarding__desc {
  font-size:   18px;
  font-weight: 500;
  max-width:   640px;
  opacity:     0.7;
  line-height: 1.55;
  margin-bottom: var(--sp-4);
}

/* -- Step Guide Header ----------------------------------- */
.hero-onboarding__steps-label {
  font-size:      10px;
  font-weight:    800;
  letter-spacing: 3px;
  text-transform: uppercase;
  color:          var(--spring);
  margin-bottom:  var(--sp-2);
  border-top:     1px solid rgba(246,247,237,0.15);
  padding-top:    var(--sp-3);
}

/* -- Step Grid ------------------------------------------- */
.hero-steps {
  display:               grid;
  grid-template-columns: repeat(3, 1fr);
  gap:                   var(--sp-3);
  margin-bottom:         var(--sp-4);
}

.hero-step {
  border:     var(--border-thin);
  border-color: rgba(246,247,237,0.25);
  padding:    var(--sp-2) var(--sp-3);
  background: rgba(246,247,237,0.05);
}

.hero-step__num {
  font-size:      11px;
  font-weight:    800;
  letter-spacing: 2px;
  color:          var(--spring);
  margin-bottom:  var(--sp-1);
}

.hero-step__text {
  font-size:   14px;
  font-weight: 500;
  opacity:     0.75;
  line-height: 1.4;
}

/* -- CTA Button ------------------------------------------ */
.hero-onboarding__cta {
  background:     var(--spring);
  color:          var(--midnight-mirage);
  border:         var(--border);
  border-color:   var(--spring);
  box-shadow:     6px 6px 0px var(--spring);
  padding:        16px 36px;
  font-family:    'Space Grotesk', sans-serif;
  font-weight:    800;
  font-size:      14px;
  letter-spacing: 1px;
  text-transform: uppercase;
  cursor:         pointer;
}

.hero-onboarding__cta:hover {
  transform:  translate(-2px, -2px);
  box-shadow: 8px 8px 0px var(--spring);
}

.hero-onboarding__cta:active {
  transform:  translate(2px, 2px);
  box-shadow: 3px 3px 0px var(--spring);
}

/* -- "HOW IT WORKS" Reopen Button (Navbar) --------------- */
.btn-how-it-works {
  font-size:      10px;
  font-weight:    800;
  letter-spacing: 2px;
  text-transform: uppercase;
  background:     transparent;
  border:         var(--border-thin);
  border-color:   rgba(246,247,237,0.4);
  color:          var(--praxeti-white);
  padding:        6px 12px;
  cursor:         pointer;
  opacity:        0;
  pointer-events: none;
  transition:     opacity var(--motion-base) ease;
}

.btn-how-it-works.visible {
  opacity:        1;
  pointer-events: auto;
}

.btn-how-it-works:hover {
  border-color: var(--spring);
  color:        var(--spring);
}
```

### UX Behavior

| Trigger                  | Hero State                                              |
|--------------------------|---------------------------------------------------------|
| Page load (no analysis)  | Visible � full height                                   |
| ANALYZE / START clicked  | Collapses (`collapsed` class added, `max-height: 0`)    |
| "HOW IT WORKS" clicked   | Expands � `collapsed` class removed                     |
| "HOW IT WORKS" button    | Hidden on load, visible once hero is collapsed          |

### JavaScript Behavior

```js
const hero    = document.getElementById('onboarding-hero');
const howBtn  = document.getElementById('btn-how-it-works');

function collapseHero() {
  hero.classList.add('collapsed');
  howBtn.classList.add('visible');
}

function expandHero() {
  hero.classList.remove('collapsed');
  howBtn.classList.remove('visible');
  hero.scrollIntoView({ behavior: 'smooth' });
}

// CTA scrolls to and focuses the input
document.getElementById('hero-cta').addEventListener('click', () => {
  const input = document.getElementById('vision-input');
  input.scrollIntoView({ behavior: 'smooth' });
  input.focus();
});

howBtn.addEventListener('click', expandHero);

// Auto-collapse when analysis starts
document.getElementById('btn-next-1').addEventListener('click', collapseHero);
```

### HTML Structure

```html
<section id="onboarding-hero" class="hero-onboarding" aria-label="How Re-Prompt works">
  <div class="hero-onboarding__eyebrow">? RE-PROMPT</div>
  <h1 class="hero-onboarding__title">Turn vague ideas into<br>structured outputs.</h1>
  <p class="hero-onboarding__desc">
    Re-Prompt analyzes your idea, clarifies missing context, and generates
    structured outputs: refined concepts, product plans, PRDs, and AI prompts.
  </p>

  <div class="hero-onboarding__steps-label">How It Works</div>
  <div class="hero-steps">
    <div class="hero-step">
      <div class="hero-step__num">01</div>
      <div class="hero-step__text">Enter your idea in the input box.</div>
    </div>
    <div class="hero-step">
      <div class="hero-step__num">02</div>
      <div class="hero-step__text">Answer clarification questions generated by the system.</div>
    </div>
    <div class="hero-step">
      <div class="hero-step__num">03</div>
      <div class="hero-step__text">Review structured outputs including validation and confidence scores.</div>
    </div>
  </div>

  <button id="hero-cta" class="hero-onboarding__cta">Start Analysis &#8250;</button>
</section>
```

### Mobile Layout

```css
@media (max-width: 768px) {
  .hero-onboarding { padding: var(--sp-3); }
  .hero-steps      { grid-template-columns: 1fr; }
  .hero-onboarding__title { font-size: 2rem; }
  .hero-onboarding__desc  { font-size: 16px; }
}
```