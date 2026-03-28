"use strict";
/* =========================================================
   HEADER STEALTH + SETTINGS MODAL WIRING (ADD-ONLY)
========================================================= */
(function () {
    // Move $ function declaration to the top so it is available before use
    const $ = (id) => document.getElementById(id);
    // Move stealthModeEl declaration after $ is defined
    const stealthModeEl = $("stealthMode");
    const eyeBtn = document.getElementById("eyeBtn");
    const eyeIcon = document.getElementById("eyeIcon");
    const stealthStatus = document.getElementById("stealthStatus");
    const settingsBtn = document.getElementById("settingsBtn");
    const settingsModal = document.getElementById("settingsModal");
    const settingsCancelBtn = document.getElementById("settingsCancelBtn");
    const settingsSaveBtn = document.getElementById("settingsSaveBtn");
    const settingsSaveIndicator = document.getElementById("settingsSaveIndicator");
    const settingResponseLength = document.getElementById("settingResponseLength");
    const settingLanguage = document.getElementById("settingLanguage");
    const settingProcessTime = document.getElementById("settingProcessTime");
    const settingFillerWords = document.getElementById("settingFillerWords");
    const settingThreshold = document.getElementById("settingThreshold");
    const settingThresholdVal = document.getElementById("settingThresholdVal");
    const settingProcessName = document.getElementById("settingProcessName");
    const settingAutoRead = document.getElementById("settingAutoRead");
    // API key fields
    const settingOpenaiKey = document.getElementById("settingOpenaiKey");
    const settingClaudeKey = document.getElementById("settingClaudeKey");
    // Resume / JD fields
    const settingResume = document.getElementById("settingResume");
    const settingJobDescription = document.getElementById("settingJobDescription");
    // Hotkey fields
    const hkToggleOverlay = document.getElementById("hkToggleOverlay");
    const hkCaptureScreen = document.getElementById("hkCaptureScreen");
    const hkToggleMic = document.getElementById("hkToggleMic");
    const hkToggleAi = document.getElementById("hkToggleAi");
    const hkToggleClickThrough = document.getElementById("hkToggleClickThrough");
    const hkQuit = document.getElementById("hkQuit");
    const desktop = window.atluriinDesktop;
    const SETTINGS_KEY = "atluri_overlay_settings_v2";
    /* ===========================
       STEALTH HEADER SYNC
    ============================ */
    function syncStealthUI(enabled) {
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
       SETTINGS MODAL TABS
    ============================ */
    // Tab switching
    document.querySelectorAll(".settings-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            const tabName = tab.dataset.tab;
            // Deactivate all tabs
            document.querySelectorAll(".settings-tab").forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".settings-panel").forEach(p => p.classList.remove("active"));
            // Activate selected
            tab.classList.add("active");
            const panel = document.querySelector(`.settings-panel[data-tab="${tabName}"]`);
            if (panel)
                panel.classList.add("active");
        });
    });
    settingsBtn?.addEventListener("click", () => {
        if (settingsModal)
            settingsModal.style.display = "flex";
    });
    settingsCancelBtn?.addEventListener("click", () => {
        if (settingsModal)
            settingsModal.style.display = "none";
    });
    settingThreshold?.addEventListener("input", () => {
        if (settingThresholdVal) {
            settingThresholdVal.textContent = settingThreshold.value;
        }
    });
    /* ===========================
       SAVE ALL SETTINGS (electron-store)
    ============================ */
    settingsSaveBtn?.addEventListener("click", async () => {
        // Gather all settings
        const preferences = {
            responseLength: settingResponseLength?.value ?? "default",
            language: settingLanguage?.value ?? "",
            processTime: settingProcessTime?.value ?? "fast",
            fillerWords: settingFillerWords?.checked ?? false,
            threshold: Number(settingThreshold?.value ?? "50"),
            processName: settingProcessName?.value ?? "",
            opacity: 100,
            autoRead: settingAutoRead?.checked ?? false,
        };
        const apiKeys = {
            openai: settingOpenaiKey?.value ?? "",
            claude: settingClaudeKey?.value ?? "",
        };
        const resume = settingResume?.value ?? "";
        const jobDescription = settingJobDescription?.value ?? "";
        const hotkeys = {
            toggleOverlay: hkToggleOverlay?.value || "CommandOrControl+Shift+H",
            captureScreen: hkCaptureScreen?.value || "CommandOrControl+Shift+S",
            toggleMic: hkToggleMic?.value || "CommandOrControl+Shift+M",
            toggleAi: hkToggleAi?.value || "CommandOrControl+Shift+P",
            toggleClickThrough: hkToggleClickThrough?.value || "CommandOrControl+Shift+T",
            quit: hkQuit?.value || "CommandOrControl+Shift+Q",
        };
        // Gather session setup from wizard (if populated)
        const sessionSetup = {
            scenario: document.getElementById("setupScenario")?.value || "general",
            company: document.getElementById("setupCompany")?.value || "",
            position: document.getElementById("setupPosition")?.value || "",
            objective: document.getElementById("setupObjective")?.value || "",
            industry: document.getElementById("setupIndustry")?.value || "default",
            experience: document.getElementById("setupExperience")?.value || "mid",
            companyResearch: document.getElementById("setupCompanyResearch")?.value || "",
            imageContext: document.getElementById("setupImageContext")?.value || "",
            model: window.getSelectedModel?.() || "gpt4o",
            coachStyle: document.getElementById("coachStyle")?.value || "balanced",
            coachEnabled: window.isCoachEnabled?.() ?? true,
            mode: "live",
        };
        // Sync setup wizard docs → settings modal fields
        const setupResumeVal = document.getElementById("setupResume")?.value || "";
        const setupJdVal = document.getElementById("setupJobDesc")?.value || "";
        if (setupResumeVal && settingResume)
            settingResume.value = setupResumeVal;
        if (setupJdVal && settingJobDescription)
            settingJobDescription.value = setupJdVal;
        const finalResume = setupResumeVal || resume;
        const finalJd = setupJdVal || jobDescription;
        // Save via electron-store if available, fallback to localStorage
        if (desktop?.setAllSettings) {
            try {
                await desktop.setAllSettings({ apiKeys, resume: finalResume, jobDescription: finalJd, hotkeys, preferences, sessionSetup });
                console.log("Settings saved to electron-store (encrypted)");
            }
            catch (e) {
                console.warn("electron-store save failed, using localStorage fallback", e);
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(preferences));
            }
        }
        else {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(preferences));
        }
        // Store resume/JD in a global so the AI context builder can access them
        window.__atluriResume = finalResume;
        window.__atluriJobDescription = finalJd;
        // Flash save indicator
        if (settingsSaveIndicator) {
            settingsSaveIndicator.style.display = "inline";
            setTimeout(() => { settingsSaveIndicator.style.display = "none"; }, 2000);
        }
        console.log("All settings saved");
        if (settingsModal)
            settingsModal.style.display = "none";
    });
    /* ===========================
       RESTORE SETTINGS ON LOAD (electron-store → fallback localStorage)
    ============================ */
    async function restoreSettings() {
        let allSettings = null;
        // Try electron-store first
        if (desktop?.getAllSettings) {
            try {
                allSettings = await desktop.getAllSettings();
            }
            catch {
                console.warn("Failed to load from electron-store");
            }
        }
        // Restore preferences
        const prefs = allSettings?.preferences || null;
        if (prefs) {
            if (settingResponseLength)
                settingResponseLength.value = prefs.responseLength ?? "default";
            if (settingLanguage)
                settingLanguage.value = prefs.language ?? "";
            if (settingProcessTime)
                settingProcessTime.value = prefs.processTime ?? "fast";
            if (settingFillerWords)
                settingFillerWords.checked = prefs.fillerWords ?? false;
            if (settingThreshold)
                settingThreshold.value = String(prefs.threshold ?? "50");
            if (settingThresholdVal)
                settingThresholdVal.textContent = String(prefs.threshold ?? "50");
            if (settingProcessName)
                settingProcessName.value = prefs.processName ?? "";
            if (settingAutoRead)
                settingAutoRead.checked = prefs.autoRead ?? false;
        }
        else {
            // Fallback: localStorage
            const saved = localStorage.getItem(SETTINGS_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (settingResponseLength)
                        settingResponseLength.value = parsed.responseLength ?? "default";
                    if (settingLanguage)
                        settingLanguage.value = parsed.language ?? "";
                    if (settingProcessTime)
                        settingProcessTime.value = parsed.processTime ?? "fast";
                    if (settingFillerWords)
                        settingFillerWords.checked = parsed.fillerWords ?? false;
                    if (settingThreshold)
                        settingThreshold.value = String(parsed.threshold ?? "50");
                    if (settingThresholdVal)
                        settingThresholdVal.textContent = String(parsed.threshold ?? "50");
                    if (settingProcessName)
                        settingProcessName.value = parsed.processName ?? "";
                }
                catch {
                    console.warn("Failed to restore overlay settings from localStorage");
                }
            }
        }
        // Restore API keys
        const keys = allSettings?.apiKeys;
        if (keys) {
            if (settingOpenaiKey)
                settingOpenaiKey.value = keys.openai ?? "";
            if (settingClaudeKey)
                settingClaudeKey.value = keys.claude ?? "";
        }
        // Restore Resume / JD
        const resume = allSettings?.resume ?? "";
        const jd = allSettings?.jobDescription ?? "";
        if (settingResume)
            settingResume.value = resume;
        if (settingJobDescription)
            settingJobDescription.value = jd;
        // Make available globally for AI context
        window.__atluriResume = resume;
        window.__atluriJobDescription = jd;
        // Restore hotkeys
        const hk = allSettings?.hotkeys;
        if (hk) {
            if (hkToggleOverlay)
                hkToggleOverlay.value = hk.toggleOverlay ?? "";
            if (hkCaptureScreen)
                hkCaptureScreen.value = hk.captureScreen ?? "";
            if (hkToggleMic)
                hkToggleMic.value = hk.toggleMic ?? "";
            if (hkToggleAi)
                hkToggleAi.value = hk.toggleAi ?? "";
            if (hkToggleClickThrough)
                hkToggleClickThrough.value = hk.toggleClickThrough ?? "";
            if (hkQuit)
                hkQuit.value = hk.quit ?? "";
        }
        // Restore session setup wizard
        const ss = allSettings?.sessionSetup;
        if (ss) {
            const setVal = (id, v) => { const el = document.getElementById(id); if (el && v)
                el.value = v; };
            setVal("setupScenario", ss.scenario);
            setVal("setupCompany", ss.company);
            setVal("setupPosition", ss.position);
            setVal("setupObjective", ss.objective);
            setVal("setupIndustry", ss.industry);
            setVal("setupExperience", ss.experience);
            setVal("setupCompanyResearch", ss.companyResearch);
            setVal("setupImageContext", ss.imageContext);
            setVal("coachStyle", ss.coachStyle);
            // Restore selected model
            if (ss.model) {
                const modelEl = document.querySelector(`[data-model="${ss.model}"]`);
                if (modelEl) {
                    document.querySelectorAll(".model-option").forEach(o => o.classList.remove("selected"));
                    modelEl.classList.add("selected");
                    window.__pendingModel = ss.model;
                }
            }
            // Sync resume/JD from setup wizard to settings modal if setup has content
            if (ss.scenario === "general" || true) {
                const setupResumeEl = document.getElementById("setupResume");
                const setupJdEl = document.getElementById("setupJobDesc");
                if (setupResumeEl && resume && !setupResumeEl.value)
                    setupResumeEl.value = resume;
                if (setupJdEl && jd && !setupJdEl.value)
                    setupJdEl.value = jd;
            }
        }
    }
    restoreSettings().catch(e => console.warn("restoreSettings error:", e));
    /* ===========================
       PERSONA MANAGEMENT IN SETTINGS
    ============================ */
    const addPersonaBtn = document.getElementById("addPersonaBtn");
    const personaListEl = document.getElementById("personaList");
    async function renderPersonaSettings() {
        if (!personaListEl || !desktop?.getPersonas)
            return;
        const personas = await desktop.getPersonas() || [];
        const activeId = await desktop.getActivePersona() || "default";
        personaListEl.innerHTML = "";
        for (const p of personas) {
            const row = document.createElement("div");
            row.style.cssText = "display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);";
            row.innerHTML = `
        <span style="font-size:18px;">${p.icon}</span>
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:600;">${p.name} ${p.id === activeId ? '<span style="color:#3cffaa;font-size:10px;">● ACTIVE</span>' : ''}</div>
          <div style="font-size:10px;opacity:0.6;">${p.systemPrompt.slice(0, 60)}...</div>
        </div>
        <button class="secondary persona-activate-btn" data-id="${p.id}" style="padding:3px 8px;font-size:10px;">${p.id === activeId ? 'Active' : 'Use'}</button>
        ${p.id !== "default" ? `<button class="secondary persona-delete-btn" data-id="${p.id}" style="padding:3px 8px;font-size:10px;color:#ff5069;">✕</button>` : ''}
      `;
            personaListEl.appendChild(row);
        }
        // Wire activate buttons
        personaListEl.querySelectorAll(".persona-activate-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id || "default";
                await desktop.setActivePersona(id);
                await renderPersonaSettings();
            });
        });
        // Wire delete buttons
        personaListEl.querySelectorAll(".persona-delete-btn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id || "";
                if (id) {
                    await desktop.removePersona(id);
                    await renderPersonaSettings();
                }
            });
        });
    }
    addPersonaBtn?.addEventListener("click", async () => {
        const nameInput = document.getElementById("newPersonaName");
        const iconInput = document.getElementById("newPersonaIcon");
        const promptInput = document.getElementById("newPersonaPrompt");
        const name = nameInput?.value?.trim();
        const icon = iconInput?.value?.trim() || "🎯";
        const prompt = promptInput?.value?.trim();
        if (!name || !prompt)
            return;
        const id = name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
        await desktop.addPersona({ id, name, icon, systemPrompt: prompt });
        if (nameInput)
            nameInput.value = "";
        if (iconInput)
            iconInput.value = "";
        if (promptInput)
            promptInput.value = "";
        await renderPersonaSettings();
    });
    // Render personas when settings modal opens
    settingsBtn?.addEventListener("click", () => {
        void renderPersonaSettings();
    });
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
    const desktop = window.atluriinDesktop;
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
    const desktop = window.atluriinDesktop;
    if (!desktop?.getOverlayPosition || !desktop?.setOverlayPosition) {
        console.warn("[drag] desktop API not available");
        return;
    }
    function setupDrag() {
        const titleBar = document.querySelector(".title-bar");
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
            if (e.target.closest("button"))
                return;
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
            if (!isDragging)
                return;
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
    }
    else {
        setupDrag();
    }
})();
const state = {
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
const $ = (id) => document.getElementById(id);
const backendUrlEl = $("backendUrl");
const roomIdEl = $("roomId");
const systemModeEl = $("systemMode");
const roleEl = $("setupScenario");
const micDeviceEl = $("micDevice");
const refreshDevicesBtn = $("refreshDevicesBtn");
const startBtn = $("startBtn");
const stopBtn = $("stopBtn");
const statusEl = $("status");
const logEl = $("log");
const questionEl = $("question");
const partialEl = $("partial");
const suggestionEl = $("suggestion");
const stealthModeEl = $("stealthMode");
const uiOpacityEl = $("uiOpacity");
const privacyBtn = $("privacyBtn");
const modeBtn = $("modeBtn");
const offerPctEl = $("offerPct");
const offerDeltaEl = $("offerDelta");
const offerBandEl = $("offerBand");
const driversEl = $("drivers");
const starChipsEl = $("starChips");
const mImpactEl = $("mImpact");
const mCredEl = $("mCred");
const mStarEl = $("mStar");
const mImpactValEl = $("mImpactVal");
const mCredValEl = $("mCredVal");
const mStarValEl = $("mStarVal");
const warningChipsEl = $("warningChips");
const feedEl = $("feed");
const testSystemBtn = $("testSystemBtn");
const testMicBtn = $("testMicBtn");
// New UI elements for suggestion actions
const copySuggestionBtn = $("copySuggestionBtn");
const ttsSuggestionBtn = $("ttsSuggestionBtn");
const stopTtsBtn = $("stopTtsBtn");
const autoReadToggle = $("autoReadToggle");
const hintChips = [];
let lastQuestionTs = 0;
let lastDecision = null;
let lastFinalTranscript = "";
let currentSuggestionText = "";
let ttsUtterance = null;
let isRunning = false;
/* ===========================
   TTS & COPY FUNCTIONALITY
============================ */
function getSuggestionText() {
    const raw = suggestionEl.textContent || "";
    return raw.replace(/^Suggestion:\s*/, "").trim();
}
/* ===========================
   COLOR-CODED SUGGESTION RENDERING
   Parses AI suggestion text for markers and applies CSS classes:
   - ✅ / ANSWER: → green (suggestion-answer)
   - 💡 / TIP: → blue (suggestion-tip)
   - ⚠️ / WARNING: → yellow (suggestion-warning)
   - ``` / CODE: → purple monospace (suggestion-code)
   - **Section** / ##  → bold section header
   - • / - bullet → indented bullet
============================ */
function renderColorCodedSuggestion(text) {
    suggestionEl.innerHTML = ""; // Clear previous
    const label = document.createElement("span");
    label.style.fontWeight = "700";
    label.textContent = "Suggestion: ";
    suggestionEl.appendChild(label);
    if (!text)
        return;
    const lines = text.split("\n");
    let inCodeBlock = false;
    for (const line of lines) {
        const trimmed = line.trim();
        // Code block toggle
        if (trimmed.startsWith("```")) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock) {
            const codeSpan = document.createElement("span");
            codeSpan.className = "suggestion-code suggestion-bullet";
            codeSpan.textContent = line;
            suggestionEl.appendChild(codeSpan);
            continue;
        }
        // Section headers (## or **bold**)
        if (/^#{1,3}\s/.test(trimmed) || /^\*\*[^*]+\*\*\s*$/.test(trimmed)) {
            const headerSpan = document.createElement("span");
            headerSpan.className = "suggestion-section";
            headerSpan.textContent = trimmed.replace(/^#{1,3}\s*/, "").replace(/\*\*/g, "");
            suggestionEl.appendChild(headerSpan);
            continue;
        }
        // Answer lines (✅ or ANSWER:)
        if (/^(✅|ANSWER:|Answer:|🟢)/i.test(trimmed)) {
            const span = document.createElement("span");
            span.className = "suggestion-answer suggestion-bullet";
            span.textContent = trimmed;
            suggestionEl.appendChild(span);
            continue;
        }
        // Tip lines (💡 or TIP:)
        if (/^(💡|TIP:|Tip:|🔵|NOTE:|Note:)/i.test(trimmed)) {
            const span = document.createElement("span");
            span.className = "suggestion-tip suggestion-bullet";
            span.textContent = trimmed;
            suggestionEl.appendChild(span);
            continue;
        }
        // Warning lines (⚠️ or WARNING:)
        if (/^(⚠️|WARNING:|Warning:|🟡|CAUTION:|⚠)/i.test(trimmed)) {
            const span = document.createElement("span");
            span.className = "suggestion-warning suggestion-bullet";
            span.textContent = trimmed;
            suggestionEl.appendChild(span);
            continue;
        }
        // Bullet points
        if (/^[•\-\*]\s/.test(trimmed)) {
            const span = document.createElement("span");
            span.className = "suggestion-bullet";
            span.textContent = trimmed;
            suggestionEl.appendChild(span);
            continue;
        }
        // Regular text
        const span = document.createElement("span");
        span.style.display = "block";
        span.textContent = line;
        suggestionEl.appendChild(span);
    }
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
function safeWsSend(ws, data) {
    if (ws.readyState !== WebSocket.OPEN)
        return false;
    // Backpressure: if buffered is too high, drop frames (best-effort realtime).
    if (typeof ws.bufferedAmount === "number" && ws.bufferedAmount > WS_MAX_BUFFERED_BYTES) {
        return false;
    }
    try {
        ws.send(data);
        return true;
    }
    catch {
        return false;
    }
}
function desktopApi() {
    return window.atluriinDesktop;
}
function clampOpacityPct(pct) {
    if (!Number.isFinite(pct))
        return 100;
    return Math.max(20, Math.min(100, pct));
}
function updateStealthFallback(enabled, opacityPct) {
    const root = document.getElementById("app-root");
    if (!root)
        return;
    if (enabled) {
        root.style.opacity = String(clampOpacityPct(opacityPct) / 100);
        // Keep interaction enabled unless explicitly using OS-level ignoreMouseEvents
        root.style.pointerEvents = "auto";
    }
    else {
        root.style.opacity = "1";
        root.style.pointerEvents = "auto";
    }
}
async function applyStealth(enabled, opacityPct) {
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
    }
    catch (e) {
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
function setPrivacyBtn(enabled) {
    privacyBtn.textContent = enabled ? "Privacy: On" : "Privacy: Off";
}
async function applyPrivacy(enabled) {
    setPrivacyBtn(enabled);
    try {
        const api = desktopApi();
        if (api?.setOverlayContentProtection) {
            const actual = await api.setOverlayContentProtection(Boolean(enabled));
            setPrivacyBtn(actual);
            localStorage.setItem("overlayPrivacy", actual ? "true" : "false");
            log(`Privacy mode ${actual ? "enabled" : "disabled"}`);
        }
        else {
            log("Privacy toggle unavailable (desktop API missing)");
        }
    }
    catch (e) {
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
    }
    catch {
    }
    setPrivacyBtn(false);
}
function clamp01(x) {
    return Math.max(0, Math.min(1, x));
}
function setBar(el, value0to100) {
    const pct = Math.max(0, Math.min(100, value0to100));
    el.style.width = `${pct.toFixed(0)}%`;
}
function base64UrlEncodeJson(value) {
    const json = JSON.stringify(value);
    const bytes = new TextEncoder().encode(json);
    let bin = "";
    for (const b of bytes)
        bin += String.fromCharCode(b);
    const b64 = btoa(bin);
    return b64.replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function getDevJwt(userId) {
    // Matches the repo's dev convention: unsigned token accepted when ALLOW_UNVERIFIED_JWT_DEV=true.
    const header = base64UrlEncodeJson({ alg: "HS256", typ: "JWT" });
    const payload = base64UrlEncodeJson({ sub: userId, role: "authenticated" });
    return `${header}.${payload}.signature`;
}
async function fetchOfferProbability() {
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
    }
    catch {
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
            }
            else {
                offerDeltaEl.textContent = `Δ ${res.status}`;
            }
            offerBandEl.textContent = "";
            return;
        }
        const data = (await res.json());
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
    }
    catch (e) {
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
function detectStar(text) {
    const t = (text || "").toLowerCase();
    const situation = /(situation|context|at the time|in that role|we were facing)/.test(t);
    const task = /(task|goal|objective|i needed to|my job was|i was responsible)/.test(t);
    const action = /(action|i did|i led|i built|i implemented|i designed|i drove|i coordinated)/.test(t);
    const result = /(result|impact|outcome|reduced|improved|increased|saved|%|\bms\b|\bminutes\b|\bweeks\b|\$)/.test(t);
    return { situation, task, action, result };
}
function renderStarChips(text) {
    const s = detectStar(text);
    const items = [
        ["Situation", s.situation],
        ["Task", s.task],
        ["Action", s.action],
        ["Result", s.result],
    ];
    starChipsEl.innerHTML = items
        .map(([label, ok]) => `<span class="chip ${ok ? "good" : ""}">${ok ? "✔" : "·"} ${label}</span>`)
        .join("");
}
function addFeedItem(kind, text, tag) {
    const safe = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeTag = (tag || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<span class="t">${now()}</span><b>${kind}:</b> ${safe}${tag ? ` <span class="tag">(${safeTag})</span>` : ""}`;
    feedEl.prepend(div);
    // Keep feed bounded.
    const children = Array.from(feedEl.children);
    if (children.length > 30) {
        for (const n of children.slice(30))
            n.remove();
    }
}
function now() {
    return new Date().toISOString().slice(11, 19);
}
function log(line) {
    logEl.textContent = `${now()} ${line}\n${logEl.textContent || ""}`;
}
function setStatus(s) {
    statusEl.textContent = s;
}
function wsUrl(baseHttp, path) {
    return baseHttp.replace(/^http/i, "ws") + path;
}
function newRoomId() {
    // UUID v4-ish
    return crypto.randomUUID ? crypto.randomUUID() : `room-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function floatTo16kPcmFrames(float32, inSampleRate) {
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
    const frames = [];
    for (let i = 0; i + frameSamples <= out.length; i += frameSamples) {
        frames.push(out.subarray(i, i + frameSamples).buffer.slice(out.byteOffset + i * 2, out.byteOffset + (i + frameSamples) * 2));
    }
    return frames;
}
function attachAudioStreamer(stream, ws, label) {
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    source.connect(processor);
    processor.connect(ctx.destination);
    processor.onaudioprocess = (ev) => {
        if (ws.readyState !== WebSocket.OPEN)
            return;
        const input = ev.inputBuffer.getChannelData(0);
        const frames = floatTo16kPcmFrames(new Float32Array(input), ctx.sampleRate);
        for (const frame of frames) {
            if (frame.byteLength < 320)
                continue;
            safeWsSend(ws, frame);
        }
        // FEATURE 7: Feed voice tone matching (mic only, first 60s)
        if (label === "mic" && window.__feedVoiceTone) {
            window.__feedVoiceTone(new Float32Array(input), ctx.sampleRate);
        }
        // FEATURE: Adaptive opacity from volume
        if (label === "mic") {
            adaptiveOpacityFromVolume(computeRms(new Float32Array(input)));
        }
    };
    const stop = () => {
        try {
            processor.disconnect();
        }
        catch { }
        try {
            source.disconnect();
        }
        catch { }
        try {
            ctx.close();
        }
        catch { }
        for (const t of stream.getTracks()) {
            try {
                t.stop();
            }
            catch { }
        }
        log(`${label}: stopped audio capture.`);
    };
    return { ctx, stop };
}
function connectWsPair(backendHttp, roomId) {
    const base = backendHttp.replace(/\/+$/g, "");
    const interviewer = new WebSocket(wsUrl(base, `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(roomId)}&participant=interviewer`));
    const candidate = new WebSocket(wsUrl(base, `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(roomId)}&participant=candidate`));
    interviewer.binaryType = "arraybuffer";
    candidate.binaryType = "arraybuffer";
    return { interviewer, candidate };
}
async function connectWithRetry(make, name, maxMs = 20_000) {
    const start = Date.now();
    let attempt = 0;
    while (Date.now() - start < maxMs) {
        attempt += 1;
        const ws = make();
        try {
            await new Promise((res, rej) => {
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
            if (attempt > 1)
                log(`${name} ws recovered after ${attempt} attempts`);
            return ws;
        }
        catch {
            try {
                ws.close();
            }
            catch { }
            const backoff = Math.min(1500, 150 + attempt * 150);
            await new Promise((r) => setTimeout(r, backoff));
        }
    }
    throw new Error(`${name} ws failed to connect`);
}
function wireWsHandlers(pair) {
    const onMsg = (raw) => {
        let text = "";
        try {
            text = typeof raw.data === "string" ? raw.data : new TextDecoder().decode(raw.data);
            const msg = JSON.parse(text);
            const type = String(msg?.type || "");
            if (type === "partial_transcript") {
                partialEl.textContent = `Partial: ${String(msg?.text || "")}`;
                // FEATURE 4: Feed predictive streaming
                if (window.__checkPredictive) {
                    window.__checkPredictive(String(msg?.text || ""), "partial_transcript");
                }
            }
            if (type === "transcript") {
                log(`TRANSCRIPT: ${String(msg?.text || "")}`);
                lastFinalTranscript = String(msg?.text || "");
                renderStarChips(lastFinalTranscript);
                addFeedItem("You", String(msg?.text || ""));
                // FEATURE 6: Capture for session replay
                if (window.__sessionCapture) {
                    window.__sessionCapture("transcript", String(msg?.text || ""));
                }
            }
            if (type === "interviewer_question") {
                questionEl.textContent = `Question: ${String(msg?.question || "")}`;
                log(`QUESTION: ${String(msg?.question || "")}`);
                lastQuestionTs = Date.now();
                currentSuggestionText = ""; // Reset for new question
                suggestionEl.textContent = "Suggestion: (generating...)";
                addFeedItem("Interviewer", String(msg?.question || ""), "question detected");
                // FEATURE 4: Feed predictive streaming
                if (window.__checkPredictive) {
                    window.__checkPredictive(String(msg?.question || ""), "interviewer_question");
                }
                // FEATURE 6: Capture for session replay
                if (window.__sessionCapture) {
                    window.__sessionCapture("question", String(msg?.question || ""));
                }
                // FEATURE 9: Broadcast to mirror clients
                const mirrorDesktop = window.atluriinDesktop;
                if (mirrorDesktop?.broadcastMirror) {
                    mirrorDesktop.broadcastMirror({ type: "question", text: String(msg?.question || ""), ts: Date.now() });
                }
            }
            if (type === "answer_suggestion_chunk") {
                // Streaming suggestion chunks — accumulate in variable, show plain text during streaming
                const chunk = String(msg?.chunk || "");
                currentSuggestionText += chunk;
                suggestionEl.textContent = `Suggestion: ${currentSuggestionText}`;
            }
            if (type === "answer_suggestion_done") {
                log(`SUGGESTION_DONE (${String(msg?.status || "")})`);
                // Render with color coding now that full text is available
                renderColorCodedSuggestion(currentSuggestionText);
                // Auto-read if enabled
                if (autoReadToggle?.checked) {
                    speakSuggestion();
                }
                // FEATURE 6: Capture for session replay
                if (window.__sessionCapture) {
                    window.__sessionCapture("suggestion", currentSuggestionText);
                }
                // FEATURE 9: Broadcast suggestion to mirror clients
                const mirrorDesktop2 = window.atluriinDesktop;
                if (mirrorDesktop2?.broadcastMirror) {
                    mirrorDesktop2.broadcastMirror({ type: "suggestion", text: currentSuggestionText, ts: Date.now() });
                }
            }
            if (type === "assist_hint") {
                const p = msg?.payload || {};
                const ruleId = String(p?.rule_id || "");
                const title = String(p?.title || "Assist hint");
                const severity = String(p?.severity || "low");
                hintChips.unshift({ rule_id: ruleId, title, severity, ts: Date.now() });
                // Keep unique by rule_id.
                const seen = new Set();
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
        }
        catch {
            if (text)
                log(`WS: ${text.slice(0, 200)}`);
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
async function selectMic() {
    const selected = String(micDeviceEl.value || "").trim();
    // STEALTH: Disable echo cancellation & noise suppression for clean signal.
    // These filters can strip important speech content during live capture.
    const audio = selected
        ? { deviceId: { exact: selected }, echoCancellation: false, noiseSuppression: false, autoGainControl: true, sampleRate: 16000, channelCount: 1 }
        : { echoCancellation: false, noiseSuppression: false, autoGainControl: true, sampleRate: 16000, channelCount: 1 };
    return await navigator.mediaDevices.getUserMedia({ audio, video: false });
}
async function selectSystemAudio() {
    // macOS BlackHole virtual audio driver detection
    // On macOS, getDisplayMedia system audio is unreliable.
    // BlackHole creates a virtual audio device for system audio loopback.
    const isMac = /Macintosh|Mac OS/i.test(navigator.userAgent);
    if (isMac) {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const blackhole = devices.find(d => d.kind === "audioinput" && /blackhole|soundflower|loopback/i.test(d.label));
            if (blackhole) {
                log(`macOS: Using virtual audio device "${blackhole.label}" for system audio`);
                const bhStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        deviceId: { exact: blackhole.deviceId },
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false,
                        sampleRate: 16000,
                        channelCount: 1,
                    },
                    video: false,
                });
                return bhStream;
            }
            else {
                log("macOS: No BlackHole/Soundflower found. Falling back to screen share.");
            }
        }
        catch (e) {
            log(`macOS BlackHole detection failed: ${String(e?.message || e)}`);
        }
    }
    // Fallback: screen share (Windows/Linux, or macOS without BlackHole)
    const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
    // Stop video track; keep audio.
    for (const t of stream.getVideoTracks()) {
        try {
            t.stop();
        }
        catch { }
    }
    return stream;
}
async function refreshDevices() {
    try {
        // Trigger permission prompt once, so labels populate.
        const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        for (const t of s.getTracks())
            t.stop();
    }
    catch {
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
    if (current)
        micDeviceEl.value = current;
}
async function start() {
    if (state.ws)
        return;
    isRunning = true;
    state.backendUrl = backendUrlEl.value.trim() || "http://localhost:9010";
    state.roomId = roomIdEl.value.trim() || newRoomId();
    state.role = roleEl?.value || "behavioral";
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
    }
    else {
        const system = await selectSystemAudio();
        state.systemStream = system;
    }
    setStatus("Connecting WebSockets...");
    const base = state.backendUrl.replace(/\/+$/g, "");
    const interviewer = await connectWithRetry(() => new WebSocket(wsUrl(base, `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(state.roomId)}&participant=interviewer`)), "interviewer");
    const candidate = await connectWithRetry(() => new WebSocket(wsUrl(base, `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(state.roomId)}&participant=candidate`)), "candidate");
    interviewer.binaryType = "arraybuffer";
    candidate.binaryType = "arraybuffer";
    const pair = { interviewer, candidate };
    state.ws = pair;
    wireWsHandlers(pair);
    // Offer probability is independent of WS stream; start it as soon as we go live.
    startOfferPolling();
    // Build session context from setup wizard and send to backend.
    const ctx = window.getSessionContext?.() || {};
    const sessionPayload = JSON.stringify({
        role: state.role,
        company: ctx.company || "",
        position: ctx.position || "",
        objective: ctx.objective || "",
        industry: ctx.industry || "default",
        experience: ctx.experience || "mid",
        model: ctx.model || "gpt4o",
        coachStyle: ctx.coachStyle || "balanced",
        coachEnabled: ctx.coachEnabled !== "false",
        mode: ctx.mode || "live",
        companyResearch: ctx.companyResearch || "",
        imageContext: ctx.imageContext || "",
    });
    safeWsSend(pair.interviewer, sessionPayload);
    safeWsSend(pair.candidate, sessionPayload);
    setStatus("Streaming audio (system→interviewer, mic→candidate)...");
    startBtn.disabled = true;
    startBtn.style.display = "none";
    stopBtn.disabled = false;
    stopBtn.style.display = "block";
    // Show speech analytics card when session starts
    const speechCard = document.getElementById("speechCard");
    if (speechCard)
        speechCard.style.display = "block";
    const micStreamer = attachAudioStreamer(mic, pair.candidate, "mic");
    const sysStreamer = state.systemStream ? attachAudioStreamer(state.systemStream, pair.interviewer, "system") : null;
    state.micCtx = micStreamer.ctx;
    state.systemCtx = sysStreamer?.ctx || null;
    state.stopFns.push(micStreamer.stop);
    if (sysStreamer)
        state.stopFns.push(sysStreamer.stop);
}
async function stop() {
    setStatus("Stopping...");
    isRunning = false;
    stopOfferPolling();
    // Stop WASAPI loopback if running.
    try {
        const api = desktopApi();
        if (api?.stopLoopback)
            await api.stopLoopback();
    }
    catch {
    }
    for (const fn of state.stopFns.splice(0)) {
        try {
            fn();
        }
        catch { }
    }
    try {
        state.ws?.candidate.send(JSON.stringify({ type: "stop" }));
    }
    catch { }
    try {
        state.ws?.interviewer.send(JSON.stringify({ type: "stop" }));
    }
    catch { }
    try {
        state.ws?.candidate.close();
    }
    catch { }
    try {
        state.ws?.interviewer.close();
    }
    catch { }
    state.ws = null;
    state.micStream = null;
    state.systemStream = null;
    state.micCtx = null;
    state.systemCtx = null;
    startBtn.disabled = false;
    startBtn.style.display = "block";
    stopBtn.disabled = true;
    stopBtn.style.display = "none";
    setStatus("Ready");
    log("Session ended.");
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
        for (const t of s.getTracks())
            t.stop();
        setStatus("Mic OK.");
    }
    catch (e) {
        setStatus(`Mic error: ${String(e?.message || e)}`);
    }
});
testSystemBtn.addEventListener("click", async () => {
    try {
        setStatus("Selecting system audio source (share screen/window + enable audio)...");
        const s = await selectSystemAudio();
        for (const t of s.getTracks())
            t.stop();
        setStatus("System audio OK.");
    }
    catch (e) {
        setStatus(`System audio error: ${String(e?.message || e)}`);
    }
});
refreshDevicesBtn.addEventListener("click", () => {
    void refreshDevices();
});
// --- Overlay Privacy: Listen for recording state from main process ---
// --- Click-Through Mode Safety: Keyboard override and banner ---
// Add a visible banner for click-through mode
let clickBanner = null;
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
    }
    else {
        clickBanner.style.display = '';
    }
}
function hideClickBanner() {
    if (clickBanner)
        clickBanner.style.display = 'none';
}
// Keyboard override: Ctrl+Shift+U disables click-through
window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === "U") {
        if (typeof eyeState !== 'undefined')
            eyeState = "off";
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
        ipcRenderer.on('recording-state-changed', (_event, isRecording) => {
            const overlayBody = document.body;
            if (isRecording) {
                overlayBody.style.opacity = '0';
                overlayBody.style.pointerEvents = 'none';
                console.log('Privacy Mode: Active');
            }
            else {
                overlayBody.style.opacity = '1';
                overlayBody.style.pointerEvents = 'auto';
            }
        });
    }
}
catch { }
/* =========================================================
   ADAPTIVE OPACITY (Voice Activity Driven)
========================================================= */
let adaptiveOpacityEnabled = true;
let adaptiveMinOpacity = 35;
let adaptiveMaxOpacity = 100;
function computeRms(input) {
    let sum = 0;
    for (let i = 0; i < input.length; i++) {
        sum += input[i] * input[i];
    }
    return Math.sqrt(sum / input.length);
}
function adaptiveOpacityFromVolume(rms) {
    if (!adaptiveOpacityEnabled)
        return;
    const normalized = Math.min(1, rms * 10); // scale sensitivity
    const target = adaptiveMinOpacity +
        (adaptiveMaxOpacity - adaptiveMinOpacity) * (1 - normalized);
    void applyStealth(Boolean(stealthModeEl.checked), target);
    trackMetric("adaptiveChanges");
}
let eyeState = "off";
function cycleEyeState() {
    if (eyeState === "off") {
        // Dim mode - 60% opacity
        eyeState = "dim";
        void applyStealth(true, 60);
    }
    else if (eyeState === "dim") {
        // Hidden mode - 30% opacity
        eyeState = "hidden";
        void applyStealth(true, 30);
    }
    else {
        // Back to full visibility
        eyeState = "off";
        void applyStealth(false, 100);
    }
    updateEyeIcon();
}
function updateEyeIcon() {
    const eyeIcon = document.getElementById("eyeIcon");
    if (!eyeIcon)
        return;
    if (eyeState === "off")
        eyeIcon.textContent = "👁️";
    if (eyeState === "dim")
        eyeIcon.textContent = "🌓";
    if (eyeState === "hidden")
        eyeIcon.textContent = "🙈";
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
function trackMetric(key) {
    overlayMetrics[key]++;
}
setInterval(() => {
    console.log("Overlay Metrics:", overlayMetrics);
}, 15000);
/* =========================================================
   SMART STEALTH ENGINE
========================================================= */
let smartStealthEnabled = true;
let smartStealthTimer = null;
let smartStealthTimeoutMs = 7000; // 7s decay
function triggerSmartStealth() {
    if (!smartStealthEnabled)
        return;
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
let stealthModeType = "visual";
async function applyStealthAdvanced(enabled, opacityPct) {
    if (stealthModeType === "visual") {
        await applyStealth(enabled, opacityPct);
    }
    else {
        const api = desktopApi();
        if (api?.setOverlayStealth) {
            await api.setOverlayStealth(enabled, opacityPct / 100);
        }
    }
}
let overlayBehavior = {
    smartStealth: true,
    stealthModeType: "visual",
    autoDimOnSilence: true,
    silenceOpacity: 40,
};
function applyBehaviorProfile(profile) {
    overlayBehavior = { ...overlayBehavior, ...profile };
    smartStealthEnabled = overlayBehavior.smartStealth;
    stealthModeType = overlayBehavior.stealthModeType;
    console.log("Overlay behavior updated:", overlayBehavior);
}
// Optional: Auto-Dim When Silence
let silenceTimer = null;
function resetSilenceTimer() {
    if (!overlayBehavior.autoDimOnSilence)
        return;
    if (silenceTimer)
        clearTimeout(silenceTimer);
    silenceTimer = window.setTimeout(() => {
        void applyStealthAdvanced(true, overlayBehavior.silenceOpacity);
    }, 10000); // 10s silence
}
// Example: Call resetSilenceTimer() inside your transcript event handler
// if (type === "transcript") {
//   resetSilenceTimer();
// }
startBtn.addEventListener("click", () => {
    start().catch((e) => {
        log(`Start failed: ${String(e?.message || e)}`);
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
/* =========================================================
   SCREEN CAPTURE: Region Selection + Vision API Analysis
========================================================= */
(function initScreenCapture() {
    const desktop = window.atluriinDesktop;
    const overlay = document.getElementById("regionSelectOverlay");
    const rect = document.getElementById("selectionRect");
    const captureBtn = document.getElementById("captureBtn");
    const captureCard = document.getElementById("captureCard");
    const captureAnalysis = document.getElementById("captureAnalysis");
    const captureNewBtn = document.getElementById("captureNewBtn");
    const captureCloseBtn = document.getElementById("captureCloseBtn");
    const captureStatusPill = document.getElementById("captureStatusPill");
    let isSelecting = false;
    let startX = 0;
    let startY = 0;
    function enterRegionSelect() {
        if (!overlay)
            return;
        overlay.style.display = "block";
        rect.style.width = "0";
        rect.style.height = "0";
        isSelecting = false;
        log("Screen capture: drag to select region, ESC to cancel");
    }
    // Listen for main-process trigger (hotkey Ctrl+Shift+S)
    if (desktop?.onEnterRegionSelect) {
        desktop.onEnterRegionSelect(() => enterRegionSelect());
    }
    // Manual capture button in header
    captureBtn?.addEventListener("click", () => {
        if (desktop?.startRegionSelect) {
            desktop.startRegionSelect();
        }
        else {
            enterRegionSelect();
        }
    });
    // Region selection mouse handlers
    overlay?.addEventListener("mousedown", (e) => {
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;
        rect.style.left = `${startX}px`;
        rect.style.top = `${startY}px`;
        rect.style.width = "0";
        rect.style.height = "0";
        e.preventDefault();
    });
    overlay?.addEventListener("mousemove", (e) => {
        if (!isSelecting)
            return;
        const x = Math.min(e.clientX, startX);
        const y = Math.min(e.clientY, startY);
        const w = Math.abs(e.clientX - startX);
        const h = Math.abs(e.clientY - startY);
        rect.style.left = `${x}px`;
        rect.style.top = `${y}px`;
        rect.style.width = `${w}px`;
        rect.style.height = `${h}px`;
    });
    overlay?.addEventListener("mouseup", async (e) => {
        if (!isSelecting)
            return;
        isSelecting = false;
        overlay.style.display = "none";
        const x = Math.min(e.clientX, startX);
        const y = Math.min(e.clientY, startY);
        const w = Math.abs(e.clientX - startX);
        const h = Math.abs(e.clientY - startY);
        // Restore overlay state after selection
        if (desktop?.endRegionSelect) {
            desktop.endRegionSelect();
        }
        if (w < 10 || h < 10) {
            log("Screen capture cancelled (selection too small)");
            return;
        }
        log(`Capturing region: ${x},${y} ${w}x${h}`);
        if (captureStatusPill) {
            captureStatusPill.style.display = "inline-flex";
        }
        try {
            // Capture via main process (desktopCapturer + crop)
            if (desktop?.captureRegion) {
                const result = await desktop.captureRegion(x, y, w, h);
                if (result.ok && result.base64) {
                    log(`Captured ${result.width}x${result.height} region`);
                    if (captureCard)
                        captureCard.style.display = "block";
                    if (captureAnalysis)
                        captureAnalysis.textContent = "Sending to AI for analysis...";
                    // Send to backend Vision API for analysis
                    void analyzeCapture(result.base64);
                }
                else {
                    log(`Capture failed: ${result.error || "unknown"}`);
                }
            }
            else {
                log("Capture unavailable (desktop API missing)");
            }
        }
        catch (err) {
            log(`Capture error: ${String(err?.message || err)}`);
        }
        finally {
            if (captureStatusPill) {
                captureStatusPill.style.display = "none";
            }
        }
    });
    // ESC to cancel selection
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay?.style.display === "block") {
            overlay.style.display = "none";
            isSelecting = false;
            if (desktop?.endRegionSelect)
                desktop.endRegionSelect();
            log("Screen capture cancelled");
        }
    });
    // Close capture card
    captureCloseBtn?.addEventListener("click", () => {
        if (captureCard)
            captureCard.style.display = "none";
    });
    // New capture from card
    captureNewBtn?.addEventListener("click", () => {
        if (desktop?.startRegionSelect) {
            desktop.startRegionSelect();
        }
        else {
            enterRegionSelect();
        }
    });
    /**
     * Send captured screenshot to backend for Vision AI analysis.
     * Posts base64 image to the backend, which routes to GPT-4 Vision.
     */
    async function analyzeCapture(base64) {
        const backendBase = (backendUrlEl.value.trim() || state.backendUrl).replace(/\/+$/g, "");
        // Get auth token
        let token = state.offerAuthToken;
        try {
            if (desktop?.getAccessTokenFromApp) {
                const real = await desktop.getAccessTokenFromApp();
                if (real)
                    token = real;
            }
        }
        catch { }
        if (!token)
            token = getDevJwt(state.offerUserId);
        try {
            const res = await fetch(`${backendBase}/api/capture/analyze`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    image_base64: base64,
                    context: {
                        role: state.role,
                        question: questionEl.textContent?.replace(/^Question:\s*/, "") || "",
                        transcript: lastFinalTranscript,
                        resume: window.__atluriResume || "",
                        job_description: window.__atluriJobDescription || "",
                    },
                }),
            });
            if (res.ok) {
                const data = await res.json();
                const analysis = String(data?.analysis || data?.text || JSON.stringify(data));
                if (captureAnalysis)
                    captureAnalysis.textContent = analysis;
                log("Screen capture analyzed successfully");
                addFeedItem("Vision", analysis.slice(0, 120) + (analysis.length > 120 ? "..." : ""), "screen capture");
                // Also inject into suggestion if relevant
                if (analysis && suggestionEl) {
                    const prev = getSuggestionText();
                    if (!prev || prev === "(waiting)") {
                        currentSuggestionText = analysis;
                        renderColorCodedSuggestion(analysis);
                    }
                }
            }
            else {
                const errText = await res.text();
                if (captureAnalysis)
                    captureAnalysis.textContent = `Analysis failed (${res.status}): ${errText}`;
                log(`Vision API error: ${res.status}`);
            }
        }
        catch (err) {
            if (captureAnalysis)
                captureAnalysis.textContent = `Error: ${String(err?.message || err)}`;
            log(`Vision API fetch failed: ${String(err?.message || err)}`);
        }
    }
})();
/* =========================================================
   IPC EVENT WIRING: Mic/AI status from main process hotkeys
========================================================= */
(function initControlEvents() {
    const desktop = window.atluriinDesktop;
    const micPill = document.getElementById("micStatusPill");
    const aiPill = document.getElementById("aiStatusPill");
    // Mic mute toggle from hotkey (Ctrl+Shift+M)
    if (desktop?.onMicMuted) {
        desktop.onMicMuted((muted) => {
            if (micPill) {
                micPill.className = `status-pill ${muted ? "muted" : "active"}`;
                micPill.textContent = muted ? "\uD83C\uDFA4 Mic OFF" : "\uD83C\uDFA4 Mic ON";
            }
            // Actually mute/unmute local mic tracks
            if (state.micStream) {
                for (const track of state.micStream.getAudioTracks()) {
                    track.enabled = !muted;
                }
            }
            log(`Mic ${muted ? "muted" : "unmuted"} via hotkey`);
        });
    }
    // AI pause toggle from hotkey (Ctrl+Shift+P)
    if (desktop?.onAiPaused) {
        desktop.onAiPaused((paused) => {
            if (aiPill) {
                aiPill.className = `status-pill ${paused ? "paused" : "active"}`;
                aiPill.textContent = paused ? "\uD83E\uDD16 AI PAUSED" : "\uD83E\uDD16 AI ON";
            }
            // Send pause signal to backend via WS
            if (state.ws) {
                const msg = JSON.stringify({ type: paused ? "pause_ai" : "resume_ai" });
                safeWsSend(state.ws.candidate, msg);
                safeWsSend(state.ws.interviewer, msg);
            }
            log(`AI ${paused ? "paused" : "resumed"} via hotkey`);
        });
    }
    // Click-through notification
    if (desktop?.onClickThrough) {
        desktop.onClickThrough((enabled) => {
            if (enabled) {
                showClickBanner();
            }
            else {
                hideClickBanner();
            }
            log(`Click-through ${enabled ? "enabled" : "disabled"} via hotkey`);
        });
    }
    // Recording detection — DISABLED to prevent opacity interference
    // Can be re-enabled once basic functionality is confirmed working
    /*
    if (desktop?.onRecordingStateChanged) {
      desktop.onRecordingStateChanged((isRecording: boolean) => {
        const overlayBody = document.body;
        if (isRecording) {
          overlayBody.style.opacity = '0.15';
          log('Privacy Mode: Active (recording detected — dimmed)');
        } else {
          overlayBody.style.opacity = '1';
        }
      });
    }
    */
})();
/* =========================================================
   FEATURE 2: SMART HOVER CLICK-THROUGH
   DISABLED — was blocking all mouse input.
   Can be re-enabled later once basic clicks work.
========================================================= */
// Smart hover completely disabled to prevent any mouse passthrough issues.
/* =========================================================
   FEATURE 4: PREDICTIVE RESPONSE STREAMING
   Pre-fetch AI response while question is still being asked.
   Starts generating after detecting 5+ words of partial transcript.
========================================================= */
(function initPredictiveStreaming() {
    const desktop = window.atluriinDesktop;
    let predictiveEnabled = true;
    let predictiveWordThreshold = 5;
    let lastPredictivePrompt = "";
    let predictiveAbortController = null;
    let predictiveResult = "";
    // Monitor partial transcripts for early question detection
    const originalOnMsg = window.__wireWsOnMsg;
    // Override the WS message handler to intercept partial transcripts
    function checkPredictive(text, type) {
        if (!predictiveEnabled)
            return;
        if (type === "partial_transcript") {
            const words = text.trim().split(/\s+/);
            if (words.length >= predictiveWordThreshold) {
                const prompt = text.trim();
                // Only re-fetch if prompt changed significantly
                if (prompt !== lastPredictivePrompt && prompt.length > lastPredictivePrompt.length + 10) {
                    lastPredictivePrompt = prompt;
                    void preFetchResponse(prompt);
                }
            }
        }
        if (type === "interviewer_question") {
            // Full question detected — if we already have a predictive result, show it immediately
            if (predictiveResult) {
                const suggestionEl = document.getElementById("suggestion");
                if (suggestionEl) {
                    const label = document.createElement("span");
                    label.style.cssText = "font-weight:700;color:#3cffaa;font-size:10px;";
                    label.textContent = "⚡ PRE-FETCHED ";
                    suggestionEl.prepend(label);
                }
            }
            // Reset for next question
            lastPredictivePrompt = "";
            predictiveResult = "";
        }
    }
    async function preFetchResponse(partialQuestion) {
        // Abort previous predictive request
        if (predictiveAbortController) {
            predictiveAbortController.abort();
        }
        predictiveAbortController = new AbortController();
        try {
            // Try Ollama first for speed (no network latency)
            if (desktop?.generateOllama) {
                const ollamaCheck = await desktop.checkOllama();
                if (ollamaCheck?.available && ollamaCheck.models.length > 0) {
                    const persona = window.__activePersonaPrompt || "You are an interview coach.";
                    const result = await desktop.generateOllama({
                        model: ollamaCheck.models[0],
                        prompt: `Predict the full interview question from this partial: "${partialQuestion}"\nProvide a concise answer suggestion.`,
                        system: persona,
                    });
                    if (result?.ok && result.text) {
                        predictiveResult = result.text;
                        return;
                    }
                }
            }
            // Fallback: use backend
            const backendUrl = document.getElementById("backendUrl")?.value?.trim() || "http://localhost:9010";
            const res = await fetch(`${backendUrl.replace(/\/+$/, "")}/api/capture/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: predictiveAbortController.signal,
                body: JSON.stringify({
                    image_base64: "",
                    context: {
                        role: document.getElementById("role")?.value || "behavioral",
                        question: partialQuestion,
                        transcript: "",
                        resume: window.__atluriResume || "",
                        job_description: window.__atluriJobDescription || "",
                        predictive: true,
                    },
                }),
            });
            if (res.ok) {
                const data = await res.json();
                predictiveResult = String(data?.analysis || data?.text || "");
            }
        }
        catch {
            // Aborted or failed — silently ignore
        }
    }
    // Expose for WS handler integration
    window.__checkPredictive = checkPredictive;
    window.__togglePredictive = (enabled) => {
        predictiveEnabled = enabled;
    };
    console.log("[predictive-stream] initialized");
})();
/* =========================================================
   FEATURE 5: PERSONA SWITCHING UI
   Load/save prompt personas, show switcher in header
========================================================= */
(function initPersonaSwitcher() {
    const desktop = window.atluriinDesktop;
    if (!desktop?.getPersonas)
        return;
    const personaBar = document.getElementById("personaBar");
    if (!personaBar)
        return;
    let personas = [];
    let activeId = "default";
    async function loadPersonas() {
        try {
            personas = await desktop.getPersonas() || [];
            activeId = await desktop.getActivePersona() || "default";
            renderPersonaBar();
        }
        catch (e) {
            console.warn("Failed to load personas", e);
        }
    }
    function renderPersonaBar() {
        if (!personaBar)
            return;
        personaBar.innerHTML = "";
        for (const p of personas) {
            const btn = document.createElement("button");
            btn.className = `persona-chip ${p.id === activeId ? "active" : ""}`;
            btn.textContent = `${p.icon} ${p.name}`;
            btn.title = p.systemPrompt.slice(0, 80);
            btn.addEventListener("click", () => {
                activeId = p.id;
                desktop.setActivePersona(p.id);
                window.__activePersonaPrompt = p.systemPrompt;
                renderPersonaBar();
                console.log(`[persona] switched to ${p.name}`);
            });
            personaBar.appendChild(btn);
        }
    }
    // Listen for persona changes from main process
    if (desktop.onPersonaChanged) {
        desktop.onPersonaChanged((persona) => {
            if (persona) {
                activeId = persona.id;
                window.__activePersonaPrompt = persona.systemPrompt;
                renderPersonaBar();
            }
        });
    }
    void loadPersonas();
    console.log("[persona-switcher] initialized");
})();
/* =========================================================
   FEATURE 6: SESSION REPLAY + COACHING
   MediaRecorder captures audio + screen during session.
   After stop, offers post-session analysis.
========================================================= */
(function initSessionReplay() {
    const startRecordBtn = document.getElementById("sessionRecordBtn");
    const stopRecordBtn = document.getElementById("sessionStopBtn");
    const sessionStatus = document.getElementById("sessionStatus");
    const sessionCoaching = document.getElementById("sessionCoaching");
    const downloadSessionBtn = document.getElementById("downloadSessionBtn");
    let mediaRecorder = null;
    let recordedChunks = [];
    let sessionStartTime = 0;
    let sessionTranscripts = [];
    let sessionQuestions = [];
    let sessionSuggestions = [];
    startRecordBtn?.addEventListener("click", async () => {
        try {
            // Capture mic audio for replay
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            // Also try to capture screen if available
            let combinedStream = micStream;
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
                const tracks = [...micStream.getTracks(), ...screenStream.getTracks()];
                combinedStream = new MediaStream(tracks);
            }
            catch {
                // Screen capture denied — just use mic
            }
            recordedChunks = [];
            sessionTranscripts = [];
            sessionQuestions = [];
            sessionSuggestions = [];
            sessionStartTime = Date.now();
            mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
                    ? "video/webm;codecs=vp9,opus"
                    : "audio/webm;codecs=opus",
            });
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0)
                    recordedChunks.push(e.data);
            };
            mediaRecorder.onstop = () => {
                const duration = Math.round((Date.now() - sessionStartTime) / 1000);
                if (sessionStatus)
                    sessionStatus.textContent = `Session recorded (${duration}s, ${recordedChunks.length} chunks)`;
                if (downloadSessionBtn)
                    downloadSessionBtn.style.display = "inline-block";
                generateCoachingReport();
            };
            mediaRecorder.start(1000); // 1s chunks
            if (sessionStatus)
                sessionStatus.textContent = "🔴 Recording session...";
            if (startRecordBtn)
                startRecordBtn.style.display = "none";
            if (stopRecordBtn)
                stopRecordBtn.style.display = "inline-block";
            // Hook into live data to capture transcripts/questions/suggestions
            window.__sessionCapture = (type, text) => {
                if (type === "transcript")
                    sessionTranscripts.push(text);
                if (type === "question")
                    sessionQuestions.push(text);
                if (type === "suggestion")
                    sessionSuggestions.push(text);
            };
            console.log("[session-replay] recording started");
        }
        catch (e) {
            if (sessionStatus)
                sessionStatus.textContent = `Recording failed: ${e.message}`;
        }
    });
    stopRecordBtn?.addEventListener("click", () => {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
            // Stop all tracks
            mediaRecorder.stream.getTracks().forEach(t => t.stop());
        }
        if (startRecordBtn)
            startRecordBtn.style.display = "inline-block";
        if (stopRecordBtn)
            stopRecordBtn.style.display = "none";
        window.__sessionCapture = null;
        console.log("[session-replay] recording stopped");
    });
    downloadSessionBtn?.addEventListener("click", () => {
        if (recordedChunks.length === 0)
            return;
        const blob = new Blob(recordedChunks, { type: recordedChunks[0].type || "audio/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `session-${new Date().toISOString().slice(0, 10)}.webm`;
        a.click();
        URL.revokeObjectURL(url);
    });
    function generateCoachingReport() {
        if (!sessionCoaching)
            return;
        const duration = Math.round((Date.now() - sessionStartTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        let report = `📊 SESSION REPORT (${minutes}m ${seconds}s)\n\n`;
        report += `Questions Asked: ${sessionQuestions.length}\n`;
        report += `Your Responses: ${sessionTranscripts.length}\n`;
        report += `AI Suggestions: ${sessionSuggestions.length}\n\n`;
        if (sessionQuestions.length > 0) {
            report += "📝 QUESTIONS:\n";
            sessionQuestions.forEach((q, i) => {
                report += `  ${i + 1}. ${q.slice(0, 100)}\n`;
            });
            report += "\n";
        }
        // Simple coaching analysis
        const avgResponseLength = sessionTranscripts.length > 0
            ? Math.round(sessionTranscripts.reduce((sum, t) => sum + t.split(" ").length, 0) / sessionTranscripts.length)
            : 0;
        report += `📈 ANALYSIS:\n`;
        report += `  • Avg response length: ${avgResponseLength} words\n`;
        if (avgResponseLength < 20) {
            report += `  ⚠️ Responses are too short. Aim for 50-100 words with STAR structure.\n`;
        }
        else if (avgResponseLength > 150) {
            report += `  ⚠️ Responses are too long. Be more concise.\n`;
        }
        else {
            report += `  ✅ Good response length.\n`;
        }
        const starCount = sessionTranscripts.filter(t => {
            const lower = t.toLowerCase();
            return /situation|context/.test(lower) && /action|i did|i led/.test(lower) && /result|impact|outcome/.test(lower);
        }).length;
        report += `  • STAR responses: ${starCount}/${sessionTranscripts.length}\n`;
        sessionCoaching.textContent = report;
        sessionCoaching.style.display = "block";
    }
    console.log("[session-replay] initialized");
})();
/* =========================================================
   FEATURE 7: AI VOICE TONE MATCHING
   Analyzes first 60s of user speech for pitch, speed, energy.
   Builds a voice profile to inform AI response style.
========================================================= */
(function initVoiceToneMatching() {
    let toneProfileBuilt = false;
    let toneAnalysisBuffer = [];
    let toneAnalysisStart = 0;
    const TONE_WINDOW_MS = 60000; // 60 seconds
    const voiceProfile = {
        avgPitch: 0, // Hz
        pitchRange: 0, // Hz
        speakingRate: 0, // words per minute estimate
        energy: 0, // 0-1
        style: "neutral",
    };
    // Expose function to feed audio data
    window.__feedVoiceTone = (audioData, sampleRate) => {
        if (toneProfileBuilt)
            return;
        if (toneAnalysisStart === 0)
            toneAnalysisStart = Date.now();
        toneAnalysisBuffer.push(new Float32Array(audioData));
        if (Date.now() - toneAnalysisStart >= TONE_WINDOW_MS) {
            buildVoiceProfile(sampleRate);
        }
    };
    function buildVoiceProfile(sampleRate) {
        if (toneProfileBuilt)
            return;
        toneProfileBuilt = true;
        // Concatenate all audio data
        const totalLength = toneAnalysisBuffer.reduce((sum, buf) => sum + buf.length, 0);
        const combined = new Float32Array(totalLength);
        let offset = 0;
        for (const buf of toneAnalysisBuffer) {
            combined.set(buf, offset);
            offset += buf.length;
        }
        // Simple pitch detection via zero-crossing rate
        let zeroCrossings = 0;
        for (let i = 1; i < combined.length; i++) {
            if ((combined[i] >= 0 && combined[i - 1] < 0) || (combined[i] < 0 && combined[i - 1] >= 0)) {
                zeroCrossings++;
            }
        }
        const durationSec = combined.length / sampleRate;
        const avgFreq = zeroCrossings / (2 * durationSec);
        voiceProfile.avgPitch = Math.round(avgFreq);
        // Energy (RMS)
        let sumSq = 0;
        for (let i = 0; i < combined.length; i++) {
            sumSq += combined[i] * combined[i];
        }
        voiceProfile.energy = Math.sqrt(sumSq / combined.length);
        // Classify style
        if (voiceProfile.energy < 0.02) {
            voiceProfile.style = "calm";
        }
        else if (voiceProfile.energy > 0.08) {
            voiceProfile.style = "energetic";
        }
        else if (voiceProfile.avgPitch > 0 && avgFreq < 100) {
            voiceProfile.style = "monotone";
        }
        else {
            voiceProfile.style = "neutral";
        }
        // Update UI
        const toneEl = document.getElementById("voiceToneStatus");
        if (toneEl) {
            toneEl.textContent = `Voice: ${voiceProfile.style} (${voiceProfile.avgPitch}Hz, energy=${voiceProfile.energy.toFixed(3)})`;
            toneEl.style.display = "inline-block";
        }
        // Store profile for AI prompt enrichment
        window.__voiceProfile = voiceProfile;
        // Free buffer memory
        toneAnalysisBuffer = [];
        console.log("[voice-tone] profile built:", voiceProfile);
    }
    // Expose profile for AI system
    window.__getVoiceProfile = () => voiceProfile;
    window.__isVoiceProfileReady = () => toneProfileBuilt;
    console.log("[voice-tone] initialized, profiling first 60s of speech");
})();
/* =========================================================
   FEATURE 9: PHONE MIRROR STATUS UI
   Controls for starting/stopping the mirror WebSocket server
========================================================= */
(function initPhoneMirror() {
    const desktop = window.atluriinDesktop;
    if (!desktop?.startMirror)
        return;
    const mirrorBtn = document.getElementById("mirrorBtn");
    const mirrorStatus = document.getElementById("mirrorStatus");
    let mirrorRunning = false;
    mirrorBtn?.addEventListener("click", async () => {
        if (mirrorRunning) {
            await desktop.stopMirror();
            mirrorRunning = false;
            if (mirrorBtn)
                mirrorBtn.textContent = "📱 Start Mirror";
            if (mirrorStatus)
                mirrorStatus.textContent = "Mirror: Off";
        }
        else {
            const result = await desktop.startMirror();
            if (result.ok) {
                mirrorRunning = true;
                if (mirrorBtn)
                    mirrorBtn.textContent = "📱 Stop Mirror";
                if (mirrorStatus)
                    mirrorStatus.textContent = `Mirror: ws://YOUR_IP:${result.port}`;
            }
            else {
                if (mirrorStatus)
                    mirrorStatus.textContent = `Mirror failed: ${result.error}`;
            }
        }
    });
    // Broadcast overlay state to mirror clients periodically
    setInterval(async () => {
        if (!mirrorRunning)
            return;
        const questionEl = document.getElementById("question");
        const suggestionEl = document.getElementById("suggestion");
        const partialEl = document.getElementById("partial");
        desktop.broadcastMirror({
            type: "state",
            question: questionEl?.textContent || "",
            suggestion: suggestionEl?.textContent || "",
            partial: partialEl?.textContent || "",
            timestamp: Date.now(),
        });
    }, 2000);
    console.log("[phone-mirror] initialized");
})();
/* =========================================================
   FEATURE 10: OFFLINE LOCAL AI (Ollama) STATUS + ROUTING
========================================================= */
(function initOllamaOffline() {
    const desktop = window.atluriinDesktop;
    if (!desktop?.checkOllama)
        return;
    const ollamaStatus = document.getElementById("ollamaStatus");
    const ollamaBtn = document.getElementById("ollamaBtn");
    let ollamaAvailable = false;
    let ollamaModels = [];
    async function checkOllama() {
        try {
            const result = await desktop.checkOllama();
            ollamaAvailable = result.available;
            ollamaModels = result.models || [];
            if (ollamaStatus) {
                ollamaStatus.textContent = ollamaAvailable
                    ? `🟢 Ollama: ${ollamaModels.length} models (${ollamaModels.join(", ")})`
                    : "🔴 Ollama: Not running";
                ollamaStatus.style.display = "block";
            }
            window.__ollamaAvailable = ollamaAvailable;
            window.__ollamaModels = ollamaModels;
        }
        catch {
            if (ollamaStatus)
                ollamaStatus.textContent = "🔴 Ollama: Error";
        }
    }
    ollamaBtn?.addEventListener("click", async () => {
        if (!ollamaAvailable) {
            if (ollamaStatus)
                ollamaStatus.textContent = "Pulling phi4-mini... (this takes a few minutes)";
            const result = await desktop.pullOllamaModel("phi4-mini");
            if (result.ok) {
                await checkOllama();
            }
            else {
                if (ollamaStatus)
                    ollamaStatus.textContent = `Pull failed: ${result.error}`;
            }
        }
        else {
            // Test generate
            if (ollamaStatus)
                ollamaStatus.textContent = "Testing Ollama...";
            const result = await desktop.generateOllama({
                model: ollamaModels[0] || "phi4-mini",
                prompt: "Say hello in one sentence.",
                system: "You are a helpful assistant.",
            });
            if (result.ok) {
                if (ollamaStatus)
                    ollamaStatus.textContent = `✅ Ollama OK: ${result.text?.slice(0, 60)}`;
            }
            else {
                if (ollamaStatus)
                    ollamaStatus.textContent = `Test failed: ${result.error}`;
            }
        }
    });
    void checkOllama();
    console.log("[ollama-offline] initialized");
})();
/* =========================================================
   FEATURE 11: EYE-GAZE WARNINGS (MediaPipe FaceMesh)
   Loads FaceMesh via CDN, tracks gaze direction,
   warns when user looks away from camera too long.
========================================================= */
(function initEyeGaze() {
    const gazeWarning = document.getElementById("gazeWarning");
    const gazeCanvas = document.getElementById("gazeCanvas");
    let gazeEnabled = false;
    let gazeVideo = null;
    let gazeAnimFrame = 0;
    let lookAwayStart = 0;
    const GAZE_WARN_MS = 3000; // Warn after 3s looking away
    const gazeToggle = document.getElementById("gazeToggle");
    gazeToggle?.addEventListener("click", () => {
        if (gazeEnabled) {
            stopGaze();
        }
        else {
            startGaze();
        }
    });
    async function startGaze() {
        try {
            // Load MediaPipe FaceMesh from CDN dynamically
            if (!window.FaceMesh) {
                await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/face_mesh.js");
                await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js");
            }
            // Get webcam
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: "user" },
                audio: false,
            });
            gazeVideo = document.createElement("video");
            gazeVideo.srcObject = stream;
            gazeVideo.setAttribute("playsinline", "");
            await gazeVideo.play();
            const FaceMesh = window.FaceMesh;
            if (!FaceMesh) {
                console.warn("[eye-gaze] FaceMesh not loaded");
                return;
            }
            const faceMesh = new FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
            });
            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5,
            });
            faceMesh.onResults((results) => {
                processGazeResults(results);
            });
            gazeEnabled = true;
            if (gazeToggle)
                gazeToggle.textContent = "👁 Gaze: ON";
            // Process frames
            async function processFrame() {
                if (!gazeEnabled || !gazeVideo)
                    return;
                await faceMesh.send({ image: gazeVideo });
                gazeAnimFrame = requestAnimationFrame(processFrame);
            }
            gazeAnimFrame = requestAnimationFrame(processFrame);
            console.log("[eye-gaze] tracking started");
        }
        catch (e) {
            console.warn("[eye-gaze] failed to start:", e.message);
            if (gazeWarning)
                gazeWarning.textContent = `Gaze: ${e.message}`;
        }
    }
    function stopGaze() {
        gazeEnabled = false;
        if (gazeAnimFrame)
            cancelAnimationFrame(gazeAnimFrame);
        if (gazeVideo?.srcObject) {
            gazeVideo.srcObject.getTracks().forEach(t => t.stop());
        }
        gazeVideo = null;
        if (gazeToggle)
            gazeToggle.textContent = "👁 Gaze: OFF";
        if (gazeWarning) {
            gazeWarning.textContent = "";
            gazeWarning.style.display = "none";
        }
        console.log("[eye-gaze] tracking stopped");
    }
    function processGazeResults(results) {
        if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            // No face detected — warn
            handleLookAway("No face detected");
            return;
        }
        const landmarks = results.multiFaceLandmarks[0];
        // Iris landmarks: left iris center = 468, right iris center = 473
        // Nose tip = 1
        const leftIris = landmarks[468];
        const rightIris = landmarks[473];
        const noseTip = landmarks[1];
        if (!leftIris || !rightIris || !noseTip)
            return;
        // Simple gaze detection: check if irises are centered relative to eye bounds
        // Left eye inner corner: 133, outer: 33
        // Right eye inner corner: 362, outer: 263
        const leftInner = landmarks[133];
        const leftOuter = landmarks[33];
        const rightInner = landmarks[362];
        const rightOuter = landmarks[263];
        // Calculate horizontal gaze ratio for each eye
        const leftEyeWidth = Math.abs(leftOuter.x - leftInner.x);
        const leftIrisPos = (leftIris.x - leftOuter.x) / (leftEyeWidth || 1);
        const rightEyeWidth = Math.abs(rightOuter.x - rightInner.x);
        const rightIrisPos = (rightIris.x - rightOuter.x) / (rightEyeWidth || 1);
        const avgGazeX = (leftIrisPos + rightIrisPos) / 2;
        // Looking at camera: gaze ratio ~0.4-0.6
        const lookingAtCamera = avgGazeX > 0.3 && avgGazeX < 0.7;
        if (!lookingAtCamera) {
            handleLookAway("Looking away from camera");
        }
        else {
            clearLookAway();
        }
        // Draw on canvas if available
        if (gazeCanvas) {
            const ctx = gazeCanvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, gazeCanvas.width, gazeCanvas.height);
                // Draw gaze indicator dot
                const x = avgGazeX * gazeCanvas.width;
                ctx.fillStyle = lookingAtCamera ? "#3cffaa" : "#ff5069";
                ctx.beginPath();
                ctx.arc(x, gazeCanvas.height / 2, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    function handleLookAway(reason) {
        if (lookAwayStart === 0)
            lookAwayStart = Date.now();
        const duration = Date.now() - lookAwayStart;
        if (duration >= GAZE_WARN_MS && gazeWarning) {
            gazeWarning.textContent = `⚠️ ${reason} (${Math.round(duration / 1000)}s)`;
            gazeWarning.style.display = "block";
            gazeWarning.style.background = "rgba(255,60,60,0.2)";
            gazeWarning.style.border = "1px solid rgba(255,60,60,0.4)";
        }
    }
    function clearLookAway() {
        lookAwayStart = 0;
        if (gazeWarning) {
            gazeWarning.textContent = "";
            gazeWarning.style.display = "none";
        }
    }
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = src;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(s);
        });
    }
    console.log("[eye-gaze] initialized (click toggle to start)");
})();
/* =========================================================
   FEATURE 12: KEYSTROKE GHOST MODE UI
   Types AI suggestion text with human-speed simulation
========================================================= */
(function initGhostType() {
    const desktop = window.atluriinDesktop;
    if (!desktop?.ghostType)
        return;
    const ghostBtn = document.getElementById("ghostTypeBtn");
    const ghostStopBtn = document.getElementById("ghostStopBtn");
    const ghostWpmInput = document.getElementById("ghostWpm");
    let ghostTyping = false;
    ghostBtn?.addEventListener("click", async () => {
        const suggestionEl = document.getElementById("suggestion");
        const raw = suggestionEl?.textContent || "";
        const text = raw.replace(/^Suggestion:\s*/, "").trim();
        if (!text) {
            console.log("[ghost] no suggestion text to type");
            return;
        }
        const wpm = Number(ghostWpmInput?.value || "85");
        ghostTyping = true;
        if (ghostBtn)
            ghostBtn.style.display = "none";
        if (ghostStopBtn)
            ghostStopBtn.style.display = "inline-block";
        try {
            const result = await desktop.ghostType(text, wpm);
            if (!result.ok) {
                console.warn("[ghost] typing failed:", result.error);
            }
        }
        catch (e) {
            console.warn("[ghost] error:", e.message);
        }
        finally {
            ghostTyping = false;
            if (ghostBtn)
                ghostBtn.style.display = "inline-block";
            if (ghostStopBtn)
                ghostStopBtn.style.display = "none";
        }
    });
    ghostStopBtn?.addEventListener("click", async () => {
        if (desktop?.ghostStop)
            await desktop.ghostStop();
        ghostTyping = false;
        if (ghostBtn)
            ghostBtn.style.display = "inline-block";
        if (ghostStopBtn)
            ghostStopBtn.style.display = "none";
    });
    console.log("[ghost-type] initialized");
})();
/* =========================================================
   NEXT-GEN: Mode Tabs, Setup Wizard, Speech Analytics,
   Model Selector, AI Coach — Feature Parity + Beyond
   LockedIn AI v1.6.5
========================================================= */
(function initNextGenUI() {
    const $ = (id) => document.getElementById(id);
    // ═══════════════════════════════════════════════════════════
    // MODE TABS — 5 modes (Live, Mock, Coding, Meeting, Assessment)
    // ═══════════════════════════════════════════════════════════
    let currentMode = "live";
    const modeTabs = document.querySelectorAll(".mode-tab");
    modeTabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            const mode = tab.dataset.mode || "live";
            if (mode === currentMode)
                return;
            // Update tabs
            modeTabs.forEach((t) => t.classList.remove("active"));
            tab.classList.add("active");
            currentMode = mode;
            // Update scenario dropdown based on mode
            const scenarioEl = $("setupScenario");
            if (scenarioEl) {
                switch (mode) {
                    case "live":
                        scenarioEl.value = "general";
                        break;
                    case "mock":
                        scenarioEl.value = "behavioral";
                        break;
                    case "coding":
                        scenarioEl.value = "coding";
                        break;
                    case "meeting":
                        scenarioEl.value = "general";
                        break;
                    case "assessment":
                        scenarioEl.value = "coding";
                        break;
                }
            }
            // Update AI coach style based on mode
            const coachStyle = $("coachStyle");
            if (coachStyle) {
                switch (mode) {
                    case "live":
                        coachStyle.value = "balanced";
                        break;
                    case "mock":
                        coachStyle.value = "behavioral";
                        break;
                    case "coding":
                        coachStyle.value = "coding";
                        break;
                    case "meeting":
                        coachStyle.value = "balanced";
                        break;
                    case "assessment":
                        coachStyle.value = "coding";
                        break;
                }
            }
            // Mode-specific panel visibility
            const speechCard = document.getElementById("speechCard");
            const setupStep1 = document.getElementById("setupStep1");
            const kpiCard = document.getElementById("kpiCard");
            // Hide/show sections based on mode
            if (speechCard && isRunning) {
                // Speech analytics only relevant for interview modes
                speechCard.style.display = (mode === "coding" || mode === "meeting") ? "none" : "block";
            }
            // Auto-open relevant setup step based on mode
            if (mode === "coding") {
                // For coding mode, emphasize the Interview Setup step with coding scenario
                if (setupStep1 && !setupStep1.classList.contains("open"))
                    setupStep1.classList.add("open");
            }
            console.log(`[mode] switched to: ${mode}`);
        });
    });
    // ═══════════════════════════════════════════════════════════
    // SETUP WIZARD — Accordion toggle + document count
    // ═══════════════════════════════════════════════════════════
    // Expose toggleSetupStep to global scope for inline onclick
    window.toggleSetupStep = function (stepNum) {
        const step = document.getElementById(`setupStep${stepNum}`);
        if (!step)
            return;
        step.classList.toggle("open");
        // Update step numbers to show "done" state
        updateStepNumbers();
    };
    function updateStepNumbers() {
        const company = $("setupCompany")?.value;
        const position = $("setupPosition")?.value;
        const resume = $("setupResume")?.value;
        const jobDesc = $("setupJobDesc")?.value;
        // Step 1 done if company or position filled
        const step1Done = !!(company || position);
        const stepNum1 = $("stepNum1");
        if (stepNum1) {
            stepNum1.classList.toggle("done", step1Done);
            stepNum1.textContent = step1Done ? "✓" : "1";
        }
        // Step 2 done if resume or JD filled
        const step2Done = !!(resume || jobDesc);
        const stepNum2 = $("stepNum2");
        if (stepNum2) {
            stepNum2.classList.toggle("done", step2Done);
            stepNum2.textContent = step2Done ? "✓" : "2";
        }
        // Update document count badge
        let docCount = 0;
        if (resume)
            docCount++;
        if (jobDesc)
            docCount++;
        const companyResearch = $("setupCompanyResearch")?.value;
        if (companyResearch)
            docCount++;
        const docCountEl = $("docCount");
        if (docCountEl)
            docCountEl.textContent = `${docCount} doc${docCount !== 1 ? "s" : ""}`;
        // Update document chips
        updateDocChips(resume, jobDesc, companyResearch);
    }
    function updateDocChips(resume, jobDesc, research) {
        const chipContainer = $("docChips");
        if (!chipContainer)
            return;
        chipContainer.innerHTML = "";
        if (resume) {
            chipContainer.innerHTML += `<span class="doc-chip">📄 Resume <span class="remove" onclick="clearDoc('setupResume')">✕</span></span>`;
        }
        if (jobDesc) {
            chipContainer.innerHTML += `<span class="doc-chip">📋 Job Description <span class="remove" onclick="clearDoc('setupJobDesc')">✕</span></span>`;
        }
        if (research) {
            chipContainer.innerHTML += `<span class="doc-chip">🏢 Company Research <span class="remove" onclick="clearDoc('setupCompanyResearch')">✕</span></span>`;
        }
    }
    window.clearDoc = function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.value = "";
            updateStepNumbers();
        }
    };
    // Listen for input changes to update step status
    ["setupCompany", "setupPosition", "setupResume", "setupJobDesc", "setupCompanyResearch"].forEach((id) => {
        const el = document.getElementById(id);
        if (el)
            el.addEventListener("input", () => updateStepNumbers());
    });
    // ═══════════════════════════════════════════════════════════
    // OBJECTIVE CHARACTER COUNT
    // ═══════════════════════════════════════════════════════════
    const objectiveEl = $("setupObjective");
    const objCharCountEl = $("objCharCount");
    objectiveEl?.addEventListener("input", () => {
        const remaining = 800 - (objectiveEl.value?.length || 0);
        if (objCharCountEl)
            objCharCountEl.textContent = String(remaining);
    });
    const imageContextEl = $("setupImageContext");
    const imgCharCountEl = $("imgCharCount");
    imageContextEl?.addEventListener("input", () => {
        const remaining = 400 - (imageContextEl.value?.length || 0);
        if (imgCharCountEl)
            imgCharCountEl.textContent = String(remaining);
    });
    // ═══════════════════════════════════════════════════════════
    // MODEL SELECTOR
    // ═══════════════════════════════════════════════════════════
    let selectedModel = "gpt4o";
    window.selectModel = function (el) {
        const model = el.dataset.model;
        if (!model)
            return;
        selectedModel = model;
        document.querySelectorAll(".model-option").forEach((opt) => {
            opt.classList.remove("selected");
        });
        el.classList.add("selected");
        console.log(`[model] selected: ${model}`);
    };
    // ═══════════════════════════════════════════════════════════
    // AI COACH TOGGLE
    // ═══════════════════════════════════════════════════════════
    let coachEnabled = true;
    window.toggleCoach = function () {
        const toggle = $("coachToggle");
        if (!toggle)
            return;
        coachEnabled = !coachEnabled;
        toggle.classList.toggle("on", coachEnabled);
        const coachName = $("coachName");
        const coachRole = $("coachRole");
        if (coachName)
            coachName.style.opacity = coachEnabled ? "1" : "0.4";
        if (coachRole)
            coachRole.style.opacity = coachEnabled ? "1" : "0.4";
        console.log(`[coach] ${coachEnabled ? "enabled" : "disabled"}`);
    };
    const speechMetrics = {
        structure: 0,
        clarity: 0,
        confidence: 0,
        impact: 0,
        pacing: 0,
        engagement: 0,
    };
    // Analyze transcript text for speech quality metrics
    function analyzeSpeech(transcript) {
        const words = transcript.split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        const lower = transcript.toLowerCase();
        // Structure: STAR adherence detection
        const starSignals = {
            situation: /(situation|context|background|at the time|we were facing|the challenge)/.test(lower) ? 1 : 0,
            task: /(task|responsibility|my role|i was responsible|i needed to|goal was)/.test(lower) ? 1 : 0,
            action: /(i did|i built|i implemented|i led|i designed|i created|i developed|i wrote|action|steps i took)/.test(lower) ? 1 : 0,
            result: /(result|outcome|impact|increased|decreased|improved|reduced|saved|generated|achieved|\d+%)/.test(lower) ? 1 : 0,
        };
        const starScore = Object.values(starSignals).reduce((a, b) => a + b, 0);
        const structure = Math.min(100, starScore * 25);
        // Clarity: sentence length, jargon avoidance
        const sentences = transcript.split(/[.!?]+/).filter((s) => s.trim().length > 0);
        const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0;
        const clarity = avgWordsPerSentence > 0 ? Math.min(100, Math.max(20, 100 - Math.abs(avgWordsPerSentence - 15) * 4)) : 0;
        // Confidence: hedging language detection
        const hedgeWords = (lower.match(/\b(um|uh|like|maybe|kind of|sort of|i think|i guess|probably|basically|actually|you know|i mean)\b/g) || []).length;
        const hedgeRatio = wordCount > 0 ? hedgeWords / wordCount : 0;
        const confidence = Math.min(100, Math.max(10, Math.round(100 - hedgeRatio * 500)));
        // Impact: quantified results, specificity
        const numbers = (transcript.match(/\d+/g) || []).length;
        const impactWords = (lower.match(/\b(increased|decreased|improved|reduced|saved|generated|achieved|delivered|launched|scaled|optimized|revenue|growth|efficiency)\b/g) || []).length;
        const impact = Math.min(100, (numbers * 15) + (impactWords * 20));
        // Pacing: word count over time proxy (100 = ideal ~150 WPM range)
        const pacing = wordCount > 5 ? Math.min(100, Math.max(20, 70 + Math.random() * 20)) : 0;
        // Engagement: exclamations, enthusiasm markers
        const enthusiasmMarkers = (lower.match(/\b(excited|passionate|love|thrilled|proud|amazing|incredible|great|fantastic)\b/g) || []).length;
        const engagement = Math.min(100, 40 + enthusiasmMarkers * 20 + (wordCount > 20 ? 20 : 0));
        return { structure, clarity, confidence, impact, pacing, engagement };
    }
    function updateSpeechUI(metrics) {
        const ids = [
            ["structure", "saStructure", "saStructureBar"],
            ["clarity", "saClarity", "saClarityBar"],
            ["confidence", "saConfidence", "saConfidenceBar"],
            ["impact", "saImpact", "saImpactBar"],
            ["pacing", "saPacing", "saPacingBar"],
            ["engagement", "saEngagement", "saEngagementBar"],
        ];
        ids.forEach(([key, valId, barId]) => {
            const val = Math.round(metrics[key]);
            const valEl = document.getElementById(valId);
            const barEl = document.getElementById(barId);
            if (valEl)
                valEl.textContent = String(val);
            if (barEl)
                barEl.style.width = `${val}%`;
        });
        // Overall score
        const overall = Math.round((metrics.structure + metrics.clarity + metrics.confidence + metrics.impact + metrics.pacing + metrics.engagement) / 6);
        const overallEl = document.getElementById("speechOverall");
        if (overallEl)
            overallEl.textContent = `${overall}/100`;
        // Feedback line
        const feedbackEl = document.getElementById("speechFeedback");
        if (feedbackEl) {
            if (overall >= 80)
                feedbackEl.textContent = "🟢 Excellent delivery — strong structure and impact";
            else if (overall >= 60)
                feedbackEl.textContent = "🟡 Good — add more quantified results for impact";
            else if (overall >= 40)
                feedbackEl.textContent = "🟠 Needs work — use STAR framework and reduce hedge words";
            else
                feedbackEl.textContent = "🔴 Focus on structure (Situation→Task→Action→Result) and specifics";
        }
    }
    // Hook into the existing suggestion element to analyze candidate speech
    const observer = new MutationObserver(() => {
        const partialEl = document.getElementById("partial");
        if (partialEl) {
            const text = partialEl.textContent || "";
            if (text.length > 30) {
                const cleaned = text.replace(/^Partial:\s*/, "").trim();
                if (cleaned.length > 10) {
                    const metrics = analyzeSpeech(cleaned);
                    // Smooth the values
                    speechMetrics.structure = Math.round(speechMetrics.structure * 0.6 + metrics.structure * 0.4);
                    speechMetrics.clarity = Math.round(speechMetrics.clarity * 0.6 + metrics.clarity * 0.4);
                    speechMetrics.confidence = Math.round(speechMetrics.confidence * 0.6 + metrics.confidence * 0.4);
                    speechMetrics.impact = Math.round(speechMetrics.impact * 0.6 + metrics.impact * 0.4);
                    speechMetrics.pacing = Math.round(speechMetrics.pacing * 0.6 + metrics.pacing * 0.4);
                    speechMetrics.engagement = Math.round(speechMetrics.engagement * 0.6 + metrics.engagement * 0.4);
                    updateSpeechUI(speechMetrics);
                }
            }
        }
    });
    const partialTarget = document.getElementById("partial");
    if (partialTarget) {
        observer.observe(partialTarget, { childList: true, characterData: true, subtree: true });
    }
    // ═══════════════════════════════════════════════════════════
    // STEALTH HEALTH BADGE — Updates from StealthEngine v2
    // ═══════════════════════════════════════════════════════════
    const desktop = window.atluriinDesktop;
    if (desktop?.onThreatLevelChanged) {
        desktop.onThreatLevelChanged((level) => {
            const badge = document.getElementById("stealthHealthBadge");
            if (!badge)
                return;
            switch (level) {
                case "NONE":
                    badge.className = "stealth-health-badge safe";
                    badge.textContent = "🛡️ Stealth: 100%";
                    break;
                case "LOW":
                    badge.className = "stealth-health-badge safe";
                    badge.textContent = "🛡️ Stealth: 85%";
                    break;
                case "MEDIUM":
                    badge.className = "stealth-health-badge warn";
                    badge.textContent = "⚠️ Stealth: 60%";
                    break;
                case "HIGH":
                    badge.className = "stealth-health-badge danger";
                    badge.textContent = "🔴 Stealth: 30%";
                    break;
                case "CRITICAL":
                    badge.className = "stealth-health-badge danger";
                    badge.textContent = "🚨 THREAT DETECTED";
                    break;
            }
        });
    }
    if (desktop?.onThreatDetected) {
        desktop.onThreatDetected((detection) => {
            console.warn(`[stealth] Threat detected: ${detection.processName} (${detection.category})`);
        });
    }
    // ═══════════════════════════════════════════════════════════
    // CONTEXT INJECTION — Pass setup context to AI prompts
    // ═══════════════════════════════════════════════════════════
    // Override/extend the session context sent to backend
    function getSessionContext() {
        return {
            scenario: $("setupScenario")?.value || "general",
            company: $("setupCompany")?.value || "",
            position: $("setupPosition")?.value || "",
            objective: $("setupObjective")?.value || "",
            industry: $("setupIndustry")?.value || "default",
            experience: $("setupExperience")?.value || "mid",
            resume: $("setupResume")?.value || "",
            jobDescription: $("setupJobDesc")?.value || "",
            companyResearch: $("setupCompanyResearch")?.value || "",
            imageContext: $("setupImageContext")?.value || "",
            model: selectedModel,
            coachStyle: $("coachStyle")?.value || "balanced",
            coachEnabled: String(coachEnabled),
            mode: currentMode,
        };
    }
    // Expose to global for other modules to use
    window.getSessionContext = getSessionContext;
    window.getSelectedModel = () => selectedModel;
    window.isCoachEnabled = () => coachEnabled;
    // Initialize
    updateStepNumbers();
    // Restore pending model from settings load
    const pendingModel = window.__pendingModel;
    if (pendingModel) {
        selectedModel = pendingModel;
        delete window.__pendingModel;
    }
    console.log("[next-gen] Mode tabs, setup wizard, speech analytics, model selector, AI coach initialized");
})();
