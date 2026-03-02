"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Copy, ArrowRight, Lightbulb, Send, Mic, MicOff,
  CheckCircle, XCircle, Link2, Shield, MessageSquare, Zap,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import { GlassCard, NeonButton, StatusBadge } from "@/components/ui";

const QUICK_HINTS = [
  { label: "STAR Framework", text: "Structure: Situation → Task → Action → Result" },
  { label: "Time Complexity", text: "Mention Big-O: O(1) < O(log n) < O(n) < O(n log n) < O(n²)" },
  { label: "System Design", text: "Cover: Requirements → Estimation → API → Schema → Architecture → Deep Dive" },
  { label: "Behavioral Tip", text: "Focus on YOUR contributions, use 'I' not 'we', quantify impact" },
];

interface ChatMsg {
  from: "helper" | "system";
  text: string;
  ts: string;
}

export default function DuoPage() {
  const [mode, setMode] = useState<"select" | "candidate" | "helper">("select");
  const [sessionCode, setSessionCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([
    { from: "system", text: "Session created. Waiting for helper to join...", ts: "00:00" },
  ]);

  const createSession = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSessionCode(code);
    setMode("candidate");
  };

  const joinSession = () => {
    if (joinCode.length === 6) {
      setSessionCode(joinCode);
      setMode("helper");
      setConnected(true);
      setMessages((p) => [...p, { from: "system", text: "Helper connected successfully!", ts: "00:05" }]);
    }
  };

  const sendHint = (text: string) => {
    setMessages((p) => [...p, { from: "helper", text, ts: new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }) }]);
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    sendHint(chatInput);
    setChatInput("");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-amber to-brand-orange flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-textPrimary">MentorLink™ — Duo Interview Mode</h1>
            <p className="text-xs text-textMuted">Collaborate with a friend or mentor during live interviews</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Mode selection */}
          {mode === "select" && (
            <motion.div key="select" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
              {/* Candidate card */}
              <GlassCard className="p-6 text-center cursor-pointer hover:scale-[1.02] transition-all" onClick={createSession}>
                <div className="w-14 h-14 mx-auto rounded-xl bg-brand-cyan/10 flex items-center justify-center mb-4">
                  <Mic className="w-7 h-7 text-brand-cyan" />
                </div>
                <h3 className="text-lg font-bold text-textPrimary mb-1">I&rsquo;m the Candidate</h3>
                <p className="text-sm text-textMuted mb-4">Create a session and share the code with your helper</p>
                <NeonButton className="w-full">Create Session</NeonButton>
              </GlassCard>

              {/* Helper card */}
              <GlassCard className="p-6 text-center">
                <div className="w-14 h-14 mx-auto rounded-xl bg-brand-purple/10 flex items-center justify-center mb-4">
                  <Lightbulb className="w-7 h-7 text-brand-purple" />
                </div>
                <h3 className="text-lg font-bold text-textPrimary mb-1">I&rsquo;m the Helper</h3>
                <p className="text-sm text-textMuted mb-4">Enter the session code to start assisting</p>
                <div className="flex gap-2">
                  <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/[0.06] text-sm text-textPrimary placeholder-textMuted outline-none focus:border-brand-purple/30 text-center tracking-[0.3em] font-mono" />
                  <NeonButton onClick={joinSession} disabled={joinCode.length !== 6}>Join</NeonButton>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Active session */}
          {(mode === "candidate" || mode === "helper") && (
            <motion.div key="session" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              {/* Session bar */}
              <GlassCard className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge variant={connected ? "green" : "amber"}>{connected ? "Connected" : "Waiting"}</StatusBadge>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-textMuted">Session:</span>
                    <span className="font-mono text-textPrimary tracking-[0.2em] bg-white/5 px-3 py-1 rounded">{sessionCode}</span>
                    <button onClick={() => navigator.clipboard.writeText(sessionCode)} className="text-textMuted hover:text-brand-cyan transition"><Copy className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-textMuted capitalize flex items-center gap-1.5">
                    {mode === "candidate" ? <Mic className="w-3.5 h-3.5" /> : <Lightbulb className="w-3.5 h-3.5" />}
                    {mode}
                  </span>
                  <button onClick={() => { setMode("select"); setConnected(false); setSessionCode(""); setMessages([{ from: "system", text: "Session ended.", ts: "00:00" }]); }} className="text-xs text-brand-red hover:text-brand-red/80 transition">
                    End Session
                  </button>
                </div>
              </GlassCard>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Live transcript (candidate view) / Audio feed */}
                <GlassCard className="lg:col-span-2 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-textPrimary flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                      {mode === "candidate" ? "Interview Audio" : "Live Transcript"}
                    </h2>
                    {mode === "candidate" && (
                      <button onClick={() => setMicOn(!micOn)} className={`p-2 rounded-lg transition ${micOn ? "bg-brand-cyan/20 text-brand-cyan" : "bg-white/5 text-textMuted"}`}>
                        {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  {mode === "candidate" && (
                    <div className="space-y-3">
                      <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] min-h-[300px]">
                        <p className="text-xs text-textMuted mb-3">Interviewer:</p>
                        <p className="text-sm text-textSecondary">&ldquo;Tell me about a challenging project you&rsquo;ve worked on recently and how you handled obstacles.&rdquo;</p>
                        <div className="mt-4 pt-4 border-t border-white/[0.06]">
                          <p className="text-xs text-textMuted mb-3">Your response (live):</p>
                          <div className="flex items-center gap-2">
                            <motion.div className="flex gap-0.5" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                              {[1, 2, 3].map((i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />)}
                            </motion.div>
                            <span className="text-sm text-textMuted italic">Listening...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {mode === "helper" && (
                    <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06] min-h-[300px] space-y-3">
                      <div>
                        <p className="text-xs text-textMuted mb-1">Interviewer:</p>
                        <p className="text-sm text-textSecondary">&ldquo;Tell me about a challenging project you&rsquo;ve worked on recently...&rdquo;</p>
                      </div>
                      <div>
                        <p className="text-xs text-textMuted mb-1">Candidate:</p>
                        <p className="text-sm text-textSecondary">&ldquo;Sure, recently I worked on a real-time data pipeline that...&rdquo;</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-textMuted mt-2">
                        <motion.div className="flex gap-0.5" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                          {[1, 2, 3].map((i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-green" />)}
                        </motion.div>
                        <span>Transcribing live...</span>
                      </div>
                    </div>
                  )}
                </GlassCard>

                {/* Right panel: Hints + Chat */}
                <GlassCard className="p-5">
                  <h2 className="text-sm font-semibold text-textPrimary mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-brand-amber" />
                    {mode === "helper" ? "Send Hints" : "Incoming Hints"}
                  </h2>

                  {/* Quick hints (helper mode) */}
                  {mode === "helper" && (
                    <div className="space-y-2 mb-4">
                      {QUICK_HINTS.map((h) => (
                        <button key={h.label} onClick={() => sendHint(h.text)} className="w-full text-left p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition group">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-textPrimary">{h.label}</span>
                            <Zap className="w-3 h-3 text-textMuted group-hover:text-brand-amber transition" />
                          </div>
                          <p className="text-[10px] text-textMuted mt-0.5 line-clamp-1">{h.text}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Messages */}
                  <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar mb-3">
                    {messages.map((m, i) => (
                      <div key={i} className={`text-xs p-2 rounded-lg ${m.from === "system" ? "bg-white/[0.02] text-textMuted text-center italic" : "bg-brand-amber/5 border border-brand-amber/10"}`}>
                        {m.from === "helper" && <span className="text-brand-amber font-medium">💡 Hint: </span>}
                        <span className="text-textSecondary">{m.text}</span>
                        <span className="block text-[9px] text-textMuted mt-0.5">{m.ts}</span>
                      </div>
                    ))}
                  </div>

                  {/* Chat input */}
                  <div className="flex gap-2">
                    <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder={mode === "helper" ? "Type a hint..." : "Type a message..."} className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/[0.06] text-sm text-textPrimary placeholder-textMuted outline-none focus:border-brand-amber/30" />
                    <button onClick={sendChat} className="p-2 rounded-lg bg-brand-amber/20 text-brand-amber hover:bg-brand-amber/30 transition"><Send className="w-4 h-4" /></button>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
