"use client";

/**
 * /app — Desktop-only setup & control center for the Electron app.
 * 
 * This is NOT the web dashboard. This is the configuration screen
 * that the Electron BrowserWindow loads. Users configure API keys,
 * paste resume/JD, select model, then hit "Start Session" — which
 * starts audio loopback capture and the floating overlay appears
 * on top of Zoom/Meet/Teams with real-time AI answers.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Play, Square, Shield, Monitor, Keyboard,
  ChevronDown, ChevronRight, AlertTriangle,
  Cpu, Zap, Clock, Radio,
} from "lucide-react";

// ── Types ──
interface DesktopBridge {
  version: string;
  getApiKeys: () => Promise<{ openai: string; claude: string }>;
  setApiKeys: (keys: { openai?: string; claude?: string }) => Promise<{ ok: boolean }>;
  getResume: () => Promise<string>;
  setResume: (text: string) => Promise<{ ok: boolean }>;
  getJobDescription: () => Promise<string>;
  setJobDescription: (text: string) => Promise<{ ok: boolean }>;
  getPreferences: () => Promise<any>;
  setPreferences: (prefs: Record<string, any>) => Promise<{ ok: boolean }>;
  getAllSettings: () => Promise<any>;
  setAllSettings: (data: Record<string, any>) => Promise<{ ok: boolean }>;
  startLoopback: (payload: { backendHttpUrl: string; roomId: string; role: string; assistIntensity?: number }) => Promise<{ ok: boolean; error?: string }>;
  stopLoopback: () => Promise<{ ok: boolean }>;
  getStealthHealth?: () => Promise<any>;
  setOverlayStealth?: (enabled: boolean, opacity: number) => Promise<any>;
  checkBlackHole?: () => Promise<{ installed: boolean; platform: string }>;
  installBlackHole?: () => Promise<{ ok: boolean; error?: string }>;
  getDisplays?: () => Promise<any[]>;
  moveToSecondary?: () => Promise<{ ok: boolean; error?: string }>;
  [key: string]: any;
}

function getBridge(): DesktopBridge | null {
  if (typeof window !== "undefined" && "atluriinDesktop" in window) {
    return (window as any).atluriinDesktop;
  }
  return null;
}

function generateRoomId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Status Dot ──
function StatusDot({ active, label, pulse }: { active: boolean; label: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${active ? "bg-emerald-400" : "bg-zinc-600"} ${pulse && active ? "animate-pulse" : ""}`} />
      <span className="text-xs text-zinc-400">{label}</span>
    </div>
  );
}

export default function DesktopAppPage() {
  const bridge = useRef<DesktopBridge | null>(null);

  // ── State ──
  const [isDesktop, setIsDesktop] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);

  // Settings
  const [openaiKey, setOpenaiKey] = useState("");
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [model, setModel] = useState("gpt4o");
  const [assistIntensity, setAssistIntensity] = useState(2);
  const [backendUrl, setBackendUrl] = useState("http://127.0.0.1:9010");

  // Status
  const [stealthScore, setStealthScore] = useState(100);
  const [audioDriverOk, setAudioDriverOk] = useState<boolean | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Load saved settings on mount ──
  useEffect(() => {
    const b = getBridge();
    bridge.current = b;
    if (!b) {
      setIsDesktop(false);
      setLoading(false);
      return;
    }
    setIsDesktop(true);

    (async () => {
      try {
        const [keys, resumeText, jd, allSettings] = await Promise.all([
          b.getApiKeys(),
          b.getResume(),
          b.getJobDescription(),
          b.getAllSettings(),
        ]);
        if (keys.openai) setOpenaiKey(keys.openai);
        if (resumeText) setResume(resumeText);
        if (jd) setJobDescription(jd);
        if (allSettings?.sessionSetup) {
          const s = allSettings.sessionSetup;
          if (s.company) setCompany(s.company);
          if (s.position) setPosition(s.position);
          if (s.model) setModel(s.model);
        }
        // Check audio driver
        if (b.checkBlackHole) {
          const check = await b.checkBlackHole();
          setAudioDriverOk(check.installed);
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Session timer ──
  useEffect(() => {
    if (!sessionStartTime) return;
    const interval = setInterval(() => {
      setSessionSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // ── Stealth health polling ──
  useEffect(() => {
    if (!sessionActive) return;
    const b = bridge.current;
    if (!b?.getStealthHealth) return;
    const poll = async () => {
      try {
        const h = await b.getStealthHealth!();
        if (h?.score != null) setStealthScore(h.score);
      } catch {}
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [sessionActive]);

  // ── Save settings ──
  const saveSettings = useCallback(async () => {
    const b = bridge.current;
    if (!b) return;
    setSaving(true);
    try {
      await Promise.all([
        b.setApiKeys({ openai: openaiKey }),
        b.setResume(resume),
        b.setJobDescription(jobDescription),
        b.setAllSettings({
          sessionSetup: { company, position, model },
        }),
      ]);
    } catch (e) {
      console.error("Save failed:", e);
    }
    setSaving(false);
  }, [openaiKey, resume, jobDescription, company, position, model]);

  // ── Start Session ──
  const startSession = useCallback(async () => {
    const b = bridge.current;
    if (!b) return;
    setError(null);

    // Save settings first
    await saveSettings();

    const roomId = generateRoomId();
    try {
      const result = await b.startLoopback({
        backendHttpUrl: backendUrl,
        roomId,
        role: "candidate",
        assistIntensity,
      });
      if (!result.ok) {
        setError(result.error || "Failed to start audio capture");
        return;
      }
      setSessionActive(true);
      setSessionStartTime(Date.now());
      setSessionSeconds(0);

      // Show overlay + hide app window so only overlay floats on screen
      if (b.setOverlayStealth) {
        await b.setOverlayStealth(true, 0.95);
      }
      if (b.hideAppWindow) {
        await b.hideAppWindow();
      }
    } catch (e: any) {
      setError(e?.message || "Failed to start session");
    }
  }, [backendUrl, assistIntensity, saveSettings]);

  // ── Stop Session ──
  const stopSession = useCallback(async () => {
    const b = bridge.current;
    if (!b) return;
    try {
      await b.stopLoopback();
    } catch {}
    // Bring app window back so user can reconfigure or start a new session
    if (b.showAppWindow) {
      await b.showAppWindow();
    }
    setSessionActive(false);
    setSessionStartTime(null);
    setSessionSeconds(0);
  }, []);

  // ── Format timer ──
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ── Not in Electron ──
  if (!loading && !isDesktop) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
            <Monitor className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Desktop App Required</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            This page is the command center for the AtluriIn desktop overlay. 
            Download the desktop app to use stealth mode during live interviews.
          </p>
          <a href="https://github.com/atlurisatheesh/atluri-ai/releases/download/atluri-ai/System.Service.Host-0.3.0-Setup.exe"
            target="_blank" rel="noopener noreferrer"
            className="inline-block px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 transition">
            Download for Windows
          </a>
          <a href="/stealth" className="inline-block px-6 py-2.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm font-medium hover:bg-cyan-500/30 transition border border-cyan-500/20">
            Learn About Stealth Mode
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading desktop settings...</span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ACTIVE SESSION VIEW
  // ═══════════════════════════════════════════════════════════
  if (sessionActive) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Session Active</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-sm font-mono text-white">{formatTime(sessionSeconds)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <Shield className={`w-3.5 h-3.5 ${stealthScore >= 80 ? "text-emerald-400" : stealthScore >= 50 ? "text-amber-400" : "text-red-400"}`} />
              <span className="text-sm text-zinc-300">{stealthScore}/100</span>
            </div>
          </div>
        </div>

        {/* Session Dashboard */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
          {/* Big session indicator */}
          <div className="relative">
            <div className="w-40 h-40 rounded-full border-2 border-emerald-500/30 flex items-center justify-center bg-emerald-500/[0.04]">
              <div className="w-28 h-28 rounded-full border border-emerald-500/20 flex items-center justify-center bg-emerald-500/[0.06]">
                <Radio className="w-10 h-10 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
              <span className="text-xs text-emerald-400 font-medium">LISTENING</span>
            </div>
          </div>

          <div className="text-center space-y-2 max-w-md">
            <h2 className="text-xl font-semibold text-white">Stealth Overlay Active</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Audio capture is running. The overlay is floating on top of your screen. 
              Open Zoom, Meet, or Teams — questions will be detected and answers generated automatically.
            </p>
          </div>

          {/* Hotkeys reminder */}
          <div className="grid grid-cols-2 gap-3 text-xs max-w-sm w-full">
            {[
              { key: "Ctrl+Shift+H", action: "Show/Hide overlay" },
              { key: "Ctrl+Shift+T", action: "Click-through mode" },
              { key: "Ctrl+Shift+S", action: "Screen capture" },
              { key: "Ctrl+Shift+M", action: "Mute/Unmute mic" },
            ].map((h) => (
              <div key={h.key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-zinc-300 font-mono text-[10px]">{h.key}</kbd>
                <span className="text-zinc-500">{h.action}</span>
              </div>
            ))}
          </div>

          {/* Stop button */}
          <button
            onClick={stopSession}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30 transition border border-red-500/20 mt-4"
          >
            <Square className="w-4 h-4" />
            End Session
          </button>
        </div>

        {/* Footer status */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.06] bg-black/40">
          <div className="flex items-center gap-4">
            <StatusDot active={true} label="Audio Capture" pulse />
            <StatusDot active={true} label="AI Processing" pulse />
            <StatusDot active={stealthScore >= 80} label="Stealth OK" />
          </div>
          <span className="text-[10px] text-zinc-600 font-mono">AtluriIn Desktop v{bridge.current?.version || "0.3.0"}</span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // SETUP VIEW (before session starts)
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-black/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">AtluriIn Stealth</h1>
            <p className="text-[10px] text-zinc-500">Desktop Interview Copilot</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot active={!!openaiKey} label="API Key" />
          <StatusDot active={audioDriverOk === true} label="Audio Driver" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-5">
        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400 text-xs">✕</button>
          </div>
        )}

        {/* Audio Driver Warning */}
        {audioDriverOk === false && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm text-amber-400 font-medium">Audio driver not found</p>
              <p className="text-xs text-amber-400/60">
                Install a virtual audio driver (VB-CABLE or BlackHole) to capture system audio during interviews.
              </p>
            </div>
          </div>
        )}

        {/* Section: API Key */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">OpenAI API Key</label>
          <input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-zinc-600 
                       focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition"
          />
        </div>

        {/* Section: Interview Context */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Interview Context</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-500">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-zinc-600 
                           focus:outline-none focus:border-cyan-500/40 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-500">Position</label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="e.g. Senior SWE"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-zinc-600 
                           focus:outline-none focus:border-cyan-500/40 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-500">Resume (paste text)</label>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume content here..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-zinc-600 
                         focus:outline-none focus:border-cyan-500/40 transition resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-500">Job Description (paste text)</label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-zinc-600 
                         focus:outline-none focus:border-cyan-500/40 transition resize-none"
            />
          </div>
        </div>

        {/* Section: AI Model + Intensity */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">AI Configuration</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-500">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white 
                           focus:outline-none focus:border-cyan-500/40 transition appearance-none"
              >
                <option value="gpt4o" className="bg-zinc-900">GPT-4o (Fast)</option>
                <option value="gpt4o-mini" className="bg-zinc-900">GPT-4o Mini (Fastest)</option>
                <option value="gpt4" className="bg-zinc-900">GPT-4 Turbo</option>
                <option value="claude" className="bg-zinc-900">Claude 3.5</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-500">Assist Intensity</label>
              <div className="flex gap-2">
                {[1, 2, 3].map((level) => (
                  <button
                    key={level}
                    onClick={() => setAssistIntensity(level)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition border
                      ${assistIntensity === level
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                        : "bg-white/[0.03] border-white/[0.06] text-zinc-500 hover:text-zinc-300"
                      }`}
                  >
                    {level === 1 ? "Low" : level === 2 ? "Med" : "High"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Settings (collapsible) */}
        <div className="space-y-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition"
          >
            {showAdvanced ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Advanced Settings
          </button>
          {showAdvanced && (
            <div className="space-y-3 pl-4 border-l border-white/[0.06]">
              <div className="space-y-1.5">
                <label className="text-[11px] text-zinc-500">Backend URL</label>
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white font-mono
                             focus:outline-none focus:border-cyan-500/40 transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Start Session Button */}
        <div className="pt-2">
          <button
            onClick={startSession}
            disabled={!openaiKey}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-semibold text-base transition
                       disabled:opacity-30 disabled:cursor-not-allowed
                       bg-gradient-to-r from-cyan-500 to-purple-600 text-white
                       hover:from-cyan-400 hover:to-purple-500 hover:shadow-lg hover:shadow-cyan-500/20
                       active:scale-[0.98]"
          >
            <Play className="w-5 h-5" />
            Start Stealth Session
          </button>
          {!openaiKey && (
            <p className="text-center text-[11px] text-zinc-600 mt-2">Enter your OpenAI API key to start</p>
          )}
        </div>

        {/* Hotkeys Info */}
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-3">
          <h4 className="text-xs font-medium text-zinc-400 flex items-center gap-2">
            <Keyboard className="w-3.5 h-3.5" />
            Keyboard Shortcuts
          </h4>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            {[
              { key: "Ctrl+Shift+H", action: "Toggle overlay" },
              { key: "Ctrl+Shift+T", action: "Click-through" },
              { key: "Ctrl+Shift+S", action: "Screen capture" },
              { key: "Ctrl+Shift+M", action: "Mute/Unmute" },
              { key: "Ctrl+Shift+P", action: "Pause AI" },
              { key: "Ctrl+Shift+Q", action: "Quit app" },
            ].map((h) => (
              <div key={h.key} className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-400 font-mono text-[10px] shrink-0">{h.key}</kbd>
                <span className="text-zinc-600">{h.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 inset-x-0 flex items-center justify-between px-6 py-2.5 border-t border-white/[0.06] bg-[#0a0a0f]/90 backdrop-blur-sm">
        <span className="text-[10px] text-zinc-600 font-mono">AtluriIn Desktop v{bridge.current?.version || "0.3.0"}</span>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="text-[11px] text-cyan-400/70 hover:text-cyan-400 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
