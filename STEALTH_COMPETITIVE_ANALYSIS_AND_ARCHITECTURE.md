# PhantomVeil™ — Competitive Stealth Analysis & Next-Gen Architecture

## Date: 2026-02-17 | Founder Strategy Document

---

## 1. COMPETITIVE LANDSCAPE — Full Breakdown

### 1.1 LockedIn AI (lockedinai.com)
- **Users:** 1M+ | **Price:** ~$58 USD/month
- **Platform:** Web + Desktop (Mac + Windows)
- **AI Models:** GPT, Claude, Gemini, DeepSeek, Grok
- **Languages:** 42+, bilingual support
- **Response Time:** 116ms avg

**Stealth Features:**
| Feature | Status |
|---------|--------|
| Invisible on taskbar/dock | ✅ |
| Invisible in Task Manager/Activity Monitor (aliases as background service) | ✅ |
| Invisible on Alt+Tab / Mission Control | ✅ |
| OS-level undetectable hotkeys (not browser listeners) | ✅ |
| Click-through mode | ✅ |
| Transparency/opacity controls | ✅ |
| Active Tab Isolation (locks to chosen window) | ✅ |
| Screen capture invisibility | ✅ |
| Smart Area Selection (drag to analyze) | ✅ |
| System audio capture | ✅ |

**Unique Advantages:**
- **LockedIn Duo** — Invite a friend to join session in real-time, send tips via text/audio
- **Dual-Layer AI** — Copilot + Coach running in parallel
- **VSCode/Cursor Integration** — Coding assistance inside IDE
- **Complete Career Ecosystem** — Resume, job search, interview prep, communities
- **Mock Interviews** on any device (web, tablet, phone)

**Weaknesses:**
- No panic-hide hotkey (we have this)
- No minimal strip mode (we have this)
- No fine-grained opacity control (they have basic transparency)
- No process name MASKING (they alias but don't randomize)
- No phone mirror mode
- No ghost typing
- No offline AI (Ollama)
- No recording detection alerts

---

### 1.2 InterviewCoder (interviewcoder.co)
- **Users:** 150K+ | **Price:** $299/month or $799 lifetime
- **Platform:** Desktop only (Mac + Windows)
- **Focus:** Coding interviews (expanding to all types)

**Stealth Features (claims "20+ undetectability features"):**
| Feature | Status |
|---------|--------|
| Invisible on Dock | ✅ |
| Invisible in Activity Monitor | ✅ |
| Invisible to Screen Recording | ✅ |
| Complete click-through (no cursor detection) | ✅ |
| Invisible to System Tray | ✅ |
| Invisible to Screen Share | ✅ |
| Undetectable by Browser | ✅ (MAJOR — we lack this) |
| Undetectable hotkey registration | ✅ |
| Audio support | ✅ |
| Daily testing on 9+ platforms | ✅ (MAJOR — we lack this) |

**Platforms Tested Daily:**
Teams, Zoom, Google Meet, Amazon Chime, Cisco Webex, Lark/Feishu, HackerRank, CoderPad, Codility

**Unique Advantages:**
- Strongest stealth claims in the market
- "Has never been caught" claim
- Real video proof of working during actual interviews (Amazon, Oracle, Snowflake, Roblox)
- Daily platform compatibility testing
- Comparison table showing superiority vs LockedIn, UltraCode, AIApply

**Weaknesses:**
- No multi-LLM choice (they use fine-tuned models)
- No phone mirror mode
- No ghost typing
- No recording detection
- No offline capability
- No resume/career ecosystem
- No human assist / duo mode
- Most expensive ($299/mo or $799 lifetime)

---

### 1.3 Final Round AI (finalroundai.com)
- **Users:** 10M+ | **Price:** Starts at $25/month
- **Platform:** Web + Desktop
- **Compliance:** SOC 2 Type 1 & 2, CCPA, GDPR
- **Languages:** 91

**Stealth Features:**
| Feature | Status |
|---------|--------|
| 100% Invisible & Undetectable claim | ✅ |
| Desktop Stealth Copilot | ✅ |
| Works with screen sharing | ✅ |
| No interface visible to interviewer | ✅ |
| Multi-platform (Zoom/Meet/Teams/LeetCode/HackerRank/etc) | ✅ |

**Unique Advantages:**
- **Massive user base** (10M+)
- **Post-interview reports** with performance scores, speech clarity, engagement
- **AI Mock Interview** simulator
- **AI Resume Builder + Job Hunter**
- **HireVue Interview support**
- **SOC 2 compliance** (enterprise trust)
- **Cheapest pricing** ($25/mo)

**Weaknesses:**
- Less emphasis on deep stealth engineering
- No specific anti-proctoring claims
- No phone mirror
- No ghost typing
- No process masking details

---

### 1.4 Interview Hammer (interviewhammer.com)
- **Users:** 257 reviews | **Price:** Has free trial
- **Platform:** Mobile + Web + Desktop
- **Focus:** Mobile-first

**Stealth Features:**
- Invisible assistance on major platforms
- Mobile discreet mode (phone in pocket/nearby)

**Weaknesses:**
- Smallest player, least stealth depth
- No desktop-level stealth engineering
- No process hiding, no content protection

---

## 2. GAP ANALYSIS — PhantomVeil vs ALL Competitors

### 2.1 Features We ALREADY Beat Everyone On:
| Feature | PhantomVeil | Competitors |
|---------|-------------|-------------|
| Panic-hide hotkey (<1ms) | ✅ Ctrl+Shift+H | ❌ Only Paraqeet has partial |
| Minimal strip mode | ✅ Thin bar | ❌ Nobody |
| Fine opacity control (10-100%) | ✅ Slider | ❌ Basic transparency only |
| Process name masking | ✅ Custom name | ⚠️ LockedIn aliases |
| Ghost typing (OS-native) | ✅ 20-200 WPM +jitter | ❌ Nobody |
| Phone mirror (WebSocket) | ✅ Real-time sync | ❌ Nobody (LockedIn Duo is human, not phone) |
| Recording detection alerts | ✅ Polls OBS/Zoom/capture | ❌ Nobody |
| Offline AI (Ollama) | ✅ Local models | ❌ Nobody |
| Dual monitor routing | ✅ Auto-secondary | ❌ Nobody mentions |
| BlackHole audio installer | ✅ macOS auto-install | ❌ Nobody |
| WASAPI loopback capture | ✅ Direct system audio | ⚠️ Others use browser audio |
| Keyboard-only mode | ✅ Full hotkey control | ⚠️ LockedIn has OS hotkeys |
| Content Protection (WDA_EXCLUDEFROMCAPTURE) | ✅ Win10 2004+ | ✅ Others use similar |
| Eye-gaze simulation guidance | ✅ | ❌ Nobody |
| 5 AI Personas | ✅ Switchable | ⚠️ LockedIn has role-based |
| Encrypted settings store | ✅ electron-store | ❌ Nobody mentions |
| Vision AI (GPT-4o screenshot) | ✅ Region capture | ✅ InterviewCoder has similar |
| MentorLink stealth hints | ✅ Duo hints | ⚠️ LockedIn Duo is stronger (human) |

### 2.2 CRITICAL GAPS We Must Close:
| Gap | Who Has It | Priority | Impact |
|-----|-----------|----------|--------|
| **Browser-level undetectability** | InterviewCoder | P0 | Proctoring tools use browser APIs |
| **Activity Monitor/Task Manager TRUE hiding** | InterviewCoder, LockedIn | P0 | IT/HR can check |
| **Anti-proctoring engine** (HireVue, Mettl, ProctorU, Examity, Respondus) | Nobody explicitly | P0 | Huge moat |
| **Window enumeration protection** | InterviewCoder (claims) | P0 | FindWindow/EnumWindows detection |
| **System tray invisibility** | InterviewCoder | P1 | Minor but thorough |
| **Active tab isolation** | LockedIn | P1 | Prevents accidental exposure |
| **Daily automated platform testing** | InterviewCoder | P1 | Quality assurance |
| **Dual-layer AI (Copilot+Coach)** | LockedIn, Final Round | P2 | Feature advantage |
| **Post-interview reports** | Final Round | P2 | User retention |
| **IDE integration (VSCode/Cursor)** | LockedIn | P2 | Coding interview coverage |
| **HireVue specific support** | Final Round | P2 | One-way video interviews |
| **91+ languages** | Final Round | P3 | Market reach |

---

## 3. NEXT-GEN STEALTH ARCHITECTURE — "PhantomVeil v2.0"

### 3.1 LAYER 1: Stealth Hardening Engine (Desktop)
**Module: `stealth_engine.ts`**

```
┌────────────────────────────────────────────────────────┐
│                 STEALTH ENGINE v2.0                      │
├────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Window Cloak │  │ Process Cloak│  │ Memory Cloak │  │
│  │              │  │              │  │              │  │
│  │ • Class name │  │ • PID masking│  │ • Heap rand  │  │
│  │   randomize  │  │ • Argv wipe  │  │ • Stack      │  │
│  │ • Title wipe │  │ • Parent spf │  │   obfuscate  │  │
│  │ • Enum block │  │ • CPU profile│  │ • Module hide │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Network Clk  │  │ Audio Cloak  │  │ Input Cloak  │  │
│  │              │  │              │  │              │  │
│  │ • DNS over   │  │ • Virtual    │  │ • Keystroke  │  │
│  │   HTTPS      │  │   device     │  │   timing     │  │
│  │ • WS encrypt │  │ • Loopback   │  │   normalize  │  │
│  │ • API proxy  │  │   isolate    │  │ • Mouse      │  │
│  │ • Traffic pad│  │ • Gain norm  │  │   pattern    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
└────────────────────────────────────────────────────────┘
```

### 3.2 LAYER 2: Anti-Detection Engine (Desktop)
**Module: `anti_detection.ts`**

```
┌────────────────────────────────────────────────────────┐
│              ANTI-DETECTION ENGINE v2.0                  │
├────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │           PROCTORING DETECTOR                     │   │
│  │                                                   │   │
│  │  Scans for: HireVue, Mettl, ProctorU, Examity,  │   │
│  │  Respondus LockdownBrowser, Talview, HackerRank  │   │
│  │  Proctoring, Codility Proctoring, TestGorilla    │   │
│  │                                                   │   │
│  │  Detection vectors:                               │   │
│  │  • Process scanning (30+ signatures)              │   │
│  │  • Window title matching                          │   │
│  │  • Browser extension detection                    │   │
│  │  • Network endpoint monitoring                    │   │
│  │  • Registry key scanning (Windows)                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │           EVASION CONTROLLER                      │   │
│  │                                                   │   │
│  │  When proctoring detected:                        │   │
│  │  1. Auto-reduce stealth level                     │   │
│  │  2. Switch to minimal mode                        │   │
│  │  3. Randomize window class                        │   │
│  │  4. Mask API calls                                │   │
│  │  5. Alert user with threat level                  │   │
│  │  6. Optional: Auto-hide until safe                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │           PLATFORM COMPATIBILITY MONITOR          │   │
│  │                                                   │   │
│  │  Tracks: Zoom, Teams, Meet, Chime, Webex,        │   │
│  │  HackerRank, CoderPad, Codility, CodeSignal,     │   │
│  │  LiveStorm, Lark/Feishu, BlueJeans               │   │
│  │                                                   │   │
│  │  Detects: Version changes, new detection          │   │
│  │  methods, API changes                             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└────────────────────────────────────────────────────────┘
```

### 3.3 LAYER 3: Browser-Level Countermeasures (Backend)
**Module: `browser_countermeasures.py`**

These run when the user is in a browser-based interview (HackerRank, CodeSignal, etc.):

| Countermeasure | How It Works |
|----------------|--------------|
| **Tab focus spoofing** | Inject `visibilitychange` event suppression so browser thinks tab never loses focus |
| **Window blur prevention** | Override `window.onblur` to prevent tab-switch detection |
| **Screen detail API blocking** | Block `window.getScreenDetails()` to hide multi-monitor setup |
| **Clipboard isolation** | Prevent interview platforms from reading clipboard history |
| **DevTools detection bypass** | Counteract `debugger` statements and console size checks |
| **WebRTC leak prevention** | Block `RTCPeerConnection` from exposing local IPs |
| **Copy-paste behavior normalization** | Simulate natural typing cadence when pasting AI responses |
| **Extension enumeration blocking** | Prevent sites from detecting installed browser extensions |

### 3.4 LAYER 4: Stealth Telemetry & Health (Backend API)
**Endpoint: `/api/stealth/health`**

```json
{
  "stealth_score": 97,
  "active_threats": [],
  "detection_risk": "LOW",
  "features_active": {
    "content_protection": true,
    "process_masking": true,
    "window_cloaking": true,
    "proctoring_shield": true,
    "recording_detection": true,
    "network_obfuscation": true
  },
  "platform_compatibility": {
    "zoom": "verified",
    "teams": "verified", 
    "meet": "verified",
    "hackerrank": "verified"
  },
  "last_threat_scan": "2026-02-17T10:30:00Z"
}
```

---

## 4. IMPLEMENTATION PRIORITY

### Phase 1 — Stealth Hardening (P0)
1. ✅ Proctoring software detector (30+ known signatures)
2. ✅ Window enumeration protection (hide from FindWindow/EnumWindows)
3. ✅ Dynamic window class name randomization
4. ✅ Process command-line argument sanitization
5. ✅ System tray hiding
6. ✅ Threat level alerting system

### Phase 2 — Anti-Detection Engine (P0)
1. ✅ Proctoring evasion controller (auto-adapt when threats detected)
2. ✅ Platform compatibility registry
3. ✅ Browser countermeasure injection system
4. ✅ Automated stealth health scoring

### Phase 3 — Advanced Evasion (P1)
1. ✅ Active Tab Isolation mode
2. ✅ Network traffic padding
3. ✅ Input pattern normalization (typing cadence, mouse movement)
4. ✅ Stealth telemetry backend endpoint

---

## 5. COMPETITIVE MOAT SUMMARY

After implementation, PhantomVeil will have:

| Category | PhantomVeil v2 | LockedIn AI | InterviewCoder | Final Round AI |
|----------|---------------|-------------|----------------|----------------|
| Stealth features count | **25+** | ~10 | ~20 | ~5 |
| Panic hide | ✅ <1ms | ❌ | ❌ | ❌ |
| Ghost typing | ✅ OS-native | ❌ | ❌ | ❌ |
| Phone mirror | ✅ WebSocket | ❌ | ❌ | ❌ |
| Proctoring detection | ✅ 30+ sigs | ❌ | ❌ | ❌ |
| Auto-evasion | ✅ Adaptive | ❌ | ❌ | ❌ |
| Recording alerts | ✅ Real-time | ❌ | ❌ | ❌ |
| Offline AI | ✅ Ollama | ❌ | ❌ | ❌ |
| Stealth health score | ✅ Live | ❌ | ❌ | ❌ |
| Browser countermeasures | ✅ | ❌ | ✅ (claims) | ❌ |
| Window enum protection | ✅ | ⚠️ | ✅ (claims) | ❌ |
| Multi-LLM | ✅ GPT+Claude+Ollama | ✅ | ❌ | ⚠️ |
| OS support | ✅ Win+Mac+Linux | ✅ Win+Mac | ✅ Win+Mac | ✅ Win+Mac |

**Result: PhantomVeil becomes the most technically advanced stealth interview AI tool in existence.**
