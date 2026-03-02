"use client";

import { motion } from "framer-motion";
import { Github, Linkedin, Twitter, Globe, Heart, Code2 } from "lucide-react";

export default function CreatorSection() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-purple/[0.02] to-transparent" />
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <span className="text-xs font-mono text-brand-purple tracking-widest uppercase">Behind the Product</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-3">Built by Engineers, for Engineers</h2>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center">
                <Code2 className="w-12 h-12 text-white" />
              </div>
            </div>

            {/* Bio */}
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-white">Satheesh Atluri</h3>
              <p className="text-sm text-brand-cyan mt-1">Founder & Lead Engineer</p>
              <p className="text-sm text-textSecondary mt-4 leading-relaxed">
                Full-stack engineer and AI enthusiast who experienced the pain of technical interviews firsthand.
                After hundreds of hours of interview prep and seeing how broken the process is, I built the tool I wished existed —
                one that combines real-time AI assistance, mock interviews, and resume optimization into a single platform.
              </p>

              {/* Social links */}
              <div className="flex items-center gap-3 mt-6 justify-center md:justify-start">
                {[
                  { icon: <Github className="w-4 h-4" />, href: "https://github.com/atlurisatheesh", label: "GitHub" },
                  { icon: <Linkedin className="w-4 h-4" />, href: "#", label: "LinkedIn" },
                  { icon: <Twitter className="w-4 h-4" />, href: "#", label: "Twitter" },
                  { icon: <Globe className="w-4 h-4" />, href: "#", label: "Website" },
                ].map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-textMuted hover:text-brand-cyan hover:bg-white/10 transition" aria-label={s.label}>
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Mission statement */}
          <div className="mt-8 pt-8 border-t border-white/[0.06] text-center">
            <p className="text-sm text-textSecondary leading-relaxed flex items-center justify-center gap-2">
              <Heart className="w-4 h-4 text-brand-red flex-shrink-0" />
              <span>Built with passion in 2025. Our mission: make world-class interview preparation accessible to everyone.</span>
            </p>
          </div>
        </motion.div>

        {/* Tech stack badges */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="mt-8 flex flex-wrap gap-2 justify-center">
          {["Next.js", "React 19", "Tailwind CSS", "FastAPI", "PostgreSQL", "Redis", "GPT-4o", "Deepgram", "Docker", "WebSocket"].map((tech) => (
            <span key={tech} className="px-3 py-1.5 rounded-full bg-white/5 text-xs text-textMuted border border-white/[0.06]">{tech}</span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
