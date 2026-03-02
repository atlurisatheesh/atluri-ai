# 14-Day Closed Beta Launch Playbook

**Product:** Real-Time AI Interview Copilot  
**Goal:** Validate trust and reliability with 10-20 real users  
**Timeline:** 14 days  
**Success Metric:** Would users trust this in a real interview?

---

## 1. Beta Recruitment Strategy

### Target Profile
| Attribute | Ideal | Acceptable |
|-----------|-------|------------|
| Interview frequency | Active job seeker | Casually looking |
| Technical comfort | Can share screen | Basic computer literacy |
| Network quality | Stable broadband | Mobile hotspot OK |
| Feedback style | Will give honest criticism | Responds to surveys |

### Where to Find 10-20 Users (No Paid Ads)

**Tier 1: Warm Network (Days 1-3)**
```
- LinkedIn connections actively job searching
- University career center mailing lists
- Slack communities (Blind, Levels.fyi, etc.)
- Discord servers for job seekers
- Reddit: r/cscareerquestions, r/jobs, r/interviews
```

**Tier 2: Cold Outreach (Days 3-5)**
```
- Comment on LinkedIn posts about interview prep
- DM people who posted "interviewing at FAANG"
- Reach out to bootcamp graduates (active seekers)
- Contact career coaches for referrals
```

**Tier 3: Micro-Influencer (Optional)**
```
- Find 1-2 people with 1K-10K followers in career space
- Offer free lifetime access for honest review
```

### Recruitment Message Template

**Subject:** Free AI Interview Coach - Need 10 Beta Testers

```
Hey [Name],

I'm building an AI that gives you real-time suggestions during 
live interviews (like having a coach in your ear).

Looking for 10 people to test it over the next 2 weeks.

What you get:
- Free access during beta
- Direct line to me for feedback
- Lifetime discount if we launch

What I need:
- 2-3 practice sessions (15 min each)
- Honest feedback (even if harsh)
- Quick survey after each session

Interested? Reply "yes" and I'll send setup instructions.

[Your name]
```

### Screening Questions
Before accepting a user, ask:
1. Are you actively interviewing or preparing?
2. What device/browser will you use?
3. Do you have a working microphone?
4. Can you commit to 3 sessions over 14 days?

Reject users who:
- Only want to "check it out"
- Can't commit to multiple sessions
- Have known audio setup issues

---

## 2. Onboarding Flow

### Pre-Session Setup (Send 24h Before)

**Email: "Your Beta Session Tomorrow"**
```
Hi [Name],

Your first session is tomorrow. Here's what to do:

BEFORE THE SESSION:
1. Use Chrome (latest version)
2. Test your mic here: [link to mic test page]
3. Find a quiet room
4. Have headphones ready

DURING THE SESSION:
1. Go to [app URL]
2. Click "Start Practice Interview"
3. Allow microphone access
4. Practice for 10-15 minutes

AFTER THE SESSION:
1. Fill out this 2-minute survey: [link]
2. Note any freezes, misfires, or confusion

See you tomorrow!
```

### In-App Onboarding (First Launch)

```
Step 1: Mic Permission
-----------------------
[Allow Microphone Access]
"We need your mic to hear the interview questions."

Step 2: Audio Check
-----------------------
"Say something and watch the meter move."
[Audio level visualization]
[✓ Sounds good] [Try again]

Step 3: Quick Calibration
-----------------------
"Read this sentence aloud:"
"Tell me about a time you solved a difficult problem."
[Processing...]
"Got it! Your voice is calibrated."

Step 4: What to Expect
-----------------------
- Suggestions appear in ~1 second
- Click a suggestion to expand it
- You can ignore suggestions anytime
- This is practice mode - experiment freely

[Start Practice Interview]
```

### First Session Script (Guided)

For the first 5 users, join their session live via screen share:
1. Watch their setup process
2. Note confusion points
3. Ask them to think aloud
4. Record (with permission) for review

---

## 3. Session Instrumentation Plan

### Browser-Side Telemetry

**Must Capture:**
```javascript
// session_telemetry.js

const telemetry = {
  // Identity
  session_id: uuid(),
  user_id: getUserId(),
  timestamp: Date.now(),
  
  // Environment
  browser: navigator.userAgent,
  screen_width: window.innerWidth,
  connection_type: navigator.connection?.effectiveType,
  
  // Audio State
  mic_permission: 'granted|denied|prompt',
  audio_level_avg: 0.0,  // Running average
  audio_gaps_count: 0,   // Silence > 3s
  
  // WebSocket Health
  ws_connect_time_ms: 0,
  ws_reconnect_count: 0,
  ws_disconnect_reason: '',
  
  // Suggestion Interaction
  suggestions_shown: 0,
  suggestions_clicked: 0,
  suggestion_latencies: [],  // Array of ms values
  
  // Trust Signals (KEY)
  user_paused_speaking: false,  // Did they wait for suggestion?
  user_ignored_suggestion: 0,   // Count
  user_followed_suggestion: 0,  // Count
  
  // Failures
  errors: [],  // {type, message, timestamp}
  freezes: [], // {duration_ms, timestamp}
};
```

**Critical Events to Log:**
| Event | When | Why |
|-------|------|-----|
| `mic_access_granted` | Permission approved | Track setup friction |
| `first_transcript` | First STT result | Measure cold start |
| `first_suggestion` | First coaching appears | Core latency metric |
| `suggestion_clicked` | User clicks suggestion | Engagement signal |
| `suggestion_ignored` | Suggestion dismissed | Non-value signal |
| `audio_gap_detected` | >3s silence | Possible confusion |
| `ws_reconnect` | WebSocket reconnects | Reliability issue |
| `user_rage_click` | 3+ clicks in 1s | Frustration signal |
| `session_abandon` | Close without finishing | Critical failure |

### Backend-Side Telemetry

**Must Capture:**
```python
# session_metrics.py

@dataclass
class SessionMetrics:
    session_id: str
    user_id: str
    
    # Timing
    session_start: datetime
    session_end: datetime
    total_duration_sec: float
    
    # STT Performance
    stt_provider_used: str  # deepgram|openai|azure
    stt_failover_occurred: bool
    stt_latency_p50_ms: float
    stt_latency_p95_ms: float
    transcript_count: int
    
    # LLM Performance
    suggestion_count: int
    suggestion_latency_p50_ms: float
    suggestion_latency_p95_ms: float
    
    # Reliability
    error_count: int
    ws_reconnect_count: int
    
    # Quality
    transcript_confidence_avg: float
    vad_false_positives: int  # Spoke but no transcript
    vad_false_negatives: int  # Transcript but user silent
```

### Log Aggregation

Store in simple JSON files for now:
```
/data/beta_sessions/
  /user_001/
    session_2026-02-28_001.json
    session_2026-02-28_002.json
  /user_002/
    ...
```

Daily export to spreadsheet for analysis.

---

## 4. Trust Measurement Framework

### The Core Question

> "Would you use this in a real interview?"

Everything else supports answering this.

### Trust Signals (Behavioral)

| Signal | Measurement | Trust Indicator |
|--------|-------------|-----------------|
| Suggestion follow rate | clicked / shown | >40% = trust |
| Session completion | finished / started | >80% = usable |
| Return rate | users with 2+ sessions | >60% = value |
| Speaking confidence | pause before suggestion | user waits = trust |
| Abandonment point | where users quit | friction map |

### Trust Signals (Survey)

**Post-Session Survey (2 min)**
```
1. Did the app freeze or lag during your session?
   [ ] No issues
   [ ] Minor lag (< 1 sec)
   [ ] Noticeable delay (1-3 sec)  
   [ ] Unusable (> 3 sec)

2. Did any suggestion feel wrong or confusing?
   [ ] No, all made sense
   [ ] 1-2 felt off
   [ ] Several felt wrong
   [ ] Most were unhelpful

3. Did you feel MORE or LESS confident with the AI?
   [ ] Much more confident
   [ ] Slightly more confident
   [ ] No difference
   [ ] Less confident
   [ ] Much less confident

4. Would you use this in a real interview tomorrow?
   [ ] Definitely yes
   [ ] Probably yes
   [ ] Unsure
   [ ] Probably not
   [ ] Definitely not

5. What's one thing that would make you trust it more?
   [Free text]
```

**End-of-Beta Survey (5 min)**
```
1. Net Promoter Score
   "How likely are you to recommend this to a friend preparing for interviews?"
   [0-10 scale]

2. Trust Score
   "I would trust this tool during a real job interview."
   [Strongly disagree → Strongly agree]

3. Comparison
   "Compared to practicing alone, this tool was..."
   [Much worse → Much better]

4. Willingness to Pay
   "What would you pay per month for this?"
   [ ] $0 (wouldn't use)
   [ ] $1-9
   [ ] $10-19
   [ ] $20-29
   [ ] $30+

5. Critical Feedback
   "What almost made you stop using this?"
   [Free text - MOST IMPORTANT]
```

### Trust Score Calculation

```
Trust Score = (
  0.3 × Would_Use_In_Real_Interview_Score +
  0.3 × Suggestion_Follow_Rate +
  0.2 × Session_Completion_Rate +
  0.2 × Return_Rate
)

Scale: 0-100
Target: >70 for go decision
```

---

## 5. Failure Reporting Workflow

### In-App Failure Report

Add a persistent "Report Issue" button:
```
[!] Something wrong?

What happened?
[ ] App froze
[ ] Suggestion was wrong
[ ] Audio didn't work
[ ] Other: ________

[Send Report]
```

Auto-attach:
- Session ID
- Last 30 seconds of events
- Browser/device info
- Audio level at time of report

### Failure Triage Process

**Daily (10 min):**
1. Review all failure reports from past 24h
2. Categorize: Audio | Latency | Content | UX | Other
3. Tag severity: Critical | High | Medium | Low

**Critical (fix same day):**
- App crash
- No audio capture
- WebSocket won't connect
- Suggestions never appear

**High (fix within 48h):**
- Latency >3 seconds
- Wrong language detection
- Repeated disconnects

**Medium (track for patterns):**
- Occasional lag
- Suggestion quality complaints
- Minor UI confusion

**Low (note for later):**
- Feature requests
- "Nice to have" feedback

### Failure Communication

When a user reports an issue, respond within 4 hours:
```
Hi [Name],

Thanks for reporting this. I see you experienced [issue].

I'm looking into it now. A few questions:
1. Did this happen once or multiple times?
2. Were you on WiFi or cellular?
3. Can you try again and let me know if it repeats?

I'll update you within 24 hours.

[Your name]
```

---

## 6. Go / No-Go Criteria After 14 Days

### Quantitative Gates

| Metric | No-Go | Borderline | Go |
|--------|-------|------------|-----|
| Users who completed 3+ sessions | <50% | 50-70% | >70% |
| "Would use in real interview" (Yes) | <40% | 40-60% | >60% |
| Session completion rate | <70% | 70-85% | >85% |
| Critical failures reported | >5 | 2-5 | <2 |
| Average suggestion latency | >2s | 1-2s | <1s |
| NPS score | <20 | 20-40 | >40 |

### Qualitative Gates

**Must Have 0 of:**
- "This made me MORE nervous"
- "I would never use this"
- "It completely froze during important moment"

**Must Have 3+ of:**
- "This actually helped"
- "I felt more prepared"
- "I'd pay for this"
- "Can I keep using it?"

### Decision Framework

```
IF quantitative_gates >= 4/6 passed
   AND qualitative_gates met
   AND no critical safety issues
THEN → GO (proceed to wider beta)

IF quantitative_gates >= 3/6 passed
   AND clear fix path for failures
THEN → CONDITIONAL GO (fix and retest with 5 users)

ELSE → NO-GO (major pivot or feature work needed)
```

### Post-Decision Actions

**If GO:**
1. Thank beta users, offer lifetime discount
2. Fix top 3 reported issues
3. Expand to 50-user beta
4. Start building waitlist

**If CONDITIONAL GO:**
1. Identify exact blockers
2. Fix within 7 days
3. Re-test with original beta users
4. Re-evaluate

**If NO-GO:**
1. Document what failed
2. Identify if fixable or fundamental
3. Decide: pivot or persist
4. Thank users honestly

---

## 14-Day Calendar

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1-2 | Recruitment | 10 confirmed users |
| 3 | Onboarding prep | Test accounts + docs ready |
| 4-5 | First sessions | 5 users complete first session |
| 6-7 | Triage + fix | Address critical issues |
| 8-9 | Second sessions | All users complete 2nd session |
| 10-11 | Deep feedback | 1:1 calls with 3 power users |
| 12-13 | Third sessions | Final sessions + end survey |
| 14 | Decision | Go/No-Go call |

---

## Quick Reference: What to Watch Daily

```
Morning Check (5 min):
□ How many sessions yesterday?
□ Any critical failures?
□ Survey responses received?

Evening Check (10 min):
□ Review session logs for anomalies
□ Respond to any user messages
□ Update tracking spreadsheet
```

---

## Tracking Spreadsheet Template

```
| User | Sessions | Completion | Latency | Trust Score | Would Pay | Notes |
|------|----------|------------|---------|-------------|-----------|-------|
| U01  | 3        | 100%       | 0.8s    | 75          | $19       | Loved it |
| U02  | 2        | 67%        | 1.2s    | 60          | $9        | Lag issues |
| U03  | 1        | 33%        | 2.5s    | 40          | $0        | Abandoned |
```

---

## Final Note

This is about **one question**:

> "Do real humans trust this enough to use it when it matters?"

Everything else is noise.

Measure trust. Ship if trusted. Pivot if not.
