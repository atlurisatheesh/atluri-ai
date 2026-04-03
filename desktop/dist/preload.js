"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("atluriinDesktop", {
    version: "0.3.5",
    openUrl: async (url) => {
        return await electron_1.ipcRenderer.invoke("app:openUrl", String(url));
    },
    getOverlayContentProtection: async () => {
        return await electron_1.ipcRenderer.invoke("overlay:getContentProtection");
    },
    setOverlayContentProtection: async (enabled) => {
        return await electron_1.ipcRenderer.invoke("overlay:setContentProtection", Boolean(enabled));
    },
    getOverlayStealth: async () => {
        return await electron_1.ipcRenderer.invoke("overlay:getStealth");
    },
    setOverlayStealth: async (enabled, opacity) => {
        return await electron_1.ipcRenderer.invoke("overlay:setStealth", { enabled: Boolean(enabled), opacity: Number(opacity) });
    },
    // Dynamic click-through: passthrough=true means clicks go through to windows behind
    setMousePassthrough: async (passthrough) => {
        return await electron_1.ipcRenderer.invoke("overlay:setMousePassthrough", Boolean(passthrough));
    },
    // Window controls
    minimizeOverlay: async () => {
        return await electron_1.ipcRenderer.invoke("overlay:minimize");
    },
    closeOverlay: async () => {
        return await electron_1.ipcRenderer.invoke("overlay:close");
    },
    // Manual drag - get window position
    getOverlayPosition: async () => {
        return await electron_1.ipcRenderer.invoke("overlay:getPosition");
    },
    // Manual drag - set window position
    setOverlayPosition: async (x, y) => {
        return await electron_1.ipcRenderer.invoke("overlay:setPosition", { x, y });
    },
    getAccessTokenFromApp: async () => {
        return await electron_1.ipcRenderer.invoke("auth:getAccessToken");
    },
    startLoopback: async (payload) => {
        return await electron_1.ipcRenderer.invoke("loopback:start", payload);
    },
    stopLoopback: async () => {
        return await electron_1.ipcRenderer.invoke("loopback:stop");
    },
    injectTranscript: async (text) => {
        return await electron_1.ipcRenderer.invoke("loopback:injectTranscript", text);
    },
    // ═══════════════════════════════════════════════════════════
    // SCREEN CAPTURE APIs
    // ═══════════════════════════════════════════════════════════
    captureFullScreen: async () => {
        return await electron_1.ipcRenderer.invoke("capture:fullScreen");
    },
    captureRegion: async (x, y, width, height) => {
        return await electron_1.ipcRenderer.invoke("capture:region", { x, y, width, height });
    },
    startRegionSelect: async () => {
        return await electron_1.ipcRenderer.invoke("capture:startRegionSelect");
    },
    endRegionSelect: async () => {
        return await electron_1.ipcRenderer.invoke("capture:endRegionSelect");
    },
    // ═══════════════════════════════════════════════════════════
    // MIC + AI CONTROL APIs
    // ═══════════════════════════════════════════════════════════
    getMicMuted: async () => {
        return await electron_1.ipcRenderer.invoke("control:getMicMuted");
    },
    getAiPaused: async () => {
        return await electron_1.ipcRenderer.invoke("control:getAiPaused");
    },
    // ═══════════════════════════════════════════════════════════
    // PERSISTENT SETTINGS APIs (electron-store encrypted)
    // ═══════════════════════════════════════════════════════════
    settingsGet: async (key) => {
        return await electron_1.ipcRenderer.invoke("settings:get", key);
    },
    settingsSet: async (key, value) => {
        return await electron_1.ipcRenderer.invoke("settings:set", key, value);
    },
    getApiKeys: async () => {
        return await electron_1.ipcRenderer.invoke("settings:getApiKeys");
    },
    setApiKeys: async (keys) => {
        return await electron_1.ipcRenderer.invoke("settings:setApiKeys", keys);
    },
    getResume: async () => {
        return await electron_1.ipcRenderer.invoke("settings:getResume");
    },
    setResume: async (text) => {
        return await electron_1.ipcRenderer.invoke("settings:setResume", text);
    },
    getJobDescription: async () => {
        return await electron_1.ipcRenderer.invoke("settings:getJobDescription");
    },
    setJobDescription: async (text) => {
        return await electron_1.ipcRenderer.invoke("settings:setJobDescription", text);
    },
    getPreferences: async () => {
        return await electron_1.ipcRenderer.invoke("settings:getPreferences");
    },
    setPreferences: async (prefs) => {
        return await electron_1.ipcRenderer.invoke("settings:setPreferences", prefs);
    },
    getHotkeys: async () => {
        return await electron_1.ipcRenderer.invoke("settings:getHotkeys");
    },
    setHotkeys: async (hotkeys) => {
        return await electron_1.ipcRenderer.invoke("settings:setHotkeys", hotkeys);
    },
    getAllSettings: async () => {
        return await electron_1.ipcRenderer.invoke("settings:getAll");
    },
    setAllSettings: async (data) => {
        return await electron_1.ipcRenderer.invoke("settings:setAll", data);
    },
    // ═══════════════════════════════════════════════════════════
    // EVENT LISTENERS (main process → renderer)
    // ═══════════════════════════════════════════════════════════
    onRecordingStateChanged: (callback) => {
        electron_1.ipcRenderer.on("recording-state-changed", (_event, isRecording) => callback(isRecording));
    },
    onEnterRegionSelect: (callback) => {
        electron_1.ipcRenderer.on("capture:enterRegionSelect", () => callback());
    },
    onMicMuted: (callback) => {
        electron_1.ipcRenderer.on("control:micMuted", (_event, muted) => callback(muted));
    },
    onAiPaused: (callback) => {
        electron_1.ipcRenderer.on("control:aiPaused", (_event, paused) => callback(paused));
    },
    onClickThrough: (callback) => {
        electron_1.ipcRenderer.on("control:clickThrough", (_event, enabled) => callback(enabled));
    },
    // ═══════════════════════════════════════════════════════════
    // FEATURE 3: DUAL MONITOR SMART ROUTING
    // ═══════════════════════════════════════════════════════════
    getDisplays: async () => {
        return await electron_1.ipcRenderer.invoke("display:getAll");
    },
    moveToDisplay: async (displayId) => {
        return await electron_1.ipcRenderer.invoke("display:moveToDisplay", displayId);
    },
    moveToSecondary: async () => {
        return await electron_1.ipcRenderer.invoke("display:moveToSecondary");
    },
    // ═══════════════════════════════════════════════════════════
    // FEATURE 5: PERSONA SWITCHING
    // ═══════════════════════════════════════════════════════════
    getPersonas: async () => {
        return await electron_1.ipcRenderer.invoke("persona:getAll");
    },
    setPersonas: async (personas) => {
        return await electron_1.ipcRenderer.invoke("persona:setAll", personas);
    },
    getActivePersona: async () => {
        return await electron_1.ipcRenderer.invoke("persona:getActive");
    },
    setActivePersona: async (id) => {
        return await electron_1.ipcRenderer.invoke("persona:setActive", id);
    },
    addPersona: async (persona) => {
        return await electron_1.ipcRenderer.invoke("persona:add", persona);
    },
    removePersona: async (id) => {
        return await electron_1.ipcRenderer.invoke("persona:remove", id);
    },
    onPersonaChanged: (callback) => {
        electron_1.ipcRenderer.on("persona:changed", (_event, persona) => callback(persona));
    },
    // ═══════════════════════════════════════════════════════════
    // FEATURE 8: BLACKHOLE AUTO-INSTALLER
    // ═══════════════════════════════════════════════════════════
    checkBlackHole: async () => {
        return await electron_1.ipcRenderer.invoke("blackhole:check");
    },
    installBlackHole: async () => {
        return await electron_1.ipcRenderer.invoke("blackhole:install");
    },
    // ═══════════════════════════════════════════════════════════
    // FEATURE 9: PHONE MIRROR MODE
    // ═══════════════════════════════════════════════════════════
    startMirror: async () => {
        return await electron_1.ipcRenderer.invoke("mirror:start");
    },
    stopMirror: async () => {
        return await electron_1.ipcRenderer.invoke("mirror:stop");
    },
    getMirrorStatus: async () => {
        return await electron_1.ipcRenderer.invoke("mirror:getStatus");
    },
    broadcastMirror: async (data) => {
        return await electron_1.ipcRenderer.invoke("mirror:broadcast", data);
    },
    // ═══════════════════════════════════════════════════════════
    // FEATURE 10: OFFLINE LOCAL AI (Ollama)
    // ═══════════════════════════════════════════════════════════
    checkOllama: async () => {
        return await electron_1.ipcRenderer.invoke("ollama:check");
    },
    pullOllamaModel: async (model) => {
        return await electron_1.ipcRenderer.invoke("ollama:pull", model);
    },
    generateOllama: async (payload) => {
        return await electron_1.ipcRenderer.invoke("ollama:generate", payload);
    },
    // ═══════════════════════════════════════════════════════════
    // FEATURE 12: KEYSTROKE GHOST MODE
    // ═══════════════════════════════════════════════════════════
    ghostType: async (text, wpm) => {
        return await electron_1.ipcRenderer.invoke("ghost:typeText", { text, wpm });
    },
    ghostStop: async () => {
        return await electron_1.ipcRenderer.invoke("ghost:typeStop");
    },
    // ═══════════════════════════════════════════════════════════
    // STEALTH ENGINE v2.0 — Proctoring Detection & Health
    // ═══════════════════════════════════════════════════════════
    getStealthHealth: async () => {
        return await electron_1.ipcRenderer.invoke("stealth:getHealth");
    },
    getStealthThreatLevel: async () => {
        return await electron_1.ipcRenderer.invoke("stealth:getThreatLevel");
    },
    getStealthActiveThreats: async () => {
        return await electron_1.ipcRenderer.invoke("stealth:getActiveThreats");
    },
    applyAntiDetection: async () => {
        return await electron_1.ipcRenderer.invoke("stealth:applyAntiDetection");
    },
    onThreatDetected: (callback) => {
        electron_1.ipcRenderer.on("stealth:threatDetected", (_event, detection) => callback(detection));
    },
    onThreatLevelChanged: (callback) => {
        electron_1.ipcRenderer.on("stealth:threatLevelChanged", (_event, level) => callback(level));
    },
    // ═══════════════════════════════════════════════════════════
    // OVERLAY ↔ MAIN PROCESS RELAY
    // WebSocket data relayed from main process to overlay renderer
    // ═══════════════════════════════════════════════════════════
    relayToOverlay: (msg) => {
        electron_1.ipcRenderer.send("ws:relayToOverlay", msg);
    },
    onWSMessage: (callback) => {
        const handler = (_event, msg) => callback(msg);
        electron_1.ipcRenderer.on("ws:message", handler);
        return () => { electron_1.ipcRenderer.removeListener("ws:message", handler); };
    },
    // ═══════════════════════════════════════════════════════════
    // INSTANT SCREENSHOT + AI ANALYSIS
    // Captures full screen and sends to backend for GPT-4o vision analysis.
    // No mouse needed — also triggered by Ctrl+Shift+F hotkey.
    // ═══════════════════════════════════════════════════════════
    captureAndAnalyze: async () => {
        return await electron_1.ipcRenderer.invoke("capture:analyzeFullScreen");
    },
    onCaptureTaken: (callback) => {
        const handler = (_event, info) => callback(info);
        electron_1.ipcRenderer.on("capture:taken", handler);
        return () => { electron_1.ipcRenderer.removeListener("capture:taken", handler); };
    },
    onControlMicMuted: (callback) => {
        const handler = (_event, muted) => callback(muted);
        electron_1.ipcRenderer.on("control:micMuted", handler);
        return () => { electron_1.ipcRenderer.removeListener("control:micMuted", handler); };
    },
    // ═══════════════════════════════════════════════════════════
    // APP WINDOW CONTROLS — hide app window during session
    // so only the floating overlay is visible
    // ═══════════════════════════════════════════════════════════
    hideAppWindow: async () => {
        return await electron_1.ipcRenderer.invoke("app:hide");
    },
    showAppWindow: async () => {
        return await electron_1.ipcRenderer.invoke("app:show");
    },
    minimizeAppWindow: async () => {
        return await electron_1.ipcRenderer.invoke("app:minimize");
    },
    // ═══════════════════════════════════════════════════════════
    // AUTO-UPDATER — check for updates and install
    // ═══════════════════════════════════════════════════════════
    checkForUpdates: async () => {
        return await electron_1.ipcRenderer.invoke("updater:checkForUpdates");
    },
    quitAndInstall: async () => {
        return await electron_1.ipcRenderer.invoke("updater:quitAndInstall");
    },
    getAppVersion: async () => {
        return await electron_1.ipcRenderer.invoke("updater:getVersion");
    },
    onUpdaterStatus: (callback) => {
        const handler = (_event, status) => callback(status);
        electron_1.ipcRenderer.on("updater:status", handler);
        return () => { electron_1.ipcRenderer.removeListener("updater:status", handler); };
    },
});
