import WebSocket from "ws";

export type LoopbackStartParams = {
  backendHttpUrl: string;
  roomId: string;
  role: string;
  assistIntensity?: number;
};

type LoopbackSession = {
  stop: () => Promise<void>;
};

function wsUrl(baseHttp: string, path: string) {
  return baseHttp.replace(/^http/i, "ws") + path;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function floatToPcm16Frame(float32: Float32Array, inSampleRate: number): Buffer {
  // Resample to 16kHz mono with linear interpolation.
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
    const clamped = clamp(sample, -1, 1);
    out[i] = (clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff) | 0;
  }
  return Buffer.from(out.buffer);
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

  // --- Capture ---
  // The library API is not standardized; we handle a couple common patterns.
  // Expected: 32-bit float mono frames at some sample rate.

  const capture = winCap.createCapture ? winCap.createCapture({ loopback: true }) : (winCap.create && winCap.create({ loopback: true }));
  if (!capture) throw new Error("win-audio-capture did not provide a capture instance");

  const inputRate = Number(capture.sampleRate || capture.sample_rate || 48000) || 48000;
  const chunkMs = 20;
  const chunkSamples = Math.floor((inputRate * chunkMs) / 1000);
  let buffered: number[] = [];

  const onData = (data: any) => {
    if (ws.readyState !== WebSocket.OPEN) return;

    // Normalize incoming to Float32Array
    let floats: Float32Array | null = null;
    if (data instanceof Float32Array) floats = data;
    else if (Buffer.isBuffer(data)) floats = new Float32Array(data.buffer, data.byteOffset, Math.floor(data.byteLength / 4));
    else if (data?.buffer) {
      try {
        floats = new Float32Array(data.buffer);
      } catch {
      }
    }
    if (!floats || floats.length === 0) return;

    // Accumulate and frame
    for (let i = 0; i < floats.length; i += 1) buffered.push(floats[i]);
    while (buffered.length >= chunkSamples) {
      const slice = buffered.slice(0, chunkSamples);
      buffered = buffered.slice(chunkSamples);
      const pcm = floatToPcm16Frame(new Float32Array(slice), inputRate);

      // 20ms at 16kHz mono PCM16 => 640 bytes (but resampler may produce slightly different lengths; backend tolerates >=320)
      if (ws.bufferedAmount > 256 * 1024) {
        // drop on backpressure
        continue;
      }
      try {
        ws.send(pcm);
      } catch {
        return;
      }
    }
  };

  if (typeof capture.on === "function") {
    capture.on("data", onData);
    capture.on("error", () => {
      // no-op; ws close will stop
    });
    if (typeof capture.start === "function") capture.start();
  } else if (typeof capture.addListener === "function") {
    capture.addListener("data", onData);
    if (typeof capture.start === "function") capture.start();
  } else {
    throw new Error("capture instance does not support events");
  }

  const stop = async () => {
    try {
      if (typeof capture.stop === "function") capture.stop();
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

  return { stop };
}
