# AtluriIn Category Dominance Playbook (2026-02-17)

## 1) Landing Positioning (Dominant Form)

## Category Claim
- **The Interview Performance OS**
- **See how interviewers perceive you — live. Increase offer probability with every session.**

## Hero (above the fold)
- **Headline:** Most candidates lose offers in the first 90 seconds.
- **Subheadline:** AtluriIn shows your interviewer-perception signal in real time: credibility, structure, confidence stability, and impact strength.
- **Primary CTA:** Start Live Pressure Round
- **Secondary CTA:** Watch 2-Minute Proof Demo
- **Proof strip (immediate):** Real-time perception scoring · Company-calibrated pressure rounds · Longitudinal growth graph

## Pain-First Positioning Blocks
1. **Why candidates fail**
   - Vague stories
   - No measurable impact
   - Delivery instability under pressure
2. **What interviewers actually evaluate**
   - Credibility under scrutiny
   - Structure clarity (STAR quality)
   - Signal consistency across follow-ups
3. **How AtluriIn wins**
   - Live perception simulation
   - Offer-probability progression model
   - Session-by-session performance lift tracking

## Messaging Principles
- Replace feature-first language with outcome-first language.
- Speak in hiring outcomes, not internal architecture.
- Every section answers: "How does this increase my chance of getting the offer?"

## Approved Dominant Copy Bank
- "You are being evaluated before your answer is complete."
- "See your interviewer-perception signal live."
- "Fix weak signals before they cost your offer."
- "Train like the interview decides your future — because it does."
- "Increase offer probability, not just confidence."

---

## 2) Offer Probability Model (Design Spec)

## Product Framing
- Core metric shown everywhere: **Offer Probability (%)**
- Must change meaningfully by behavior, not random noise.
- Must be explainable (top gain/loss drivers visible per session).

## Output Contract
- `offer_probability`: 0-100
- `confidence_band`: low | medium | high confidence in estimate
- `drivers_positive`: top 3 factors improving probability
- `drivers_negative`: top 3 factors hurting probability
- `delta_vs_last_session`: signed percentage points
- `what_to_fix_next`: 2 actionable highest-leverage behaviors

## Inputs (v1)
- `credibility_index` (0-100)
- `risk_drift` (0-100, inverse)
- `pressure_stability` (0-100)
- `structure_star_score` (0-100)
- `impact_density_score` (0-100)
- `contradictions_detected` (count, penalized)
- `company_mode_difficulty_multiplier` (e.g., FAANG > general)
- `longitudinal_consistency` (stability over last N sessions)

## Normalization
- Convert all metrics to 0-1 scale.
- Invert negative factors (risk, contradictions) into positive contribution terms.

## Baseline Weighted Score (v1)
- Suggested weights:
  - Credibility: 0.26
  - Structure (STAR): 0.18
  - Pressure stability: 0.16
  - Impact density: 0.16
  - Longitudinal consistency: 0.12
  - Risk drift (inverse): 0.12

## Calculation
1. `raw_score = Σ(weight_i * feature_i)`
2. Apply penalties:
   - contradiction penalty
   - severe drift burst penalty
3. Apply company mode calibration multiplier
4. Map to probability curve (logistic preferred for realistic saturation):
   - `offer_probability = sigmoid(a * raw_score + b) * 100`

## Confidence Band Logic
- High: >= 8 recent sessions + stable variance + complete metrics
- Medium: 4-7 sessions or moderate variance
- Low: <= 3 sessions or sparse/unstable signals

## Guardrails
- No ±15 point jumps unless major risk event.
- Cap per-session movement (e.g., ±8 points) for trust.
- Always surface driver explanations to avoid black-box perception.

## API Sketch
- `GET /api/user/offer-probability`
- `POST /api/user/offer-probability/recompute`
- Include session-level breakdown for dashboard graphing.

---

## 3) Real-Time Perception UI (Design Spec)

## UX Goal
- Make intelligence feel alive, immediate, and consequential.
- User should feel: "The system is judging how I am being perceived right now."

## Core Live Panel
- **Title:** Interviewer Perception — Live
- **Primary Meter:** Offer Probability (live trend spark)
- **Signal Meters (reactive):**
  - Credibility
  - Structure (STAR)
  - Confidence Stability
  - Impact Strength
  - Risk Drift

## Live Feedback Events (micro-interactions)
- STAR missing -> amber pulse + "Missing Result/Impact"
- Over-explaining detected -> red hint chip + "Compress to one core point"
- No measurable impact -> warning chip + "Add one metric"
- Stability drop -> subtle screen-edge tint + "Pace reset suggested"
- Credibility gain -> blue glow pulse + "+Signal Strengthened"

## Real-Time Transcript Layer
- Inline tags per sentence:
  - `Context`, `Action`, `Result`, `Reflection`
- Highlight weak spans:
  - vague claims
  - unsupported assertions
  - filler-heavy sections
- One-click suggestion card:
  - "Rewrite this line with impact evidence"

## Session-End Moment (must feel cinematic)
- Animated delta card:
  - `Offer Probability: +4.8 pts`
  - "What changed"
  - "What to fix next"
- CTA: "Run next pressure round now"

## UX Constraints
- Keep same architecture; add behavior and copy layers.
- No clutter: max 5 live signal bars + 3 actionable hints at once.
- Every visual event must map to a measurable backend signal.

---

## 4) Distribution Attack Strategy (0 -> Category Awareness)

## Objective
Build authority + conversion loops while preserving ethical coaching positioning.

## Distribution Thesis
- Win trust through proof of improvement, not hype.
- Publish outcomes and signal deltas repeatedly in public.

## 4-Channel Attack Stack
1. **LinkedIn Founder Authority**
   - 4 posts/week:
     - candidate failure patterns
     - before/after perception examples
     - offer probability improvement stories
     - product teardown clips
2. **Short-Form Video Loop (YouTube Shorts + Reels + TikTok)**
   - 3-5 clips/week (20-45s):
     - "Why candidates fail in first 90 sec"
     - live UI perception reaction
     - one tactical interview correction
3. **Community Insertion**
   - Weekly value posts in relevant career/tech communities
   - Focus on diagnostic frameworks and anonymized transformations
4. **Referral + Social Proof Flywheel**
   - Shareable session report links
   - "Improvement badges" (credibility + structure gains)
   - Lightweight testimonial capture after strong deltas

## 30-Day Execution Sprint
### Week 1
- Finalize dominant landing copy + 2-min demo video
- Publish first authority thread + 3 clips
- Start closed beta invite list

### Week 2
- Launch offer probability as primary KPI in UI
- Publish 2 case snapshots (before/after)
- Add onboarding path to first wow in <= 60 sec

### Week 3
- Push social proof layer (testimonials + outcome cards)
- Run structured outreach to campus clubs + interview communities
- Start referral prompt after session improvement events

### Week 4
- Analyze acquisition-to-activation funnel
- Double down on highest-converting message angle
- Publish monthly "Interview Signal Report" for authority

## KPI Stack (what to track weekly)
- Landing conversion rate
- Time-to-first-wow (seconds)
- Session 1 -> Session 3 retention
- Avg offer probability delta after 3 sessions
- Share/report conversion rate
- Organic content -> signup attribution

---

## 5) Strategic Rule of Thumb
- **Do not add more backend architecture right now unless reliability breaks.**
- Prioritize perception, proof, and distribution cadence.
- Build the category around a single clear promise:
  - **Increase offer probability through live interviewer-perception intelligence.**
