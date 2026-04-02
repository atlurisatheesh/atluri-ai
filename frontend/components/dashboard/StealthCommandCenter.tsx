"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ShieldCheck, ShieldAlert, ShieldOff,
  Eye, EyeOff, Cpu, Activity, Wifi, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, MonitorOff,
} from "lucide-react";
import { GlassCard, StatusBadge } from "../ui";
import { apiRequest } from "../../lib/api";
import { getAccessTokenOrThrow } from "../../lib/auth";

// ─── Types (mirror backend Pydantic models) ──────────────────
interface ThreatDetection {
  process_name: string;
  category: "proctoring" | "recording" | "remote_access" | "screen_capture";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  detected_at?: string;
}

interface StealthHealthReport {
  overall_score: number;       // 0-100
  threat_level: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  active_threats: ThreatDetection[];
  layers_active: Record<string, boolean>;
  uptime_seconds: number;
  platform: string;
}

// ─── Layer definitions ───────────────────────────────────────
const LAYER_ICONS: Record<string, React.ReactNode> = {
  display_affinity:      <MonitorOff className="w-3.5 h-3.5" />,
  process_masking:       <EyeOff className="w-3.5 h-3.5" />,
  click_through:         <Activity className="w-3.5 h-3.5" />,
  proctoring_detection:  <Eye className="w-3.5 h-3.5" />,
  ghost_typing:          <Cpu className="w-3.5 h-3.5" />,
  screen_enum_block:     <Shield className="w-3.5 h-3.5" />,
  clipboard_protection:  <ShieldCheck className="w-3.5 h-3.5" />,
  anti_blur_detection:   <Wifi className="w-3.5 h-3.5" />,
  auto_evasion:          <ShieldAlert className="w-3.5 h-3.5" />,
  visibility_block:      <EyeOff className="w-3.5 h-3.5" />,
};

const LAYER_LABELS: Record<string, string> = {
  display_affinity:      "Content Protection (WDA_EXCLUDEFROMCAPTURE)",
  process_masking:       "Process Masking",
  click_through:         "Click-Through Mode",
  proctoring_detection:  "Proctoring Detection",
  ghost_typing:          "Ghost Typing",
  screen_enum_block:     "Screen Enum Guard",
  clipboard_protection:  "Clipboard Protection",
  anti_blur_detection:   "Anti-Blur Detection",
  auto_evasion:          "Active Evasion",
  visibility_block:      "Visibility Block",
};

const SEVERITY_COLOR: Record<string, string> = {
  LOW:      "text-brand-green",
  MEDIUM:   "text-brand-amber",
  HIGH:     "text-brand-orange",
  CRITICAL: "text-brand-red",
};

const THREAT_LEVEL_META: Record<string, { label: string; variant: "green" | "cyan" | "amber" | "red"; icon: React.ReactNode }> = {
  NONE:     { label: "CLEAN",    variant: "green", icon: <ShieldCheck className="w-4 h-4" /> },
  LOW:      { label: "LOW",      variant: "cyan",  icon: <Shield className="w-4 h-4" /> },
  MEDIUM:   { label: "MEDIUM",   variant: "amber", icon: <ShieldAlert className="w-4 h-4" /> },
  HIGH:     { label: "HIGH",     variant: "red",   icon: <ShieldAlert className="w-4 h-4" /> },
  CRITICAL: { label: "CRITICAL", variant: "red",   icon: <ShieldOff className="w-4 h-4" /> },
};

// ─── Score Ring ───────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const progress = circ - (score / 100) * circ;
  const color = score >= 90 ? "#00FF88" : score >= 70 ? "#00D4FF" : score >= 50 ? "#FFB800" : "#FF4466";

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <motion.circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: progress }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-2xl font-bold ${score >= 90 ? "text-brand-green" : score >= 70 ? "text-brand-cyan" : score >= 50 ? "text-brand-amber" : "text-brand-red"}`}>{score}</span>
        <span className="text-[10px] text-textMuted -mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

// ─── Layer Toggle Row ─────────────────────────────────────────
function LayerRow({ layerKey, active }: { layerKey: string; active: boolean }) {
  const icon = LAYER_ICONS[layerKey] ?? <Shield className="w-3.5 h-3.5" />;
  const label = LAYER_LABELS[layerKey] ?? layerKey.replace(/_/g, " ");

  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2 text-textMuted">{icon}
        <span className="text-xs text-textSecondary">{label}</span>
      </div>
      <div className={`flex items-center gap-1.5 text-xs font-semibold ${active ? "text-brand-green" : "text-textMuted"}`}>
        {active
          ? <><CheckCircle2 className="w-3.5 h-3.5" />ACTIVE</>
          : <><XCircle className="w-3.5 h-3.5" />OFF</>
        }
      </div>
    </div>
  );
}

// ─── Threat Row ───────────────────────────────────────────────
function ThreatRow({ threat }: { threat: ThreatDetection }) {
  const color = SEVERITY_COLOR[threat.severity] ?? "text-textMuted";
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 py-2 border-b border-white/[0.04] last:border-0"
    >
      <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-textPrimary truncate">{threat.process_name}</p>
        <p className="text-[11px] text-textMuted capitalize">{threat.category.replace(/_/g, " ")}</p>
      </div>
      <span className={`text-[11px] font-bold ${color}`}>{threat.severity}</span>
    </motion.div>
  );
}

// ─── Mock/Desktop fallback when no desktop IPC ───────────────
const DEMO_HEALTH: StealthHealthReport = {
  overall_score: 97,
  threat_level: "NONE",
  active_threats: [],
  layers_active: {
    display_affinity: true,
    process_masking: true,
    click_through: true,
    proctoring_detection: true,
    ghost_typing: true,
    screen_enum_block: true,
    clipboard_protection: true,
    anti_blur_detection: true,
    auto_evasion: false,
    visibility_block: true,
  },
  uptime_seconds: 0,
  platform: "unknown",
};

// ─── Main Component ───────────────────────────────────────────
export interface StealthCommandCenterProps {
  /** If provided, this health report is used directly (from desktop IPC). Otherwise component fetches from API. */
  health?: StealthHealthReport;
  className?: string;
}

export default function StealthCommandCenter({ health: propHealth, className = "" }: StealthCommandCenterProps) {
  const [health, setHealth] = useState<StealthHealthReport>(propHealth ?? DEMO_HEALTH);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchHealth = useCallback(async () => {
    if (propHealth) { setHealth(propHealth); return; }
    try {
      setLoading(true);
      const token = await getAccessTokenOrThrow();
      // POST an empty report to trigger a health check echo; real telemetry comes from desktop IPC
      const result = await apiRequest<{ score: number; threat_level: string }>(
        "/api/stealth/health",
        {
          method: "POST",
          authToken: token,
          body: JSON.stringify({
            overall_score: health.overall_score,
            threat_level: health.threat_level,
            active_threats: health.active_threats,
            layers_active: health.layers_active,
            uptime_seconds: health.uptime_seconds,
            platform: health.platform,
          }),
        }
      );
      setHealth((prev) => ({
        ...prev,
        overall_score: result.score ?? prev.overall_score,
        threat_level: (result.threat_level as StealthHealthReport["threat_level"]) ?? prev.threat_level,
      }));
      setLastRefresh(Date.now());
    } catch {
      // keep current state on error
    } finally {
      setLoading(false);
    }
  }, [propHealth, health]);

  useEffect(() => {
    if (propHealth) setHealth(propHealth);
  }, [propHealth]);

  const threatMeta = THREAT_LEVEL_META[health.threat_level] ?? THREAT_LEVEL_META["NONE"];
  const sortedLayers = Object.entries(health.layers_active).sort(([, a], [, b]) => (b ? 1 : 0) - (a ? 1 : 0));
  const activeLayerCount = sortedLayers.filter(([, v]) => v).length;
  const uptimeMin = Math.floor(health.uptime_seconds / 60);

  return (
    <GlassCard className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-green/20 to-brand-cyan/10 border border-brand-green/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-brand-green" />
          </div>
          <div>
            <h2 className="text-base font-bold text-textPrimary">Stealth Command Center</h2>
            <p className="text-xs text-textMuted">PhantomVeil protection telemetry</p>
          </div>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer text-textMuted hover:text-textPrimary disabled:opacity-50"
          title="Refresh stealth telemetry"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Score + Threat Level */}
      <div className="flex items-center gap-6 mb-5 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <ScoreRing score={health.overall_score} />
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-xs text-textMuted uppercase tracking-wider mb-1">Stealth Score</p>
            <StatusBadge variant={threatMeta.variant} pulse={health.threat_level !== "NONE"}>
              <span className="flex items-center gap-1.5">
                {threatMeta.icon}
                {threatMeta.label}
              </span>
            </StatusBadge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] text-textMuted">Layers Active</p>
              <p className="text-sm font-bold text-textPrimary">{activeLayerCount}/{sortedLayers.length}</p>
            </div>
            <div>
              <p className="text-[11px] text-textMuted">Uptime</p>
              <p className="text-sm font-bold text-textPrimary">{uptimeMin > 0 ? `${uptimeMin}m` : "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Threats */}
      <AnimatePresence>
        {health.active_threats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <p className="text-xs font-semibold text-brand-red uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Active Threats ({health.active_threats.length})
            </p>
            <div className="rounded-xl bg-brand-red/5 border border-brand-red/20 px-4 py-1">
              {health.active_threats.map((t, i) => <ThreatRow key={i} threat={t} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Layers */}
      <div>
        <p className="text-xs font-semibold text-textSecondary uppercase tracking-wider mb-2">Protection Layers</p>
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-1 max-h-[220px] overflow-y-auto">
          {sortedLayers.map(([key, active]) => (
            <LayerRow key={key} layerKey={key} active={active} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <p className="text-[10px] text-textMuted mt-3 text-center">
        Last sync: {new Date(lastRefresh).toLocaleTimeString()}
      </p>
    </GlassCard>
  );
}
