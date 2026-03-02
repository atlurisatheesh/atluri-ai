"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User, Bell, Shield, Cpu, Palette, Volume2,
  Save, Eye, EyeOff, ChevronRight,
} from "lucide-react";
import { DashboardLayout } from "../../components/dashboard";
import { GlassCard, Tabs, NeonButton, StatusBadge } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { apiRequest } from "../../lib/api";
import { getAccessTokenOrThrow } from "../../lib/auth";

/* ── Toggle Switch ─────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
        checked ? "bg-brand-cyan" : "bg-white/[0.1]"
      }`}
    >
      <motion.div
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow"
        animate={{ x: checked ? 20 : 0 }}
        transition={{ duration: 0.2 }}
      />
    </button>
  );
}

/* ── Settings Row ──────────────────────────────────── */
function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/[0.04] last:border-0">
      <div>
        <p className="text-sm font-medium text-textPrimary">{label}</p>
        {description && <p className="text-xs text-textMuted mt-0.5">{description}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // prefs
  const [autoPlay, setAutoPlay] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(false);
  const [showScore, setShowScore] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [companyMode, setCompanyMode] = useState("general");
  const [difficulty, setDifficulty] = useState("medium");
  const [responseTone, setResponseTone] = useState("professional");
  const [responseLength, setResponseLength] = useState("balanced");
  const [language, setLanguage] = useState("en");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await supabase.auth.getSession();
        const user = result.data.session?.user;
        if (!user) return;
        setEmail(user.email || "");
        setDisplayName(
          user.display_name ||
          user.email?.split("@")[0] ||
          ""
        );
      } catch {}
    };
    load();
  }, []);

  const saveProfile = async () => {
    try {
      setSaving(true);
      setSaveMsg("");
      const authToken = await getAccessTokenOrThrow();
      await apiRequest("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName }),
        retries: 0,
        authToken,
      });
      setSaveMsg("Profile saved!");
    } catch {
      setSaveMsg("Failed to save. Try again.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const tabItems = [
    {
      label: "Profile",
      content: (
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center text-white text-2xl font-bold">
              {displayName.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-lg font-semibold text-textPrimary">{displayName || "User"}</p>
              <p className="text-sm text-textMuted">{email}</p>
            </div>
          </div>
          <div>
            <label className="text-sm text-textSecondary mb-1 block">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-textPrimary placeholder:text-textMuted outline-none focus:border-brand-cyan/50 transition"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-sm text-textSecondary mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-textMuted cursor-not-allowed"
            />
          </div>
          <div className="flex items-center gap-3">
            <NeonButton size="sm" onClick={saveProfile} disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Profile"}
            </NeonButton>
            {saveMsg && <StatusBadge variant={saveMsg.includes("Failed") ? "red" : "green"}>{saveMsg}</StatusBadge>}
          </div>
        </GlassCard>
      ),
    },
    {
      label: "AI Preferences",
      content: (
        <GlassCard className="p-6">
          <SettingRow label="Default Company Mode" description="Sets the interview style for new sessions.">
            <select
              value={companyMode}
              onChange={(e) => setCompanyMode(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-textPrimary cursor-pointer outline-none"
            >
              <option value="general">General</option>
              <option value="amazon">Amazon</option>
              <option value="google">Google</option>
              <option value="meta">Meta</option>
              <option value="microsoft">Microsoft</option>
              <option value="apple">Apple</option>
            </select>
          </SettingRow>
          <SettingRow label="Difficulty Level" description="Controls question complexity.">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-textPrimary cursor-pointer outline-none"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
          </SettingRow>
          <SettingRow label="Auto-play answers" description="Automatically read AI answers aloud.">
            <Toggle checked={autoPlay} onChange={setAutoPlay} />
          </SettingRow>
          <SettingRow label="Show real-time score" description="Display live score during sessions.">
            <Toggle checked={showScore} onChange={setShowScore} />
          </SettingRow>
          <SettingRow label="Response Tone" description="Adjust AI response style.">
            <select value={responseTone} onChange={(e) => setResponseTone(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-textPrimary cursor-pointer outline-none">
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="technical">Technical</option>
              <option value="concise">Concise</option>
            </select>
          </SettingRow>
          <SettingRow label="Response Length" description="How detailed AI answers should be.">
            <select value={responseLength} onChange={(e) => setResponseLength(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-textPrimary cursor-pointer outline-none">
              <option value="brief">Brief (1-2 sentences)</option>
              <option value="balanced">Balanced</option>
              <option value="detailed">Detailed</option>
            </select>
          </SettingRow>
          <SettingRow label="Language" description="Primary language for AI responses.">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-textPrimary cursor-pointer outline-none">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="zh">Chinese (Mandarin)</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="hi">Hindi</option>
            </select>
          </SettingRow>
        </GlassCard>
      ),
    },
    {
      label: "Notifications",
      content: (
        <GlassCard className="p-6">
          <SettingRow label="Email Notifications" description="Receive session summaries and tips.">
            <Toggle checked={emailNotifications} onChange={setEmailNotifications} />
          </SettingRow>
          <SettingRow label="Session Reminders" description="Get reminded to practice daily.">
            <Toggle checked={sessionReminders} onChange={setSessionReminders} />
          </SettingRow>
          <SettingRow label="Sound Effects" description="Play sounds for events during sessions.">
            <Toggle checked={soundEffects} onChange={setSoundEffects} />
          </SettingRow>
        </GlassCard>
      ),
    },
    {
      label: "Security",
      content: (
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-textPrimary">Two-Factor Authentication</p>
              <p className="text-xs text-textMuted">Add an extra layer of security with TOTP authenticator.</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge variant={twoFactorEnabled ? "green" : "amber"}>{twoFactorEnabled ? "Enabled" : "Disabled"}</StatusBadge>
              <Toggle checked={twoFactorEnabled} onChange={setTwoFactorEnabled} />
            </div>
          </div>
          <div className="h-px bg-white/[0.04]" />
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-textPrimary">Change Password</p>
              <p className="text-xs text-textMuted">Update your account password.</p>
            </div>
            <NeonButton size="sm" variant="secondary">
              <Shield className="w-4 h-4 mr-2" /> Change
            </NeonButton>
          </div>
          <div className="h-px bg-white/[0.04]" />
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-textPrimary">Connected Accounts</p>
              <p className="text-xs text-textMuted">Google, GitHub, Microsoft OAuth connections.</p>
            </div>
            <StatusBadge variant="green">Active</StatusBadge>
          </div>
          <div className="h-px bg-white/[0.04]" />
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-textPrimary">GDPR Data Export</p>
              <p className="text-xs text-textMuted">Download all your personal data as a JSON archive.</p>
            </div>
            <NeonButton size="sm" variant="secondary">Export Data</NeonButton>
          </div>
          <div className="h-px bg-white/[0.04]" />
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-brand-red">Delete Account</p>
              <p className="text-xs text-textMuted">Permanently remove your account and all data. This action is irreversible.</p>
            </div>
            <NeonButton size="sm" variant="accent">Delete</NeonButton>
          </div>
        </GlassCard>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-textPrimary mb-1">Settings</h1>
        <p className="text-sm text-textSecondary mb-6">Manage your profile, preferences, and security.</p>
      </motion.div>
      <Tabs tabs={tabItems} />
    </DashboardLayout>
  );
}
