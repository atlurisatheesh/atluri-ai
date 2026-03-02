"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import GlassCard from "../ui/GlassCard";

const testimonials = [
  {
    name: "Sarah K.",
    role: "SWE → Google L5",
    avatar: "SK",
    stars: 5,
    text: "I went from bombing system-design rounds to getting an L5 offer at Google. The real-time coaching made all the difference — I could actually think clearly during the interview.",
  },
  {
    name: "Marcus T.",
    role: "PM → Meta",
    avatar: "MT",
    stars: 5,
    text: "The stealth mode is insane. Ran it during my Meta final round on Zoom and my interviewer had zero clue. Got the PM offer the same week.",
  },
  {
    name: "Priya V.",
    role: "DS → Amazon",
    avatar: "PV",
    stars: 5,
    text: "I practiced 15 mock sessions in Amazon mode. The AI perfectly mimicked the Leadership Principles pressure. My actual loop felt like a repeat — landed L6 DS.",
  },
  {
    name: "James L.",
    role: "Bootcamp Grad → Stripe",
    avatar: "JL",
    stars: 5,
    text: "Coming from a bootcamp with no CS degree, I thought FAANG was a pipe dream. 3 weeks with AtluriIn and I closed Stripe. Unreal product.",
  },
  {
    name: "Aisha M.",
    role: "Career Switch → Microsoft",
    avatar: "AM",
    stars: 4,
    text: "Switched from marketing to SWE. The company-specific modes showed me exactly what Microsoft looks for. Passed all 5 rounds on my first attempt.",
  },
];

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const total = testimonials.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);

  // auto-advance
  useEffect(() => {
    const id = setInterval(next, 6000);
    return () => clearInterval(id);
  }, [next]);

  const t = testimonials[current];

  return (
    <section className="section-padding bg-transparent">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
          <span className="text-brand-orange text-sm font-semibold tracking-wider uppercase">Testimonials</span>
          <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mt-2 mb-4">Loved by Job Seekers Worldwide</h2>
        </motion.div>

        {/* carousel */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            >
              <GlassCard className="p-8 md:p-10 text-center">
                {/* avatar */}
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                  {t.avatar}
                </div>
                {/* stars */}
                <div className="flex justify-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < t.stars ? "text-brand-amber fill-brand-amber" : "text-white/20"}`} />
                  ))}
                </div>
                {/* quote */}
                <p className="text-textSecondary text-lg leading-relaxed mb-6 max-w-2xl mx-auto italic">"{t.text}"</p>
                <p className="text-textPrimary font-semibold">{t.name}</p>
                <p className="text-brand-cyan text-sm">{t.role}</p>
              </GlassCard>
            </motion.div>
          </AnimatePresence>

          {/* nav arrows */}
          <button onClick={prev} className="absolute top-1/2 -translate-y-1/2 -left-4 md:-left-10 w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-textMuted hover:text-textPrimary transition cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={next} className="absolute top-1/2 -translate-y-1/2 -right-4 md:-right-10 w-9 h-9 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-textMuted hover:text-textPrimary transition cursor-pointer">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* dots */}
        <div className="flex justify-center gap-2 mt-6">
          {testimonials.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${i === current ? "bg-brand-cyan w-6" : "bg-white/20"}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
