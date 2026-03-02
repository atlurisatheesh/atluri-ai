# LIVE INTERVIEW UI ARCHITECTURE
## 30-Year Veteran Design System

**Document Type:** Production UI Specification  
**Environment:** High-stakes real-time voice interview  
**Primary Goal:** Calm, clarity, confidence  

---

# PART 1 — UX PRINCIPLES

## 1.1 Core Psychological Goals

| Priority | Goal | Implementation |
|----------|------|----------------|
| 1 | **Reduce cognitive load** | Single focal point at any moment |
| 2 | **Create temporal stability** | Nothing moves unless user caused it |
| 3 | **Signal reliability** | Consistent visual rhythm, no surprises |
| 4 | **Support peripheral awareness** | Status visible but not demanding |
| 5 | **Enable flow state** | UI disappears during use |

## 1.2 What Must NEVER Happen

```
✗ Layout shift during streaming
✗ Elements jumping or resizing unexpectedly
✗ Flashing or pulsing animations
✗ Color changes that demand attention
✗ Modal dialogs interrupting flow
✗ Sound effects or notification sounds
✗ Suggestions replacing each other rapidly
✗ Scroll position changing without user action
✗ Loading spinners in the primary focus area
✗ Error messages that block interaction
```

## 1.3 Visual Behavior During Latency

**The Golden Rule:** User should never wonder "is it working?"

| State | Visual Signal | Duration | User Perception |
|-------|--------------|----------|-----------------|
| Processing | Subtle dot pulse (3 dots) | Indefinite | "It's thinking" |
| Slow (>2s) | Add "Still working..." text | After 2s | "Taking longer than usual" |
| Very slow (>5s) | Muted status bar update | After 5s | "Connection may be slow" |
| Timeout (>10s) | Inline gray notice | After 10s | "Try speaking again" |

**Never:** Spinning wheels, progress bars, or anything that suggests "waiting."

## 1.4 Streaming Text Philosophy

```
RULE 1: Reserve space before content arrives
RULE 2: Append, never replace mid-sentence
RULE 3: Complete thoughts before fading old content
RULE 4: Cursor/caret shows "still receiving"
RULE 5: No scroll unless user is at bottom
```

---

# PART 2 — PAGE LAYOUT STRUCTURE

## 2.1 Spatial Hierarchy (12-Column Grid)

```
┌─────────────────────────────────────────────────────────────────────┐
│  TOP BAR (fixed, h-14)                                    col 1-12  │
│  ├─ Logo/Brand (left)                                               │
│  ├─ Session status (center)                                         │
│  └─ Controls (right)                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐  │
│  │                         │  │                                 │  │
│  │   TRANSCRIPT PANEL      │  │   SUGGESTION PANEL              │  │
│  │   (col 1-5)             │  │   (col 6-12)                    │  │
│  │                         │  │                                 │  │
│  │   - What was said       │  │   - Primary: Current suggestion │  │
│  │   - Speaker labels      │  │   - Secondary: Key points       │  │
│  │   - Timestamps          │  │   - History: Previous 2         │  │
│  │                         │  │                                 │  │
│  │   [Scrollable]          │  │   [Fixed height, no scroll]     │  │
│  │                         │  │                                 │  │
│  └─────────────────────────┘  └─────────────────────────────────┘  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  STATUS BAR (fixed, h-10)                                 col 1-12  │
│  ├─ Connection indicator (left)                                     │
│  ├─ Latency indicator (center)                                      │
│  └─ Mic level / VAD (right)                                         │
└─────────────────────────────────────────────────────────────────────┘
```

## 2.2 Visual Weight Distribution

| Element | Weight | Rationale |
|---------|--------|-----------|
| Current Suggestion | **HEAVY** (100%) | This is why they use the tool |
| Transcript | MEDIUM (60%) | Context, not primary |
| Status indicators | LIGHT (20%) | Peripheral awareness only |
| Controls | MINIMAL (10%) | Rarely needed |

## 2.3 What NEVER Moves

```
✓ Top bar position and height
✓ Suggestion panel boundaries
✓ Status bar position
✓ Column divider line
✓ Primary suggestion container size
```

## 2.4 What MAY Update (With Constraints)

```
✓ Transcript content (append only, scroll)
✓ Suggestion text (stream in place)
✓ Status indicator states (color only, same position)
✓ Mic level visualization (constrained to fixed area)
```

---

# PART 3 — TAILWIND LAYOUT STRUCTURE

```tsx
// app/interview/page.tsx
// Production-ready Next.js layout

export default function InterviewPage() {
  return (
    <div className="h-screen w-screen bg-neutral-950 text-neutral-100 flex flex-col overflow-hidden">
      
      {/* ═══════════════════════════════════════════════════════════
          TOP BAR — Fixed, never moves, h-14
          ═══════════════════════════════════════════════════════════ */}
      <header className="h-14 min-h-14 max-h-14 flex-shrink-0 border-b border-neutral-800 px-6 flex items-center justify-between">
        
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-neutral-400">Interview Copilot</span>
        </div>
        
        {/* Center: Session Status */}
        <div className="flex items-center gap-2">
          <StatusIndicator />
        </div>
        
        {/* Right: Controls */}
        <div className="flex items-center gap-4">
          <button className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors">
            Settings
          </button>
          <button className="text-sm text-red-400/80 hover:text-red-400 transition-colors">
            End
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT — Fills remaining height
          ═══════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-h-0 flex">
        
        {/* ─────────────────────────────────────────────────────────
            LEFT: Transcript Panel (5 columns of 12)
            ───────────────────────────────────────────────────────── */}
        <section className="w-5/12 min-w-[320px] max-w-[480px] border-r border-neutral-800 flex flex-col">
          
          {/* Panel Header */}
          <div className="h-12 min-h-12 px-4 flex items-center border-b border-neutral-800/50">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Transcript
            </span>
          </div>
          
          {/* Scrollable Transcript */}
          <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth px-4 py-3">
            <TranscriptFeed />
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────
            RIGHT: Suggestion Panel (7 columns of 12)
            ───────────────────────────────────────────────────────── */}
        <section className="flex-1 flex flex-col">
          
          {/* Panel Header */}
          <div className="h-12 min-h-12 px-6 flex items-center justify-between border-b border-neutral-800/50">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Suggestion
            </span>
            <ThinkingIndicator />
          </div>
          
          {/* Primary Suggestion — Fixed height, NO scroll */}
          <div className="flex-1 min-h-0 flex flex-col px-6 py-6">
            
            {/* Current Question Context */}
            <div className="mb-4">
              <p className="text-xs text-neutral-500 mb-1">Current question:</p>
              <p className="text-sm text-neutral-400 line-clamp-2">
                <CurrentQuestion />
              </p>
            </div>
            
            {/* Primary Suggestion Area — NEVER SCROLLS */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <PrimarySuggestion />
            </div>
            
            {/* Key Points (Secondary) */}
            <div className="mt-6 pt-4 border-t border-neutral-800/50">
              <KeyPoints />
            </div>
          </div>
          
          {/* Previous Suggestions (Collapsed) */}
          <div className="h-24 min-h-24 border-t border-neutral-800/50 px-6 py-3 overflow-hidden">
            <PreviousSuggestions />
          </div>
        </section>
      </main>

      {/* ═══════════════════════════════════════════════════════════
          STATUS BAR — Fixed, bottom
          ═══════════════════════════════════════════════════════════ */}
      <footer className="h-10 min-h-10 max-h-10 flex-shrink-0 border-t border-neutral-800 px-6 flex items-center justify-between text-xs">
        
        {/* Left: Connection */}
        <div className="flex items-center gap-2">
          <ConnectionStatus />
        </div>
        
        {/* Center: Latency */}
        <div className="text-neutral-600">
          <LatencyIndicator />
        </div>
        
        {/* Right: Mic Level */}
        <div className="flex items-center gap-2">
          <MicLevel />
        </div>
      </footer>
    </div>
  );
}
```

## 3.1 Component Implementations

```tsx
// components/interview/StatusIndicator.tsx

export function StatusIndicator() {
  return (
    <div className="flex items-center gap-2">
      {/* Connection dot */}
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      <span className="text-xs text-neutral-400">Live</span>
    </div>
  );
}

// components/interview/ThinkingIndicator.tsx

export function ThinkingIndicator({ isThinking }: { isThinking: boolean }) {
  if (!isThinking) return null;
  
  return (
    <div className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse" />
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse [animation-delay:300ms]" />
    </div>
  );
}

// components/interview/PrimarySuggestion.tsx

export function PrimarySuggestion({ text, isStreaming }: Props) {
  return (
    <div className="h-full flex flex-col">
      {/* Reserved space — always same height */}
      <div className="flex-1 min-h-0">
        <p className="text-lg leading-relaxed text-neutral-100 whitespace-pre-wrap">
          {text}
          {isStreaming && (
            <span className="inline-block w-0.5 h-5 bg-neutral-400 ml-0.5 animate-pulse" />
          )}
        </p>
      </div>
    </div>
  );
}

// components/interview/TranscriptFeed.tsx

export function TranscriptFeed({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Only auto-scroll if user is at bottom
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries, autoScroll]);
  
  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <div key={i} className="group">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={cn(
              "text-xs font-medium",
              entry.speaker === 'interviewer' ? 'text-blue-400/70' : 'text-emerald-400/70'
            )}>
              {entry.speaker === 'interviewer' ? 'Q' : 'A'}
            </span>
            <span className="text-xs text-neutral-600">
              {entry.timestamp}
            </span>
          </div>
          <p className="text-sm text-neutral-300 pl-4">
            {entry.text}
          </p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

// components/interview/ConnectionStatus.tsx

export function ConnectionStatus({ status }: Props) {
  const configs = {
    connected: { color: 'bg-emerald-500', label: 'Connected' },
    reconnecting: { color: 'bg-amber-500', label: 'Reconnecting...' },
    failover: { color: 'bg-amber-500', label: 'Connected' }, // Don't expose failover
    disconnected: { color: 'bg-red-500', label: 'Disconnected' },
  };
  
  const config = configs[status] || configs.connected;
  
  return (
    <div className="flex items-center gap-2">
      <span className={cn("w-1.5 h-1.5 rounded-full", config.color)} />
      <span className="text-neutral-500">{config.label}</span>
    </div>
  );
}

// components/interview/MicLevel.tsx

export function MicLevel({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-neutral-500">Mic</span>
      <div className="w-16 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-emerald-500/70 transition-all duration-75"
          style={{ width: `${Math.min(100, level)}%` }}
        />
      </div>
    </div>
  );
}
```

---

# PART 4 — STREAMING STABILITY RULES

## 4.1 Text Streaming Protocol

```typescript
// lib/streaming.ts

interface StreamingConfig {
  // Never replace text that's already rendered
  appendOnly: true;
  
  // Reserve minimum height for suggestion area
  minHeight: '200px';
  
  // Maximum suggestion length before truncation
  maxLength: 500;
  
  // Debounce DOM updates to prevent jank
  updateIntervalMs: 50;
  
  // Buffer partial words before rendering
  wordBuffer: true;
}

function renderStreamingText(
  container: HTMLElement,
  chunk: string,
  isComplete: boolean
) {
  // Rule 1: Batch updates to prevent layout thrashing
  requestAnimationFrame(() => {
    // Rule 2: Append only, never replace
    container.textContent += chunk;
    
    // Rule 3: Only show cursor while streaming
    if (!isComplete) {
      showStreamingCursor(container);
    } else {
      hideStreamingCursor(container);
    }
  });
}
```

## 4.2 Layout Shift Prevention

```css
/* Critical: Reserve space BEFORE content arrives */

.suggestion-container {
  /* Fixed minimum height prevents collapse */
  min-height: 200px;
  
  /* Prevent text from causing width changes */
  word-break: break-word;
  overflow-wrap: break-word;
  
  /* Prevent layout recalculation */
  contain: layout style;
}

.transcript-container {
  /* Prevent reflow from new entries */
  contain: layout;
  
  /* Smooth scroll without jumps */
  scroll-behavior: smooth;
  overscroll-behavior: contain;
}
```

## 4.3 Auto-Scroll Logic

```typescript
// hooks/useAutoScroll.ts

export function useAutoScroll(containerRef: RefObject<HTMLElement>, deps: any[]) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  // Detect if user scrolled away from bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const threshold = 50; // pixels from bottom
      const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      setIsAtBottom(atBottom);
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Only auto-scroll if user was at bottom
  useEffect(() => {
    if (isAtBottom && containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, deps);
  
  return isAtBottom;
}
```

## 4.4 Suggestion Update Protocol

```typescript
// When new suggestion arrives while streaming:

function handleNewSuggestion(newSuggestion: string, currentState: SuggestionState) {
  // Rule 1: If current is still streaming, queue the new one
  if (currentState.isStreaming) {
    return {
      ...currentState,
      queued: newSuggestion // Will render after current completes
    };
  }
  
  // Rule 2: If current is complete, fade transition to new
  return {
    current: newSuggestion,
    previous: currentState.current, // Move to history
    isStreaming: true,
    queued: null
  };
}

// Never interrupt mid-stream. Never replace visible text.
```

---

# PART 5 — VISUAL SYSTEM

## 5.1 Color Palette

```css
:root {
  /* ═══════════════════════════════════════════════════════════
     BACKGROUND LAYERS (Dark, calm, non-fatiguing)
     ═══════════════════════════════════════════════════════════ */
  --bg-base: #0a0a0a;        /* Main background - near black */
  --bg-elevated: #141414;     /* Cards, panels */
  --bg-hover: #1a1a1a;        /* Hover states */
  --bg-active: #262626;       /* Active/pressed */
  
  /* ═══════════════════════════════════════════════════════════
     BORDERS (Subtle, structural)
     ═══════════════════════════════════════════════════════════ */
  --border-subtle: #262626;   /* Panel dividers */
  --border-default: #333333;  /* Component borders */
  
  /* ═══════════════════════════════════════════════════════════
     TEXT (High contrast but not harsh)
     ═══════════════════════════════════════════════════════════ */
  --text-primary: #f5f5f5;    /* Main content */
  --text-secondary: #a3a3a3;  /* Labels, metadata */
  --text-muted: #737373;      /* Timestamps, hints */
  --text-disabled: #525252;   /* Inactive elements */
  
  /* ═══════════════════════════════════════════════════════════
     STATUS COLORS (Semantic, not decorative)
     ═══════════════════════════════════════════════════════════ */
  --status-active: #10b981;   /* Connected, mic active - emerald */
  --status-warning: #f59e0b;  /* Reconnecting, slow - amber */
  --status-error: #ef4444;    /* Disconnected, failed - red */
  --status-info: #3b82f6;     /* Interviewer speech - blue */
  
  /* ═══════════════════════════════════════════════════════════
     ACCENT (Minimal use - only for primary actions)
     ═══════════════════════════════════════════════════════════ */
  --accent-primary: #3b82f6;  /* Primary buttons only */
  --accent-subtle: #1d4ed8;   /* Hover on primary */
}
```

## 5.2 Typography

```css
:root {
  /* ═══════════════════════════════════════════════════════════
     FONT FAMILY — System fonts for reliability
     ═══════════════════════════════════════════════════════════ */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SF Mono', 'Fira Code', Consolas, monospace;
  
  /* ═══════════════════════════════════════════════════════════
     SIZE SCALE — Limited, intentional
     ═══════════════════════════════════════════════════════════ */
  --text-xs: 0.75rem;     /* 12px - timestamps, labels */
  --text-sm: 0.875rem;    /* 14px - transcript, secondary */
  --text-base: 1rem;      /* 16px - body text */
  --text-lg: 1.125rem;    /* 18px - primary suggestion */
  --text-xl: 1.25rem;     /* 20px - emphasis only */
  
  /* ═══════════════════════════════════════════════════════════
     WEIGHT — Only 3 weights used
     ═══════════════════════════════════════════════════════════ */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  
  /* ═══════════════════════════════════════════════════════════
     LINE HEIGHT — Generous for readability
     ═══════════════════════════════════════════════════════════ */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

## 5.3 Spacing System (8px Base)

```css
:root {
  --space-1: 4px;    /* Tight internal spacing */
  --space-2: 8px;    /* Default gap */
  --space-3: 12px;   /* Component padding */
  --space-4: 16px;   /* Section padding */
  --space-6: 24px;   /* Panel padding */
  --space-8: 32px;   /* Large gaps */
}
```

## 5.4 Animation Philosophy

```css
:root {
  /* ═══════════════════════════════════════════════════════════
     DURATION — Fast, not sluggish
     ═══════════════════════════════════════════════════════════ */
  --duration-instant: 50ms;   /* Micro-feedback */
  --duration-fast: 150ms;     /* Hover states */
  --duration-normal: 200ms;   /* Transitions */
  --duration-slow: 300ms;     /* Panel reveals */
  
  /* ═══════════════════════════════════════════════════════════
     EASING — Smooth, natural
     ═══════════════════════════════════════════════════════════ */
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}

/* ═══════════════════════════════════════════════════════════
   WHAT NEVER ANIMATES
   ═══════════════════════════════════════════════════════════ */
/*
  ✗ Layout position changes
  ✗ Element size changes
  ✗ Text content changes
  ✗ Scroll position
  ✗ Anything in the primary focus area
*/

/* ═══════════════════════════════════════════════════════════
   WHAT MAY ANIMATE (Subtly)
   ═══════════════════════════════════════════════════════════ */
/*
  ✓ Color transitions (status indicators)
  ✓ Opacity transitions (fade in/out)
  ✓ Transform (hover micro-feedback)
  ✓ Cursor blink (streaming indicator)
*/
```

---

# PART 6 — FAILURE & EDGE STATE DESIGN

## 6.1 Network Slowdown

```tsx
// User sees: Nothing changes visually
// Behind scenes: Extend timeout, queue requests

function NetworkSlowState() {
  // Only show after 5+ seconds of degradation
  return (
    <div className="text-xs text-neutral-600">
      {/* Subtle, not alarming */}
      Connection slower than usual
    </div>
  );
}

// Rules:
// - Never show immediately
// - Never block UI
// - Never use red
// - Keep existing content visible
```

## 6.2 STT Failover

```tsx
// User sees: NOTHING (invisible failover)
// Behind scenes: Switch to backup provider

function STTFailover() {
  // User should never know this happened
  // No UI change
  // Continue as normal
  return null;
}

// Rules:
// - Failover must be invisible
// - No "switching providers" message
// - No interruption to transcript
// - Log for debugging only
```

## 6.3 AI Timeout

```tsx
function AITimeoutState({ seconds }: { seconds: number }) {
  // Only show after threshold
  if (seconds < 5) return <ThinkingIndicator />;
  
  if (seconds < 10) {
    return (
      <div className="text-xs text-neutral-500">
        Taking longer than usual...
      </div>
    );
  }
  
  // After 10 seconds, offer gentle guidance
  return (
    <div className="text-sm text-neutral-400">
      <p>No suggestion available for this question.</p>
      <p className="text-xs text-neutral-600 mt-1">
        Try rephrasing or continue with your own answer.
      </p>
    </div>
  );
}

// Rules:
// - Never say "error" or "failed"
// - Never blame the user
// - Always provide a path forward
// - Keep previous suggestion visible
```

## 6.4 WebSocket Reconnect

```tsx
function ReconnectState({ isReconnecting }: Props) {
  if (!isReconnecting) return null;
  
  return (
    // Bottom status bar only - not main UI
    <div className="flex items-center gap-2 text-xs text-amber-500/80">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      <span>Reconnecting...</span>
    </div>
  );
}

// Rules:
// - Show in status bar only
// - Never block main content
// - Keep all existing content visible
// - Auto-dismiss when connected
// - Never require user action
```

## 6.5 Silent Input (No Speech Detected)

```tsx
function SilentInputState({ silentSeconds }: Props) {
  // Only show after 30+ seconds of silence
  if (silentSeconds < 30) return null;
  
  return (
    <div className="text-xs text-neutral-600">
      Mic is active. Start speaking when ready.
    </div>
  );
}

// Rules:
// - Very long threshold (30s)
// - Never rush the user
// - Keep mic visualization active
// - No prompts to "click to speak"
```

## 6.6 User Tab Switch

```tsx
// When user switches tabs:
// 1. Continue processing in background
// 2. Queue any new suggestions
// 3. On return, show latest state (no animation)
// 4. Never show "welcome back" or similar

function useTabVisibility() {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // User left - continue processing silently
        pauseAnimations();
      } else {
        // User returned - resume without fanfare
        resumeAnimations();
        // Show current state immediately, no transition
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
}
```

---

# PART 7 — INTERACTION DESIGN

## 7.1 Keyboard Shortcuts

```typescript
const SHORTCUTS = {
  // Essential only - don't overwhelm
  'Escape': 'Dismiss current suggestion',
  'Space': 'Pause/resume (when not in input)',
  'Cmd+K': 'Open settings',
  'Cmd+E': 'End session',
};

// Rules:
// - Maximum 5 shortcuts
// - All should work without looking
// - Never conflict with browser defaults
// - Always show in settings, never in main UI
```

## 7.2 Hover States

```css
/* Minimal, functional hover feedback */

.interactive-element {
  transition: background-color var(--duration-fast) var(--ease-out);
}

.interactive-element:hover {
  background-color: var(--bg-hover);
}

/* No transform, no shadow, no scale */
/* Just color change */
```

## 7.3 Focus States

```css
/* High contrast for accessibility, subtle for sighted users */

.interactive-element:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* Remove default focus ring for mouse users */
.interactive-element:focus:not(:focus-visible) {
  outline: none;
}
```

## 7.4 Screen Reader Compatibility

```tsx
// Live regions for dynamic content
<div
  role="log"
  aria-live="polite"
  aria-label="Interview transcript"
>
  <TranscriptFeed />
</div>

<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  aria-label="Current suggestion"
>
  <PrimarySuggestion />
</div>

// Status announcements
<div className="sr-only" role="status">
  {connectionStatus === 'reconnecting' && 'Reconnecting to server'}
  {connectionStatus === 'connected' && 'Connected'}
</div>
```

---

# PART 8 — TRUST ENGINEERING

## 8.1 How UI Communicates Stability

| Signal | Implementation |
|--------|----------------|
| Consistent layout | Fixed positions, no reflow |
| Predictable updates | New content appears in same place |
| Visible activity | Subtle mic level, thinking dots |
| Quick response | Any input acknowledged within 100ms |
| Graceful degradation | Never blank, never error modals |

## 8.2 Subconscious Confidence Builders

```
1. DARK BACKGROUND
   - Associates with professional tools (IDE, trading)
   - Reduces perceived brightness/urgency
   - Feels "serious" not "playful"

2. MINIMAL COLOR
   - Green = working
   - No other colors competing
   - Reduces cognitive decisions

3. FIXED ZONES
   - User knows where to look
   - Eyes don't search
   - Builds muscle memory

4. RESERVED SPACE
   - Content area never collapses
   - User trusts content will appear
   - No anxiety about "empty state"

5. CONTINUOUS FEEDBACK
   - Mic level always visible
   - Connection always visible
   - Never "is this working?"
```

## 8.3 Cognitive Load Reduction

```
RULE 1: One focal point
- Primary suggestion is THE thing
- Everything else is peripheral

RULE 2: No decisions during interview
- No modals asking "are you sure?"
- No options to configure
- No choices to make

RULE 3: Progressive disclosure
- Settings hidden until needed
- History collapsed by default
- Advanced features invisible

RULE 4: No visual competition
- Transcript is visually quieter than suggestion
- Status bar is barely noticeable
- Controls are ghost-like
```

---

# PART 9 — RED FLAGS (WHAT KILLS TRUST)

## 9.1 Common Founder Mistakes

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Animated AI "thinking" blob | Draws attention away from content | Static dots only |
| Gradient backgrounds | Looks like marketing, not tool | Solid dark color |
| Floating/bouncing elements | Triggers anxiety | Everything fixed |
| Progress bars for AI | Creates time pressure | Simple dots |
| "AI is thinking..." modal | Blocks user, creates waiting | Inline indicator |
| Sound effects | Startles user | Complete silence |
| Emoji in suggestions | Unprofessional, breaks trust | Text only |
| Multiple font colors | Visual chaos | 3 colors max |
| Scroll-triggered animations | Distracting during stress | No animations |

## 9.2 Visual Patterns That Kill Trust

```
✗ Suggestions that disappear before being read
✗ Text that replaces itself mid-sentence
✗ Loading spinners in the main content area
✗ Flashing or pulsing status indicators
✗ Color changes that demand attention
✗ Elements that resize based on content
✗ Scroll position that changes unexpectedly
✗ Error messages with red backgrounds
✗ Modal dialogs of any kind during session
✗ "New suggestion available" notifications
```

## 9.3 Layout Behaviors That Increase Anxiety

```
✗ Content that jumps when new text arrives
✗ Panels that resize based on content length
✗ Scroll bars that appear/disappear
✗ Font size that changes based on content
✗ Buttons that move position
✗ Status bar that slides in/out
✗ Side panels that collapse/expand
✗ Any animation longer than 200ms
```

## 9.4 Instant Abandonment Triggers

```
1. App freezes for >3 seconds during speech
2. Suggestion is completely wrong/irrelevant
3. User feels MORE stressed than without tool
4. Visible error message during interview
5. Audio feedback (any sound)
6. Request to "click to continue"
7. Suggestion arrives after user already answered
8. UI looks "beta" or "unfinished"
```

---

# PART 10 — IMPLEMENTATION CHECKLIST

## Before Launch

```
□ All animations disabled in main content area
□ Layout tested with 500+ character suggestions
□ Layout tested with empty suggestion state
□ All error states show graceful fallback
□ Failover states are invisible to user
□ No modals or dialogs during session
□ All status indicators use same position
□ Keyboard navigation works fully
□ Screen reader announces all updates
□ Dark mode is the only mode
□ No gradient or glow effects anywhere
□ Font is system font (fast load)
□ Maximum 3 colors in main UI
□ Mic level visualization is always visible
□ Connection status is always visible
```

## After Each Session (Validation)

```
□ User never asked "is it working?"
□ User never had to scroll to see suggestion
□ User never saw a loading spinner
□ User never saw an error dialog
□ User never heard a sound
□ User never had to click during interview
□ User knew where to look at all times
□ UI felt "stable" not "busy"
```

---

**Document Status:** Production-ready specification  
**Design Philosophy:** Calm, clarity, confidence  
**Primary Metric:** User never doubts if system is working  
**Created:** February 28, 2026
