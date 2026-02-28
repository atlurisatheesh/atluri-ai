# Closed Beta Runbook (20–50 Candidates)

## Goal
Validate that Offer Probability feels believable, reactive, and motivating under real interview pressure.

## Beta Cohort
- Target size: 20–50 serious candidates
- Mix: behavioral-heavy + systems-heavy + FAANG-mode candidates
- Minimum engagement requirement: 3 sessions per user in 10 days

## Success Criteria
- >=70% of users complete first round in <45 seconds from app entry
- >=60% complete at least 3 rounds
- >=50% report that Offer Probability feels credible and actionable
- >=30% share an improvement snapshot or testimonial statement

## Daily Ops Cadence
- Day 1–2: onboarding + first-round completion tracking
- Day 3–7: monitor session completion and friction points
- Day 8–10: gather outcome stories and testimonial-ready evidence
- Day 11–14: publish first case-study set

## Instrumentation Checks
- Verify `GET /api/user/offer-probability` call success rate and latency
- Verify session-end delta card render rate after round completion
- Verify share snapshot CTA click-through and copy success
- Verify testimonial prompt trigger gating (delta, confidence band, session count)

## Interview Script for User Debrief (10 minutes)
1. Did the Offer Probability score feel believable?
2. What exact moment made you trust or distrust the score?
3. What did you change after seeing drivers and fix-next actions?
4. Did the live panel feel immediate or delayed?
5. Would you share your improvement snapshot publicly?

## Data Capture Template
- User ID
- Session count
- First-wow time (seconds)
- Initial Offer Probability
- Latest Offer Probability
- Delta after 3 sessions
- Confidence band trend
- Top negative driver pattern
- Outcome note (callback / final round / offer)

## Exit Criteria (Beta -> Public Growth)
- 10+ strong qualitative proof quotes
- 5+ quantified transformation examples
- clear top-3 onboarding friction list with fixes
- publish-ready 90-second dominance demo finalized
