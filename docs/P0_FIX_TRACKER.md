# P0 FIX TRACKER
## Critical Issues from Real User Testing

**Status:** IN PROGRESS  
**Target:** Retest in 3 days  

---

## Issue 1: Connection Time = 6+ seconds

### Root Cause
```
Sequential initialization:
1. WebSocket accept (50ms)
2. Token verification (100ms)
3. Room creation (100ms)
4. Session engine init (500ms)
5. Deepgram service init (5000ms+ even if disabled)
6. AI engines init (500ms)
```

### Fix

```python
# In ws_voice.py - Move Deepgram init to background
async def voice_ws(websocket: WebSocket):
    # FAST PATH - get user connected quickly
    await websocket.accept()
    await _safe_send({"type": "connected", "status": "initializing"})
    
    # PARALLEL INIT - non-blocking
    init_tasks = [
        asyncio.create_task(init_session_engine()),
        asyncio.create_task(init_ai_engines()),
    ]
    
    # LAZY DEEPGRAM - only connect when first audio arrives
    # Don't block connection on Deepgram
```

### Verification
- [ ] Connection time < 2 seconds
- [ ] User sees "connected" within 1 second
- [ ] Deepgram initializes lazily

### Owner
Solo founder

### Deadline
Day 1 (TODAY)

---

## Issue 2: Responses Timeout (3/5 messages)

### Root Cause
```
QA_MODE disables suggestion generation entirely.
Transcript messages received but not processed.
No fallback path when AI engine not ready.
```

### Fix

```python
# In ws_voice.py - Add QA mode mock suggestions
if QA_MODE:
    # Generate mock suggestion for testing
    await _safe_send({
        "type": "suggestion",
        "question": transcript_text,
        "suggestions": [
            "Consider starting with your recent experience",
            "Use the STAR method: Situation, Task, Action, Result",
            "Be specific with metrics and outcomes"
        ],
        "confidence": 0.85
    })
```

### Verification
- [ ] Every transcript gets a response
- [ ] Response time < 1 second in QA mode
- [ ] Suggestions are relevant to question type

### Owner
Solo founder

### Deadline
Day 1 (TODAY)

---

## Issue 3: Nervous/Fast Speakers Not Supported

### Root Cause
```
VAD triggers too frequently on filler words
System can't keep up with burst speech
No buffering of partial transcripts
Suggestions arrive too late
```

### Fix

```python
# Buffer partial transcripts before triggering suggestion
class TranscriptBuffer:
    def __init__(self, min_words: int = 5, max_wait_ms: int = 2000):
        self.buffer = []
        self.last_final_ts = time.time()
    
    def add(self, text: str, is_final: bool) -> Optional[str]:
        self.buffer.append(text)
        
        # Only process if enough content OR timeout
        word_count = len(" ".join(self.buffer).split())
        time_since_last = (time.time() - self.last_final_ts) * 1000
        
        if is_final or word_count >= self.min_words or time_since_last > self.max_wait_ms:
            result = " ".join(self.buffer)
            self.buffer = []
            self.last_final_ts = time.time()
            return result
        return None
```

### Verification
- [ ] Nervous fresher trust score ≥ 60
- [ ] Fast overtalker gets suggestions
- [ ] No duplicate suggestions

### Owner
Solo founder

### Deadline
Day 2

---

## Issue 4: No Visual Feedback

### Root Cause
```
Frontend doesn't show processing state
User doesn't know if system is working
No indication of listening/thinking/ready
```

### Fix

```typescript
// In interview component
const [processingState, setProcessingState] = useState<
  'idle' | 'listening' | 'processing' | 'suggesting'
>('idle');

// Show indicator
<ProcessingIndicator state={processingState}>
  {processingState === 'listening' && "Listening..."}
  {processingState === 'processing' && "Thinking..."}
  {processingState === 'suggesting' && "Suggestion ready!"}
</ProcessingIndicator>
```

### Verification
- [ ] User always knows current state
- [ ] "Listening" shows within 500ms of speech
- [ ] "Suggesting" shows when help available

### Owner
Solo founder

### Deadline
Day 2

---

## PROGRESS TRACKER

| Issue | Status | Completion |
|-------|--------|------------|
| Connection time | NOT STARTED | 0% |
| Response timeouts | NOT STARTED | 0% |
| Nervous speakers | NOT STARTED | 0% |
| Visual feedback | NOT STARTED | 0% |

---

## RE-TEST PLAN

After fixes:
1. Run persona_stress_test.py again
2. Target: Trust Score ≥ 60 avg
3. Target: "Would use in real" ≥ 50%
4. If pass: Recruit first 5 beta users

---

**Created:** February 28, 2026  
**Last Updated:** February 28, 2026
