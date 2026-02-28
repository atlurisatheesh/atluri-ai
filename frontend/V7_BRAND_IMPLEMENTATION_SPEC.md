# AtluriIn V7 — Final Brand Infrastructure Spec

## Part 1 — Tailwind Design Tokens

### 1) Theme Extension (Production)
- Implemented in [tailwind.config.js](tailwind.config.js)
- Wired in [app/globals.css](app/globals.css) via `@config "../tailwind.config.js";`

Token groups:
- Colors: `canvas`, `surface`, `elevated`, `borderSubtle`, `textPrimary`, `textSecondary`, `textMuted`, `accent`, `accentHover`
- Typography: `text-hero`, `text-sectionTitle`, `text-body`, `text-muted`
- Spacing: baseline 4px ladder with extended keys (`18`, `22`, `26`, `30`)
- Radius: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-pill`
- Shadow: `shadow-none`, `shadow-card`, `shadow-lift`
- Motion durations: `duration-120`, `duration-180`, `duration-240`
- Easing: `ease-calm`, `ease-standard`

### 2) JSX Usage Examples

#### Hero section
```tsx
<section className="mx-auto max-w-content px-6 lg:px-8 py-20 lg:py-30 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
  <div className="space-y-8">
    <p className="text-muted text-textMuted">Interview Performance OS</p>
    <h1 className="text-hero text-textPrimary max-w-[14ch]">Interviews feel hard when feedback is vague.</h1>
    <p className="text-body text-textMuted max-w-measure">One clear next move for the next round.</p>
  </div>
</section>
```

#### CTA button
```tsx
<Link className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-[#0F1626] transition duration-180 ease-calm hover:bg-accentHover">
  Start Free
</Link>
```

#### Section container
```tsx
<section className="mx-auto max-w-content px-6 lg:px-8 py-20 lg:py-26 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
  ...
</section>
```

#### Elevated preview card
```tsx
<div className="rounded-lg border border-borderSubtle bg-elevated/75 p-8 shadow-card backdrop-blur-[1.5px]">
  ...
</div>
```

#### Proof block
```tsx
<div className="space-y-6">
  <blockquote className="text-body text-textSecondary max-w-[40ch]">...</blockquote>
  <p className="text-muted text-textMuted">Senior candidate</p>
</div>
```

### 3) Strict Token Usage Rules
- No raw hex values inside page/component JSX.
- No arbitrary spacing in classes (`mt-[13px]`, `p-[19px]`) outside token scale.
- No non-token colors in component-level classes.
- No random font weights; use only 400, 500, 600.
- No new shadows outside `shadow-none`, `shadow-card`, `shadow-lift`.
- No custom transition timings outside token durations/easing.

---

## Part 2 — Exact `page.tsx` Implementation Rules

### Structural Rules
1. Max sections: 6 (target 5 for V7 if copy supports it).
2. Required narrative order: Problem → Outcome → Mechanism → Proof → CTA.
3. One idea per section.

### Layout Rules
4. Section spacing classes: `py-20 lg:py-26` (hero can use `lg:py-30`).
5. Container: `mx-auto max-w-content px-6 lg:px-8`.
6. Hero grid: `lg:grid-cols-[1.15fr_0.85fr] lg:items-end`.

### CTA + Accent Rules
7. One dominant CTA above fold only.
8. Secondary actions in text style only (muted, non-competitive).
9. Accent (`accent`, `accentHover`) reserved for decision actions.

### Surface + Border Rules
10. Border only for structural separation: `border-borderSubtle`.
11. Max two visible surface layers per section.
12. No nested card stacks.

### Background + Depth Rules
13. Canvas uses global atmospheric layer only (fog + grain from globals).
14. No section-level decorative gradients.
15. No heavy glow/shadow effects.

### Content Discipline Rules
16. Proof appears after mechanism, before final CTA.
17. Bullets: max 3 (hard cap 4).
18. Paragraph length: max 2 lines in main narrative.
19. Visual rhythm: alternate text-heavy and visual-supported sections.

### Skeleton (`page.tsx`)
```tsx
<main className="mx-auto max-w-content px-6 lg:px-8">
  <section className="py-20 lg:py-30 grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
    {/* Problem / Hero */}
  </section>

  <section className="py-20 lg:py-26 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
    {/* Outcome */}
  </section>

  <section className="py-20 lg:py-26 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
    {/* Mechanism */}
  </section>

  <section className="py-20 lg:py-26 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
    {/* Proof */}
  </section>

  <section className="py-20 lg:py-26 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
    {/* Final CTA */}
  </section>
</main>
```

---

## Part 3 — YC Partner Visual Critique (First 15 Seconds)

### Immediate Read
- Serious: Yes.
- Differentiated: Partially.
- Premium: Yes, if discipline is maintained.
- Defensible category posture: Emerging, not complete.
- Another AI landing page: Less than most, but still at risk if proof stays thin.

### Brutal Critique
- Still generic where: proof treatment and preview block semantics are too interchangeable with many SaaS pages.
- Stronger needed where: one unmistakable visual signature motif tied to “performance decisions,” not just clean styling.
- Investor-grade requires:
  - stronger evidence block without adding density,
  - tighter claim-to-proof linkage,
  - absolutely consistent token discipline across every route.
- Signals that imply “this wins”:
  - ruthless visual restraint,
  - zero decorative debt,
  - one dominant decision path,
  - identity consistency between landing and product shell,
  - confidence without theatrical effects.

### Bottom Line
- V7 can look category-owning if execution remains strict.
- The failure mode is drift into generic SaaS patterns (extra cards, extra borders, extra accents).
- Guardrail discipline is the moat.
