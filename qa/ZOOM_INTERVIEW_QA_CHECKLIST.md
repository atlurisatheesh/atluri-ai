# Live Zoom Interview QA Checklist

## Pre-Test Setup

- [ ] Backend running: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port 9010`
- [ ] Desktop app built: `cd desktop && npm run build && npm start`
- [ ] Zoom meeting open (use 2nd device or browser tab as "interviewer")
- [ ] Microphone working (check system audio settings)
- [ ] Backend logs visible in terminal (watch for errors)

---

## Test 1: Connection & Overlay Basics

| # | Step | Expected | Pass |
|---|------|----------|------|
| 1.1 | Launch desktop app | App window opens, login/connect screen | [ ] |
| 1.2 | Enter backend URL `http://localhost:9010` | URL field accepts input | [ ] |
| 1.3 | Click Start/Connect | WS connects, overlay appears | [ ] |
| 1.4 | Check overlay position | Floating over Zoom, always-on-top | [ ] |
| 1.5 | Check backend logs | `ws connected` log appears | [ ] |

---

## Test 2: Stealth & Click-Through

| # | Step | Expected | Pass |
|---|------|----------|------|
| 2.1 | Press `Ctrl+Shift+T` | Red "CLICK-THROUGH ACTIVE" banner appears | [ ] |
| 2.2 | Click on Zoom behind overlay | Click passes through to Zoom | [ ] |
| 2.3 | Press `Ctrl+Shift+T` again | Banner disappears, overlay is clickable again | [ ] |
| 2.4 | Adjust stealth opacity | Overlay becomes semi-transparent | [ ] |
| 2.5 | Alt+Tab | Overlay NOT visible in Alt+Tab switcher | [ ] |
| 2.6 | Try screen-share the overlay | Overlay NOT captured in screen share (content protection) | [ ] |

---

## Test 3: Live Interview — Behavioral Questions

**Setup**: Speak as "interviewer" from your 2nd device/tab

| # | Interviewer Says | Expected Overlay Response | Timing | Pass |
|---|------------------|--------------------------|--------|------|
| 3.1 | "Tell me about yourself" | Initial question detected, answer generated | <40s | [ ] |
| 3.2 | "Tell me about a time you led a team through a tight deadline" | Question transcribed → answer_suggestion_start → chunks stream → full STAR answer | <40s | [ ] |
| 3.3 | "Describe a situation where you received critical feedback" | New question detected, previous abandoned, new answer streams | <40s | [ ] |
| 3.4 | "Walk me through a project where you improved performance" | Question classified as behavioral, STAR framework suggested | <40s | [ ] |
| 3.5 | "Tell me about a time you disagreed with your manager" | Full answer with situation, task, action, result structure | <40s | [ ] |

**Check after each question:**
- [ ] Transcript appears in overlay
- [ ] Answer streams word-by-word (not all at once)
- [ ] Answer is relevant to the question asked
- [ ] Answer follows STAR format for behavioral questions

---

## Test 4: Live Interview — Technical Questions

| # | Interviewer Says | Expected | Timing | Pass |
|---|------------------|----------|--------|------|
| 4.1 | "How would you design a notification system for 10 million users?" | System design answer with architecture components | <40s | [ ] |
| 4.2 | "Explain eventual vs strong consistency" | Technical explanation with use cases | <40s | [ ] |
| 4.3 | "How would you debug a production memory leak in Python?" | Step-by-step debugging approach | <40s | [ ] |

---

## Test 5: Screen Capture (Smart Area Selection)

| # | Step | Expected | Pass |
|---|------|----------|------|
| 5.1 | Press `Ctrl+Shift+S` | Crosshair overlay appears | [ ] |
| 5.2 | Drag to select a code snippet on screen | Selection rectangle with dashed border | [ ] |
| 5.3 | Release mouse | Capture card appears with "Sending to AI for analysis..." | [ ] |
| 5.4 | Wait for analysis | AI analysis relevant to captured content + interview context | [ ] |
| 5.5 | Press ESC during selection | Selection cancelled cleanly | [ ] |
| 5.6 | Click "New Capture" in capture card | New selection starts | [ ] |
| 5.7 | Capture a coding question from Zoom chat | AI provides code solution | [ ] |

---

## Test 6: Rapid Question Switching

| # | Step | Expected | Pass |
|---|------|----------|------|
| 6.1 | Ask Q1 immediately followed by Q2 within 2 seconds | Q1 stream cancels, Q2 generates fully | [ ] |
| 6.2 | Ask same question twice | Second is deduplicated (no double generation) | [ ] |
| 6.3 | Ask very short phrase ("um, what?") | Ignored (< 4 words, too partial) | [ ] |

---

## Test 7: Reconnection / Resilience

| # | Step | Expected | Pass |
|---|------|----------|------|
| 7.1 | Kill backend, restart it | Desktop reconnects automatically | [ ] |
| 7.2 | Disconnect WiFi for 5s, reconnect | WS reconnects, state recovered | [ ] |
| 7.3 | Close overlay, reopen with same room_id | sync_state returns current question | [ ] |

---

## Test 8: Question Intelligence Features

| # | Check | Expected | Pass |
|---|-------|----------|------|
| 8.1 | Question type classification | Behavioral / Technical / Coding shown | [ ] |
| 8.2 | Difficulty indicator | Easy / Medium / Hard shown | [ ] |
| 8.3 | Framework suggestion | STAR / PROBLEM_SOLVING etc | [ ] |
| 8.4 | Follow-up predictions | 2+ predicted follow-up questions | [ ] |
| 8.5 | Key phrase extraction | Highlighted key phrases in answer | [ ] |
| 8.6 | Speech coaching | WPM and pacing feedback | [ ] |

---

## Test 9: Audio Quality

| # | Step | Expected | Pass |
|---|------|----------|------|
| 9.1 | Speak clearly at normal pace | Transcript accurate >90% | [ ] |
| 9.2 | Speak with background noise | Transcript still usable | [ ] |
| 9.3 | Two people talking (interviewer + you) | Interviewer questions detected correctly | [ ] |
| 9.4 | Silence for 10 seconds | No false transcriptions | [ ] |

---

## Test 10: Performance Under Extended Use

| # | Check | Expected | Pass |
|---|-------|----------|------|
| 10.1 | Memory usage after 10 questions | Stays under 500MB | [ ] |
| 10.2 | Overlay responsiveness after 15 min | Still smooth, no lag | [ ] |
| 10.3 | Backend memory after 30 min | No memory leak trending | [ ] |

---

## Bug Report Template

```
**Test #**: ___
**Steps to reproduce**: ___
**Expected**: ___
**Actual**: ___
**Backend log excerpt**: ___
**Screenshot**: (if applicable)
```

---

## Sign-off

| Item | Status |
|------|--------|
| All critical tests pass (1-6) | [ ] |
| Screen capture works | [ ] |
| Answer timing consistently <40s | [ ] |
| Stealth/click-through works | [ ] |
| No crashes in 15-min session | [ ] |
| **Ready for beta** | [ ] |

**Tested by**: _________________ **Date**: _________________
