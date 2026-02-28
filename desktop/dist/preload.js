"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("atluriinDesktop", {
    version: "0.1.0",
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
});
