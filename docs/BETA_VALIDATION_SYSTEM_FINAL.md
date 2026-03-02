# 14-DAY CLOSED BETA VALIDATION SYSTEM
## Real-Time AI Interview Copilot — Execution Blueprint

**Author:** YC Partner + Head of Product Perspective  
**Version:** Production-Ready  
**Target:** 10-20 Beta Users → Go/No-Go Decision

---

# PART 1 — BETA RECRUITMENT STRATEGY

## 1.1 Ideal Tester Profile

| Attribute | Must Have | Nice to Have |
|-----------|-----------|--------------|
| Job search status | Actively interviewing OR preparing | Has interview scheduled |
| Technical comfort | Can use Chrome, allow mic | Tech-savvy |
| Feedback quality | Will give honest criticism | Articulate |
| Time availability | 3 sessions over 14 days | Available for 1:1 call |
| Network quality | Stable internet | Wired connection |

**Reject immediately:**
- "Just curious" users (no skin in game)
- Users who can't commit to 3 sessions
- Known flaky participants from past projects
- Anyone without working microphone

## 1.2 Where to Find 10-20 Testers

### Tier 1: Warm Network (Days 1-2) — Target: 8 users
```
✓ LinkedIn connections who posted about job hunting
✓ University career services (ask for 5 referrals)
✓ Former colleagues who are interviewing
✓ Friends of friends preparing for FAANG
```

### Tier 2: Communities (Days 2-4) — Target: 8 users
```
✓ Reddit: r/cscareerquestions, r/jobs, r/interviews
✓ Discord: Blind, Levels.fyi, Tech Interview Prep servers
✓ Slack: YC founders channel, indie hackers
✓ WhatsApp groups: Alumni networks, bootcamp cohorts
```

### Tier 3: Cold LinkedIn (Days 3-5) — Target: 4 users
```
✓ Search "interviewing" or "job search" in posts
✓ Find people who commented on interview tips
✓ Reach out to bootcamp recent graduates
```

## 1.3 Exact Outreach Templates

### LinkedIn DM (Cold)
```
Hey [Name],

Saw you're prepping for interviews. I'm building an AI that gives 
you real-time coaching during live interviews — like having a 
senior engineer whispering answers in your ear.

Looking for 10 people to test it before launch. Takes 15 min/session.

In return:
• Free access forever
• Direct input on features
• Reference for your job search if you want

Interested? I'll send setup instructions.

[Your name]
```

### WhatsApp/Text (Warm)
```
Hey! Quick favor — I'm launching an AI interview coach and need 
10 beta testers. It gives you real-time suggestions during mock 
interviews.

Would you try it 3x over the next 2 weeks? 15 min each.

You get free lifetime access + I owe you one.

Yes/No?
```

### Email (Formal)
```
Subject: Free AI Interview Coach — Need Your Feedback

Hi [Name],

I'm [Your name], building an AI tool that provides real-time 
coaching during job interviews.

I'm looking for 10 beta testers to validate it before launch.

What it does:
- Listens to interview questions via your mic
- Suggests talking points in <1 second
- Works during live interviews (discreetly)

Commitment:
- 3 sessions over 14 days
- 15 minutes per session
- Honest feedback after each

What you get:
- Free lifetime access
- Direct influence on the product
- Priority support

Interested? Reply "Yes" and I'll send setup instructions.

Best,
[Your name]
```

## 1.4 Psychological Framing

**Why people say yes:**
1. **Exclusivity** — "Only 10 spots"
2. **Reciprocity** — "Free lifetime access"
3. **Status** — "Help shape a new product"
4. **Self-interest** — "Get better at interviews"

**Why people ghost:**
1. **Vague ask** — Be specific: "3 sessions, 15 min each"
2. **No urgency** — Add: "Starting Monday"
3. **No social proof** — Add: "5 others already signed up"

## 1.5 Screening Questions

Before confirming:
```
1. Are you actively interviewing or preparing? (Must = Yes)
2. What device will you use? (Must = Laptop/Desktop)
3. Do you have a working microphone? (Must = Yes)
4. Can you commit to 3 sessions over 14 days? (Must = Yes)
5. When is your next real interview? (Ideal = <30 days)
```

---

# PART 2 — ONBOARDING FLOW

## 2.1 Pre-Session Setup (24h Before)

**Email: "Your Beta Session Tomorrow"**
```
Hi [Name],

Tomorrow's your first session. Here's how to prepare:

BEFORE (5 min):
□ Use Chrome (latest version)
□ Test your mic: [mic test link]
□ Find a quiet room
□ Have headphones ready

DURING (15 min):
□ Go to [app URL]
□ Click "Start Practice Interview"
□ Allow microphone when prompted
□ Practice answering 5-7 questions

AFTER (2 min):
□ Fill out feedback survey: [link]
□ Note anything that felt off

See you tomorrow!

P.S. If anything breaks, text me: [your number]
```

## 2.2 First 3 Minutes — Building Trust

**Critical window:** User decides within 180 seconds if they trust your tool.

### Onboarding Flow (In-App)

```
[Screen 1: Welcome]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Welcome to Interview Copilot

You're about to practice with an AI coach that:
• Listens to interview questions
• Suggests answers in under 1 second
• Helps you sound confident

This is practice mode. Experiment freely.

[Let's Start →]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Screen 2: Mic Access]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Allow Microphone Access

We need your mic to hear interview questions.
Your audio is processed in real-time and never stored.

[Allow Microphone]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Screen 3: Audio Check]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Let's test your mic

Say: "Tell me about yourself"

[||||||||░░░░░░░░] Audio Level

[✓ Sounds good]  [Try Again]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Screen 4: Quick Demo]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Here's what to expect

When you speak, I'll show suggestions like this:

┌─────────────────────────────────┐
│ 💡 Suggestion                   │
│                                 │
│ "Start with your most recent   │
│  role and work backwards..."   │
│                                 │
│ [Expand] [Dismiss]             │
└─────────────────────────────────┘

Click to expand. Or ignore and keep talking.

[Got it, Start Practice →]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 2.3 Reducing User Anxiety

| Anxiety Source | Solution |
|----------------|----------|
| "Will it work?" | Show audio level meter immediately |
| "Is it listening?" | Visual indicator when processing |
| "Did it understand?" | Echo back detected question |
| "What if it's wrong?" | Frame as "suggestions, not scripts" |
| "Am I being recorded?" | Explicit "Not recording" badge |

---

# PART 3 — LIVE SESSION STRUCTURE

## 3.1 Session Script (15 min)

```
WARMUP (2 min)
━━━━━━━━━━━━━━
"Let's start easy. Tell me about yourself."
[Observe: Does suggestion appear? Does user look at it?]

BEHAVIORAL (5 min)
━━━━━━━━━━━━━━━━━
"Tell me about a time you failed."
"Describe a conflict with a coworker."
"How do you handle pressure?"
[Observe: Does user trust suggestions? Follow them?]

TECHNICAL (3 min)
━━━━━━━━━━━━━━━━
"Explain [topic relevant to their role]."
"How would you design [simple system]?"
[Observe: Are technical suggestions accurate?]

STRESS TEST (3 min)
━━━━━━━━━━━━━━━━━━
Rapid-fire questions:
- "What's your biggest weakness?"
- "Why should we hire you?"
- "Where do you see yourself in 5 years?"
[Observe: Does system keep up? Any freezes?]

COOLDOWN (2 min)
━━━━━━━━━━━━━━━━
"Any questions for me?"
[Observe: Does user engage naturally?]
```

## 3.2 Question Types to Test

| Type | Example | What It Tests |
|------|---------|---------------|
| Open-ended | "Tell me about yourself" | Suggestion relevance |
| Behavioral | "Time you showed leadership" | STAR format suggestions |
| Technical | "Explain REST vs GraphQL" | Accuracy under complexity |
| Stress | "Why are you leaving?" | Speed under pressure |
| Curveball | "Sell me this pen" | Creativity handling |

## 3.3 Simulating Real Pressure

**Add these stressors:**
```
1. Time pressure: "You have 2 minutes for this answer"
2. Interruption: Cut them off mid-sentence
3. Follow-up: "Can you go deeper on that?"
4. Silence: Pause 5 seconds after they finish
5. Challenge: "I'm not sure I agree..."
```

## 3.4 Observer Checklist

During each session, note:
```
□ Did user look at suggestions? (eyes tracking)
□ Did user follow suggestion? (verbal match)
□ Did user express frustration? (sighing, clicking)
□ Did user pause waiting for suggestion?
□ Did user speak over the suggestion?
□ Did system freeze? How long?
□ Did suggestion appear too late?
□ Did user give up on a question?
```

---

# PART 4 — INSTRUMENTATION PLAN

## 4.1 Browser-Side Telemetry

```javascript
// MUST TRACK
{
  // Session identity
  session_id: string,
  user_id: string,
  
  // Core performance
  suggestion_latency_ms: number[],      // Time from speech → suggestion
  freeze_events: {timestamp, duration}[], // UI unresponsive
  
  // Trust signals
  suggestions_shown: number,
  suggestions_clicked: number,
  suggestions_ignored: number,
  user_paused_for_suggestion: number,   // KEY TRUST METRIC
  
  // Failure signals
  rage_clicks: number,                  // 3+ clicks in 1 sec
  audio_gaps: number,                   // Silence > 3 sec
  session_abandonment: boolean,         // Closed before 5 min
  
  // Environment
  connection_type: string,
  browser: string,
  
  // Raw events for debugging
  events: {type, timestamp, data}[]
}
```

## 4.2 Backend Metrics

```python
# MUST TRACK
{
  # STT Performance
  "stt_provider": "deepgram|openai",
  "stt_failover_count": int,
  "stt_latency_p50_ms": float,
  "stt_latency_p95_ms": float,
  
  # LLM Performance  
  "suggestion_latency_p50_ms": float,
  "suggestion_latency_p95_ms": float,
  "suggestion_count": int,
  
  # Reliability
  "ws_reconnects": int,
  "errors": list,
  
  # Quality
  "transcript_confidence_avg": float,
}
```

## 4.3 Key Behavioral Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| Follow Rate | suggestions_clicked / suggestions_shown | >40% |
| Trust Pause | Times user waited for suggestion before speaking | >30% |
| Completion Rate | Sessions finished / sessions started | >80% |
| Return Rate | Users with 2+ sessions | >60% |
| Rage Index | rage_clicks + abandonment | <5% |

## 4.4 Detecting Problems

| Problem | Detection Signal |
|---------|------------------|
| Freeze | No UI update for >2 sec |
| Misfire | Suggestion appears after user finished answering |
| Confusion | User clicks suggestion then immediately dismisses |
| Distrust | User never looks at suggestions |
| Frustration | rage_clicks > 0 OR early abandonment |

---

# PART 5 — FEEDBACK COLLECTION FRAMEWORK

## 5.1 Post-Session Survey (2 min)

```
Q1. RELIABILITY
Did the app freeze or lag during your session?
○ No issues
○ Minor lag (barely noticed)
○ Noticeable delay (1-3 sec)
○ Major issues (unusable)

Q2. ACCURACY
Were the suggestions helpful?
○ Very helpful (used most of them)
○ Somewhat helpful (used some)
○ Mixed (hit or miss)
○ Not helpful (ignored most)

Q3. CONFIDENCE
Did using this make you feel MORE or LESS confident?
○ Much more confident
○ Slightly more confident
○ No change
○ Less confident
○ Much less confident

Q4. TRUST [CORE METRIC]
Would you use this in a REAL interview tomorrow?
○ Definitely yes
○ Probably yes
○ Unsure
○ Probably not
○ Definitely not

Q5. OPEN
What's the ONE thing that would make you trust it more?
[Free text]

Q6. NPS
How likely are you to recommend this to a friend? (0-10)
[Scale]
```

## 5.2 Trust Score Formula

```
Trust Score = (
    0.35 × Would_Use_Real_Interview +
    0.25 × Suggestion_Follow_Rate +
    0.20 × Confidence_Impact +
    0.15 × Session_Completion +
    0.05 × NPS_Normalized
)

Scoring:
- Would_Use_Real_Interview: definitely_yes=100, probably_yes=75, unsure=50, probably_not=25, definitely_not=0
- Suggestion_Follow_Rate: (clicked/shown) × 100
- Confidence_Impact: much_more=100, slightly_more=75, no_change=50, less=25, much_less=0
- Session_Completion: (completed/started) × 100
- NPS_Normalized: (NPS_score/10) × 100
```

## 5.3 Reliability Score Formula

```
Reliability Score = (
    0.40 × (100 - Freeze_Rate) +
    0.30 × (100 - Latency_Penalty) +
    0.20 × (100 - Error_Rate) +
    0.10 × Failover_Invisibility
)

Where:
- Freeze_Rate: (freeze_events / total_sessions) × 100
- Latency_Penalty: max(0, (avg_latency_ms - 1000) / 20)
- Error_Rate: (sessions_with_errors / total_sessions) × 100
- Failover_Invisibility: 100 if user didn't notice failover, else 0
```

## 5.4 Launch Readiness Thresholds

| Score | Interpretation | Action |
|-------|----------------|--------|
| 85+ | Ready to launch | Expand beta |
| 70-84 | Almost ready | Fix top issues, retest |
| 50-69 | Needs work | Major iteration needed |
| <50 | Not viable | Rethink approach |

---

# PART 6 — 14-DAY TIMELINE

## Day-by-Day Execution

```
DAY 1-2: RECRUITMENT
━━━━━━━━━━━━━━━━━━━
□ Send 30 outreach messages
□ Confirm 10 users minimum
□ Set up tracking spreadsheet
□ Test app end-to-end yourself

DAY 3-4: FIRST SESSIONS
━━━━━━━━━━━━━━━━━━━━━━
□ Onboard first 5 users
□ Join sessions live (screen share)
□ Take detailed notes
□ Fix any blocking bugs SAME DAY

DAY 5-6: EXPAND + FIX
━━━━━━━━━━━━━━━━━━━━
□ Onboard remaining users
□ Fix bugs from Day 3-4
□ Review all survey responses
□ Identify top 3 pain points

DAY 7: CHECKPOINT
━━━━━━━━━━━━━━━━
□ Calculate Trust Score
□ Calculate Reliability Score
□ Decide: continue / pivot / fix

DAY 8-10: SECOND SESSIONS
━━━━━━━━━━━━━━━━━━━━━━━━
□ All users complete session 2
□ Test under higher stress
□ Track improvement from fixes

DAY 11-12: DEEP FEEDBACK
━━━━━━━━━━━━━━━━━━━━━━━━
□ 1:1 calls with 3 most engaged users
□ Ask: "What almost made you quit?"
□ Get verbatim quotes for marketing

DAY 13: FINAL SESSIONS
━━━━━━━━━━━━━━━━━━━━━━
□ All users complete session 3
□ Send end-of-beta survey
□ Offer lifetime discount

DAY 14: DECISION
━━━━━━━━━━━━━━━━
□ Calculate final scores
□ Review all qualitative feedback
□ Make GO / NO-GO call
□ Send thank you + next steps
```

## Daily Metrics Check (5 min)

```
Morning:
□ Sessions completed yesterday: ___
□ Critical bugs reported: ___
□ Survey responses received: ___

Evening:
□ Review session logs
□ Respond to user messages
□ Update tracking sheet
```

## What to Fix Immediately

| Issue | Priority | Action |
|-------|----------|--------|
| App crashes | P0 | Fix same day |
| No audio capture | P0 | Fix same hour |
| Latency >3 sec | P1 | Fix within 24h |
| Suggestion wrong | P2 | Log, batch fix |
| UI confusion | P3 | Note for later |

## Go / No-Go Criteria

### Must Pass (All 6):
```
□ Session completion rate ≥70%
□ Return user rate ≥50%
□ Trust Score ≥60
□ Reliability Score ≥70
□ Critical bugs reported <3
□ "Would use in real interview" (Yes) ≥50%
```

### Decision Matrix:
```
6/6 passed → GO (expand to 50 users)
4-5/6 passed → CONDITIONAL (fix and retest)
<4/6 passed → NO-GO (major changes needed)
```

---

# PART 7 — TRUST & RELIABILITY MEASUREMENT FRAMEWORK

## 7.1 Trust Dimensions

### Cognitive Trust (Does it work?)
- Suggestion accuracy
- Response relevance
- Technical correctness

### Emotional Trust (Does it feel safe?)
- Consistency (no surprises)
- Calmness (doesn't add stress)
- Control (user feels in charge)

### Behavioral Trust (Would they rely on it?)
- Do they look at suggestions?
- Do they wait for suggestions?
- Do they follow suggestions?
- Would they use it when stakes are real?

## 7.2 Quantitative Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Freeze Rate | freeze_events / total_minutes × 100 | <1% |
| Misfire Rate | late_suggestions / total_suggestions × 100 | <5% |
| Usefulness Score | suggestions_clicked / suggestions_shown × 100 | >40% |
| Speed Satisfaction | users_rating_speed_good / total_users × 100 | >80% |
| Recovery Speed | avg time from error to normal (sec) | <3s |
| Failover Invisibility | users_who_noticed_failover / total_users × 100 | <5% |

## 7.3 Qualitative Signals

### Distrust Indicators (Verbatim)
```
"It froze right when I needed it"
"The suggestion was way off"
"I don't trust it enough to use live"
"It made me more nervous"
"I kept waiting but nothing showed up"
```

### Stress Amplification Behaviors
```
- Speaking faster when suggestion appears late
- Sighing or groaning audibly
- Clicking repeatedly on UI
- Stopping mid-sentence to look at suggestion
- Abandoning session early
```

## 7.4 Composite Trust Score

```
TRUST SCORE (0-100) = 
    35% × Real_Interview_Willingness
  + 25% × Behavioral_Follow_Rate
  + 20% × Confidence_Impact
  + 15% × Session_Completion
  + 05% × NPS_Score

LAUNCH THRESHOLD: ≥70
```

## 7.5 Red Flag Thresholds

### Instant Kill (Stop Everything)
```
- Freeze during user's answer: >2 per session
- Total app crash: >1 per 10 sessions
- User says "It made interview worse"
- Suggestion factually wrong in technical answer
```

### Silent Churn Risk
```
- Latency >2 sec consistently
- Suggestions ignored >70% of time
- User doesn't return for session 2
- Survey skipped entirely
```

### Hotfix Required
```
- Any freeze >5 sec
- Audio not capturing
- WebSocket disconnect >3 per session
- Suggestion appears >3 sec after speech
```

---

# PART 8 — 10 PERSONA STRESS TESTS (BRUTAL MODE)

## Persona 1: EXTREMELY NERVOUS FRESHER

**Who:** 22-year-old CS grad, first real interview ever

### A) Behavior During Session
- Voice trembles every sentence
- Says "um", "like", "you know" constantly
- Speaks in bursts: fast → stops → fast → stops
- Forgets mid-sentence what they were saying
- Looks at screen desperately hoping for help

### B) System Stress Points
| Issue | Likelihood | Impact |
|-------|------------|--------|
| VAD over-triggers on "um" | HIGH | Sends partial phrases to STT |
| Suggestion arrives but user too panicked to read | HIGH | Suggestion useless |
| User speaks before suggestion loads | MEDIUM | Trust destroyed |
| Fast-slow-fast speech confuses processing | HIGH | Transcript garbled |

### C) Real Quotes They Would Say
```
"I saw something flash but I was too stressed to read it"
"Why isn't it helping me?!"
"I panicked and forgot the app was even there"
"It showed me something AFTER I already said the wrong thing"
"Can it just tell me the answer?"
```

### D) Fix Priority
**LAUNCH BLOCKING**
- This is 40% of your users
- If you can't help nervous people, product is useless
- Need: 500ms suggestion, large font, persistent display

---

## Persona 2: STRONG ACCENT SPEAKER (Indian/Chinese/Spanish)

**Who:** 28-year-old from Bangalore, fluent but accented English

### A) Behavior During Session
- Clear pronunciation, different cadence
- Some words sound different: "development" → "daevelupment"
- May use slightly different sentence structure
- Speaks confidently but STT may struggle

### B) System Stress Points
| Issue | Likelihood | Impact |
|-------|------------|--------|
| Deepgram confidence drops <70% | HIGH | Failover triggers constantly |
| Words misheard → wrong suggestion | HIGH | User loses trust |
| Unusual sentence structure confuses LLM | MEDIUM | Generic suggestions |
| User notices suggestions don't match | HIGH | Abandons tool |

### C) Real Quotes They Would Say
```
"It doesn't understand what I'm saying"
"The suggestion was for a completely different question"
"Do I need to speak with an American accent?"
"I said 'manager' but it heard 'maneuver'"
"This only works for native speakers"
```

### D) Fix Priority
**LAUNCH BLOCKING**
- 60%+ of software engineers are non-native speakers
- If Deepgram fails, Whisper must catch it
- Need: Accent-robust STT, multiple transcription attempts

---

## Persona 3: SLOW SPEAKER WITH PAUSES

**Who:** 45-year-old senior manager, thinks before speaking

### A) Behavior During Session
- 3-5 second pauses between sentences
- Deliberate, measured speech
- May pause 8 seconds to formulate thought
- Never says "um", just silence

### B) System Stress Points
| Issue | Likelihood | Impact |
|-------|------------|--------|
| VAD thinks they're done, fires early | VERY HIGH | Suggestion interrupts |
| Multiple partial suggestions appear | HIGH | Confusing |
| System detects "new question" incorrectly | MEDIUM | Wrong context |
| User feels rushed by eager suggestions | HIGH | Emotional trust lost |

### C) Real Quotes They Would Say
```
"It kept jumping in before I was ready"
"I wasn't finished thinking, it thought I was done"
"The suggestions felt impatient"
"I had to rush because it kept showing new things"
"Can I tell it to wait for me?"
```

### D) Fix Priority
**HIGH (not blocking but damages trust)**
- Senior candidates = higher-paying customers
- Need: Configurable VAD sensitivity, "thinking" mode

---

## Persona 4: FAST OVER-TALKER

**Who:** 26-year-old ex-salesperson, talks at 200 WPM

### A) Behavior During Session
- No pauses, ever
- Run-on sentences for 60+ seconds
- Changes topics mid-sentence
- Barely breathes

### B) System Stress Points
| Issue | Likelihood | Impact |
|-------|------------|--------|
| VAD never finds speech_final | HIGH | Suggestion never fires |
| STT buffer overflows | MEDIUM | Lost audio |
| By time suggestion arrives, topic changed | VERY HIGH | Irrelevant suggestion |
| User never sees any suggestion | HIGH | Thinks tool is broken |

### C) Real Quotes They Would Say
```
"Where's the suggestion? I never saw anything"
"It couldn't keep up with me"
"By the time it showed up I had already moved on"
"Maybe it doesn't work?"
"I talked for 2 minutes and got nothing"
```

### D) Fix Priority
**MEDIUM (edge case but loud complainers)**
- These users will vocally criticize
- Need: Progressive suggestions, show even if not done

---

## Persona 5: DISTRACTED MULTITASKER

**Who:** 34-year-old parent, doing interview prep while kids in room

### A) Behavior During Session
- Switches tabs frequently
- Checks phone mid-session
- Background noise: TV, kids, dogs
- Looks away when suggestion appears

### B) System Stress Points
| Issue | Likelihood | Impact |
|-------|------------|--------|
| Background noise confuses VAD | MEDIUM | False triggers |
| User misses suggestion entirely | HIGH | Wasted computation |
| Session metrics polluted | HIGH | Can't trust data |
| App in background = no audio | MEDIUM | Silent failure |

### C) Real Quotes They Would Say
```
"Wait, did it say something?"
"I was looking at something else"
"Can it make a sound when suggestion appears?"
"Sorry, my kid was yelling"
"Can you repeat that?"
```

### D) Fix Priority
**LOW — not target user**
- Filter out in recruitment screening
- But... add audio notification option anyway

---

## Persona 6: LOW-BANDWIDTH USER

**Who:** 24-year-old in rural India, 2G mobile connection

### A) Behavior During Session
- Audio cuts in and out
- Page loads slowly
- WebSocket disconnects frequently
- High latency spikes (500ms → 5000ms)

### B) System Stress Points
| Issue | Likelihood | Impact |
|-------|------------|--------|
| Audio packets dropped | VERY HIGH | Incomplete transcript |
| WebSocket disconnect mid-speech | HIGH | Suggestion lost |
| Reconnection takes 5+ seconds | HIGH | User thinks crashed |
| UI shows stale data | MEDIUM | Confusing state |

### C) Real Quotes They Would Say
```
"It keeps disconnecting"
"The audio was all choppy"
"I couldn't tell if it was working or not"
"It just said 'connecting...' the whole time"
"I gave up after the third disconnect"
```

### D) Fix Priority
**HIGH — many international users**
- India/SE Asia = huge market
- Need: Aggressive reconnection, local audio buffering, offline indicator

---

## Persona 7: TECHNICAL L5 CANDIDATE

**Who:** 35-year-old Staff Engineer, 12 years experience

### A) Behavior During Session
- Gives deep, nuanced technical answers
- Uses precise jargon
- Will notice if suggestion is technically wrong
- Expects accuracy over speed

### B) System Stress Points
| Issue | Likelihood | Impact |
|-------|------------|--------|
| Generic suggestion for complex question | HIGH | Insulting |
| Technically incorrect suggestion | MEDIUM | Trust destroyed instantly |
| Suggestion too basic for level | HIGH | "This is for juniors" |
| LLM doesn't know edge cases | MEDIUM | Wrong advice |

### C) Real Quotes They Would Say
```
"This suggestion is technically incorrect"
"That's not how distributed systems actually work"
"I'm better off without this"
"Did a junior write these suggestions?"
"This is wrong about CAP theorem"
```

### D) Fix Priority
**LAUNCH BLOCKING**
- One viral tweet about technical incorrectness = dead
- Need: Confidence thresholds, "I don't know" mode

---

## Persona 8: OVERCONFIDENT USER

**Who:** 29-year-old who doesn't think they need help

### A) Behavior During Session
- Ignores all suggestions
- Glances briefly, dismisses
- "I already know this"
- May be testing to criticize

### B) System Stress Points
| Issue | Likelihood | Impact |
|-------|------------|--------|
| Low engagement skews metrics | HIGH | False negatives |
| User doesn't give honest feedback | HIGH | Can't learn from them |
| Waste of beta slot | HIGH | Limited impact |
| Will tell friends "it's useless" | MEDIUM | Negative word of mouth |

### C) Real Quotes They Would Say
```
"I didn't really need it"
"I already knew what to say"
"It's fine but I can do this myself"
"Maybe for less experienced people"
"Nothing it showed me was new"
```

### D) Fix Priority
**LOW — filter out in screening**
- Ask: "How confident are you in interviews? (1-10)"
- Reject anyone who says 9-10

---

## Persona 9: EMOTIONALLY STRESSED CANDIDATE

**Who:** 38-year-old recently laid off, family depends on them

### A) Behavior During Session
- Voice cracks with emotion
- May have long silences
- Might overshare personal details
- Desperation in voice

### B) System Stress Points
| Issue | Likelihood | Impact |
|-------|------------|--------|
| Emotional content in speech | HIGH | STT struggles |
| VAD triggers on sniffling/crying | MEDIUM | Confusing |
| Suggestions feel tone-deaf | HIGH | Emotional damage |
| User needs empathy, not answers | HIGH | Missing the point |

### C) Real Quotes They Would Say
```
"I just needed it to tell me it'll be okay"
"The suggestion felt cold"
"It doesn't understand what I'm going through"
"I'm fighting for my family and it just shows bullet points"
"Can it at least say 'good job'?"
```

### D) Fix Priority
**MEDIUM — important for trust**
- These users will be loyal forever if you help them
- Need: Emotional tone detection, encouragement mode

---

## Persona 10: SILENT / HESITANT USER

**Who:** 23-year-old introvert, anxiety around speaking

### A) Behavior During Session
- Waits 10+ seconds before speaking
- Single-word responses
- Needs prompting to continue
- May never actually speak

### B) System Stress Points
| Issue | Likelihood | Impact |
|-------|------------|--------|
| VAD never activates | HIGH | Nothing happens |
| User thinks app is broken | HIGH | Abandons |
| Long silence = "is it my turn?" | HIGH | Confusion |
| Empty session = no data | HIGH | Wasted beta slot |

### C) Real Quotes They Would Say
```
"I didn't know when to start"
"Was it waiting for me or was I waiting for it?"
"Nothing happened"
"I think it's broken"
"How do I know when to talk?"
```

### D) Fix Priority
**MEDIUM — UX clarity issue**
- Need: Clear "your turn" indicator, example prompt

---

# SUMMARY: TOP 10 FIXES BEFORE LAUNCH

| # | Issue | Affected Personas | Priority |
|---|-------|-------------------|----------|
| 1 | Accent handling in STT | 2 | P0 |
| 2 | Suggestion timing (too early/late) | 1, 3, 4 | P0 |
| 3 | Technical accuracy of suggestions | 7 | P0 |
| 4 | Reconnection handling | 6 | P1 |
| 5 | Visual feedback when processing | 1, 10 | P1 |
| 6 | VAD sensitivity tuning | 3, 4, 5 | P1 |
| 7 | Offline/degraded mode indicator | 6 | P2 |
| 8 | Audio notification for suggestions | 5 | P2 |
| 9 | Encouragement/tone detection | 9 | P3 |
| 10 | "Your turn" indicator | 10 | P3 |

---

# FINAL VERDICT CRITERIA

```
IF:
  - Trust Score ≥ 70
  - Reliability Score ≥ 70  
  - 0 P0 bugs unresolved
  - ≥50% would use in real interview
  - ≥60% return for session 2

THEN: GO → Expand to 50 users

ELSE: NO-GO → Fix and rerun 7-day sprint
```

---

**Document Complete**  
**Next Action: Start Day 1 — Send 30 outreach messages TODAY**
