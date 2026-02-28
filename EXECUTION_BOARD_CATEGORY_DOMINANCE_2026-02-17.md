# Execution Board — Category Dominance (2026-02-17)

## Goal
Ship category-defining perception + conversion improvements without destabilizing core infrastructure.

## North-Star KPI
- Increase 30-day **offer-probability improvement completion rate** (users with >=3 sessions and positive delta).

## Guardrails
- No major backend refactors unless reliability breaks.
- Keep distributed room + fanout stack stable.
- Every UX addition must map to measurable signal output.

---

## Sprint 1 (7 days) — Positioning + Offer Probability v1

## Ticket 1 — Dominant landing copy pass
- **Type:** Frontend copy/UX
- **Files:**
  - `frontend/components/AppShell.tsx`
  - `frontend/components/QuickStartPanel.tsx`
  - `frontend/components/DashboardPanel.tsx`
  - `frontend/app/page.tsx` (if landing content is there)
- **Work:**
  - Replace system-first phrasing with outcome-first phrasing.
  - Keep current structure/components; copy and CTA changes only.
- **Acceptance criteria:**
  - Hero states outcome in first line (offer probability / interviewer perception).
  - Primary CTA is action-forward and immediate.
  - No new UX surfaces introduced.

## Ticket 2 — Offer Probability data contract (backend)
- **Type:** Backend API
- **Files:**
  - `backend/app/main.py`
  - `backend/app/state.py`
  - `backend/app/schemas.py`
  - `backend/app/analytics/session_analytics_store.py` (read source)
- **Work:**
  - Add `GET /api/user/offer-probability` response contract:
    - `offer_probability`
    - `confidence_band`
    - `drivers_positive`
    - `drivers_negative`
    - `delta_vs_last_session`
    - `what_to_fix_next`
  - Implement deterministic v1 formula from playbook.
- **Acceptance criteria:**
  - Endpoint returns stable values across repeated calls with unchanged data.
  - Response includes explainability drivers.
  - Unauthorized requests return 401.

## Ticket 3 — Offer Probability primary card on dashboard
- **Type:** Frontend UI
- **Files:**
  - `frontend/components/DashboardPanel.tsx`
  - `frontend/lib/api.ts`
- **Work:**
  - Render Offer Probability as top-level KPI with delta and confidence band.
  - Show top 2 negative drivers and “what to fix next” bullets.
- **Acceptance criteria:**
  - Visible above existing secondary metrics.
  - Degrades gracefully when endpoint has sparse data.

---

## Sprint 2 (7 days) — Real-Time Perception UI v1

## Ticket 4 — Interviewer Perception live panel
- **Type:** Frontend UI behavior
- **Files:**
  - `frontend/components/Interview.tsx`
  - `frontend/components/AppShell.tsx`
- **Work:**
  - Add live panel with five meters:
    - Credibility
    - STAR Structure
    - Confidence Stability
    - Impact Strength
    - Risk Drift
  - Maintain existing visual language.
- **Acceptance criteria:**
  - Values update in-session from existing signals.
  - Existing panel remains uncluttered (max 5 bars + 3 hints).

## Ticket 5 — Live transcript signal tagging
- **Type:** Frontend interaction
- **Files:**
  - `frontend/components/Interview.tsx`
  - `frontend/components/AssistPanel.tsx` (if used for hints)
- **Work:**
  - Add sentence-level tags (`Context`, `Action`, `Result`, `Reflection`).
  - Highlight weak spans (vague / unsupported / filler-heavy).
- **Acceptance criteria:**
  - Tagging appears during active interview flow.
  - Weak spans map to actionable correction hints.

## Ticket 6 — Session-end cinematic delta moment
- **Type:** Frontend UX
- **Files:**
  - `frontend/components/Interview.tsx`
- **Work:**
  - Show end-of-round delta card:
    - Offer Probability change
    - What changed
    - What to fix next
  - CTA to immediately run next round.
- **Acceptance criteria:**
  - Card appears at round completion.
  - Delta values are sourced from backend endpoint.

---

## Sprint 3 (7 days) — Authority + Distribution Engine

## Ticket 7 — Shareable improvement report payload
- **Type:** Backend + frontend
- **Files:**
  - `backend/app/main.py`
  - `backend/app/analytics/session_analytics_builder.py`
  - `frontend/components/DashboardPanel.tsx`
- **Work:**
  - Include offer-probability delta + top drivers in share/export payload.
  - Add “Share Improvement Snapshot” CTA.
- **Acceptance criteria:**
  - Shared snapshot contains user-safe, concise outcome framing.
  - Existing token security semantics remain intact.

## Ticket 8 — Testimonial capture trigger
- **Type:** Frontend growth loop
- **Files:**
  - `frontend/components/ToastProvider.tsx`
  - `frontend/components/Interview.tsx`
- **Work:**
  - Trigger lightweight testimonial prompt after significant positive delta.
- **Acceptance criteria:**
  - Prompt appears only after threshold-improvement sessions.
  - Dismissal persists for current cycle.

## Ticket 9 — Distribution ops cadence doc + content board
- **Type:** GTM operations
- **Files:**
  - `CATEGORY_DOMINANCE_PLAYBOOK_2026-02-17.md`
  - `README.md` (link)
  - `docs/` new file optional (`GROWTH_CADENCE_30D.md`)
- **Work:**
  - Convert channel strategy into weekly publishing checklist.
  - Add KPI review template.
- **Acceptance criteria:**
  - Team can execute weekly without ambiguity.

---

## Cross-Cutting Quality Gates

## Gate A — CI stability
- `.github/workflows/ci.yml` must stay green.
- Required checks:
  - Frontend TypeScript no-emit
  - Backend QA scripts
  - Distributed fanout smoke

## Gate B — Metrics observability
- `/api/system/metrics` includes:
  - room count
  - disconnect reason counters
  - Redis publish latency
  - fanout delay
- Contract source:
  - `backend/docs/SYSTEM_METRICS_CONTRACT.md`

## Gate C — Performance safety
- No noticeable regressions in websocket flow and room hardening smokes.
- Keep existing multi-instance fanout smoke passing.

---

## Suggested Ownership Split
- **Backend lead:** Tickets 2, 7
- **Frontend lead:** Tickets 1, 3, 4, 5, 6, 8
- **Founder/GTM:** Ticket 9
- **Shared:** Quality gates + weekly KPI review

## Weekly Review Template
- What shipped (tickets completed)
- Conversion impact (landing CVR, time-to-wow, session retention)
- Learning (top positive driver, top negative driver)
- Next week’s highest-leverage change
