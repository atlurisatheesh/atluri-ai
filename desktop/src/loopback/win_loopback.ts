import WebSocket from "ws";

export type LoopbackStartParams = {
  backendHttpUrl: string;
  roomId: string;
  role: string;
  assistIntensity?: number;
};

type LoopbackSession = {
  stop: () => Promise<void>;
  onMessage: (handler: (type: string, data: any) => void) => void;
  injectTranscript: (text: string) => void;
  _sendScreenshot: (base64: string) => void;
  _sendScreenMonitor: (base64: string) => void;
};

function wsUrl(baseHttp: string, path: string) {
  return baseHttp.replace(/^http/i, "ws") + path;
}

/**
 * Discover the best available audio device for capturing interview audio.
 * Priority: Stereo Mix (loopback) > WASAPI loopback > default microphone.
 */
async function findBestDevice(ac: any): Promise<string> {
  try {
    const devices = await ac.getDevices();
    if (Array.isArray(devices) && devices.length > 0) {
      // Prefer Stereo Mix (system loopback)
      const stereoMix = devices.find(
        (d: any) =>
          /stereo mix|立体声混音|loopback/i.test(d.name || "") ||
          d.deviceType === "stereo_mix"
      );
      if (stereoMix) return stereoMix.name || stereoMix.id;

      // Prefer recommended
      const recommended = devices.find((d: any) => d.isRecommended);
      if (recommended) return recommended.name || recommended.id;

      // Take the first microphone
      const mic = devices.find((d: any) => /microphone|mic|麦克风/i.test(d.name || ""));
      if (mic) return mic.name || mic.id;

      return devices[0].name || devices[0].id || "default";
    }
  } catch {
    // getDevices may fail — fall through
  }
  return "default";
}

export async function startWindowsLoopback(params: LoopbackStartParams): Promise<LoopbackSession> {
  // Dynamic require so the app still works without the native module installed.
  let winCap: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    winCap = require("win-audio-capture");
  } catch {
    throw new Error("win-audio-capture not installed (WASAPI loopback unavailable)");
  }

  const backendBase = String(params.backendHttpUrl || "").replace(/\/+$/g, "");
  const roomId = String(params.roomId || "").trim();
  const role = String(params.role || "behavioral").trim();
  const assist = Number.isFinite(params.assistIntensity as any) ? Number(params.assistIntensity) : 2;

  if (!backendBase || !roomId) throw new Error("backendHttpUrl and roomId are required");

  const socketUrl = wsUrl(
    backendBase,
    `/ws/voice?assist_intensity=${encodeURIComponent(String(assist))}&room_id=${encodeURIComponent(roomId)}&participant=interviewer&role=${encodeURIComponent(role)}`
  );

  const ws = new WebSocket(socketUrl);

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("loopback ws connect timeout")), 8000);
    ws.once("open", () => {
      clearTimeout(t);
      resolve();
    });
    ws.once("error", (err: unknown) => {
      clearTimeout(t);
      reject(err);
    });
  });

  // Configure role (some backends also accept role via text message)
  try {
    ws.send(JSON.stringify({ role }));
  } catch {
  }

  // --- Incoming message handler (backend → overlay) ---
  let messageHandler: ((type: string, data: any) => void) | null = null;

  ws.on("message", (raw: any) => {
    try {
      const str = typeof raw === "string" ? raw : raw.toString("utf-8");
      const parsed = JSON.parse(str);

      // Respond to backend heartbeat pings to prevent timeout disconnects
      if (parsed.type === "ping") {
        try {
          ws.send(JSON.stringify({ type: "pong", ts: Date.now() / 1000 }));
        } catch { /* ignore send errors */ }
        return;
      }

      if (parsed.type && messageHandler) {
        messageHandler(parsed.type, parsed);
      }
    } catch {
      // binary frame or non-JSON — ignore
    }
  });

  // --- Audio Capture ---
  // win-audio-capture is an ffmpeg dshow wrapper. API:
  //   const ac = new AudioCapture();
  //   await ac.start({ device, sampleRate, channels, bitDepth, onData(chunk: Buffer) })
  //   await ac.stop();
  // The onData callback receives raw PCM16LE buffers at the configured sample rate.

  const ac = new winCap.AudioCapture();
  const deviceName = await findBestDevice(ac);
  const captureRate = 16000; // 16kHz mono PCM16 — backend expects this

  let stopped = false;

  await ac.start({
    device: deviceName,
    sampleRate: captureRate,
    channels: 1,
    bitDepth: 16,
    onData: (chunk: Buffer) => {
      if (stopped) return;
      if (ws.readyState !== WebSocket.OPEN) return;

      // The chunk is already PCM16LE at 16kHz mono — send directly.
      // Skip WAV header bytes (first chunk from ffmpeg contains a 44-byte WAV header).
      if (!Buffer.isBuffer(chunk) || chunk.length < 320) return;

      // Drop on backpressure
      if (ws.bufferedAmount > 256 * 1024) return;

      try {
        ws.send(chunk);
      } catch {
        // WS send failed — will be cleaned up on close
      }
    },
  });

  console.log(`[loopback] Audio capture started on device: "${deviceName}" @ ${captureRate}Hz mono PCM16`);

  const stop = async () => {
    stopped = true;
    try {
      await ac.stop();
    } catch {
    }
    try {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "stop" }));
    } catch {
    }
    try {
      ws.close();
    } catch {
    }
  };

  const injectTranscript = (text: string) => {
    if (ws.readyState !== WebSocket.OPEN) {
      console.warn("[loopback] cannot inject transcript — WS not open");
      return;
    }
    const msg = {
      type: "transcript",
      text,
      participant: "interviewer",
      is_final: true,
      source: "injection",
    };
    console.log(`[loopback] injecting transcript: "${text.slice(0, 60)}..."`);
    ws.send(JSON.stringify(msg));
  };

  const _sendScreenshot = (base64: string) => {
    if (ws.readyState !== WebSocket.OPEN) {
      console.warn("[loopback] cannot send screenshot — WS not open");
      return;
    }
    const msg = {
      type: "screenshot",
      base64,
      ts: Date.now() / 1000,
    };
    console.log(`[loopback] sending screenshot for analysis (${Math.round(base64.length / 1024)}KB)`);
    ws.send(JSON.stringify(msg));
  };

  const _sendScreenMonitor = (base64: string) => {
    if (ws.readyState !== WebSocket.OPEN) {
      console.warn("[loopback] cannot send screen_monitor — WS not open");
      return;
    }
    const msg = {
      type: "screen_monitor",
      base64,
      ts: Date.now() / 1000,
    };
    console.log(`[loopback] sending screen_monitor frame (${Math.round(base64.length / 1024)}KB)`);
    ws.send(JSON.stringify(msg));
  };

  return {
    stop,
    onMessage: (handler: (type: string, data: any) => void) => {
      messageHandler = handler;
    },
    injectTranscript,
    _sendScreenshot,
    _sendScreenMonitor,
  };
}
