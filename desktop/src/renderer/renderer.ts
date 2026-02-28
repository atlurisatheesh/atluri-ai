/* =========================================================
   HEADER STEALTH + SETTINGS MODAL WIRING (ADD-ONLY)
========================================================= */

(function () {

  // Move $ function declaration to the top so it is available before use
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

  // Move stealthModeEl declaration after $ is defined
  const stealthModeEl = $("stealthMode") as HTMLInputElement;


  const eyeBtn = document.getElementById("eyeBtn") as HTMLButtonElement | null;
  const eyeIcon = document.getElementById("eyeIcon") as HTMLElement | null;
  const stealthStatus = document.getElementById("stealthStatus") as HTMLElement | null;

  const settingsBtn = document.getElementById("settingsBtn") as HTMLButtonElement | null;
  const settingsModal = document.getElementById("settingsModal") as HTMLElement | null;
  const settingsCancelBtn = document.getElementById("settingsCancelBtn") as HTMLButtonElement | null;
  const settingsSaveBtn = document.getElementById("settingsSaveBtn") as HTMLButtonElement | null;

  const settingResponseLength = document.getElementById("settingResponseLength") as HTMLSelectElement | null;
  const settingLanguage = document.getElementById("settingLanguage") as HTMLInputElement | null;
  const settingProcessTime = document.getElementById("settingProcessTime") as HTMLSelectElement | null;
  const settingFillerWords = document.getElementById("settingFillerWords") as HTMLInputElement | null;
  const settingThreshold = document.getElementById("settingThreshold") as HTMLInputElement | null;
  const settingThresholdVal = document.getElementById("settingThresholdVal") as HTMLElement | null;
  const settingProcessName = document.getElementById("settingProcessName") as HTMLInputElement | null;

  const SETTINGS_KEY = "atluri_overlay_settings_v2";

  /* ===========================
     STEALTH HEADER SYNC
  ============================ */

  function syncStealthUI(enabled: boolean) {
    if (stealthStatus) {
      stealthStatus.textContent = enabled
        ? "Stealth Mode is ON"
        : "Stealth Mode is OFF";
    }

    if (eyeIcon) {
      eyeIcon.textContent = enabled ? "🙈" : "👁️";
    }
  }

  // Hook into existing stealth checkbox (already wired)
  stealthModeEl?.addEventListener("change", () => {
    syncStealthUI(stealthModeEl.checked);
  });

  // Eye icon click toggles stealth
  eyeBtn?.addEventListener("click", () => {
    const next = !stealthModeEl.checked;
    stealthModeEl.checked = next;
    syncStealthUI(next);
    void applyStealth(next, Number(uiOpacityEl.value || "100"));
  });

  // On load sync
  setTimeout(() => {
    syncStealthUI(stealthModeEl.checked);
  }, 100);

  /* ===========================
     SETTINGS MODAL
  ============================ */

  settingsBtn?.addEventListener("click", () => {
    if (settingsModal) settingsModal.style.display = "flex";
  });

  settingsCancelBtn?.addEventListener("click", () => {
    if (settingsModal) settingsModal.style.display = "none";
  });

  settingThreshold?.addEventListener("input", () => {
    if (settingThresholdVal) {
      settingThresholdVal.textContent = settingThreshold.value;
    }
  });

  settingsSaveBtn?.addEventListener("click", () => {

    const settings = {
      responseLength: settingResponseLength?.value ?? "default",
      language: settingLanguage?.value ?? "",
      processTime: settingProcessTime?.value ?? "fast",
      fillerWords: settingFillerWords?.checked ?? false,
      threshold: settingThreshold?.value ?? "50",
      processName: settingProcessName?.value ?? ""
    };

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    // Optional: apply behavior live
    console.log("Overlay settings updated:", settings);

    if (settingsModal) settingsModal.style.display = "none";
  });

  // Restore settings on load
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);

      if (settingResponseLength) settingResponseLength.value = parsed.responseLength ?? "default";
      if (settingLanguage) settingLanguage.value = parsed.language ?? "";
      if (settingProcessTime) settingProcessTime.value = parsed.processTime ?? "fast";
      if (settingFillerWords) settingFillerWords.checked = parsed.fillerWords ?? false;
      if (settingThreshold) settingThreshold.value = parsed.threshold ?? "50";
      if (settingThresholdVal) settingThresholdVal.textContent = parsed.threshold ?? "50";
      if (settingProcessName) settingProcessName.value = parsed.processName ?? "";
    } catch {
      console.warn("Failed to restore overlay settings");
    }
  }

})();

/* =========================================================
   CLICK-THROUGH OVERLAY: Note about stealth mode
   The overlay starts interactive (clickable).
   Use stealth mode to enable click-through.
========================================================= */
// No auto-init needed - main.ts starts with setIgnoreMouseEvents(false)

/* =========================================================
   WINDOW CONTROLS: Minimize and Close buttons
========================================================= */
(function initWindowControls() {
  const desktop = (window as any).atluriinDesktop;
  
  const minimizeBtn = document.getElementById("minimizeBtn");
  const closeBtn = document.getElementById("closeBtn");

  minimizeBtn?.addEventListener("click", () => {
    if (desktop?.minimizeOverlay) {
      desktop.minimizeOverlay();
    }
  });

  closeBtn?.addEventListener("click", () => {
    if (desktop?.closeOverlay) {
      desktop.closeOverlay();
    }
  });
})();

/* =========================================================
   MANUAL WINDOW DRAG: Title bar drag to move overlay
   (Required because setIgnoreMouseEvents breaks -webkit-app-region: drag)
========================================================= */
(function initManualDrag() {
  const desktop = (window as any).atluriinDesktop;
  if (!desktop?.getOverlayPosition || !desktop?.setOverlayPosition) {
    console.warn("[drag] desktop API not available");
    return;
  }

  function setupDrag() {
    const titleBar = document.querySelector(".title-bar") as HTMLElement;
    if (!titleBar) {
      console.warn("[drag] title-bar element not found");
      return;
    }

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let windowStartX = 0;
    let windowStartY = 0;

    titleBar.addEventListener("mousedown", async (e) => {
      // Ignore if clicking on buttons
      if ((e.target as HTMLElement).closest("button")) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      isDragging = true;
      dragStartX = e.screenX;
      dragStartY = e.screenY;
      
      const pos = await desktop.getOverlayPosition();
      windowStartX = pos.x;
      windowStartY = pos.y;
      
      titleBar.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      
      const deltaX = e.screenX - dragStartX;
      const deltaY = e.screenY - dragStartY;
      
      desktop.setOverlayPosition(windowStartX + deltaX, windowStartY + deltaY);
    });

    window.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        titleBar.style.cursor = "grab";
        document.body.style.userSelect = "";
      }
    });

    // Set initial cursor
    titleBar.style.cursor = "grab";
    console.log("[drag] manual drag initialized");
  }

  // Wait for DOM to be ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupDrag);
  } else {
    setupDrag();
  }
})();

type WsPair = {
  interviewer: WebSocket;
  candidate: WebSocket;
};

type CaptureState = {
  roomId: string;
  backendUrl: string;
  role: string;
  ws: WsPair | null;
  offerTimer: number | null;
  offerUserId: string;
  offerAuthToken: string;
  micStream: MediaStream | null;
  systemStream: MediaStream | null;
  micCtx: AudioContext | null;
  systemCtx: AudioContext | null;
  stopFns: Array<() => void>;
};

const state: CaptureState = {
  roomId: "",
  backendUrl: "http://localhost:9010",
  role: "behavioral",
  ws: null,
  offerTimer: null,
  offerUserId: "desktop-practice-user",
  offerAuthToken: "",
  micStream: null,
  systemStream: null,
  micCtx: null,
  systemCtx: null,
  stopFns: [],
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const backendUrlEl = $("backendUrl") as HTMLInputElement;
const roomIdEl = $("roomId") as HTMLInputElement;
const systemModeEl = $("systemMode") as HTMLSelectElement;
const roleEl = $("role") as HTMLSelectElement;
const micDeviceEl = $("micDevice") as HTMLSelectElement;
const refreshDevicesBtn = $("refreshDevicesBtn") as HTMLButtonElement;
const startBtn = $("startBtn") as HTMLButtonElement;
const stopBtn = $("stopBtn") as HTMLButtonElement;
const statusEl = $("status") as HTMLDivElement;
const logEl = $("log") as HTMLDivElement;
const questionEl = $("question") as HTMLDivElement;
const partialEl = $("partial") as HTMLDivElement;
const suggestionEl = $("suggestion") as HTMLDivElement;
const stealthModeEl = $("stealthMode") as HTMLInputElement;
const uiOpacityEl = $("uiOpacity") as HTMLInputElement;
const privacyBtn = $("privacyBtn") as HTMLButtonElement;
const modeBtn = $("modeBtn") as HTMLButtonElement;
const offerPctEl = $("offerPct") as HTMLDivElement;
const offerDeltaEl = $("offerDelta") as HTMLDivElement;
const offerBandEl = $("offerBand") as HTMLSpanElement;
const driversEl = $("drivers") as HTMLDivElement;
const starChipsEl = $("starChips") as HTMLDivElement;
const mImpactEl = $("mImpact") as HTMLElement;
const mCredEl = $("mCred") as HTMLElement;
const mStarEl = $("mStar") as HTMLElement;
const mImpactValEl = $("mImpactVal") as HTMLElement;
const mCredValEl = $("mCredVal") as HTMLElement;
const mStarValEl = $("mStarVal") as HTMLElement;
const warningChipsEl = $("warningChips") as HTMLDivElement;
const feedEl = $("feed") as HTMLDivElement;
const testSystemBtn = $("testSystemBtn") as HTMLButtonElement;
const testMicBtn = $("testMicBtn") as HTMLButtonElement;

// New UI elements for suggestion actions
const copySuggestionBtn = $("copySuggestionBtn") as HTMLButtonElement;
const ttsSuggestionBtn = $("ttsSuggestionBtn") as HTMLButtonElement;
const stopTtsBtn = $("stopTtsBtn") as HTMLButtonElement;
const autoReadToggle = $("autoReadToggle") as HTMLInputElement;

type HintChip = { rule_id: string; title: string; severity: string; ts: number };
const hintChips: HintChip[] = [];

let lastQuestionTs = 0;
let lastDecision: any = null;
let lastFinalTranscript = "";
let currentSuggestionText = "";
let ttsUtterance: SpeechSynthesisUtterance | null = null;

let isRunning = false;

/* ===========================
   TTS & COPY FUNCTIONALITY
============================ */

function getSuggestionText(): string {
  const raw = suggestionEl.textContent || "";
  return raw.replace(/^Suggestion:\s*/, "").trim();
}

function copySuggestionToClipboard() {
  const text = getSuggestionText();
  if (!text) {
    log("No suggestion to copy");
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    const originalText = copySuggestionBtn.textContent;
    copySuggestionBtn.textContent = "✓ Copied!";
    setTimeout(() => {
      copySuggestionBtn.textContent = originalText;
    }, 1500);
    log("Copied suggestion to clipboard");
  }).catch(err => {
    log(`Copy failed: ${err.message}`);
  });
}

function speakSuggestion() {
  const text = getSuggestionText();
  if (!text) {
    log("No suggestion to read");
    return;
  }
  
  // Stop any current TTS
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }
  
  ttsUtterance = new SpeechSynthesisUtterance(text);
  ttsUtterance.rate = 1.1;
  ttsUtterance.pitch = 1.0;
  
  ttsUtterance.onstart = () => {
    ttsSuggestionBtn.style.display = "none";
    stopTtsBtn.style.display = "inline-block";
  };
  
  ttsUtterance.onend = () => {
    ttsSuggestionBtn.style.display = "inline-block";
    stopTtsBtn.style.display = "none";
    ttsUtterance = null;
  };
  
  ttsUtterance.onerror = () => {
    ttsSuggestionBtn.style.display = "inline-block";
    stopTtsBtn.style.display = "none";
    ttsUtterance = null;
  };
  
  window.speechSynthesis.speak(ttsUtterance);
  log("Reading suggestion aloud");
}

function stopTts() {
  window.speechSynthesis.cancel();
  ttsSuggestionBtn.style.display = "inline-block";
  stopTtsBtn.style.display = "none";
  ttsUtterance = null;
}

// Wire up buttons
copySuggestionBtn?.addEventListener("click", copySuggestionToClipboard);
ttsSuggestionBtn?.addEventListener("click", speakSuggestion);
stopTtsBtn?.addEventListener("click", stopTts);

// Restore auto-read preference
const savedAutoRead = localStorage.getItem("overlay_auto_read");
if (autoReadToggle && savedAutoRead === "true") {
  autoReadToggle.checked = true;
}
autoReadToggle?.addEventListener("change", () => {
  localStorage.setItem("overlay_auto_read", autoReadToggle.checked ? "true" : "false");
});

const WS_MAX_BUFFERED_BYTES = 256 * 1024;

function safeWsSend(ws: WebSocket, data: string | ArrayBuffer) {
  if (ws.readyState !== WebSocket.OPEN) return false;
  // Backpressure: if buffered is too high, drop frames (best-effort realtime).
  if (typeof (ws as any).bufferedAmount === "number" && (ws as any).bufferedAmount > WS_MAX_BUFFERED_BYTES) {
    return false;
  }
  try {
    ws.send(data as any);
    return true;
  } catch {
    return false;
  }
}

function desktopApi() {
  return (window as any).atluriinDesktop as
    | {
        setOverlayContentProtection?: (enabled: boolean) => Promise<boolean>;
        getOverlayContentProtection?: () => Promise<boolean>;
        setOverlayStealth?: (enabled: boolean, opacity: number) => Promise<{ enabled: boolean; opacity: number }>;
        getOverlayStealth?: () => Promise<{ enabled: boolean; opacity: number }>;
        getAccessTokenFromApp?: () => Promise<string | null>;
        startLoopback?: (payload: { backendHttpUrl: string; roomId: string; role: string; assistIntensity?: number }) => Promise<{ ok: boolean; error?: string; message?: string }>;
        stopLoopback?: () => Promise<{ ok: boolean }>;
      }
    | undefined;
}

function clampOpacityPct(pct: number) {
  if (!Number.isFinite(pct)) return 100;
  return Math.max(20, Math.min(100, pct));
}

function updateStealthFallback(enabled: boolean, opacityPct: number) {
  const root = document.getElementById("app-root") as HTMLElement | null;
  if (!root) return;

  if (enabled) {
    root.style.opacity = String(clampOpacityPct(opacityPct) / 100);

    // Keep interaction enabled unless explicitly using OS-level ignoreMouseEvents
    root.style.pointerEvents = "auto";
  } else {
    root.style.opacity = "1";
    root.style.pointerEvents = "auto";
  }
}

async function applyStealth(enabled: boolean, opacityPct: number) {
  const safePct = clampOpacityPct(opacityPct);
  stealthModeEl.checked = enabled;
  uiOpacityEl.value = String(safePct);

  // Always update the DOM fallback so it looks right even if IPC isn't available.
  updateStealthFallback(enabled, safePct);

  try {
    const api = desktopApi();
    if (api?.setOverlayStealth) {
      const res = await api.setOverlayStealth(enabled, safePct / 100);
      localStorage.setItem("overlayStealth", res.enabled ? "true" : "false");
      localStorage.setItem("overlayOpacity", String(Math.round((res.opacity || 1) * 100)));
      log(`Stealth ${res.enabled ? "ON" : "OFF"} • opacity ${Math.round((res.opacity || 1) * 100)}%`);
      return;
    }
  } catch (e: any) {
    log(`Stealth IPC failed: ${String(e?.message || e)}`);
  }
}

async function initStealth() {
  // Always start with stealth OFF so overlay is clickable on startup
  // User can enable stealth manually if needed
  localStorage.removeItem("overlayStealth");
  localStorage.setItem("overlayOpacity", "100");
  
  await applyStealth(false, 100);
}

function setPrivacyBtn(enabled: boolean) {
  privacyBtn.textContent = enabled ? "Privacy: On" : "Privacy: Off";
}

async function applyPrivacy(enabled: boolean) {
  setPrivacyBtn(enabled);
  try {
    const api = desktopApi();
    if (api?.setOverlayContentProtection) {
      const actual = await api.setOverlayContentProtection(Boolean(enabled));
      setPrivacyBtn(actual);
      localStorage.setItem("overlayPrivacy", actual ? "true" : "false");
      log(`Privacy mode ${actual ? "enabled" : "disabled"}`);
    } else {
      log("Privacy toggle unavailable (desktop API missing)");
    }
  } catch (e: any) {
    log(`Privacy toggle failed: ${String(e?.message || e)}`);
  }
}

async function initPrivacy() {
  // Persisted preference wins. If absent, ask main process for current.
  const stored = localStorage.getItem("overlayPrivacy");
  if (stored === "true" || stored === "false") {
    await applyPrivacy(stored === "true");
    return;
  }
  try {
    const api = desktopApi();
    if (api?.getOverlayContentProtection) {
      const cur = await api.getOverlayContentProtection();
      setPrivacyBtn(Boolean(cur));
      return;
    }
  } catch {
  }
  setPrivacyBtn(false);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function setBar(el: HTMLElement, value0to100: number) {
  const pct = Math.max(0, Math.min(100, value0to100));
  el.style.width = `${pct.toFixed(0)}%`;
}

function base64UrlEncodeJson(value: unknown): string {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return b64.replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function getDevJwt(userId: string): string {
  // Matches the repo's dev convention: unsigned token accepted when ALLOW_UNVERIFIED_JWT_DEV=true.
  const header = base64UrlEncodeJson({ alg: "HS256", typ: "JWT" });
  const payload = base64UrlEncodeJson({ sub: userId, role: "authenticated" });
  return `${header}.${payload}.signature`;
}

async function fetchOfferProbability(): Promise<void> {
  const base = (backendUrlEl.value.trim() || state.backendUrl).replace(/\/+$/g, "");
  // Prefer the real Supabase access token (strict verification environments).
  // Fallback to unsigned dev JWT (when backend allows ALLOW_UNVERIFIED_JWT_DEV).
  let token = state.offerAuthToken;
  try {
    const api = desktopApi();
    if (api?.getAccessTokenFromApp) {
      const real = await api.getAccessTokenFromApp();
      if (real) {
        token = real;
        state.offerAuthToken = real;
      }
    }
  } catch {
  }
  if (!token) {
    token = state.offerAuthToken = getDevJwt(state.offerUserId);
  }
  const url = `${base}/api/user/offer-probability?limit=40`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      offerPctEl.textContent = "Offer: --%";
      if (res.status === 401) {
        offerDeltaEl.textContent = "Δ auth";
        driversEl.textContent = "Sign in on the main app window to enable Offer%";
      } else {
        offerDeltaEl.textContent = `Δ ${res.status}`;
      }
      offerBandEl.textContent = "";
      return;
    }
    const data = (await res.json()) as any;
    const offer = Number(data?.offer_probability ?? NaN);
    const delta = Number(data?.delta_vs_last_session ?? NaN);
    const band = String(data?.confidence_band || "").trim();
    const velocity = Number(data?.improvement_velocity_pp_per_session ?? NaN);
    const plateau = String(data?.plateau_note || "").trim();
    if (Number.isFinite(offer)) {
      offerPctEl.textContent = `Offer: ${offer.toFixed(0)}%`;
    }
    if (Number.isFinite(delta)) {
      const sign = delta > 0 ? "+" : "";
      offerDeltaEl.textContent = `Δ ${sign}${delta.toFixed(1)}pp`;
    }
    offerBandEl.textContent = band ? `Band: ${band}` : "";

    const strongest = String(lastDecision?.strongest_dimension || "").trim();
    const weakest = String(lastDecision?.weakest_dimension || "").trim();
    const v = Number.isFinite(velocity) ? `${velocity.toFixed(1)}pp/session` : "";
    const driverBits = [
      strongest ? `strongest: ${strongest}` : "",
      weakest ? `weakest: ${weakest}` : "",
      v ? `velocity: ${v}` : "",
    ].filter(Boolean);
    const qChip = Date.now() - lastQuestionTs < 30_000 ? "🟣 question detected" : "";
    const line = [...driverBits, qChip].filter(Boolean).join(" • ");
    driversEl.textContent = line || plateau || "";
  } catch (e: any) {
    offerDeltaEl.textContent = `Δ err`;
  }
}

function startOfferPolling() {
  stopOfferPolling();
  void fetchOfferProbability();
  state.offerTimer = window.setInterval(() => {
    void fetchOfferProbability();
  }, 3000);
}

function stopOfferPolling() {
  if (state.offerTimer) {
    window.clearInterval(state.offerTimer);
    state.offerTimer = null;
  }
}

function renderHintChips() {
  const items = hintChips.slice(0, 3);
  warningChipsEl.innerHTML = items
    .map((c) => {
      const cls = c.severity === "high" || c.severity === "critical" ? "chip danger" : c.severity === "medium" ? "chip warn" : "chip";
      const safeTitle = c.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<span class="${cls}">${safeTitle}</span>`;
    })
    .join("");
}

function detectStar(text: string) {
  const t = (text || "").toLowerCase();
  const situation = /(situation|context|at the time|in that role|we were facing)/.test(t);
  const task = /(task|goal|objective|i needed to|my job was|i was responsible)/.test(t);
  const action = /(action|i did|i led|i built|i implemented|i designed|i drove|i coordinated)/.test(t);
  const result = /(result|impact|outcome|reduced|improved|increased|saved|%|\bms\b|\bminutes\b|\bweeks\b|\$)/.test(t);
  return { situation, task, action, result };
}

function renderStarChips(text: string) {
  const s = detectStar(text);
  const items: Array<[string, boolean]> = [
    ["Situation", s.situation],
    ["Task", s.task],
    ["Action", s.action],
    ["Result", s.result],
  ];
  starChipsEl.innerHTML = items
    .map(([label, ok]) => `<span class="chip ${ok ? "good" : ""}">${ok ? "✔" : "·"} ${label}</span>`)
    .join("");
}

function addFeedItem(kind: string, text: string, tag?: string) {
  const safe = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeTag = (tag || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const div = document.createElement("div");
  div.className = "item";
  div.innerHTML = `<span class="t">${now()}</span><b>${kind}:</b> ${safe}${tag ? ` <span class="tag">(${safeTag})</span>` : ""}`;
  feedEl.prepend(div);
  // Keep feed bounded.
  const children = Array.from(feedEl.children);
  if (children.length > 30) {
    for (const n of children.slice(30)) n.remove();
  }
}

function now() {
  return new Date().toISOString().slice(11, 19);
}

function log(line: string) {
  logEl.textContent = `${now()} ${line}\n${logEl.textContent || ""}`;
}

function setStatus(s: string) {
  statusEl.textContent = s;
}

function wsUrl(baseHttp: string, path: string) {
  return baseHttp.replace(/^http/i, "ws") + path;
}

function newRoomId(): string {
  // UUID v4-ish
  return (crypto as any).randomUUID ? (crypto as any).randomUUID() : `room-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function floatTo16kPcmFrames(float32: Float32Array, inSampleRate: number): ArrayBuffer[] {
  // Resample to 16k using linear interpolation.
  const outRate = 16000;
  const ratio = inSampleRate / outRate;
  const outLen = Math.floor(float32.length / ratio);
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    const srcPos = i * ratio;
    const srcIdx = Math.floor(srcPos);
    const frac = srcPos - srcIdx;
    const s0 = float32[srcIdx] || 0;
    const s1 = float32[srcIdx + 1] || 0;
    const sample = s0 + (s1 - s0) * frac;
    const clamped = Math.max(-1, Math.min(1, sample));
    out[i] = (clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff) | 0;
  }

  // Frame into 20ms chunks: 16k * 0.02 = 320 samples => 640 bytes.
  const frameSamples = 320;
  const frames: ArrayBuffer[] = [];
  for (let i = 0; i + frameSamples <= out.length; i += frameSamples) {
    frames.push(out.subarray(i, i + frameSamples).buffer.slice(out.byteOffset + i * 2, out.byteOffset + (i + frameSamples) * 2));
  }
  return frames;
}

function attachAudioStreamer(
  stream: MediaStream,
  ws: WebSocket,
  label: string
): { ctx: AudioContext; stop: () => void } {
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);

  source.connect(processor);
  processor.connect(ctx.destination);

  processor.onaudioprocess = (ev) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const input = ev.inputBuffer.getChannelData(0);
    const frames = floatTo16kPcmFrames(new Float32Array(input), ctx.sampleRate);
    for (const frame of frames) {
      if (frame.byteLength < 320) continue;
      safeWsSend(ws, frame);
    }
  };

  const stop = () => {
    try { processor.disconnect(); } catch {}
    try { source.disconnect(); } catch {}
    try { ctx.close(); } catch {}
    for (const t of stream.getTracks()) {
      try { t.stop(); } catch {}
    }
    log(`${label}: stopped audio capture.`);
  };
  return { ctx, stop };
}

function connectWsPair(backendHttp: string, roomId: string): WsPair {
  const base = backendHttp.replace(/\/+$/g, "");
  const interviewer = new WebSocket(
    wsUrl(base, `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(roomId)}&participant=interviewer`)
  );
  const candidate = new WebSocket(
    wsUrl(base, `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(roomId)}&participant=candidate`)
  );
  interviewer.binaryType = "arraybuffer";
  candidate.binaryType = "arraybuffer";
  return { interviewer, candidate };
}

async function connectWithRetry(make: () => WebSocket, name: string, maxMs = 20_000): Promise<WebSocket> {
  const start = Date.now();
  let attempt = 0;
  while (Date.now() - start < maxMs) {
    attempt += 1;
    const ws = make();
    try {
      await new Promise<void>((res, rej) => {
        const t = window.setTimeout(() => rej(new Error("ws timeout")), 4000);
        ws.addEventListener("open", () => {
          window.clearTimeout(t);
          res();
        }, { once: true });
        ws.addEventListener("error", () => {
          window.clearTimeout(t);
          rej(new Error("ws error"));
        }, { once: true });
      });
      if (attempt > 1) log(`${name} ws recovered after ${attempt} attempts`);
      return ws;
    } catch {
      try { ws.close(); } catch {}
      const backoff = Math.min(1500, 150 + attempt * 150);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw new Error(`${name} ws failed to connect`);
}

function wireWsHandlers(pair: WsPair) {
  const onMsg = (raw: any) => {
    let text = "";
    try {
      text = typeof raw.data === "string" ? raw.data : new TextDecoder().decode(raw.data);
      const msg = JSON.parse(text);
      const type = String(msg?.type || "");
      if (type === "partial_transcript") {
        partialEl.textContent = `Partial: ${String(msg?.text || "")}`;
      }
      if (type === "transcript") {
        log(`TRANSCRIPT: ${String(msg?.text || "")}`);
        lastFinalTranscript = String(msg?.text || "");
        renderStarChips(lastFinalTranscript);
        addFeedItem("You", String(msg?.text || ""));
      }
      if (type === "interviewer_question") {
        questionEl.textContent = `Question: ${String(msg?.question || "")}`;
        log(`QUESTION: ${String(msg?.question || "")}`);
        lastQuestionTs = Date.now();
        addFeedItem("Interviewer", String(msg?.question || ""), "question detected");
      }
      if (type === "answer_suggestion_chunk") {
        // Streaming suggestion chunks
        const chunk = String(msg?.chunk || "");
        const prev = suggestionEl.textContent?.replace(/^Suggestion:\s*/, "") || "";
        suggestionEl.textContent = `Suggestion: ${prev}${chunk}`;
      }
      if (type === "answer_suggestion_done") {
        log(`SUGGESTION_DONE (${String(msg?.status || "")})`);
        // Auto-read if enabled
        if (autoReadToggle?.checked) {
          speakSuggestion();
        }
      }
      if (type === "assist_hint") {
        const p = msg?.payload || {};
        const ruleId = String(p?.rule_id || "");
        const title = String(p?.title || "Assist hint");
        const severity = String(p?.severity || "low");
        hintChips.unshift({ rule_id: ruleId, title, severity, ts: Date.now() });
        // Keep unique by rule_id.
        const seen = new Set<string>();
        for (let i = 0; i < hintChips.length; i += 1) {
          const id = hintChips[i].rule_id || `idx-${i}`;
          if (seen.has(id)) {
            hintChips.splice(i, 1);
            i -= 1;
            continue;
          }
          seen.add(id);
        }
        hintChips.splice(3);
        renderHintChips();
        log(`ASSIST_HINT: ${title}`);
      }
      if (type === "ai_decision") {
        const d = msg?.decision || {};
        lastDecision = d;
        const confidence = Number(d?.confidence ?? NaN);
        const depth = Number(d?.depth_score ?? NaN);
        const structure = Number(d?.structure_score ?? NaN);
        const credibility = Number(d?.resume_credibility_pct ?? d?.alignment_score ?? NaN);
        if (Number.isFinite(depth)) {
          setBar(mImpactEl, depth);
          mImpactValEl.textContent = `${Math.round(depth)}`;
        }
        if (Number.isFinite(credibility)) {
          // alignment_score is 0..100; resume_credibility_pct is 0..1? (can be 0..100 depending on engine); normalize.
          const credPct = credibility <= 1 ? credibility * 100 : credibility;
          setBar(mCredEl, credPct);
          mCredValEl.textContent = `${Math.round(credPct)}`;
        }
        if (Number.isFinite(structure)) {
          setBar(mStarEl, structure);
          mStarValEl.textContent = `${Math.round(structure)}`;
        }

        const verdict = String(d?.verdict || "").trim();
        const weakest = String(d?.weakest_dimension || "").trim();
        const confPct = Number.isFinite(confidence) ? (confidence * 100).toFixed(0) : "?";
        log(`AI_DECISION: verdict=${verdict || "?"} conf=${confPct}%`);
        addFeedItem("Coach", String(d?.explanation || ""), weakest ? `weakest: ${weakest}` : undefined);

        // Refresh drivers line quickly when decisions arrive.
        void fetchOfferProbability();
      }
    } catch {
      if (text) log(`WS: ${text.slice(0, 200)}`);
    }
  };

  pair.interviewer.addEventListener("message", onMsg);
  pair.candidate.addEventListener("message", onMsg);

  for (const [name, ws] of Object.entries(pair)) {
    ws.addEventListener("open", () => log(`${name} ws open`));
    ws.addEventListener("close", () => log(`${name} ws close`));
    ws.addEventListener("error", () => log(`${name} ws error`));
  }
}

async function selectMic(): Promise<MediaStream> {
  const selected = String(micDeviceEl.value || "").trim();
  const audio: MediaTrackConstraints = selected
    ? { deviceId: { exact: selected }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    : { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  return await navigator.mediaDevices.getUserMedia({ audio, video: false });
}

async function selectSystemAudio(): Promise<MediaStream> {
  // User selects a screen/window to share. On Windows, enabling “Share system audio” captures meeting audio.
  const stream = await (navigator.mediaDevices as any).getDisplayMedia({ audio: true, video: true });
  // Stop video track; keep audio.
  for (const t of stream.getVideoTracks()) {
    try { t.stop(); } catch {}
  }
  return stream;
}

async function refreshDevices() {
  try {
    // Trigger permission prompt once, so labels populate.
    const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    for (const t of s.getTracks()) t.stop();
  } catch {
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const mics = devices.filter((d) => d.kind === "audioinput");
  const current = micDeviceEl.value;
  micDeviceEl.innerHTML = "";

  const optAuto = document.createElement("option");
  optAuto.value = "";
  optAuto.textContent = "Default mic";
  micDeviceEl.appendChild(optAuto);

  for (const d of mics) {
    const opt = document.createElement("option");
    opt.value = d.deviceId;
    opt.textContent = d.label || `Mic (${d.deviceId.slice(0, 6)}...)`;
    micDeviceEl.appendChild(opt);
  }
  // best-effort restore
  if (current) micDeviceEl.value = current;
}

async function start(): Promise<void> {
  if (state.ws) return;
  isRunning = true;

  state.backendUrl = backendUrlEl.value.trim() || "http://localhost:9010";
  state.roomId = roomIdEl.value.trim() || newRoomId();
  state.role = roleEl.value;
  roomIdEl.value = state.roomId;

  setStatus("Requesting permissions...");
  log("Starting practice mode capture...");

  // Capture sources
  const mic = await selectMic();
  state.micStream = mic;

  const systemMode = String(systemModeEl.value || "display").toLowerCase();
  if (systemMode === "loopback") {
    const api = desktopApi();
    if (!api?.startLoopback) {
      throw new Error("Loopback mode unavailable (desktop API missing)");
    }
    setStatus("Starting WASAPI loopback (system audio)...");
    const res = await api.startLoopback({
      backendHttpUrl: state.backendUrl,
      roomId: state.roomId,
      role: state.role,
      assistIntensity: 2,
    });
    if (!res.ok) {
      throw new Error(res.error || "Failed to start WASAPI loopback");
    }
    log("Loopback started (system audio via WASAPI)");
  } else {
    const system = await selectSystemAudio();
    state.systemStream = system;
  }

  setStatus("Connecting WebSockets...");
  const base = state.backendUrl.replace(/\/+$/g, "");
  const interviewer = await connectWithRetry(
    () => new WebSocket(wsUrl(base, `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(state.roomId)}&participant=interviewer`)),
    "interviewer"
  );
  const candidate = await connectWithRetry(
    () => new WebSocket(wsUrl(base, `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(state.roomId)}&participant=candidate`)),
    "candidate"
  );
  interviewer.binaryType = "arraybuffer";
  candidate.binaryType = "arraybuffer";
  const pair = { interviewer, candidate };
  state.ws = pair;

  wireWsHandlers(pair);

  // Offer probability is independent of WS stream; start it as soon as we go live.
  startOfferPolling();

  // Set role context for both sockets.
  safeWsSend(pair.interviewer, JSON.stringify({ role: state.role }));
  safeWsSend(pair.candidate, JSON.stringify({ role: state.role }));

  setStatus("Streaming audio (system→interviewer, mic→candidate)...");
  startBtn.disabled = true;
  stopBtn.disabled = false;

  const micStreamer = attachAudioStreamer(mic, pair.candidate, "mic");
  const sysStreamer = state.systemStream ? attachAudioStreamer(state.systemStream, pair.interviewer, "system") : null;
  state.micCtx = micStreamer.ctx;
  state.systemCtx = sysStreamer?.ctx || null;
  state.stopFns.push(micStreamer.stop);
  if (sysStreamer) state.stopFns.push(sysStreamer.stop);
}

async function stop(): Promise<void> {
  setStatus("Stopping...");
  isRunning = false;
  stopOfferPolling();

  // Stop WASAPI loopback if running.
  try {
    const api = desktopApi();
    if (api?.stopLoopback) await api.stopLoopback();
  } catch {
  }
  for (const fn of state.stopFns.splice(0)) {
    try { fn(); } catch {}
  }
  try { state.ws?.candidate.send(JSON.stringify({ type: "stop" })); } catch {}
  try { state.ws?.interviewer.send(JSON.stringify({ type: "stop" })); } catch {}
  try { state.ws?.candidate.close(); } catch {}
  try { state.ws?.interviewer.close(); } catch {}
  state.ws = null;
  state.micStream = null;
  state.systemStream = null;
  state.micCtx = null;
  state.systemCtx = null;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus("Idle.");
  log("Stopped.");
}

function toggleMode() {
  const current = document.body.getAttribute("data-mode") || "expanded";
  const next = current === "expanded" ? "compact" : "expanded";
  document.body.setAttribute("data-mode", next);
  modeBtn.textContent = next === "expanded" ? "Compact" : "Expanded";
}

modeBtn.addEventListener("click", toggleMode);
privacyBtn.addEventListener("click", () => {
  const next = !/\bon\b/i.test(privacyBtn.textContent || "");
  void applyPrivacy(next);
});

stealthModeEl.addEventListener("change", () => {
  void applyStealth(Boolean(stealthModeEl.checked), Number(uiOpacityEl.value || "100"));
});

uiOpacityEl.addEventListener("input", () => {
  // Don't spam logs: just apply.
  void applyStealth(Boolean(stealthModeEl.checked), Number(uiOpacityEl.value || "100"));
});

testMicBtn.addEventListener("click", async () => {
  try {
    setStatus("Selecting mic...");
    const s = await selectMic();
    for (const t of s.getTracks()) t.stop();
    setStatus("Mic OK.");
  } catch (e: any) {
    setStatus(`Mic error: ${String(e?.message || e)}`);
  }
});

testSystemBtn.addEventListener("click", async () => {
  try {
    setStatus("Selecting system audio source (share screen/window + enable audio)...");
    const s = await selectSystemAudio();
    for (const t of s.getTracks()) t.stop();
    setStatus("System audio OK.");
  } catch (e: any) {
    setStatus(`System audio error: ${String(e?.message || e)}`);
  }
});

refreshDevicesBtn.addEventListener("click", () => {
  void refreshDevices();

// --- Overlay Privacy: Listen for recording state from main process ---
// --- Click-Through Mode Safety: Keyboard override and banner ---
// Add a visible banner for click-through mode
let clickBanner: HTMLElement | null = null;
function showClickBanner() {
  if (!clickBanner) {
    clickBanner = document.createElement('div');
    clickBanner.id = 'clickThroughBanner';
    clickBanner.style.position = 'fixed';
    clickBanner.style.top = '0';
    clickBanner.style.left = '0';
    clickBanner.style.width = '100vw';
    clickBanner.style.background = 'rgba(200,0,0,0.85)';
    clickBanner.style.color = '#fff';
    clickBanner.style.fontSize = '18px';
    clickBanner.style.fontWeight = 'bold';
    clickBanner.style.textAlign = 'center';
    clickBanner.style.zIndex = '99999';
    clickBanner.style.padding = '8px 0';
    clickBanner.textContent = 'CLICK-THROUGH ACTIVE (Ctrl+Shift+U to disable)';
    document.body.appendChild(clickBanner);
  } else {
    clickBanner.style.display = '';
  }
}
function hideClickBanner() {
  if (clickBanner) clickBanner.style.display = 'none';
}

// Keyboard override: Ctrl+Shift+U disables click-through
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === "U") {
    if (typeof eyeState !== 'undefined') eyeState = "off";
    void applyStealth(false, 100);
    const api = desktopApi();
    api?.setOverlayStealth?.(false, 1);
    hideClickBanner();
    updateEyeIcon && updateEyeIcon();
  }
});
try {
  // Only works in Electron context with IPC
  // @ts-ignore
  const { ipcRenderer } = window.require ? window.require('electron') : {};
  if (ipcRenderer) {
    ipcRenderer.on('recording-state-changed', (_event: any, isRecording: boolean) => {
      const overlayBody = document.body;
      if (isRecording) {
        overlayBody.style.opacity = '0';
        overlayBody.style.pointerEvents = 'none';
        console.log('Privacy Mode: Active');
      } else {
        overlayBody.style.opacity = '1';
        overlayBody.style.pointerEvents = 'auto';
      }
    });
  }
} catch {}

/* =========================================================
   ADAPTIVE OPACITY (Voice Activity Driven)
========================================================= */

let adaptiveOpacityEnabled = true;
let adaptiveMinOpacity = 35;
let adaptiveMaxOpacity = 100;

function computeRms(input: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    sum += input[i] * input[i];
  }
  return Math.sqrt(sum / input.length);
}

function adaptiveOpacityFromVolume(rms: number) {
  if (!adaptiveOpacityEnabled) return;

  const normalized = Math.min(1, rms * 10); // scale sensitivity
  const target =
    adaptiveMinOpacity +
    (adaptiveMaxOpacity - adaptiveMinOpacity) * (1 - normalized);

  void applyStealth(Boolean(stealthModeEl.checked), target);
  trackMetric("adaptiveChanges");
}

// Hook adaptiveOpacityFromVolume(computeRms(input)) inside attachAudioStreamer()

/* =========================================================
   AI-TRIGGERED STEALTH INTENSITY
========================================================= */
// Example: inside your ai_decision event handler
// if (Number.isFinite(confidence)) {
//   const intensity = 100 - confidence * 60;
//   void applyStealth(true, intensity);
//   trackMetric("aiAdjustments");
// }

/* =========================================================
   3-STATE EYE ICON (visual stealth only - no click-through)
========================================================= */

type EyeState = "off" | "dim" | "hidden";
let eyeState: EyeState = "off";

function cycleEyeState() {
  if (eyeState === "off") {
    // Dim mode - 60% opacity
    eyeState = "dim";
    void applyStealth(true, 60);
  } else if (eyeState === "dim") {
    // Hidden mode - 30% opacity
    eyeState = "hidden";
    void applyStealth(true, 30);
  } else {
    // Back to full visibility
    eyeState = "off";
    void applyStealth(false, 100);
  }
  updateEyeIcon();
}

function updateEyeIcon() {
  const eyeIcon = document.getElementById("eyeIcon");
  if (!eyeIcon) return;

  if (eyeState === "off") eyeIcon.textContent = "👁️";
  if (eyeState === "dim") eyeIcon.textContent = "🌓";
  if (eyeState === "hidden") eyeIcon.textContent = "🙈";
}

document.getElementById("eyeBtn")?.addEventListener("click", cycleEyeState);

/* =========================================================
   OVERLAY ANALYTICS
========================================================= */

const overlayMetrics = {
  stealthActivations: 0,
  adaptiveChanges: 0,
  aiAdjustments: 0,
};

function trackMetric(key: keyof typeof overlayMetrics) {
  overlayMetrics[key]++;
}

setInterval(() => {
  console.log("Overlay Metrics:", overlayMetrics);
}, 15000);

/* =========================================================
   SMART STEALTH ENGINE
========================================================= */

let smartStealthEnabled = true;
let smartStealthTimer: number | null = null;
let smartStealthTimeoutMs = 7000; // 7s decay

function triggerSmartStealth() {
  if (!smartStealthEnabled) return;

  if (smartStealthTimer) {
    clearTimeout(smartStealthTimer);
    smartStealthTimer = null;
  }

  // Enable stealth visually
  void applyStealth(true, Number(uiOpacityEl.value || "60"));

  smartStealthTimer = window.setTimeout(() => {
    void applyStealth(false, 100);
  }, smartStealthTimeoutMs);
}

// Example: Hook into your WS handler (inside wireWsHandlers or similar)
// if (type === "interviewer_question") {
//   triggerSmartStealth();
// }

/* =========================================================
   DUAL MODE STEALTH
========================================================= */

type StealthModeType = "visual" | "clickthrough";
let stealthModeType: StealthModeType = "visual";

async function applyStealthAdvanced(enabled: boolean, opacityPct: number) {
  if (stealthModeType === "visual") {
    await applyStealth(enabled, opacityPct);
  } else {
    const api = desktopApi();
    if (api?.setOverlayStealth) {
      await api.setOverlayStealth(enabled, opacityPct / 100);
    }
  }
}

/* =========================================================
   OVERLAY BEHAVIOR CONTROLLER
========================================================= */

type OverlayBehavior = {
  smartStealth: boolean;
  stealthModeType: StealthModeType;
  autoDimOnSilence: boolean;
  silenceOpacity: number;
};

let overlayBehavior: OverlayBehavior = {
  smartStealth: true,
  stealthModeType: "visual",
  autoDimOnSilence: true,
  silenceOpacity: 40,
};

function applyBehaviorProfile(profile: Partial<OverlayBehavior>) {
  overlayBehavior = { ...overlayBehavior, ...profile };

  smartStealthEnabled = overlayBehavior.smartStealth;
  stealthModeType = overlayBehavior.stealthModeType;

  console.log("Overlay behavior updated:", overlayBehavior);
}

// Optional: Auto-Dim When Silence
let silenceTimer: number | null = null;

function resetSilenceTimer() {
  if (!overlayBehavior.autoDimOnSilence) return;

  if (silenceTimer) clearTimeout(silenceTimer);

  silenceTimer = window.setTimeout(() => {
    void applyStealthAdvanced(true, overlayBehavior.silenceOpacity);
  }, 10000); // 10s silence
}

// Example: Call resetSilenceTimer() inside your transcript event handler
// if (type === "transcript") {
//   resetSilenceTimer();
// }
});

startBtn.addEventListener("click", () => {
  start().catch((e) => {
    log(`Start failed: ${String((e as any)?.message || e)}`);
    void stop();
  });
});

stopBtn.addEventListener("click", () => {
  void stop();
});

// Defaults
backendUrlEl.value = state.backendUrl;
modeBtn.textContent = "Compact";
renderHintChips();
void initPrivacy();
void initStealth();
void refreshDevices();
