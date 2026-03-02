"use client";

import { motion } from "framer-motion";
import { Video, MonitorSmartphone, Users, PhoneCall, Tv2, Globe, Headphones, Radio, Laptop, Smartphone, Wifi, MonitorPlay } from "lucide-react";
import GlassCard from "../ui/GlassCard";

const platforms = [
  { icon: Video, name: "Zoom", color: "text-blue-400" },
  { icon: Users, name: "Google Meet", color: "text-green-400" },
  { icon: MonitorSmartphone, name: "MS Teams", color: "text-purple-400" },
  { icon: PhoneCall, name: "Webex", color: "text-cyan-400" },
  { icon: Tv2, name: "BlueJeans", color: "text-blue-300" },
  { icon: Globe, name: "Browser-Based", color: "text-brand-cyan" },
  { icon: Headphones, name: "Discord", color: "text-indigo-400" },
  { icon: Radio, name: "Slack Huddles", color: "text-purple-300" },
  { icon: Laptop, name: "Windows", color: "text-brand-cyan" },
  { icon: Smartphone, name: "macOS", color: "text-white" },
  { icon: Wifi, name: "VoIP", color: "text-brand-green" },
  { icon: MonitorPlay, name: "Any Platform", color: "text-brand-amber" },
];

export default function Integrations() {
  return (
    <section className="section-padding bg-transparent">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <span className="text-brand-cyan text-sm font-semibold tracking-wider uppercase">Integrations</span>
          <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mt-2 mb-4">Works Everywhere You Interview</h2>
          <p className="text-textSecondary max-w-xl mx-auto">OS-level audio capture means we support every platform — no plugins, no extensions.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {platforms.map((p, i) => (
            <motion.div key={p.name} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
              <GlassCard hover className="p-4 flex flex-col items-center gap-2 text-center">
                <p.icon className={`w-7 h-7 ${p.color}`} />
                <span className="text-xs text-textMuted">{p.name}</span>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
