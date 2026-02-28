# Soft Beta Test Plan (Retention Loop)

Goal: validate whether the loop `Insight -> Goal -> Practice -> Delta -> Repeat` feels believable, actionable, and motivating.

## Scope
- No new features during this phase.
- Test current flow only: Live Interview -> Session Report -> Next Round Goal.
- Sample size: 5-10 real users (plus 3 founder self-sessions).

## Success Criteria
A session is a **pass** if user can do all 3:
1. State their next focus in one sentence.
2. Explain what changed from previous session using delta language.
3. Start another round voluntarily (or explicitly say they want to).

## Failure Signals
- User cannot explain what delta means.
- User says feedback feels generic, robotic, or judgmental.
- User cannot connect “focus next session” to in-session behavior.
- No observable behavior change between rounds.

## Founder 3-Session Check (Do First)
Run these personally before external users:

### Session 1 (Baseline)
- Run normally.
- At end, note:
  - Did delta feel believable?
  - Did feedback feel specific?

### Session 2 (Goal-Following)
- Follow the shown goal exactly.
- At end, note:
  - Did behavior change because of goal?
  - Did report delta reflect that change?

### Session 3 (Pressure)
- Simulate difficult conditions (faster answers, harder questions, interruptions).
- At end, note:
  - Did guidance still feel supportive?
  - Did system feel coaching-oriented vs punitive?

## Moderator Script (5-10 Users)
Use the same script for all users to keep data comparable.

### Pre-brief (1 minute)
- "This is a practice interview coach. We are testing usefulness, not your performance."
- "Think aloud while using it."

### Round 1 (8-12 minutes)
- User runs one interview round.
- Ask immediately after:
  1. "What was your biggest improvement opportunity?"
  2. "What does the delta tell you?"

### Round 2 (8-12 minutes)
- User runs second round using the shown focus goal.
- Ask immediately after:
  1. "Did your approach change because of the goal?"
  2. "Did the system recognize that change?"

### Debrief (3 minutes)
- "Where did you feel helped?"
- "Where did you feel judged?"
- "What was confusing?"
- "Would you use this again this week? Why?"

## Quant + Qual Rubric (per user)
Score each from 1 (poor) to 5 (excellent):
- Delta believability
- Goal actionability
- Motivation to continue
- Clarity of next step
- Emotional tone (supportive vs judgmental)

Collect short evidence notes for each score.

## Decision Rule After 5 Users
- Proceed to wider beta if:
  - Average >= 4.0 for Goal actionability and Clarity
  - Average >= 3.8 for Delta believability and Motivation
  - <= 1 user reports strong judgment/punitive feeling
- Otherwise: pause rollout and refine copy/feedback tone only.

## Evidence Logging
Use: `frontend/qa/soft_beta_scorecard_template.csv`
- One row per user per round where applicable.
- Keep raw user quotes (verbatim) in `evidence_quote` column.
