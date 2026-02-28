import type { Page, WebSocket as PwWebSocket } from "playwright";
import type { WebSocketRecord } from "./types";

export class BrowserWebSocketMonitor {
  private readonly sockets: WebSocketRecord[] = [];
  private readonly socketIndex = new Map<PwWebSocket, WebSocketRecord>();

  attach(page: Page): void {
    page.on("websocket", (ws) => this.onWebSocket(ws));
  }

  private onWebSocket(ws: PwWebSocket): void {
    const record: WebSocketRecord = {
      url: ws.url(),
      createdAtIso: new Date().toISOString(),
      framesSent: 0,
      framesReceived: 0,
    };
    this.sockets.push(record);
    this.socketIndex.set(ws, record);

    ws.on("framesent", () => {
      const current = this.socketIndex.get(ws);
      if (current) current.framesSent += 1;
    });
    ws.on("framereceived", () => {
      const current = this.socketIndex.get(ws);
      if (current) current.framesReceived += 1;
    });
    ws.on("close", () => {
      const current = this.socketIndex.get(ws);
      if (!current) return;
      current.closedAtIso = new Date().toISOString();
    });
  }

  snapshot(): WebSocketRecord[] {
    return this.sockets.map((item) => ({ ...item }));
  }
}
