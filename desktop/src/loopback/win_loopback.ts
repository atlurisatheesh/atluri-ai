import WebSocket from "ws";
import https from "https";
import dns from "dns";
import { Agent as HttpsAgent } from "https";
import { spawn, execFile, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

/**
 * Resolve the ffmpeg binary path.
 * Priority: bundled ffmpeg-static (works in packaged Electron) → system PATH ffmpeg.
 */
function resolveFFmpegPath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    let ffmpegPath: string = require("ffmpeg-static");
    // In packaged Electron, the asar archive doesn't support spawning binaries.
    // electron-builder unpacks the binary to app.asar.unpacked.
    if (ffmpegPath && ffmpegPath.includes("app.asar")) {
      ffmpegPath = ffmpegPath.replace("app.asar", "app.asar.unpacked");
    }
    if (fs.existsSync(ffmpegPath)) {
      console.log(`[loopback] Using bundled ffmpeg: ${ffmpegPath}`);
      return ffmpegPath;
    }
  } catch {
    // ffmpeg-static not available
  }
  console.log("[loopback] Bundled ffmpeg not found — falling back to system PATH ffmpeg");
  return "ffmpeg";
}

const FFMPEG_PATH = resolveFFmpegPath();

/**
 * Discover audio input devices using ffmpeg -list_devices.
 * Does NOT depend on win-audio-capture; uses the bundled ffmpeg binary directly.
 */
function discoverDevices(): Promise<Array<{ name: string; type: string; isRecommended: boolean }>> {
  return new Promise((resolve) => {
    execFile(FFMPEG_PATH, ["-list_devices", "true", "-f", "dshow", "-i", "dummy"], (error, stdout, stderr) => {
      // ffmpeg always exits with error here; we parse stderr for device info
      const output = (stderr || "") + (stdout || "");
      const devices: Array<{ name: string; type: string; isRecommended: boolean }> = [];
      for (const line of output.split("\n")) {
        const m = line.match(/\[dshow @ [^\]]+\]\s+"([^"]+)"\s+\(audio\)/);
        if (m) {
          const name = m[1];
          let deviceType = "microphone";
          let isRecommended = false;
          if (/stereo mix|立体声混音|what you hear|wave out|loopback/i.test(name)) {
            deviceType = "stereo_mix";
            isRecommended = true;
          }
          devices.push({ name, type: deviceType, isRecommended });
        }
      }
      if (devices.length === 0) {
        console.warn("[loopback] No audio devices found via ffmpeg -list_devices");
      } else {
        console.log(`[loopback] Discovered ${devices.length} audio device(s):`);
        devices.forEach((d, i) => console.log(`  [${i}] "${d.name}" type=${d.type} recommended=${d.isRecommended}`));
      }
      resolve(devices);
    });
  });
}

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
 * DNS-over-HTTPS fallback resolver using Cloudflare (1.1.1.1).
 * Bypasses ISP DNS blocking of railway.app domains.
 */
function dohResolve(hostname: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = `https://1.1.1.1/dns-query?name=${encodeURIComponent(hostname)}&type=A`;
    https.get(url, { headers: { Accept: "application/dns-json" } }, (res) => {
      let data = "";
      res.on("data", (chunk: string) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const answer = json.Answer?.find((a: any) => a.type === 1);
          if (answer) resolve(answer.data);
          else reject(new Error(`DoH: no A record for ${hostname}`));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

/**
 * Create a custom DNS lookup function that falls back to DoH
 * when the system DNS resolver fails (e.g., ISP blocks railway.app).
 */
function createDohFallbackLookup() {
  return (hostname: string, options: any, callback: Function) => {
    dns.lookup(hostname, options, (err: any, address: any, family: any) => {
      if (!err) return callback(null, address, family);
      console.log(`[loopback] System DNS failed for ${hostname}, trying DoH...`);
      dohResolve(hostname)
        .then((ip) => {
          console.log(`[loopback] DoH resolved ${hostname} → ${ip}`);
          if (options?.all) {
            callback(null, [{ address: ip, family: 4 }]);
          } else {
            callback(null, ip, 4);
          }
        })
        .catch((dohErr) => {
          console.error(`[loopback] DoH also failed for ${hostname}:`, dohErr);
          callback(err);
        });
    });
  };
}

/**
 * Calculate RMS (Root Mean Square) audio level from PCM16 buffer.
 * Returns a value between 0.0 (silence) and 1.0 (max volume).
 */
function calculateRMS(pcm16Buffer: Buffer): number {
  const samples = pcm16Buffer.length / 2;
  if (samples === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < pcm16Buffer.length; i += 2) {
    const sample = pcm16Buffer.readInt16LE(i);
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / samples) / 32768;
}

/**
 * Discover the best available audio device for capturing interview audio.
 * Uses bundled ffmpeg binary directly (no win-audio-capture dependency).
 * Priority: microphone → recommended → Stereo Mix → first available → "default".
 */
async function findBestDevice(): Promise<{ device: string; type: string }> {
  try {
    const devices = await discoverDevices();
    if (devices.length > 0) {
      // 1. Prefer any microphone — captures user voice directly.
      const mic = devices.find((d) =>
        /microphone|mic|麦克风/i.test(d.name) && d.type !== "stereo_mix"
      );
      if (mic) {
        console.log(`[loopback] Selected MICROPHONE device: "${mic.name}"`);
        return { device: mic.name, type: "microphone" };
      }

      // 2. Recommended device
      const recommended = devices.find((d) => d.isRecommended);
      if (recommended) {
        console.log(`[loopback] Selected RECOMMENDED device: "${recommended.name}"`);
        return { device: recommended.name, type: "recommended" };
      }

      // 3. Fall back to Stereo Mix / loopback
      const stereoMix = devices.find((d) => d.type === "stereo_mix");
      if (stereoMix) {
        console.log(`[loopback] Selected STEREO MIX fallback: "${stereoMix.name}"`);
        return { device: stereoMix.name, type: "stereo_mix" };
      }

      // 4. First available device
      console.log(`[loopback] Selected FALLBACK device[0]: "${devices[0].name}"`);
      return { device: devices[0].name, type: "fallback" };
    }
  } catch (err) {
    console.warn("[loopback] Device discovery failed:", err);
  }
  console.warn("[loopback] No devices discovered — using 'default'");
  return { device: "default", type: "default" };
}

export async function startWindowsLoopback(params: LoopbackStartParams): Promise<LoopbackSession> {
  const backendBase = String(params.backendHttpUrl || "").replace(/\/+$/g, "");
  const roomId = String(params.roomId || "").trim();
  const role = String(params.role || "behavioral").trim();
  const assist = Number.isFinite(params.assistIntensity as any) ? Number(params.assistIntensity) : 2;

  if (!backendBase || !roomId) throw new Error("backendHttpUrl and roomId are required");

  const socketUrl = wsUrl(
    backendBase,
    `/ws/voice?assist_intensity=${encodeURIComponent(String(assist))}&room_id=${encodeURIComponent(roomId)}&participant=interviewer&role=${encodeURIComponent(role)}`
  );

  // Use custom HTTPS agent with DoH DNS fallback to bypass ISP blocking of railway.app
  const agent = new HttpsAgent({ lookup: createDohFallbackLookup() as any });
  const ws = new WebSocket(socketUrl, { agent });

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
  // Uses bundled ffmpeg binary directly for device discovery and PCM capture.
  // No dependency on win-audio-capture npm module at runtime.

  const { device: deviceName, type: deviceType } = await findBestDevice();
  const captureRate = 16000; // 16kHz mono PCM16 — backend expects this

  let stopped = false;

  // ── Audio Health Monitoring ──
  // Track audio levels to detect silence/broken capture. Send periodic health
  // events to the overlay so the user knows if audio is actually being received.
  let totalChunks = 0;
  let silentChunks = 0;  // chunks with RMS below threshold
  let peakLevel = 0;
  let recentLevels: number[] = [];
  const SILENCE_RMS_THRESHOLD = 0.001;  // below this = silence (sensitive for quiet mics)
  const HEALTH_INTERVAL_MS = 3000;      // send health event every 3 seconds
  const SILENCE_WARN_AFTER_SEC = 8;     // warn user after N seconds of silence

  let captureStartTime = Date.now();
  let lastSpeechTime = Date.now();
  let silenceWarned = false;

  const healthTimer = setInterval(() => {
    if (stopped) return;
    const avgLevel = recentLevels.length
      ? recentLevels.reduce((a, b) => a + b, 0) / recentLevels.length
      : 0;
    const silenceRatio = totalChunks > 0 ? silentChunks / totalChunks : 1;
    const silenceDurationSec = (Date.now() - lastSpeechTime) / 1000;
    const hasAudio = avgLevel > SILENCE_RMS_THRESHOLD;

    // Determine health status
    let status: "good" | "weak" | "silent" | "no_device" = "good";
    if (avgLevel < 0.001) status = "silent";
    else if (avgLevel < SILENCE_RMS_THRESHOLD) status = "weak";

    // Send audio health event to overlay via WS
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: "audio_health",
          level: Math.round(avgLevel * 1000) / 1000,
          peak: Math.round(peakLevel * 1000) / 1000,
          status,
          device: deviceName,
          deviceType,
          silenceDurationSec: Math.round(silenceDurationSec),
          totalChunks,
          silentChunks,
          ts: Date.now() / 1000,
        }));
      } catch { /* ignore */ }
    }

    // Warn user about prolonged silence
    if (!silenceWarned && silenceDurationSec > SILENCE_WARN_AFTER_SEC && !hasAudio) {
      silenceWarned = true;
      console.warn(`[loopback] ⚠ No speech detected for ${Math.round(silenceDurationSec)}s on "${deviceName}" (${deviceType})`);
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({
            type: "audio_warning",
            message: `No speech detected for ${Math.round(silenceDurationSec)}s on "${deviceName}". Check that your microphone is not muted.`,
            device: deviceName,
            deviceType,
            suggestion: "Open Windows Sound Settings → Recording → right-click your microphone → Properties → Levels. Ensure level is above 50 and the mic is not muted. Also check the mic is set as default recording device.",
          }));
        } catch { /* ignore */ }
      }
    }

    // Reset recent tracking
    recentLevels = [];
    peakLevel = 0;

    // Log periodically
    console.log(`[loopback] audio health: status=${status} avgLevel=${avgLevel.toFixed(4)} device="${deviceName}" silence=${Math.round(silenceDurationSec)}s`);
  }, HEALTH_INTERVAL_MS);

  // ── Direct FFmpeg Audio Capture (raw PCM16LE, no WAV header) ──
  // Spawn ffmpeg directly to produce raw PCM16LE (no RIFF/WAV header).
  // Uses the bundled ffmpeg-static binary so we don't depend on system PATH.
  let ffmpegProc: ChildProcess | null = null;
  let ffmpegFirstData = false;

  await new Promise<void>((resolveCapture, rejectCapture) => {
    const args = [
      "-f", "dshow",
      "-i", `audio=${deviceName}`,
      "-acodec", "pcm_s16le",
      "-ar", String(captureRate),
      "-ac", "1",
      "-f", "s16le",   // Raw PCM16LE — no RIFF/WAV header
      "pipe:1",
    ];
    console.log(`[loopback] spawning: ${FFMPEG_PATH} ${args.join(" ")}`);
    ffmpegProc = spawn(FFMPEG_PATH, args, { stdio: ["ignore", "pipe", "pipe"] });

    // Log stderr so device-not-found / permission errors are visible.
    ffmpegProc.stderr?.on("data", (data: Buffer) => {
      const line = data.toString().trim();
      if (line && !/^(ffmpeg version|  built with|  configuration:|  lib|Input #|Output #|  Duration|  Stream|frame=|size=|video:|audio:)/i.test(line)) {
        console.warn(`[loopback ffmpeg] ${line.slice(0, 400)}`);
      }
    });

    ffmpegProc.on("error", (err: Error) => {
      if (!ffmpegFirstData) {
        clearInterval(healthTimer);
        rejectCapture(new Error(
          `ffmpeg failed to start: ${err.message}. ` +
          `Make sure ffmpeg is installed and available in PATH (https://ffmpeg.org/download.html).`
        ));
      }
    });

    ffmpegProc.on("close", (code: number | null) => {
      if (!ffmpegFirstData) {
        // ffmpeg exited before producing audio — likely wrong device name
        clearInterval(healthTimer);
        rejectCapture(new Error(
          `ffmpeg exited (code=${code}) before audio capture started. ` +
          `Device "${deviceName}" may not exist. Check Windows Sound Settings → Recording.`
        ));
      } else {
        console.warn(`[loopback] ffmpeg exited (code=${code})`);
      }
    });

    ffmpegProc.stdout?.on("data", (chunk: Buffer) => {
      if (!ffmpegFirstData) {
        ffmpegFirstData = true;
        console.log(`[loopback] ffmpeg producing audio on "${deviceName}" (${deviceType}) @ ${captureRate}Hz PCM16LE`);
        resolveCapture();
      }

      if (stopped || ws.readyState !== WebSocket.OPEN) return;
      if (!Buffer.isBuffer(chunk) || chunk.length < 320) return;

      // ── Audio Level Monitoring ──
      const rms = calculateRMS(chunk);
      totalChunks++;
      recentLevels.push(rms);
      if (rms > peakLevel) peakLevel = rms;

      if (rms < SILENCE_RMS_THRESHOLD) {
        silentChunks++;
      } else {
        lastSpeechTime = Date.now();
        if (silenceWarned) {
          silenceWarned = false;
          console.log(`[loopback] ✓ Speech detected (level=${rms.toFixed(4)})`);
        }
      }

      // Drop on backpressure
      if (ws.bufferedAmount > 256 * 1024) return;
      try {
        ws.send(chunk);
      } catch { /* ignore */ }
    });

    // If ffmpeg hasn't produced audio in 4 seconds, resolve anyway so the
    // session continues; the health monitor will warn if mic stays silent.
    setTimeout(() => {
      if (!ffmpegFirstData) {
        ffmpegFirstData = true;
        console.warn(`[loopback] ffmpeg timeout — no audio from "${deviceName}" after 4s. Device may be muted or wrong.`);
        resolveCapture();
      }
    }, 4000);
  });

  console.log(`[loopback] Audio capture active — device: "${deviceName}" (${deviceType})`);

  const stop = async () => {
    stopped = true;
    clearInterval(healthTimer);
    try {
      ffmpegProc?.kill("SIGTERM");
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
