import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import WebSocket from "ws";
import { MetricsCollector } from "./metrics-collector";

type BrowserSimConfig = {
  frontendUrl: string;
  backendUrl: string;
  answersPerUser: number;
  headless: boolean;
  wsConnectTimeoutMs: number;
  wsStabilityDurationMs: number;
  wsStabilityIntervalMs: number;
};

function b64url(raw: string): string {
  return Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function unsignedJwt(sub: string): string {
  return `${b64url(JSON.stringify({ alg: "none", typ: "JWT" }))}.${b64url(JSON.stringify({ sub }))}.`;
}

async function directWebSocketConnectMs(wsUrl: string, timeoutMs: number): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const start = performance.now();
    const socket = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      try { socket.close(); } catch {}
      reject(new Error(`WS connect timeout (${timeoutMs}ms)`));
    }, timeoutMs);
    socket.on("open", () => {
      clearTimeout(timer);
      const ms = Math.round(performance.now() - start);
      try { socket.close(); } catch {}
      resolve(ms);
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(String((err as any)?.message || err)));
    });
  });
}

async function wsStabilityProbe(
  wsUrl: string,
  opts: { hardTimeoutMs: number; durationMs: number; intervalMs: number }
): Promise<{ connected: boolean; disconnect: boolean; connectMs: number; rttsMs: number[]; gapsMs: number[]; notes: string }> {
  return await new Promise((resolve) => {
    const start = performance.now();
    const rttsMs: number[] = [];
    const gapsMs: number[] = [];
    let lastMsgAt = 0;
    let connected = false;
    let disconnect = false;
    let done = false;

    const socket = new WebSocket(wsUrl);
    const hardTimer = setTimeout(() => {
      if (done) return;
      done = true;
      disconnect = true;
      try { socket.close(); } catch {}
      resolve({ connected, disconnect, connectMs: Math.round(performance.now() - start), rttsMs, gapsMs, notes: `WS stability hard timeout (${opts.hardTimeoutMs}ms)` });
    }, opts.hardTimeoutMs);

    const finalize = (notes: string) => {
      if (done) return;
      done = true;
      clearTimeout(hardTimer);
      try { socket.close(); } catch {}
      resolve({ connected, disconnect, connectMs: connected ? Math.round((socket as any).__connectMs || 0) : Math.round(performance.now() - start), rttsMs, gapsMs, notes });
    };

    socket.on("open", () => {
      connected = true;
      (socket as any).__connectMs = Math.round(performance.now() - start);

      let pendingSentAt: number | null = null;

      const durationTimer = setTimeout(() => finalize("WS stability window complete"), Math.max(250, opts.durationMs));
      let seq = 0;
      const interval = setInterval(() => {
        if (done) return;
        seq += 1;
        const sentAt = performance.now();
        pendingSentAt = sentAt;
        try {
          socket.send(JSON.stringify({ type: "sync_state_request", client_sent_at_ms: sentAt, seq }));
        } catch {
        }
      }, Math.max(200, opts.intervalMs));

      socket.on("message", (data) => {
        const now = performance.now();
        if (lastMsgAt > 0) gapsMs.push(Math.max(0, Math.round(now - lastMsgAt)));
        lastMsgAt = now;
        if (pendingSentAt != null) {
          rttsMs.push(Math.max(0, Math.round(now - pendingSentAt)));
          pendingSentAt = null;
        }
        try {
          const parsed = JSON.parse(String(data || "{}"));
          const sent = Number(parsed?.client_sent_at_ms);
          if (Number.isFinite(sent) && sent > 0) rttsMs.push(Math.max(0, Math.round(now - sent)));
        } catch {
        }
      });

      socket.on("close", () => {
        disconnect = true;
        clearInterval(interval);
        clearTimeout(durationTimer);
        if (!done) finalize("WS closed during stability window");
      });
      socket.on("error", (err) => {
        disconnect = true;
        clearInterval(interval);
        clearTimeout(durationTimer);
        if (!done) finalize(`WS error during stability window: ${String((err as any)?.message || err)}`);
      });
    });

    socket.on("error", (err) => {
      if (done) return;
      done = true;
      clearTimeout(hardTimer);
      resolve({ connected, disconnect: true, connectMs: Math.round(performance.now() - start), rttsMs, gapsMs, notes: `WS error: ${String((err as any)?.message || err)}` });
    });
  });
}

async function answerOnce(page: Page, answer: string) {
  const readCurrentQuestion = async (): Promise<string> => {
    return await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll("div"));
      const label = nodes.find((node) => (node.textContent || "").trim() === "Current Question");
      const card = label?.parentElement;
      if (!card) return "";
      const children = Array.from(card.querySelectorAll("div"));
      return String(children[1]?.textContent || "").trim();
    });
  };

  const prev = await readCurrentQuestion();
  const textarea = page.getByPlaceholder("Type your answer with structure: context, action, impact, reflection...");
  await textarea.fill(answer);
  await page.getByRole("button", { name: "Submit Answer" }).click();

  // Deterministic progress wait: question changes OR interview completes.
  await page.waitForFunction(
    (prevQuestion) => {
      const bodyText = document.body?.innerText || "";
      if (bodyText.includes("Interview completed")) return true;
      if (bodyText.includes("Session-End Delta")) return true;
      const nodes = Array.from(document.querySelectorAll("div"));
      const label = nodes.find((node) => (node.textContent || "").trim() === "Current Question");
      const card = label?.parentElement;
      if (!card) return false;
      const children = Array.from(card.querySelectorAll("div"));
      const current = String(children[1]?.textContent || "").trim();
      return Boolean(current && current !== String(prevQuestion || "").trim());
    },
    prev,
    { timeout: 45000 }
  );
}

export async function runBrowserUsers(
  userIds: string[],
  cfg: BrowserSimConfig,
  metrics: MetricsCollector
): Promise<void> {
  const browser: Browser = await chromium.launch({
    headless: cfg.headless,
    args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
  });

  try {
    await Promise.all(
      userIds.map(async (userId) => {
        const token = unsignedJwt(userId);
        const recordErr = (step: string, err: any) => {
          metrics.recordError({ userId, scenario: "browser", step, message: String(err?.message || err) });
        };

        let context: BrowserContext | null = null;
        let page: Page | null = null;
        try {
          context = await browser.newContext({ baseURL: cfg.frontendUrl, viewport: { width: 1280, height: 820 } });
          page = await context.newPage();

          await page.addInitScript((payload) => {
            try {
              window.localStorage.setItem("atluriin.e2e.bypass", "1");
              window.localStorage.setItem("atluriin.e2e.user_id", payload.userId);
            } catch {
            }
          }, { userId });

          // Landing
          await page.goto("/", { waitUntil: "domcontentloaded" });
          await page.getByText("AtluriIn AI").first().waitFor({ state: "visible" });

          // Interview start via QuickStart
          await page.goto("/app", { waitUntil: "domcontentloaded" });
          await page.getByText("First Session Launch").waitFor({ state: "visible" });

          const t0 = performance.now();
          await page.getByRole("button", { name: "Run First Pressure Round (1-Click)" }).first().click();
          await page.getByText("Current Question").waitFor({ state: "visible" });
          const ttfqMs = Math.round(performance.now() - t0);
          metrics.record({ key: "ttfq_ms", value: ttfqMs, userId, scenario: "browser" });

          // WS connect probe (direct, to hit WS path even if user doesn't open voice page)
          try {
            const room = crypto.randomUUID();
            const wsUrl = cfg.backendUrl.replace(/^http/i, "ws") + `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(room)}&participant=candidate`;
            const hardTimeoutMs = Math.max(8000, cfg.wsConnectTimeoutMs * 3);
            const wsMs = await directWebSocketConnectMs(wsUrl, hardTimeoutMs);
            metrics.record({ key: "ws_connect_ms", value: wsMs, userId, scenario: "browser" });
          } catch (e) {
            recordErr("ws_connect", e);
          }

          // WS stability probe (RTT/gap/disconnect)
          try {
            const room = crypto.randomUUID();
            const wsUrl = cfg.backendUrl.replace(/^http/i, "ws") + `/ws/voice?assist_intensity=2&room_id=${encodeURIComponent(room)}&participant=candidate`;
            const hardTimeoutMs = Math.max(10_000, cfg.wsStabilityDurationMs + 4000);
            const st = await wsStabilityProbe(wsUrl, { hardTimeoutMs, durationMs: cfg.wsStabilityDurationMs, intervalMs: cfg.wsStabilityIntervalMs });
            for (const rtt of st.rttsMs) metrics.record({ key: "ws_rtt_ms", value: rtt, userId, scenario: "browser" });
            for (const gap of st.gapsMs) metrics.record({ key: "ws_gap_ms", value: gap, userId, scenario: "browser" });
            if (st.disconnect) metrics.record({ key: "ws_disconnect_flag", value: 1, userId, scenario: "browser" });
          } catch (e) {
            recordErr("ws_stability", e);
          }

          const answers = [
            "I led cache and query optimization to reduce p95 from 420ms to 180ms and lower infra spend by 18%.",
            "I owned rollout planning across teams and cut deployment lead time by 37%.",
            "I drove incident command, restored service in 22 minutes, and added guardrails to prevent recurrence.",
            "I set success metrics, wrote the design doc, and owned staged rollout checkpoints.",
            "I evaluated latency vs correctness vs cost and validated decisions with metrics.",
          ];

          for (let i = 0; i < cfg.answersPerUser; i += 1) {
            const a0 = performance.now();
            await answerOnce(page, answers[i % answers.length]);
            const aMs = Math.round(performance.now() - a0);
            metrics.record({ key: "answer_latency_ms", value: aMs, userId, scenario: "browser" });
            if (await page.getByText("Interview completed").isVisible().catch(() => false)) break;
            if (await page.getByText("Session-End Delta").isVisible().catch(() => false)) break;
          }

          // Navigate dashboard
          await page.getByRole("button", { name: /More ▾/ }).click();
          await page.getByRole("button", { name: "Performance" }).click();
          await page.getByText("Offer Probability").first().waitFor({ state: "visible" });
          await page.getByText(/Velocity:/).first().waitFor({ state: "visible" });

          // Offer Probability compute latency (measured from browser -> backend)
          try {
            const ms = await page.evaluate(
              async ({ url, jwt }: { url: string; jwt: string }) => {
                const t0 = performance.now();
                const res = await fetch(url, { method: "GET", headers: { Authorization: `Bearer ${jwt}` } });
                await res.text();
                return Math.round(performance.now() - t0);
              },
              { url: `${cfg.backendUrl}/api/user/offer-probability?limit=40`, jwt: token }
            );
            metrics.record({ key: "offer_compute_ms", value: Number(ms || 0), userId, scenario: "browser" });
          } catch (e) {
            recordErr("offer_probability", e);
          }

          // Share snapshot via UI if present
          const shareButton = page.getByRole("button", { name: "Share Improvement Snapshot" });
          if (await shareButton.isVisible().catch(() => false)) {
            await shareButton.click();
            await page.getByText(/Improvement snapshot link copied\.|Failed to create snapshot link\./).first().waitFor({ state: "visible", timeout: 20000 });
          }

          // Public snapshot via API (stable) then open in browser.
          const offer = await fetch(`${cfg.backendUrl}/api/user/offer-probability?limit=40`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          });
          const offerJson: any = await offer.json();
          const latest = String(offerJson?.latest_session_id || "");
          if (latest) {
            const share = await fetch(`${cfg.backendUrl}/api/session/${encodeURIComponent(latest)}/share`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            });
            const shareJson: any = await share.json();
            const sharePath = String(shareJson?.share_path || "");
            if (sharePath) {
              await page.goto(sharePath, { waitUntil: "domcontentloaded" });
              await page.getByText("Shared Interview Snapshot").waitFor({ state: "visible", timeout: 20000 });
            }
          }
        } catch (e) {
          recordErr("user_flow", e);
        } finally {
          try { await page?.close(); } catch {}
          try { await context?.close(); } catch {}
        }
      })
    );
  } finally {
    await browser.close();
  }
}
