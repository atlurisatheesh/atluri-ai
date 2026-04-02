import path from "path";
import { app, BrowserWindow, globalShortcut, ipcMain, screen, desktopCapturer, nativeImage, shell } from "electron";
import { startWindowsLoopback, type LoopbackStartParams } from "./loopback/win_loopback";
import Store from "electron-store";
import { createServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket as WsSocket } from "ws";
import { exec } from "child_process";
import { StealthEngine, type ThreatLevel, type ProctoringDetection, type StealthHealthReport } from "./stealth_engine";
import { AntiDetectionEngine } from "./anti_detection";

const DEFAULT_FRONTEND_URL = process.env.DESKTOP_FRONTEND_URL || "http://localhost:3001";
const OPEN_DEVTOOLS = String(process.env.DESKTOP_OPEN_DEVTOOLS || "").toLowerCase() === "true";
// Content protection defaults OFF — can cause click/input issues on some Windows versions
// Set DESKTOP_OVERLAY_CONTENT_PROTECTION=true to enable
const OVERLAY_CONTENT_PROTECTION = String(process.env.DESKTOP_OVERLAY_CONTENT_PROTECTION || "false").toLowerCase() === "true";

// ═══════════════════════════════════════════════════════════
// ELECTRON-STORE: Encrypted persistent settings
// Stores API keys, resume/JD, hotkey config, preferences
// ═══════════════════════════════════════════════════════════
interface StoreSchema {
  apiKeys: {
    openai: string;
    claude: string;
  };
  resume: string;
  jobDescription: string;
  hotkeys: {
    toggleOverlay: string;
    captureScreen: string;
    toggleMic: string;
    toggleAi: string;
    toggleClickThrough: string;
    quit: string;
  };
  preferences: {
    opacity: number;
    responseLength: string;
    language: string;
    processTime: string;
    fillerWords: boolean;
    threshold: number;
    processName: string;
    autoRead: boolean;
  };
  personas: Array<{
    id: string;
    name: string;
    systemPrompt: string;
    icon: string;
  }>;
  activePersona: string;
  sessionSetup: {
    scenario: string;
    company: string;
    position: string;
    objective: string;
    industry: string;
    experience: string;
    companyResearch: string;
    imageContext: string;
    model: string;
    coachStyle: string;
    coachEnabled: boolean;
    mode: string;
  };
}

const store = new Store<StoreSchema>({
  name: "atluriin-settings",
  encryptionKey: "atluriin-practice-v1-enc-key",
  defaults: {
    apiKeys: { openai: "", claude: "" },
    resume: "",
    jobDescription: "",
    hotkeys: {
      toggleOverlay: "CommandOrControl+Shift+H",
      captureScreen: "CommandOrControl+Shift+S",
      toggleMic: "CommandOrControl+Shift+M",
      toggleAi: "CommandOrControl+Shift+P",
      toggleClickThrough: "CommandOrControl+Shift+T",
      quit: "CommandOrControl+Shift+Q",
    },
    preferences: {
      opacity: 100,
      responseLength: "default",
      language: "",
      processTime: "fast",
      fillerWords: false,
      threshold: 50,
      processName: "",
      autoRead: false,
    },
    personas: [
      { id: "default", name: "Interview Coach", systemPrompt: "You are an expert interview coach. Provide concise, actionable STAR-format answers.", icon: "🎯" },
      { id: "technical", name: "Technical Expert", systemPrompt: "You are a senior staff engineer. Give precise technical answers with code examples and complexity analysis.", icon: "💻" },
      { id: "behavioral", name: "Behavioral Coach", systemPrompt: "You are a behavioral interview specialist. Structure every answer using STAR format with quantified results.", icon: "🌟" },
      { id: "executive", name: "Executive Advisor", systemPrompt: "You are an executive communication coach. Provide strategic, high-level answers with business impact framing.", icon: "👔" },
      { id: "casual", name: "Casual Friend", systemPrompt: "You are a friendly colleague helping practice. Keep it conversational, relaxed, and encouraging.", icon: "😊" },
    ],
    activePersona: "default",
    sessionSetup: {
      scenario: "general",
      company: "",
      position: "",
      objective: "",
      industry: "default",
      experience: "mid",
      companyResearch: "",
      imageContext: "",
      model: "general",
      coachStyle: "balanced",
      coachEnabled: true,
      mode: "live",
    },
  },
});

function log(...args: Array<string | number | boolean | null | undefined>) {
  // Electron main-process logs go to the launching terminal.
  // Keep it simple and parseable.
  // eslint-disable-next-line no-console
  console.log("[desktop]", ...args);
}

// ═══════════════════════════════════════════════════════════
// STEALTH: macOS ScreenCaptureKit bypass — MUST be called before app.whenReady()
// Prevents macOS Ventura/Sonoma+ from capturing through content protection.
// ═══════════════════════════════════════════════════════════
app.commandLine.appendSwitch("disable-features", "IOSurfaceCapturer,DesktopCaptureMacV2");

// Enable remote debugging for Playwright E2E automation
// Always enable in development if E2E_TEST env var is set
if (process.argv.includes("--e2e") || process.env.E2E_TEST === "1") {
  app.commandLine.appendSwitch("remote-debugging-port", "9333");
  console.log("[desktop] Remote debugging enabled on port 9333");
}

// Some Windows environments deny Chromium cache/quota DB writes in default locations.
// Force userData + disk cache to a known-writable AppData folder.
try {
  const base = path.join(app.getPath("appData"), "AtluriInPractice");
  app.setPath("userData", path.join(base, "userData"));
  app.commandLine.appendSwitch("disk-cache-dir", path.join(base, "cache"));
  app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
} catch {
}

process.on("uncaughtException", (err) => {
  log("uncaughtException", String(err?.stack || err));
});

process.on("unhandledRejection", (reason) => {
  log("unhandledRejection", String((reason as any)?.stack || reason));
});

let appWindow: BrowserWindow | null = null;
let overlayWindow: BrowserWindow | null = null;
let overlayInteractive = true; // tracks whether overlay accepts mouse input
let micMuted = false;
let aiPaused = false;

// --- Recording Detection Logic ---

// Helper to check for capture state (customize as needed)
function checkCaptureState(sources: Electron.DesktopCapturerSource[]): boolean {
  // Example: look for known recording/capture software or generic triggers
  // This is a placeholder; you may want to check source names/types
  return sources.some(src => /obs|zoom|record|capture/i.test(src.name));
}

function startRecordingDetection() {
  setInterval(async () => {
    if (!overlayWindow) return;
    const sources = await desktopCapturer.getSources({ types: ["window", "screen"] });
    const isRecording = checkCaptureState(sources);
    overlayWindow.webContents.send('recording-state-changed', isRecording);
  }, 1000);
}
let overlayContentProtectionEnabled = OVERLAY_CONTENT_PROTECTION;

let overlayStealthEnabled = false;
let overlayOpacity = 1.0;

let loopbackSession: { stop: () => Promise<void>; onMessage: (handler: (type: string, data: any) => void) => void; injectTranscript: (text: string) => void; _sendScreenshot: (base64: string) => void; _sendScreenMonitor: (base64: string) => void } | null = null;

// (Auto-capture is now question-triggered — see loopbackSession.onMessage handler)

// ═══════════════════════════════════════════════════════════
// STEALTH ENGINE v2.0 + ANTI-DETECTION ENGINE
// ═══════════════════════════════════════════════════════════
const stealthEngine = new StealthEngine({
  enableProctoringDetection: true,
  enableWindowCloaking: true,
  enableProcessMasking: true,
  enableAutoEvasion: true,
  scanIntervalMs: 3000,
  threatCallback: (detection: ProctoringDetection) => {
    if (overlayWindow) {
      overlayWindow.webContents.send("stealth:threatDetected", detection);
    }
  },
  evasionCallback: (threatLevel: ThreatLevel) => {
    if (overlayWindow) {
      overlayWindow.webContents.send("stealth:threatLevelChanged", threatLevel);
    }
  },
});

const antiDetectionEngine = new AntiDetectionEngine();

// Stealth Engine IPC handlers
ipcMain.handle("stealth:getHealth", async () => {
  return stealthEngine.getHealthReport();
});

ipcMain.handle("stealth:getThreatLevel", async () => {
  return stealthEngine.getThreatLevel();
});

ipcMain.handle("stealth:getActiveThreats", async () => {
  return stealthEngine.getActiveThreats();
});

ipcMain.handle("stealth:applyAntiDetection", async () => {
  if (!appWindow) return { ok: false, error: "no app window" };
  try {
    await antiDetectionEngine.applyToWindow(appWindow);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("overlay:getContentProtection", async () => {
  return Boolean(overlayContentProtectionEnabled);
});

ipcMain.handle("overlay:setContentProtection", async (_event, enabled: boolean) => {
  overlayContentProtectionEnabled = Boolean(enabled);
  if (!overlayWindow) return Boolean(overlayContentProtectionEnabled);
  try {
    overlayWindow.setContentProtection(overlayContentProtectionEnabled);
    log("overlay content protection set", overlayContentProtectionEnabled);
  } catch (e) {
    log("overlay content protection failed", String((e as any)?.message || e));
  }
  return Boolean(overlayContentProtectionEnabled);
});

ipcMain.handle(
  "overlay:setStealth",
  async (_event, payload: { enabled?: boolean; opacity?: number } | undefined) => {
    const enabled = Boolean(payload?.enabled);
    const requestedOpacity = typeof payload?.opacity === "number" ? payload.opacity : overlayOpacity;
    const safeOpacity = Math.max(0.1, Math.min(1.0, requestedOpacity));

    overlayStealthEnabled = enabled;
    overlayOpacity = safeOpacity;

    if (!overlayWindow) {
      return { enabled: overlayStealthEnabled, opacity: overlayOpacity };
    }

    try {
      // Stealth mode ONLY changes opacity - window stays clickable.
      // This ensures users can always access controls.
      overlayWindow.setOpacity(overlayOpacity);
      log("overlay stealth set", overlayStealthEnabled, "opacity", overlayOpacity);
    } catch (e) {
      log("overlay stealth failed", String((e as any)?.message || e));
    }

    return { enabled: overlayStealthEnabled, opacity: overlayOpacity };
  }
);

ipcMain.handle("overlay:getStealth", async () => {
  return { enabled: overlayStealthEnabled, opacity: overlayOpacity };
});

// Dynamic mouse passthrough for click-through overlay when not hovered
ipcMain.handle("overlay:setMousePassthrough", async (_event, passthrough: boolean) => {
  if (!overlayWindow) return;
  try {
    if (Boolean(passthrough)) {
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      overlayWindow.setIgnoreMouseEvents(false);
    }
  } catch (e) {
    log("overlay:setMousePassthrough failed", String((e as any)?.message || e));
  }
});

// Minimize overlay (hide it)
ipcMain.handle("overlay:minimize", async () => {
  if (!overlayWindow) return;
  overlayWindow.hide();
  log("overlay minimized");
});

// Close overlay (hide, not quit - use Ctrl+Shift+Q to quit app)
ipcMain.handle("overlay:close", async () => {
  log("overlay close requested — quitting app");
  app.quit();
});

// Manual window drag - get current position
ipcMain.handle("overlay:getPosition", async () => {
  if (!overlayWindow) return { x: 0, y: 0 };
  const [x, y] = overlayWindow.getPosition();
  return { x, y };
});

// Manual window drag - set new position
ipcMain.handle("overlay:setPosition", async (_event, payload: { x: number; y: number }) => {
  if (!overlayWindow) return;
  overlayWindow.setPosition(Math.round(payload.x), Math.round(payload.y));
});

// ═══════════════════════════════════════════════════════════
// SCREEN CAPTURE — region crop + full screen
// ═══════════════════════════════════════════════════════════
ipcMain.handle("capture:fullScreen", async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    if (!sources.length) return { ok: false, error: "no screen sources" };
    const img = sources[0].thumbnail;
    const base64 = img.toPNG().toString("base64");
    return { ok: true, base64, width: img.getSize().width, height: img.getSize().height };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("capture:region", async (_event, payload: { x: number; y: number; width: number; height: number }) => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    if (!sources.length) return { ok: false, error: "no screen sources" };
    const img = sources[0].thumbnail;
    // Crop to the requested region
    const cropped = img.crop({
      x: Math.round(payload.x),
      y: Math.round(payload.y),
      width: Math.round(payload.width),
      height: Math.round(payload.height),
    });
    const base64 = cropped.toPNG().toString("base64");
    return { ok: true, base64, width: cropped.getSize().width, height: cropped.getSize().height };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("capture:startRegionSelect", async () => {
  // Temporarily make overlay interactive + focusable for drag selection
  if (!overlayWindow) return;
  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.setFocusable(true);
  overlayWindow.focus();
  overlayWindow.webContents.send("capture:enterRegionSelect");
});

ipcMain.handle("capture:endRegionSelect", async () => {
  // Restore overlay state after region selection completes
  if (!overlayWindow) return;
  if (!overlayInteractive) {
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  }
});

// Instant full-screen capture + send to backend for AI vision analysis (no mouse)
ipcMain.handle("capture:analyzeFullScreen", async () => {
  try {
    await captureAndAnalyze();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
});

// ═══════════════════════════════════════════════════════════
// MIC + AI TOGGLE state (forwarded to renderer)
// ═══════════════════════════════════════════════════════════
ipcMain.handle("control:getMicMuted", async () => micMuted);
ipcMain.handle("control:getAiPaused", async () => aiPaused);

ipcMain.handle("auth:getAccessToken", async () => {
  if (!appWindow) return null;
  try {
    // Supabase stores session JSON in a localStorage key like: sb-<project-ref>-auth-token
    // We search for that key shape to extract access_token.
    const token = await appWindow.webContents.executeJavaScript(
      `(() => {
        try {
          const keys = Object.keys(window.localStorage || {});
          const candidates = keys.filter(k => /^sb-[A-Za-z0-9-]+-auth-token$/.test(k));
          for (const k of candidates) {
            const raw = window.localStorage.getItem(k);
            if (!raw) continue;
            let data = null;
            try { data = JSON.parse(raw); } catch { continue; }
            const access = data?.access_token || data?.currentSession?.access_token || data?.session?.access_token;
            if (typeof access === 'string' && access.length > 20) return access;
          }
          return null;
        } catch {
          return null;
        }
      })()`
    );
    return typeof token === "string" ? token : null;
  } catch (e) {
    log("auth:getAccessToken failed", String((e as any)?.message || e));
    return null;
  }
});

// ═══════════════════════════════════════════════════════════
// APP WINDOW CONTROLS — hide during session so only overlay shows
// ═══════════════════════════════════════════════════════════
ipcMain.handle("app:hide", async () => {
  if (appWindow && !appWindow.isDestroyed()) appWindow.hide();
  return { ok: true };
});

ipcMain.handle("app:show", async () => {
  if (appWindow && !appWindow.isDestroyed()) {
    appWindow.show();
    appWindow.focus();
  }
  return { ok: true };
});

ipcMain.handle("app:minimize", async () => {
  if (appWindow && !appWindow.isDestroyed()) appWindow.minimize();
  return { ok: true };
});

ipcMain.handle("loopback:start", async (_event, payload: LoopbackStartParams) => {
  if (loopbackSession) {
    return { ok: true, message: "loopback already running" };
  }
  try {
    loopbackSession = await startWindowsLoopback(payload);

    // Forward backend WS messages to overlay
    loopbackSession.onMessage((type, data) => {
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send("ws:message", { type, data });
      }
    });

    // ── SCREEN MONITOR: Periodic capture + change detection ──
    // Detects when interviewer sends a question in chat, shares a problem,
    // or shows anything new on screen. Sends changed frames to backend
    // where GPT-4o vision identifies questions and generates answers.
    let screenMonitorTimer: ReturnType<typeof setInterval> | null = null;
    let lastScreenHash = "";

    const simpleHash = (buf: Buffer): string => {
      // Fast pixel-sample hash: sample every ~4000th byte for change detection
      let h = 0;
      const step = Math.max(1, Math.floor(buf.length / 512));
      for (let i = 0; i < buf.length; i += step) {
        h = ((h << 5) - h + buf[i]) | 0;
      }
      return h.toString(36);
    };

    const captureScreenOnce = async () => {
      if (!loopbackSession) return;
      try {
        const sources = await desktopCapturer.getSources({
          types: ["screen"],
          thumbnailSize: { width: 1920, height: 1080 },
        });
        if (!sources.length) return;
        const img = sources[0].thumbnail;
        const pngBuf = img.toPNG();
        const hash = simpleHash(pngBuf);

        // Only send if screen actually changed
        if (hash === lastScreenHash) return;
        lastScreenHash = hash;

        const base64 = pngBuf.toString("base64");
        log("screen-monitor: change detected, sending frame (%d KB)", Math.round(base64.length / 1024));

        // Send as screen_monitor type — backend uses GPT-4o vision to detect questions
        if (loopbackSession) {
          loopbackSession._sendScreenMonitor(base64);
        }

        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.webContents.send("capture:taken", {
            width: img.getSize().width,
            height: img.getSize().height,
            auto: true,
            monitor: true,
          });
        }
      } catch (e: any) {
        log("screen-monitor capture failed:", String(e?.message || e));
      }
    };

    // Start monitoring every 3 seconds
    screenMonitorTimer = setInterval(captureScreenOnce, 3000);
    log("screen-monitor started (3s interval, change-detection enabled)");

    // Store cleanup reference for loopback:stop
    (loopbackSession as any)._stopScreenMonitor = () => {
      if (screenMonitorTimer) {
        clearInterval(screenMonitorTimer);
        screenMonitorTimer = null;
        log("screen-monitor stopped");
      }
    };

    return { ok: true };
  } catch (e: any) {
    loopbackSession = null;
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("loopback:stop", async () => {
  if (!loopbackSession) return { ok: true };
  try {
    // Stop screen monitor first
    (loopbackSession as any)._stopScreenMonitor?.();
    await loopbackSession.stop();
  } catch {
  } finally {
    loopbackSession = null;
  }
  return { ok: true };
});

// Inject a text transcript into the loopback WS (for testing / TTS-based interview)
ipcMain.handle("loopback:injectTranscript", async (_event, text: string) => {
  if (!loopbackSession) return { ok: false, error: "loopback not running" };
  try {
    loopbackSession.injectTranscript(text);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
});

// ═══════════════════════════════════════════════════════════
// PERSISTENT SETTINGS via electron-store (encrypted)
// ═══════════════════════════════════════════════════════════

// Generic store get/set
ipcMain.handle("settings:get", async (_event, key: string) => {
  try {
    return store.get(key as keyof StoreSchema);
  } catch {
    return null;
  }
});

ipcMain.handle("settings:set", async (_event, key: string, value: any) => {
  try {
    store.set(key as keyof StoreSchema, value);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
});

// API Keys
ipcMain.handle("settings:getApiKeys", async () => {
  return store.get("apiKeys", { openai: "", claude: "" });
});

ipcMain.handle("settings:setApiKeys", async (_event, keys: { openai?: string; claude?: string }) => {
  const current = store.get("apiKeys", { openai: "", claude: "" });
  store.set("apiKeys", {
    openai: typeof keys.openai === "string" ? keys.openai : current.openai,
    claude: typeof keys.claude === "string" ? keys.claude : current.claude,
  });
  log("API keys updated");
  return { ok: true };
});

// Resume & Job Description
ipcMain.handle("settings:getResume", async () => {
  return store.get("resume", "");
});

ipcMain.handle("settings:setResume", async (_event, text: string) => {
  store.set("resume", String(text || ""));
  return { ok: true };
});

ipcMain.handle("settings:getJobDescription", async () => {
  return store.get("jobDescription", "");
});

ipcMain.handle("settings:setJobDescription", async (_event, text: string) => {
  store.set("jobDescription", String(text || ""));
  return { ok: true };
});

// Preferences
ipcMain.handle("settings:getPreferences", async () => {
  return store.get("preferences");
});

ipcMain.handle("settings:setPreferences", async (_event, prefs: Partial<StoreSchema["preferences"]>) => {
  const current = store.get("preferences");
  store.set("preferences", { ...current, ...prefs });
  return { ok: true };
});

// Hotkey config
ipcMain.handle("settings:getHotkeys", async () => {
  return store.get("hotkeys");
});

ipcMain.handle("settings:setHotkeys", async (_event, hotkeys: Partial<StoreSchema["hotkeys"]>) => {
  const current = store.get("hotkeys");
  const updated = { ...current, ...hotkeys };
  store.set("hotkeys", updated);
  // Re-register hotkeys with new bindings
  reregisterHotkeys(updated);
  return { ok: true };
});

// All settings at once (for bulk load/save)
ipcMain.handle("settings:getAll", async () => {
  return {
    apiKeys: store.get("apiKeys"),
    resume: store.get("resume"),
    jobDescription: store.get("jobDescription"),
    hotkeys: store.get("hotkeys"),
    preferences: store.get("preferences"),
  };
});

ipcMain.handle("settings:setAll", async (_event, data: Partial<StoreSchema>) => {
  if (data.apiKeys) store.set("apiKeys", data.apiKeys);
  if (typeof data.resume === "string") store.set("resume", data.resume);
  if (typeof data.jobDescription === "string") store.set("jobDescription", data.jobDescription);
  if (data.hotkeys) {
    store.set("hotkeys", data.hotkeys);
    reregisterHotkeys(data.hotkeys);
  }
  if (data.preferences) {
    const current = store.get("preferences");
    store.set("preferences", { ...current, ...data.preferences });
  }
  if (data.sessionSetup) {
    const current = store.get("sessionSetup");
    store.set("sessionSetup", { ...current, ...data.sessionSetup });
  }
  return { ok: true };
});

// ═══════════════════════════════════════════════════════════
// FEATURE 3: DUAL MONITOR SMART ROUTING
// Detects all displays and moves overlay to secondary monitor
// ═══════════════════════════════════════════════════════════
ipcMain.handle("display:getAll", async () => {
  const displays = screen.getAllDisplays();
  return displays.map((d, i) => ({
    id: d.id,
    label: `Display ${i + 1} (${d.size.width}x${d.size.height})`,
    bounds: d.bounds,
    isPrimary: d.bounds.x === 0 && d.bounds.y === 0,
  }));
});

ipcMain.handle("display:moveToDisplay", async (_event, displayId: number) => {
  if (!overlayWindow) return { ok: false, error: "no overlay" };
  const displays = screen.getAllDisplays();
  const target = displays.find(d => d.id === displayId);
  if (!target) return { ok: false, error: "display not found" };
  const [, ] = overlayWindow.getSize();
  overlayWindow.setPosition(target.bounds.x + 20, target.bounds.y + 20);
  log("overlay moved to display", String(displayId));
  return { ok: true };
});

ipcMain.handle("display:moveToSecondary", async () => {
  if (!overlayWindow) return { ok: false, error: "no overlay" };
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const secondary = displays.find(d => d.id !== primary.id);
  if (!secondary) return { ok: false, error: "no secondary display" };
  overlayWindow.setPosition(secondary.bounds.x + 20, secondary.bounds.y + 20);
  log("overlay moved to secondary display");
  return { ok: true };
});

// ═══════════════════════════════════════════════════════════
// FEATURE 5: PERSONA SWITCHING
// Preset prompt personas stored in electron-store
// ═══════════════════════════════════════════════════════════
ipcMain.handle("persona:getAll", async () => {
  return store.get("personas");
});

ipcMain.handle("persona:setAll", async (_event, personas: StoreSchema["personas"]) => {
  store.set("personas", personas);
  return { ok: true };
});

ipcMain.handle("persona:getActive", async () => {
  return store.get("activePersona");
});

ipcMain.handle("persona:setActive", async (_event, id: string) => {
  store.set("activePersona", String(id));
  // Notify renderer of persona change
  if (overlayWindow) {
    const personas = store.get("personas");
    const active = personas.find(p => p.id === id);
    overlayWindow.webContents.send("persona:changed", active || null);
  }
  log("active persona set to", id);
  return { ok: true };
});

ipcMain.handle("persona:add", async (_event, persona: StoreSchema["personas"][0]) => {
  const current = store.get("personas");
  current.push(persona);
  store.set("personas", current);
  return { ok: true };
});

ipcMain.handle("persona:remove", async (_event, id: string) => {
  const current = store.get("personas");
  store.set("personas", current.filter(p => p.id !== id));
  if (store.get("activePersona") === id) store.set("activePersona", "default");
  return { ok: true };
});

// ═══════════════════════════════════════════════════════════
// FEATURE 8: BLACKHOLE AUTO-INSTALLER (macOS)
// Detects if BlackHole is installed, offers auto-install
// ═══════════════════════════════════════════════════════════
ipcMain.handle("blackhole:check", async () => {
  if (process.platform !== "darwin") return { installed: false, platform: "non-mac" };
  return new Promise<{ installed: boolean; platform: string }>((resolve) => {
    exec("system_profiler SPAudioDataType 2>/dev/null | grep -i blackhole", (err, stdout) => {
      resolve({ installed: !err && stdout.toLowerCase().includes("blackhole"), platform: "darwin" });
    });
  });
});

ipcMain.handle("blackhole:install", async () => {
  if (process.platform !== "darwin") return { ok: false, error: "macOS only" };
  try {
    // Try Homebrew first
    exec("which brew", (err) => {
      if (!err) {
        exec("brew install blackhole-2ch", (brewErr) => {
          if (brewErr) {
            // Fallback: open download page
            shell.openExternal("https://existential.audio/blackhole/");
          }
        });
      } else {
        shell.openExternal("https://existential.audio/blackhole/");
      }
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
});

// ═══════════════════════════════════════════════════════════
// FEATURE 9: PHONE MIRROR MODE
// WebSocket server that mobile PWA connects to for live data
// ═══════════════════════════════════════════════════════════
let mirrorServer: ReturnType<typeof createServer> | null = null;
let mirrorWss: WebSocketServer | null = null;
let mirrorClients: Set<WsSocket> = new Set();
const MIRROR_PORT = 8765;

function broadcastToMirror(data: any) {
  const msg = JSON.stringify(data);
  for (const client of mirrorClients) {
    if (client.readyState === WsSocket.OPEN) {
      try { client.send(msg); } catch {}
    }
  }
}

ipcMain.handle("mirror:start", async () => {
  if (mirrorServer) return { ok: true, port: MIRROR_PORT, message: "already running" };
  try {
    mirrorServer = createServer();
    mirrorWss = new WebSocketServer({ server: mirrorServer });
    mirrorWss.on("connection", (ws: WsSocket) => {
      mirrorClients.add(ws);
      log("mirror client connected, total:", String(mirrorClients.size));
      ws.on("close", () => {
        mirrorClients.delete(ws);
        log("mirror client disconnected, total:", String(mirrorClients.size));
      });
      // Send current state snapshot
      ws.send(JSON.stringify({ type: "snapshot", personas: store.get("personas"), activePersona: store.get("activePersona") }));
    });
    mirrorServer.listen(MIRROR_PORT, "0.0.0.0");
    log("mirror server started on port", String(MIRROR_PORT));
    return { ok: true, port: MIRROR_PORT };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("mirror:stop", async () => {
  for (const c of mirrorClients) try { c.close(); } catch {}
  mirrorClients.clear();
  mirrorWss?.close();
  mirrorServer?.close();
  mirrorWss = null;
  mirrorServer = null;
  log("mirror server stopped");
  return { ok: true };
});

ipcMain.handle("mirror:getStatus", async () => {
  return { running: !!mirrorServer, port: MIRROR_PORT, clients: mirrorClients.size };
});

ipcMain.handle("mirror:broadcast", async (_event, data: any) => {
  broadcastToMirror(data);
  return { ok: true };
});

// ═══════════════════════════════════════════════════════════
// FEATURE 10: OFFLINE LOCAL AI (Ollama)
// Check if Ollama is running, pull models, generate responses
// ═══════════════════════════════════════════════════════════
ipcMain.handle("ollama:check", async () => {
  try {
    const { net } = require("electron");
    const request = net.request("http://localhost:11434/api/tags");
    return new Promise<{ available: boolean; models: string[] }>((resolve) => {
      let body = "";
      request.on("response", (response: any) => {
        response.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        response.on("end", () => {
          try {
            const data = JSON.parse(body);
            const models = (data?.models || []).map((m: any) => m.name);
            resolve({ available: true, models });
          } catch {
            resolve({ available: true, models: [] });
          }
        });
      });
      request.on("error", () => resolve({ available: false, models: [] }));
      request.end();
    });
  } catch {
    return { available: false, models: [] };
  }
});

ipcMain.handle("ollama:pull", async (_event, model: string) => {
  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    exec(`ollama pull ${model}`, { timeout: 300000 }, (err) => {
      resolve(err ? { ok: false, error: String(err.message) } : { ok: true });
    });
  });
});

ipcMain.handle("ollama:generate", async (_event, payload: { model: string; prompt: string; system?: string }) => {
  try {
    const { net } = require("electron");
    const request = net.request({
      method: "POST",
      url: "http://localhost:11434/api/generate",
    });
    return new Promise<{ ok: boolean; text?: string; error?: string }>((resolve) => {
      let body = "";
      request.on("response", (response: any) => {
        response.on("data", (chunk: Buffer) => { body += chunk.toString(); });
        response.on("end", () => {
          try {
            // Ollama streams NDJSON; extract all response fields
            const lines = body.split("\n").filter(Boolean);
            const texts = lines.map(l => { try { return JSON.parse(l).response || ""; } catch { return ""; } });
            resolve({ ok: true, text: texts.join("") });
          } catch {
            resolve({ ok: false, error: "parse error" });
          }
        });
      });
      request.on("error", (e: Error) => resolve({ ok: false, error: e.message }));
      request.write(JSON.stringify({
        model: payload.model || "phi4-mini",
        prompt: payload.prompt,
        system: payload.system || "",
        stream: false,
      }));
      request.end();
    });
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
});

// ═══════════════════════════════════════════════════════════
// FEATURE 12: KEYSTROKE GHOST MODE
// Simulates typing with human-speed delays using OS-native input
// ═══════════════════════════════════════════════════════════
ipcMain.handle("ghost:typeText", async (_event, payload: { text: string; wpm?: number }) => {
  const text = String(payload.text || "");
  const wpm = Math.max(20, Math.min(200, payload.wpm || 85));
  const charDelayMs = Math.round(60000 / (wpm * 5)); // avg 5 chars per word

  if (process.platform === "win32") {
    // Windows: Use PowerShell SendKeys with human-speed delays
    const escaped = text.replace(/'/g, "''").replace(/[+^%~(){}[\]]/g, "{$&}");
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      $text = '${escaped}'
      foreach ($char in $text.ToCharArray()) {
        [System.Windows.Forms.SendKeys]::SendWait($char.ToString())
        Start-Sleep -Milliseconds ${charDelayMs}
        # Add random jitter (±30ms) for human-like feel
        Start-Sleep -Milliseconds (Get-Random -Minimum 0 -Maximum 60)
      }
    `;
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      exec(`powershell -NoProfile -Command "${psScript.replace(/"/g, '\\"')}"`, { timeout: text.length * (charDelayMs + 100) + 5000 }, (err) => {
        resolve(err ? { ok: false, error: String(err.message) } : { ok: true });
      });
    });
  } else if (process.platform === "darwin") {
    // macOS: Use AppleScript
    const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const script = `
      tell application "System Events"
        set theText to "${escaped}"
        repeat with i from 1 to count of characters of theText
          keystroke (character i of theText)
          delay ${(charDelayMs / 1000).toFixed(3)}
        end repeat
      end tell
    `;
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      exec(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`, { timeout: text.length * (charDelayMs + 100) + 5000 }, (err) => {
        resolve(err ? { ok: false, error: String(err.message) } : { ok: true });
      });
    });
  } else {
    // Linux: Use xdotool
    const escaped = text.replace(/'/g, "'\"'\"'");
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      exec(`xdotool type --delay ${charDelayMs} '${escaped}'`, { timeout: text.length * (charDelayMs + 100) + 5000 }, (err) => {
        resolve(err ? { ok: false, error: String(err.message) } : { ok: true });
      });
    });
  }
});

ipcMain.handle("ghost:typeStop", async () => {
  // Kill any running PowerShell/AppleScript/xdotool typing process
  if (process.platform === "win32") {
    exec("taskkill /F /IM powershell.exe /FI \"WINDOWTITLE eq ghost*\"", () => {});
  }
  return { ok: true };
});

function createAppWindow() {
  appWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  appWindow.on("ready-to-show", () => {
    appWindow?.show();
    if (OPEN_DEVTOOLS) appWindow?.webContents.openDevTools({ mode: "detach" });
  });

  appWindow.webContents.on("did-fail-load", (_ev, code, desc, url) => {
    log("app window did-fail-load", code, desc, url);
  });

  const url = `${DEFAULT_FRONTEND_URL.replace(/\/+$/g, "")}/app`;
  log("loading app URL", url);
  void appWindow.loadURL(url);
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 420,
    height: 700,
    show: false,
    frame: false,
    resizable: true,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Keep above other windows but at a level that allows input
  overlayWindow.setAlwaysOnTop(true, "floating");

  // Phase 4: Alt-Tab invisibility + taskbar hiding + content protection
  overlayWindow.setSkipTaskbar(true);
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  if (OVERLAY_CONTENT_PROTECTION) {
    overlayWindow.setContentProtection(true);
  }
  log("overlay stealth hardening applied (skipTaskbar, allWorkspaces, contentProtection)");

  overlayWindow.on("ready-to-show", () => {
    overlayWindow?.show();
    overlayWindow?.focus(); // Ensure window gets input focus on Windows
    if (OPEN_DEVTOOLS) overlayWindow?.webContents.openDevTools({ mode: "detach" });
  });

  overlayWindow.webContents.on("did-fail-load", (_ev, code, desc, url) => {
    log("overlay did-fail-load", code, desc, url);
    // Fallback: if frontend is unavailable, load the standalone HTML
    const htmlPath = path.join(__dirname, "renderer", "index.html");
    log("falling back to standalone overlay HTML", htmlPath);
    void overlayWindow?.loadFile(htmlPath);
  });

  // Load the Next.js /overlay route (same React components as the web app)
  const overlayUrl = `${DEFAULT_FRONTEND_URL.replace(/\/+$/g, "")}/overlay`;
  log("loading overlay URL", overlayUrl);
  void overlayWindow.loadURL(overlayUrl);
}

function toggleOverlay() {
  if (!overlayWindow) return;
  if (overlayWindow.isVisible()) overlayWindow.hide();
  else overlayWindow.show();
}

function nudgeOverlay(dx: number, dy: number) {
  if (!overlayWindow) return;
  const [x, y] = overlayWindow.getPosition();
  overlayWindow.setPosition(x + dx, y + dy);
}

function toggleMic() {
  micMuted = !micMuted;
  if (overlayWindow) {
    overlayWindow.webContents.send("control:micMuted", micMuted);
  }
  log("mic", micMuted ? "muted" : "unmuted");
}

function toggleAi() {
  aiPaused = !aiPaused;
  if (overlayWindow) {
    overlayWindow.webContents.send("control:aiPaused", aiPaused);
  }
  log("ai", aiPaused ? "paused" : "resumed");
}

function toggleClickThrough() {
  overlayInteractive = !overlayInteractive;
  if (!overlayWindow) return;
  if (overlayInteractive) {
    overlayWindow.setIgnoreMouseEvents(false);
    log("overlay interactive (mouse enabled)");
  } else {
    // Click-through: mouse passes to app behind, forward: true sends hover events
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    log("overlay click-through (mouse passthrough)");
  }
  overlayWindow.webContents.send("control:clickThrough", !overlayInteractive);
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ═══════════════════════════════════════════════════════════
// CONFIGURABLE HOTKEYS — loaded from electron-store
// ═══════════════════════════════════════════════════════════
function triggerCapture() {
  if (overlayWindow) {
    overlayWindow.webContents.send("capture:enterRegionSelect");
    overlayWindow.setIgnoreMouseEvents(false);
    overlayWindow.setFocusable(true);
    overlayWindow.focus();
  }
}

/**
 * Instant full-screen capture → send to backend for GPT-4o vision analysis.
 * No mouse interaction required — triggered by Ctrl+Shift+F.
 */
async function captureAndAnalyze() {
  log("captureAndAnalyze triggered");
  try {
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 },
    });
    if (!sources.length) {
      log("captureAndAnalyze: no screen sources");
      return;
    }
    const img = sources[0].thumbnail;
    const base64 = img.toPNG().toString("base64");
    log("captureAndAnalyze: captured", img.getSize().width, "x", img.getSize().height);

    // Send via loopback WS to backend for vision analysis
    if (loopbackSession) {
      (loopbackSession as any)._sendScreenshot?.(base64);
    }

    // Also notify the overlay that a capture happened
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send("capture:taken", {
        width: img.getSize().width,
        height: img.getSize().height,
      });
    }
  } catch (e: any) {
    log("captureAndAnalyze error", String(e?.message || e));
  }
}

function reregisterHotkeys(bindings?: StoreSchema["hotkeys"]) {
  globalShortcut.unregisterAll();
  const hk = bindings || store.get("hotkeys");

  const tryRegister = (accel: string, fn: () => void) => {
    try {
      if (accel) globalShortcut.register(accel, fn);
    } catch (e) {
      log("hotkey register failed", accel, String((e as any)?.message || e));
    }
  };

  tryRegister(hk.toggleOverlay, toggleOverlay);
  tryRegister(hk.captureScreen, triggerCapture);
  tryRegister(hk.toggleMic, toggleMic);
  tryRegister(hk.toggleAi, toggleAi);
  tryRegister(hk.toggleClickThrough, toggleClickThrough);
  tryRegister(hk.quit, () => { log("quit hotkey"); app.quit(); });

  // Arrow key nudge — always hardcoded (not user-configurable)
  tryRegister("CommandOrControl+Shift+Up", () => nudgeOverlay(0, -5));
  tryRegister("CommandOrControl+Shift+Down", () => nudgeOverlay(0, 5));
  tryRegister("CommandOrControl+Shift+Left", () => nudgeOverlay(-5, 0));
  tryRegister("CommandOrControl+Shift+Right", () => nudgeOverlay(5, 0));

  // Instant capture + AI analysis (no mouse needed)
  tryRegister("CommandOrControl+Shift+F", captureAndAnalyze);

  // Legacy alias
  tryRegister("Control+Shift+I", toggleOverlay);

  log("hotkeys registered");
}

app.whenReady().then(() => {
  log("app.whenReady", "packaged=", app.isPackaged, "electron=", process.versions.electron);

  // ═══════════════════════════════════════════════════════════
  // STEALTH: macOS — hide from Dock (no icon visible)
  // ═══════════════════════════════════════════════════════════
  if (process.platform === "darwin") {
    try {
      app.dock?.hide();
      log("macOS dock icon hidden");
    } catch (e) {
      log("dock.hide failed", String((e as any)?.message || e));
    }
  }

  // Only create the overlay — no separate app window.
  // Setup/config happens inside the overlay itself.
  // createAppWindow();  // DISABLED: overlay-only mode
  createOverlayWindow();

  // Apply anti-detection header sanitization
  antiDetectionEngine.applyHeaderSanitization();

  // Phase 4: Inject full anti-detection countermeasures into overlay webContents
  if (overlayWindow) {
    antiDetectionEngine.applyToWindow(overlayWindow);
    log("anti-detection injected into overlay window");
  }

  // Register hotkeys from stored config
  reregisterHotkeys();

  // ═══════════════════════════════════════════════════════════
  // FEATURE 3: AUTO-ROUTE OVERLAY TO SECONDARY DISPLAY
  // If multiple displays detected, move overlay to secondary
  // ═══════════════════════════════════════════════════════════
  const displays = screen.getAllDisplays();
  if (displays.length > 1 && overlayWindow) {
    const primary = screen.getPrimaryDisplay();
    const secondary = displays.find(d => d.id !== primary.id);
    if (secondary) {
      overlayWindow.setPosition(secondary.bounds.x + 20, secondary.bounds.y + 20);
      log("auto-routed overlay to secondary display");
    }
  }

  // Relay overlay WS messages to phone mirror clients
  if (overlayWindow) {
    overlayWindow.webContents.on("ipc-message", (_event, channel, ...args) => {
      if (channel === "mirror:relay" && mirrorClients.size > 0) {
        broadcastToMirror(args[0]);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════
  // RELAY: App Window → Overlay Window (WebSocket data)
  // The app window's interview page sends WS messages via IPC;
  // we forward them to the overlay renderer so PhantomOverlay
  // stays in sync without its own WebSocket connection.
  // ═══════════════════════════════════════════════════════════
  ipcMain.on("ws:relayToOverlay", (_event, msg: { type: string; data: any }) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send("ws:message", msg);
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  stealthEngine.shutdown();
});
