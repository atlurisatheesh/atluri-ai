"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const win_loopback_1 = require("./loopback/win_loopback");
const DEFAULT_FRONTEND_URL = process.env.DESKTOP_FRONTEND_URL || "http://localhost:3001";
const OPEN_DEVTOOLS = String(process.env.DESKTOP_OPEN_DEVTOOLS || "").toLowerCase() === "true";
const OVERLAY_CONTENT_PROTECTION = String(process.env.DESKTOP_OVERLAY_CONTENT_PROTECTION || "").toLowerCase() === "true";
function log(...args) {
    // Electron main-process logs go to the launching terminal.
    // Keep it simple and parseable.
    // eslint-disable-next-line no-console
    console.log("[desktop]", ...args);
}
// Some Windows environments deny Chromium cache/quota DB writes in default locations.
// Force userData + disk cache to a known-writable AppData folder.
try {
    const base = path_1.default.join(electron_1.app.getPath("appData"), "AtluriInPractice");
    electron_1.app.setPath("userData", path_1.default.join(base, "userData"));
    electron_1.app.commandLine.appendSwitch("disk-cache-dir", path_1.default.join(base, "cache"));
    electron_1.app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
}
catch {
}
process.on("uncaughtException", (err) => {
    log("uncaughtException", String(err?.stack || err));
});
process.on("unhandledRejection", (reason) => {
    log("unhandledRejection", String(reason?.stack || reason));
});
let appWindow = null;
let overlayWindow = null;
// --- Recording Detection Logic ---
const electron_2 = require("electron");
// Helper to check for capture state (customize as needed)
function checkCaptureState(sources) {
    // Example: look for known recording/capture software or generic triggers
    // This is a placeholder; you may want to check source names/types
    return sources.some(src => /obs|zoom|record|capture/i.test(src.name));
}
function startRecordingDetection() {
    setInterval(async () => {
        if (!overlayWindow)
            return;
        const sources = await electron_2.desktopCapturer.getSources({ types: ["window", "screen"] });
        const isRecording = checkCaptureState(sources);
        overlayWindow.webContents.send('recording-state-changed', isRecording);
    }, 1000);
}
let overlayContentProtectionEnabled = OVERLAY_CONTENT_PROTECTION;
let overlayStealthEnabled = false;
let overlayOpacity = 1.0;
let loopbackSession = null;
electron_1.ipcMain.handle("overlay:getContentProtection", async () => {
    return Boolean(overlayContentProtectionEnabled);
});
electron_1.ipcMain.handle("overlay:setContentProtection", async (_event, enabled) => {
    overlayContentProtectionEnabled = Boolean(enabled);
    if (!overlayWindow)
        return Boolean(overlayContentProtectionEnabled);
    try {
        overlayWindow.setContentProtection(overlayContentProtectionEnabled);
        log("overlay content protection set", overlayContentProtectionEnabled);
    }
    catch (e) {
        log("overlay content protection failed", String(e?.message || e));
    }
    return Boolean(overlayContentProtectionEnabled);
});
electron_1.ipcMain.handle("overlay:setStealth", async (_event, payload) => {
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
    }
    catch (e) {
        log("overlay stealth failed", String(e?.message || e));
    }
    return { enabled: overlayStealthEnabled, opacity: overlayOpacity };
});
electron_1.ipcMain.handle("overlay:getStealth", async () => {
    return { enabled: overlayStealthEnabled, opacity: overlayOpacity };
});
// Dynamic mouse passthrough for click-through overlay when not hovered
electron_1.ipcMain.handle("overlay:setMousePassthrough", async (_event, passthrough) => {
    if (!overlayWindow)
        return;
    try {
        if (Boolean(passthrough)) {
            overlayWindow.setIgnoreMouseEvents(true, { forward: true });
        }
        else {
            overlayWindow.setIgnoreMouseEvents(false);
        }
    }
    catch (e) {
        log("overlay:setMousePassthrough failed", String(e?.message || e));
    }
});
// Minimize overlay (hide it)
electron_1.ipcMain.handle("overlay:minimize", async () => {
    if (!overlayWindow)
        return;
    overlayWindow.hide();
    log("overlay minimized");
});
// Close overlay (hide, not quit - use Ctrl+Shift+Q to quit app)
electron_1.ipcMain.handle("overlay:close", async () => {
    if (!overlayWindow)
        return;
    overlayWindow.hide();
    log("overlay closed");
});
// Manual window drag - get current position
electron_1.ipcMain.handle("overlay:getPosition", async () => {
    if (!overlayWindow)
        return { x: 0, y: 0 };
    const [x, y] = overlayWindow.getPosition();
    return { x, y };
});
// Manual window drag - set new position
electron_1.ipcMain.handle("overlay:setPosition", async (_event, payload) => {
    if (!overlayWindow)
        return;
    overlayWindow.setPosition(Math.round(payload.x), Math.round(payload.y));
});
electron_1.ipcMain.handle("auth:getAccessToken", async () => {
    if (!appWindow)
        return null;
    try {
        // Supabase stores session JSON in a localStorage key like: sb-<project-ref>-auth-token
        // We search for that key shape to extract access_token.
        const token = await appWindow.webContents.executeJavaScript(`(() => {
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
      })()`);
        return typeof token === "string" ? token : null;
    }
    catch (e) {
        log("auth:getAccessToken failed", String(e?.message || e));
        return null;
    }
});
electron_1.ipcMain.handle("loopback:start", async (_event, payload) => {
    if (loopbackSession) {
        return { ok: true, message: "loopback already running" };
    }
    try {
        loopbackSession = await (0, win_loopback_1.startWindowsLoopback)(payload);
        return { ok: true };
    }
    catch (e) {
        loopbackSession = null;
        return { ok: false, error: String(e?.message || e) };
    }
});
electron_1.ipcMain.handle("loopback:stop", async () => {
    if (!loopbackSession)
        return { ok: true };
    try {
        await loopbackSession.stop();
    }
    catch {
    }
    finally {
        loopbackSession = null;
    }
    return { ok: true };
});
function createAppWindow() {
    appWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 820,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, "preload.js"),
        },
    });
    appWindow.on("ready-to-show", () => {
        appWindow?.show();
        if (OPEN_DEVTOOLS)
            appWindow?.webContents.openDevTools({ mode: "detach" });
    });
    appWindow.webContents.on("did-fail-load", (_ev, code, desc, url) => {
        log("app window did-fail-load", code, desc, url);
    });
    const url = `${DEFAULT_FRONTEND_URL.replace(/\/+$/g, "")}/app`;
    log("loading app URL", url);
    void appWindow.loadURL(url);
}
function createOverlayWindow() {
    overlayWindow = new electron_1.BrowserWindow({
        width: 420,
        height: 680,
        show: false,
        alwaysOnTop: true,
        resizable: true,
        transparent: false,
        backgroundColor: "#0d1420",
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, "preload.js"),
        },
    });
    const htmlPath = path_1.default.join(__dirname, "renderer", "index.html");
    // Start recording detection polling for overlay privacy
    startRecordingDetection();
    // Optional privacy hardening. When enabled, Windows screen capture / some recording tools
    // may show a black window. Keep OFF by default for "practice overlay" usability.
    if (OVERLAY_CONTENT_PROTECTION) {
        try {
            overlayWindow.setContentProtection(true);
            overlayContentProtectionEnabled = true;
            log("overlay content protection enabled");
        }
        catch (e) {
            log("overlay content protection failed", String(e?.message || e));
        }
    }
    overlayWindow.on("ready-to-show", () => {
        overlayWindow?.show();
        if (OPEN_DEVTOOLS)
            overlayWindow?.webContents.openDevTools({ mode: "detach" });
    });
    overlayWindow.webContents.on("did-fail-load", (_ev, code, desc, url) => {
        log("overlay did-fail-load", code, desc, url);
    });
    log("loading overlay HTML", htmlPath);
    void overlayWindow.loadFile(htmlPath);
    // Start with overlay fully interactive (not click-through).
    // Stealth mode can enable click-through later.
    try {
        overlayWindow.setOpacity(overlayOpacity);
        overlayWindow.setIgnoreMouseEvents(false);
    }
    catch {
    }
}
function toggleOverlay() {
    if (!overlayWindow)
        return;
    if (overlayWindow.isVisible())
        overlayWindow.hide();
    else
        overlayWindow.show();
}
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
electron_1.app.whenReady().then(() => {
    log("app.whenReady", "packaged=", electron_1.app.isPackaged, "electron=", process.versions.electron);
    createAppWindow();
    createOverlayWindow();
    // Ctrl+Shift+I toggles overlay (practice-friendly; visible UI)
    electron_1.globalShortcut.register("Control+Shift+I", toggleOverlay);
    // Frameless overlay has no window chrome; provide a clear quit hotkey.
    electron_1.globalShortcut.register("Control+Shift+Q", () => {
        log("quit hotkey");
        electron_1.app.quit();
    });
});
electron_1.app.on("will-quit", () => {
    electron_1.globalShortcut.unregisterAll();
});
