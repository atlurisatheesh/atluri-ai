"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, Shield, Monitor, Keyboard, Sliders, AlertTriangle,
  Settings, Move, Volume2, VolumeX, Save, RotateCcw, Zap,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { GlassCard, NeonButton, StatusBadge } from "@/components/ui";

/* ── Quick profiles ─────────────────────────────────────── */
const PROFILES = [
  { id: "max_stealth", name: "Maximum Stealth", desc: "Minimal overlay, no audio, keyboard-only", transparency: 15, audioOff: true, overlayPos: "bottom-right" },
  { id: "balanced", name: "Balanced", desc: "Semi-transparent overlay with audio hints", transparency: 50, audioOff: false, overlayPos: "right" },
  { id: "training", name: "Training Mode", desc: "Full visibility, all features enabled", transparency: 90, audioOff: false, overlayPos: "right" },
];

const SHORTCUTS = [
  { keys: "Ctrl + Shift + H", action: "Toggle overlay visibility" },
  { keys: "Ctrl + Shift + M", action: "Toggle microphone" },
  { keys: "Ctrl + Shift + N", action: "Next AI response" },
  { keys: "Ctrl + Shift + P", action: "Previous response" },
  { keys: "Ctrl + Shift + S", action: "Toggle stealth mode" },
  { keys: "Ctrl + Shift + C", action: "Copy current response" },
];

export default function StealthPage() {
  const [stealthOn, setStealthOn] = useState(false);
  const [transparency, setTransparency] = useState(50);
  const [overlayPos, setOverlayPos] = useState<"right" | "left" | "bottom-right" | "top-right">("right");
  const [audioHints, setAudioHints] = useState(true);
  const [antiDetect, setAntiDetect] = useState({
    randomDelay: true,
    mouseJitter: false,
    typingVariation: true,
    tabBlurHide: true,
    screenShareDetect: true,
  });

  const applyProfile = (p: typeof PROFILES[0]) => {
    setTransparency(p.transparency);
    setAudioHints(!p.audioOff);
    setOverlayPos(p.overlayPos as typeof overlayPos);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-red to-brand-purple flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-textPrimary">PhantomVeil™ — Stealth Configuration</h1>
              <p className="text-xs text-textMuted">Configure overlay invisibility and anti-detection for live interviews</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge variant={stealthOn ? "green" : "amber"}>{stealthOn ? "STEALTH ACTIVE" : "STEALTH OFF"}</StatusBadge>
            <NeonButton onClick={() => setStealthOn(!stealthOn)} className={stealthOn ? "!bg-brand-red/20 !text-brand-red" : ""}>
              {stealthOn ? <><EyeOff className="w-4 h-4 mr-1" /> Deactivate</> : <><Eye className="w-4 h-4 mr-1" /> Activate</>}
            </NeonButton>
          </div>
        </div>

        {/* Quick profiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROFILES.map((p) => (
            <GlassCard key={p.id} className="p-4 cursor-pointer hover:scale-[1.02] transition-all" onClick={() => applyProfile(p)}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-brand-cyan" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-textPrimary">{p.name}</p>
                  <p className="text-[10px] text-textMuted">{p.desc}</p>
                </div>
              </div>
              <NeonButton className="w-full !text-xs !py-1.5">Apply Profile</NeonButton>
            </GlassCard>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Overlay settings */}
          <GlassCard className="p-5 space-y-5">
            <h2 className="text-sm font-semibold text-textPrimary flex items-center gap-2"><Sliders className="w-4 h-4 text-brand-cyan" /> Overlay Settings</h2>

            {/* Transparency */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-textMuted">Transparency</label>
                <span className="text-xs text-textPrimary font-mono">{transparency}%</span>
              </div>
              <input type="range" min={5} max={100} value={transparency} onChange={(e) => setTransparency(Number(e.target.value))} className="w-full h-1.5 rounded-lg appearance-none bg-white/10 accent-brand-cyan" />
              <div className="flex justify-between text-[9px] text-textMuted mt-1"><span>Nearly invisible</span><span>Fully visible</span></div>
            </div>

            {/* Position */}
            <div>
              <label className="text-xs text-textMuted block mb-2">Overlay Position</label>
              <div className="grid grid-cols-2 gap-2">
                {(["right", "left", "bottom-right", "top-right"] as const).map((pos) => (
                  <button key={pos} onClick={() => setOverlayPos(pos)} className={`px-3 py-2 rounded-lg text-xs capitalize transition flex items-center gap-2 ${overlayPos === pos ? "bg-brand-cyan/20 text-brand-cyan ring-1 ring-brand-cyan/30" : "bg-white/5 text-textSecondary hover:bg-white/10"}`}>
                    <Move className="w-3 h-3" /> {pos.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio hints */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
              <div className="flex items-center gap-2">
                {audioHints ? <Volume2 className="w-4 h-4 text-brand-green" /> : <VolumeX className="w-4 h-4 text-textMuted" />}
                <div>
                  <p className="text-sm text-textPrimary">Audio Hints</p>
                  <p className="text-[10px] text-textMuted">Subtle audio cues for AI responses</p>
                </div>
              </div>
              <button onClick={() => setAudioHints(!audioHints)} className={`w-10 h-5 rounded-full transition-all relative ${audioHints ? "bg-brand-cyan" : "bg-white/10"}`}>
                <motion.div className="w-4 h-4 rounded-full bg-white absolute top-0.5" animate={{ left: audioHints ? "22px" : "2px" }} transition={{ type: "spring", stiffness: 400, damping: 25 }} />
              </button>
            </div>
          </GlassCard>

          {/* Anti-detection */}
          <GlassCard className="p-5 space-y-5">
            <h2 className="text-sm font-semibold text-textPrimary flex items-center gap-2"><Shield className="w-4 h-4 text-brand-red" /> Anti-Detection</h2>
            <div className="p-3 rounded-lg bg-brand-amber/5 border border-brand-amber/10 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-brand-amber flex-shrink-0 mt-0.5" />
              <p className="text-xs text-textSecondary">These settings help avoid detection during screen-shared interviews. Use responsibly and ethically.</p>
            </div>

            <div className="space-y-3">
              {[
                { key: "randomDelay", label: "Random Response Delay", desc: "Adds 1-3s random delay to AI responses to appear natural" },
                { key: "mouseJitter", label: "Mouse Jitter Simulation", desc: "Subtly moves cursor to prevent idle detection" },
                { key: "typingVariation", label: "Typing Speed Variation", desc: "Varies typing speed to mimic human patterns" },
                { key: "tabBlurHide", label: "Tab Blur Auto-Hide", desc: "Hides overlay when browser loses focus" },
                { key: "screenShareDetect", label: "Screen Share Detection", desc: "Auto-minimize when screen sharing is detected" },
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                  <div>
                    <p className="text-sm text-textPrimary">{setting.label}</p>
                    <p className="text-[10px] text-textMuted">{setting.desc}</p>
                  </div>
                  <button onClick={() => setAntiDetect((p) => ({ ...p, [setting.key]: !p[setting.key as keyof typeof p] }))} className={`w-10 h-5 rounded-full transition-all relative ${antiDetect[setting.key as keyof typeof antiDetect] ? "bg-brand-cyan" : "bg-white/10"}`}>
                    <motion.div className="w-4 h-4 rounded-full bg-white absolute top-0.5" animate={{ left: antiDetect[setting.key as keyof typeof antiDetect] ? "22px" : "2px" }} transition={{ type: "spring", stiffness: 400, damping: 25 }} />
                  </button>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Keyboard shortcuts */}
        <GlassCard className="p-5">
          <h2 className="text-sm font-semibold text-textPrimary flex items-center gap-2 mb-3"><Keyboard className="w-4 h-4 text-brand-purple" /> Keyboard Shortcuts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02]">
                <kbd className="px-2 py-1 text-[10px] font-mono rounded bg-white/5 text-textPrimary border border-white/[0.08] whitespace-nowrap">{s.keys}</kbd>
                <span className="text-xs text-textSecondary">{s.action}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Save bar */}
        <div className="flex justify-end gap-3">
          <button className="flex items-center gap-1 text-sm text-textMuted hover:text-textPrimary transition"><RotateCcw className="w-4 h-4" /> Reset Defaults</button>
          <NeonButton><Save className="w-4 h-4 mr-1" /> Save Configuration</NeonButton>
        </div>
      </div>
    </DashboardLayout>
  );
}
