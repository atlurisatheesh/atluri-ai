"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, X } from "lucide-react";

const DEMOS = [
  { id: "copilot", title: "NeuralWhisper™ Live Copilot", desc: "Watch AI generate real-time interview answers", thumb: "/demo-copilot.jpg", duration: "2:34" },
  { id: "mock", title: "SimuDrill™ Mock Interview", desc: "Full AI-powered mock interview with scoring", thumb: "/demo-mock.jpg", duration: "3:12" },
  { id: "resume", title: "ProfileCraft™ Resume Lab", desc: "AI rewrites bullets and boosts ATS score", thumb: "/demo-resume.jpg", duration: "1:48" },
  { id: "coding", title: "CodeForge™ Coding Lab", desc: "Solve problems with AI pair-programming", thumb: "/demo-coding.jpg", duration: "2:55" },
];

export default function DemoVideos() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-cyan/[0.02] to-transparent" />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <span className="text-xs font-mono text-brand-cyan tracking-widest uppercase">See It In Action</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-3">Product Demos</h2>
          <p className="text-textMuted mt-3 max-w-lg mx-auto">Watch real walkthroughs of every major feature in under 3 minutes each.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {DEMOS.map((d, i) => (
            <motion.div key={d.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="group cursor-pointer" onClick={() => setActiveVideo(d.id)}>
              <div className="relative rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] aspect-video flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/10 to-brand-purple/10" />
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-hover:scale-110 transition"><Play className="w-5 h-5 text-white ml-0.5" /></div>
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-white font-mono">{d.duration}</span>
              </div>
              <h3 className="text-sm font-semibold text-white mt-3">{d.title}</h3>
              <p className="text-xs text-textMuted mt-1">{d.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Video modal placeholder */}
      {activeVideo && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setActiveVideo(null)}>
          <div className="relative w-full max-w-3xl aspect-video rounded-xl bg-black border border-white/10 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-textMuted text-sm">Video player placeholder — {activeVideo}</p>
            <button onClick={() => setActiveVideo(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"><X className="w-4 h-4 text-white" /></button>
          </div>
        </motion.div>
      )}
    </section>
  );
}
