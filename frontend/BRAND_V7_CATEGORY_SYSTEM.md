# AtluriIn Visual Brand System — V7 Category Direction

## Part 1 — Micro-Brand Guide

### A) Typography System

#### Font Stack
- Primary: Inter (UI + product + marketing).
- Secondary (optional, long-form only): IBM Plex Sans.
- Fallback: Segoe UI, Arial, sans-serif.

#### Weight Rules
- H1/H2: 600 only.
- H3/H4: 500 or 600 (default 600 for section heads).
- Body: 400.
- UI labels/chips/buttons: 500.
- Numeric highlights/steps: 600.

#### Scale + Rhythm
- Hero headline: 60–72px desktop, 40–52px mobile.
- Section headline: 34–40px desktop, 28–34px mobile.
- Body copy: 17–19px.
- Support/meta text: 12–14px.
- Line-height: headings 1.00–1.12, body 1.50–1.65, labels 1.30–1.45.

#### Tracking + Case
- Headline tracking: -0.01em to -0.03em.
- Body tracking: normal.
- Labels/meta: up to +0.06em only for short uppercase tokens.
- Capitalization: sentence case by default.
- Title case: only for navigation and explicit section titles.

#### Numeric Treatment
- Steps use 01 / 02 / 03 format.
- Percentages and metrics use tabular style where available.
- No playful numeral styling.

#### Avoided Typography Mistakes
- No more than 4 active font sizes in a section.
- No weight soup (300/400/500/600/700 all at once).
- No all-caps headlines.
- No low-contrast long paragraphs.
- No center-aligned long body blocks.

### B) Spacing System

#### Base Unit
- 4px base scale.
- Primary ladder: 4, 8, 12, 16, 24, 32, 48, 72, 96, 120.

#### Vertical Rhythm
- Section spacing baseline: 80 desktop, 64 mobile.
- Hero can expand to 96–120 when visual density is low.
- Within section: stack spacing 12/16/24 only.

#### Containers + Width
- Global container: max 1100.
- Main copy width: 42–46ch.
- Dense copy blocks: cap at 36ch.
- Visual blocks align to same grid, no drifting gutters.

#### Padding Rules
- Primary button: height 44, horizontal 20.
- Secondary button: height 40–44, horizontal 14–18.
- Card/surface padding: 24 or 32 only.

#### Compress vs Expand
- Compress when copy is procedural (steps, controls, chips).
- Expand when decision framing is needed (hero, proof, final CTA).
- If two adjacent sections feel dense, add vertical space before adding borders.

#### Whitespace Philosophy
- Whitespace is a hierarchy tool, not empty space.
- Prefer spacing over dividers.
- Every divider must justify itself by reducing ambiguity.

### C) Motion System

#### Motion Philosophy
- Calm, low-amplitude, confidence-first.
- Motion should confirm action, never demand attention.

#### Allowed Motion
- Opacity fade.
- Small translateY (2–6px).
- Color/opacity transitions.
- Surface elevation shift via subtle border/contrast change.

#### Timing + Easing
- Hover/focus: 120–180ms.
- Enter/exit micro transitions: 180–240ms.
- Modal open/close: 200–260ms.
- Easing: ease-out for enter, ease-in-out for standard state changes.

#### Interaction Style
- Hover: slight contrast lift, no scale bounce.
- Buttons: immediate feedback, no elastic effects.
- Page load: no full-screen intro animation.

#### Forbidden Motion
- No bounce/spring theatrics.
- No glow pulses.
- No infinite loops except required loaders.
- No parallax hero movement.

---

## Part 2 — UI Restraint Checklist (Strict)

### Hard Limits
- Max visual hierarchy levels per section: 3.
- Max CTA buttons per section: 1.
- Max dominant CTA above fold: 1.
- Max accent colors in interface: 1 primary + 1 semantic error.
- Max font weights in one viewport: 3 (400/500/600).
- Max active surface layers visible at once: 2.
- Max bullets per section: 3 (hard cap 4).
- Max landing sections: 6.

### Color + Accent Rules
- Accent reserved for action, not decoration.
- Do not accent two unrelated elements in same block.
- If accent appears more than 3 times above fold, reduce.

### Shadow + Border Rules
- Shadows optional; if used, one subtle style globally.
- Border usage should be sparse and structural.
- If border count is high, replace at least 30% with whitespace.

### Copy Discipline Rules
- One idea per section.
- No paragraph beyond two lines in landing primary path.
- Remove adjectives that do not change decision quality.

### Surface Discipline Rules
- No nested card stacks for simple content.
- No “box inside box inside box” compositions.
- No decorative blocks without information or action.

### Remove Before Ship (Mandatory)
- Remove duplicate CTA with same destination.
- Remove any section that repeats previous claim.
- Remove decorative gradients with no hierarchy benefit.
- Remove chips/tags that do not change user action.
- Remove one border in every section pass (unless clarity drops).
- Remove one sentence per section in copy pass.

---

## Part 3 — V7 Category Ownership Direction

### V7 Definition

#### Emotional Temperature
- Cool, controlled, inevitable.
- Not motivational, not playful, not urgent.

#### Visual Density
- Low-to-medium.
- Dense only at decision-critical surfaces.

#### Background Direction
- Muted graphite-blue atmosphere with subtle fog depth.
- Fine grain texture at barely perceptible intensity.
- No theatrical gradients.

#### Accent Restraint
- Single blue accent for decisions.
- Accent appears where commitment is requested, not where explanation occurs.

#### Section Philosophy
- Narrative-first, one decision per section.
- Sequence: Problem → Outcome → Mechanism → Proof → CTA.
- Every section must answer: what changes now?

#### Hero Dominance Style
- Strong single statement + one action.
- Secondary action is informational, not competitive.

#### CTA Psychology
- Confidence CTA, not pressure CTA.
- Language emphasizes control and readiness, not fear.

#### Proof Positioning
- Proof appears once, late enough to validate, early enough to unblock action.
- One quote + one credential line + restrained logo row.

### Differentiation vs LockedIn AI
- AtluriIn: operating system for controlled performance decisions.
- LockedIn-style products: assistant framing, advice framing, engagement-heavy UI.
- AtluriIn visual signature: fewer signals, higher confidence, lower emotional volatility.

### Why V7 Feels Inevitable
- It removes performative UI and keeps only decision-relevant information.
- It trades novelty for authority.
- It looks like a product that expects to be evaluated seriously.

### Reaction Simulation

#### If a FAANG Engineer sees V7
- Feels: this product is structured and respects cognitive load.
- Conclusion: likely useful for high-stakes prep, not hype software.

#### If an Investor sees V7
- Feels: clear positioning, disciplined product thinking, premium restraint.
- Conclusion: team has category intent, not just feature accumulation.

#### If a Competitor sees V7
- Feels: AtluriIn is hard to out-market with noise.
- Conclusion: must attack with proof depth or pricing, not visual theatrics.

---

## Implementation Notes (Operational)
- Keep this document as design gate criteria for PR review.
- Reject UI changes that violate hard limits unless a measurable conversion gain is shown.
- Use this as the baseline for all future landing and shell iterations.
