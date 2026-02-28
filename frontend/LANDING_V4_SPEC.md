# AtluriIn Landing V4 Production Spec

## A) Tailwind-Ready Layout Skeleton

- Container: `max-w-[1100px] mx-auto px-6 lg:px-8`
- Section baseline: `py-28`
- Section order (max 6):
  1. Hero
  2. Core Outcome
  3. Mechanism
  4. Inside Preview
  5. Proof
  6. Final CTA
- Rhythm: left text + right visual in sections 1–5 where possible.

## B) Design Token System

### Spacing Scale

- `1 = 4px`
- `2 = 8px`
- `3 = 12px`
- `4 = 16px`
- `6 = 24px`
- `8 = 32px`
- `12 = 48px`
- `18 = 72px`
- `24 = 96px`
- `30 = 120px`

### Typography Scale

- Hero: `text-6xl lg:text-7xl font-semibold tracking-[-0.03em]`
- Section headline: `text-4xl font-semibold tracking-[-0.02em]`
- Body: `text-lg text-neutral-300 leading-relaxed`
- Muted: `text-sm text-neutral-500`

### Color + Surface

- Background: `#0B0D10`
- Surface subtle: `#111418`
- Primary text: `#F3F5F7`
- Muted text: `#98A2AD`
- Accent (CTA only): soft blue (`#7FA9FF` / hover `#95B8FF`)
- Border (rare): `border-neutral-800`

## C) Spacing Scale Usage

- Nav vertical: `py-8`
- Hero to next section: `py-28`
- Internal stacks: `space-y-4`, `space-y-6`, `space-y-8`
- Visual gutters: `gap-12`
- CTA touch target: `h-11 px-5`

## D) Typography Scale Usage

- Page title only in Hero.
- One headline per section.
- Body lines capped to short, two-line friendly blocks.
- Muted labels for metadata, step numbers, and logo row.

## E) Color System Rules

- Landing stays near-black with neutral hierarchy.
- Use accent blue only for the hero primary CTA.
- No gradients for section backgrounds.
- No bright accents in supporting sections.

## F) Button Hierarchy Spec

- Primary (single dominant above fold): filled soft-blue button in Hero.
- Secondary actions: plain text links only.
- Final CTA section uses low-pressure text CTA to avoid repeated visual dominance.

## G) Layout Container Spec

- Global frame: `w-full max-w-[1100px] mx-auto`.
- Horizontal rhythm: `px-6 lg:px-8`.
- Grid pattern: `lg:grid-cols-[1fr_1fr]` or asymmetry `lg:grid-cols-[1.15fr_0.85fr]`.
- Avoid nested wrappers beyond one visual container per column.

## H) Full V4 Copy (Minimal)

### 1) Hero

- Headline: **Walk in calm. Perform with control.**
- Supporting line: **Stop guessing what interviewers heard. Practice with clarity before it counts.**
- Primary CTA: **Start Free**
- Visual note: clean session preview rail on right.

### 2) Core Outcome

- Headline: **Know your outcome sooner.**
- Supporting line: **Replace uncertainty with one clear direction.**
- Bullets:
  - See what to fix before real interviews.
  - Focus on one move at a time.
  - Build repeatable performance under pressure.

### 3) Mechanism

- Headline: **A simple loop you can trust.**
- Supporting line: **Three steps. One direction.**
- Steps:
  - Run a realistic round.
  - Review one clear read.
  - Apply the next adjustment.

### 4) Inside Preview

- Headline: **Inside the system.**
- Supporting line: **Built for focused preparation, not noisy dashboards.**
- Visual note: one workspace frame with guidance + transcript + next action.

### 5) Proof

- Headline: **Trusted by serious candidates.**
- Supporting line: **One voice. No hype.**
- Quote: **“AtluriIn helped me stop overthinking and start preparing with intent.”**
- Attribution: **Senior PM candidate**
- Logos: muted monochrome wordmarks only.

### 6) Final CTA

- Headline: **Start your first focused round.**
- Supporting line: **Make your next interview your clearest one yet.**
- CTA: **Continue to AtluriIn**

## I) Visual Rhythm Spec

- Use whitespace as separator first, borders second.
- Max one surface block on visual side per section.
- Keep left-text/right-visual cadence through major sections.
- Keep proof section quiet: one quote, one attribution, muted logo row.
- No dense block stacks; no card grids.

## J) Production React + Tailwind Skeleton Reference

Implemented in:

- `frontend/app/page.tsx`

Includes:

- 6-section V4 structure
- Tailwind-ready class system with exact container rhythm
- Single dominant above-fold CTA
- Minimal proof block and muted logos
- Final low-pressure CTA

## K) Premium Restraint Checklist

- [x] Max 6 sections total
- [x] One dominant CTA above fold
- [x] No metric grids
- [x] No dashboard stat cards
- [x] No comparison tables
- [x] No heavy border system
- [x] No nested card stacks
- [x] No repeated high-emphasis CTA buttons
- [x] No long explanatory paragraphs
- [x] Narrative flow: Problem → Outcome → Mechanism → Inside View → Proof → CTA

## Before vs After Compression (Conversion Rationale)

- Before: dense, analytical, and dashboard-coded first impression.
- After: calm and immediate understanding in first scan.
- Before: multiple competing blocks and signals.
- After: one idea per section with directional progression.
- Before: landing felt like product internals.
- After: landing sells confidence; app delivers depth.
