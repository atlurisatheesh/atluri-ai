import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("atluriinDesktop", {
  version: "0.1.0",
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
});
