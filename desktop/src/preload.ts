import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("atluriinDesktop", {
  version: "0.3.2",
  openUrl: async (url: string): Promise<{ ok: boolean; error?: string }> => {
    return await ipcRenderer.invoke("app:openUrl", String(url));
  },
  getOverlayContentProtection: async (): Promise<boolean> => {
    return await ipcRenderer.invoke("overlay:getContentProtection");
  },
  setOverlayContentProtection: async (enabled: boolean): Promise<boolean> => {
    return await ipcRenderer.invoke("overlay:setContentProtection", Boolean(enabled));
  },
  getOverlayStealth: async (): Promise<{ enabled: boolean; opacity: number }> => {
    return await ipcRenderer.invoke("overlay:getStealth");
  },
  setOverlayStealth: async (enabled: boolean, opacity: number): Promise<{ enabled: boolean; opacity: number }> => {
    return await ipcRenderer.invoke("overlay:setStealth", { enabled: Boolean(enabled), opacity: Number(opacity) });
  },
  // Dynamic click-through: passthrough=true means clicks go through to windows behind
  setMousePassthrough: async (passthrough: boolean): Promise<void> => {
    return await ipcRenderer.invoke("overlay:setMousePassthrough", Boolean(passthrough));
  },
  // Window controls
  minimizeOverlay: async (): Promise<void> => {
    return await ipcRenderer.invoke("overlay:minimize");
  },
  closeOverlay: async (): Promise<void> => {
    return await ipcRenderer.invoke("overlay:close");
  },
  // Manual drag - get window position
  getOverlayPosition: async (): Promise<{ x: number; y: number }> => {
    return await ipcRenderer.invoke("overlay:getPosition");
  },
  // Manual drag - set window position
  setOverlayPosition: async (x: number, y: number): Promise<void> => {
    return await ipcRenderer.invoke("overlay:setPosition", { x, y });
  },
  getAccessTokenFromApp: async (): Promise<string | null> => {
    return await ipcRenderer.invoke("auth:getAccessToken");
  },
  startLoopback: async (payload: { backendHttpUrl: string; roomId: string; role: string; assistIntensity?: number }): Promise<{ ok: boolean; error?: string; message?: string }> => {
    return await ipcRenderer.invoke("loopback:start", payload);
  },
  stopLoopback: async (): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("loopback:stop");
  },
  injectTranscript: async (text: string): Promise<{ ok: boolean; error?: string }> => {
    return await ipcRenderer.invoke("loopback:injectTranscript", text);
  },

  // ═══════════════════════════════════════════════════════════
  // SCREEN CAPTURE APIs
  // ═══════════════════════════════════════════════════════════
  captureFullScreen: async (): Promise<{ ok: boolean; base64?: string; width?: number; height?: number; error?: string }> => {
    return await ipcRenderer.invoke("capture:fullScreen");
  },
  captureRegion: async (x: number, y: number, width: number, height: number): Promise<{ ok: boolean; base64?: string; width?: number; height?: number; error?: string }> => {
    return await ipcRenderer.invoke("capture:region", { x, y, width, height });
  },
  startRegionSelect: async (): Promise<void> => {
    return await ipcRenderer.invoke("capture:startRegionSelect");
  },
  endRegionSelect: async (): Promise<void> => {
    return await ipcRenderer.invoke("capture:endRegionSelect");
  },

  // ═══════════════════════════════════════════════════════════
  // MIC + AI CONTROL APIs
  // ═══════════════════════════════════════════════════════════
  getMicMuted: async (): Promise<boolean> => {
    return await ipcRenderer.invoke("control:getMicMuted");
  },
  getAiPaused: async (): Promise<boolean> => {
    return await ipcRenderer.invoke("control:getAiPaused");
  },

  // ═══════════════════════════════════════════════════════════
  // PERSISTENT SETTINGS APIs (electron-store encrypted)
  // ═══════════════════════════════════════════════════════════
  settingsGet: async (key: string): Promise<any> => {
    return await ipcRenderer.invoke("settings:get", key);
  },
  settingsSet: async (key: string, value: any): Promise<{ ok: boolean; error?: string }> => {
    return await ipcRenderer.invoke("settings:set", key, value);
  },
  getApiKeys: async (): Promise<{ openai: string; claude: string }> => {
    return await ipcRenderer.invoke("settings:getApiKeys");
  },
  setApiKeys: async (keys: { openai?: string; claude?: string }): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("settings:setApiKeys", keys);
  },
  getResume: async (): Promise<string> => {
    return await ipcRenderer.invoke("settings:getResume");
  },
  setResume: async (text: string): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("settings:setResume", text);
  },
  getJobDescription: async (): Promise<string> => {
    return await ipcRenderer.invoke("settings:getJobDescription");
  },
  setJobDescription: async (text: string): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("settings:setJobDescription", text);
  },
  getPreferences: async (): Promise<any> => {
    return await ipcRenderer.invoke("settings:getPreferences");
  },
  setPreferences: async (prefs: Record<string, any>): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("settings:setPreferences", prefs);
  },
  getHotkeys: async (): Promise<any> => {
    return await ipcRenderer.invoke("settings:getHotkeys");
  },
  setHotkeys: async (hotkeys: Record<string, string>): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("settings:setHotkeys", hotkeys);
  },
  getAllSettings: async (): Promise<any> => {
    return await ipcRenderer.invoke("settings:getAll");
  },
  setAllSettings: async (data: Record<string, any>): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("settings:setAll", data);
  },

  // ═══════════════════════════════════════════════════════════
  // EVENT LISTENERS (main process → renderer)
  // ═══════════════════════════════════════════════════════════
  onRecordingStateChanged: (callback: (isRecording: boolean) => void): void => {
    ipcRenderer.on("recording-state-changed", (_event, isRecording: boolean) => callback(isRecording));
  },
  onEnterRegionSelect: (callback: () => void): void => {
    ipcRenderer.on("capture:enterRegionSelect", () => callback());
  },
  onMicMuted: (callback: (muted: boolean) => void): void => {
    ipcRenderer.on("control:micMuted", (_event, muted: boolean) => callback(muted));
  },
  onAiPaused: (callback: (paused: boolean) => void): void => {
    ipcRenderer.on("control:aiPaused", (_event, paused: boolean) => callback(paused));
  },
  onClickThrough: (callback: (enabled: boolean) => void): void => {
    ipcRenderer.on("control:clickThrough", (_event, enabled: boolean) => callback(enabled));
  },

  // ═══════════════════════════════════════════════════════════
  // FEATURE 3: DUAL MONITOR SMART ROUTING
  // ═══════════════════════════════════════════════════════════
  getDisplays: async (): Promise<any[]> => {
    return await ipcRenderer.invoke("display:getAll");
  },
  moveToDisplay: async (displayId: number): Promise<{ ok: boolean; error?: string }> => {
    return await ipcRenderer.invoke("display:moveToDisplay", displayId);
  },
  moveToSecondary: async (): Promise<{ ok: boolean; error?: string }> => {
    return await ipcRenderer.invoke("display:moveToSecondary");
  },

  // ═══════════════════════════════════════════════════════════
  // FEATURE 5: PERSONA SWITCHING
  // ═══════════════════════════════════════════════════════════
  getPersonas: async (): Promise<any[]> => {
    return await ipcRenderer.invoke("persona:getAll");
  },
  setPersonas: async (personas: any[]): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("persona:setAll", personas);
  },
  getActivePersona: async (): Promise<string> => {
    return await ipcRenderer.invoke("persona:getActive");
  },
  setActivePersona: async (id: string): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("persona:setActive", id);
  },
  addPersona: async (persona: any): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("persona:add", persona);
  },
  removePersona: async (id: string): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("persona:remove", id);
  },
  onPersonaChanged: (callback: (persona: any) => void): void => {
    ipcRenderer.on("persona:changed", (_event, persona: any) => callback(persona));
  },

  // ═══════════════════════════════════════════════════════════
  // FEATURE 8: BLACKHOLE AUTO-INSTALLER
  // ═══════════════════════════════════════════════════════════
  checkBlackHole: async (): Promise<{ installed: boolean; platform: string }> => {
    return await ipcRenderer.invoke("blackhole:check");
  },
  installBlackHole: async (): Promise<{ ok: boolean; error?: string }> => {
    return await ipcRenderer.invoke("blackhole:install");
  },

  // ═══════════════════════════════════════════════════════════
  // FEATURE 9: PHONE MIRROR MODE
  // ═══════════════════════════════════════════════════════════
  startMirror: async (): Promise<{ ok: boolean; port?: number; error?: string }> => {
    return await ipcRenderer.invoke("mirror:start");
  },
  stopMirror: async (): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("mirror:stop");
  },
  getMirrorStatus: async (): Promise<{ running: boolean; port: number; clients: number }> => {
    return await ipcRenderer.invoke("mirror:getStatus");
  },
  broadcastMirror: async (data: any): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("mirror:broadcast", data);
  },

  // ═══════════════════════════════════════════════════════════
  // FEATURE 10: OFFLINE LOCAL AI (Ollama)
  // ═══════════════════════════════════════════════════════════
  checkOllama: async (): Promise<{ available: boolean; models: string[] }> => {
    return await ipcRenderer.invoke("ollama:check");
  },
  pullOllamaModel: async (model: string): Promise<{ ok: boolean; error?: string }> => {
    return await ipcRenderer.invoke("ollama:pull", model);
  },
  generateOllama: async (payload: { model: string; prompt: string; system?: string }): Promise<{ ok: boolean; text?: string; error?: string }> => {
    return await ipcRenderer.invoke("ollama:generate", payload);
  },

  // ═══════════════════════════════════════════════════════════
  // FEATURE 12: KEYSTROKE GHOST MODE
  // ═══════════════════════════════════════════════════════════
  ghostType: async (text: string, wpm?: number): Promise<{ ok: boolean; error?: string }> => {
    return await ipcRenderer.invoke("ghost:typeText", { text, wpm });
  },
  ghostStop: async (): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("ghost:typeStop");
  },

  // ═══════════════════════════════════════════════════════════
  // STEALTH ENGINE v2.0 — Proctoring Detection & Health
  // ═══════════════════════════════════════════════════════════
  getStealthHealth: async (): Promise<any> => {
    return await ipcRenderer.invoke("stealth:getHealth");
  },
  getStealthThreatLevel: async (): Promise<string> => {
    return await ipcRenderer.invoke("stealth:getThreatLevel");
  },
  getStealthActiveThreats: async (): Promise<any[]> => {
    return await ipcRenderer.invoke("stealth:getActiveThreats");
  },
  applyAntiDetection: async (): Promise<{ ok: boolean; error?: string }> => {
    return await ipcRenderer.invoke("stealth:applyAntiDetection");
  },
  onThreatDetected: (callback: (detection: any) => void): void => {
    ipcRenderer.on("stealth:threatDetected", (_event, detection: any) => callback(detection));
  },
  onThreatLevelChanged: (callback: (level: string) => void): void => {
    ipcRenderer.on("stealth:threatLevelChanged", (_event, level: string) => callback(level));
  },

  // ═══════════════════════════════════════════════════════════
  // OVERLAY ↔ MAIN PROCESS RELAY
  // WebSocket data relayed from main process to overlay renderer
  // ═══════════════════════════════════════════════════════════
  relayToOverlay: (msg: { type: string; data: any }): void => {
    ipcRenderer.send("ws:relayToOverlay", msg);
  },
  onWSMessage: (callback: (msg: { type: string; data: any }) => void): (() => void) => {
    const handler = (_event: any, msg: { type: string; data: any }) => callback(msg);
    ipcRenderer.on("ws:message", handler);
    return () => { ipcRenderer.removeListener("ws:message", handler); };
  },

  // ═══════════════════════════════════════════════════════════
  // INSTANT SCREENSHOT + AI ANALYSIS
  // Captures full screen and sends to backend for GPT-4o vision analysis.
  // No mouse needed — also triggered by Ctrl+Shift+F hotkey.
  // ═══════════════════════════════════════════════════════════
  captureAndAnalyze: async (): Promise<{ ok: boolean; error?: string }> => {
    return await ipcRenderer.invoke("capture:analyzeFullScreen");
  },
  onCaptureTaken: (callback: (info: { width: number; height: number; auto?: boolean }) => void): (() => void) => {
    const handler = (_event: any, info: { width: number; height: number; auto?: boolean }) => callback(info);
    ipcRenderer.on("capture:taken", handler);
    return () => { ipcRenderer.removeListener("capture:taken", handler); };
  },

  onControlMicMuted: (callback: (muted: boolean) => void): (() => void) => {
    const handler = (_event: any, muted: boolean) => callback(muted);
    ipcRenderer.on("control:micMuted", handler);
    return () => { ipcRenderer.removeListener("control:micMuted", handler); };
  },

  // ═══════════════════════════════════════════════════════════
  // APP WINDOW CONTROLS — hide app window during session
  // so only the floating overlay is visible
  // ═══════════════════════════════════════════════════════════
  hideAppWindow: async (): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("app:hide");
  },
  showAppWindow: async (): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("app:show");
  },
  minimizeAppWindow: async (): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("app:minimize");
  },

  // ═══════════════════════════════════════════════════════════
  // AUTO-UPDATER — check for updates and install
  // ═══════════════════════════════════════════════════════════
  checkForUpdates: async (): Promise<{ ok: boolean; version?: string; error?: string }> => {
    return await ipcRenderer.invoke("updater:checkForUpdates");
  },
  quitAndInstall: async (): Promise<{ ok: boolean }> => {
    return await ipcRenderer.invoke("updater:quitAndInstall");
  },
  getAppVersion: async (): Promise<string> => {
    return await ipcRenderer.invoke("updater:getVersion");
  },
  onUpdaterStatus: (callback: (status: any) => void): (() => void) => {
    const handler = (_event: any, status: any) => callback(status);
    ipcRenderer.on("updater:status", handler);
    return () => { ipcRenderer.removeListener("updater:status", handler); };
  },
});
