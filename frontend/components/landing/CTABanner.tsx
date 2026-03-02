"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import NeonButton from "../ui/NeonButton";

export default function CTABanner() {
  return (
    <section className="section-padding">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="relative rounded-2xl overflow-hidden">
            {/* gradient bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/20 via-brand-purple/15 to-brand-green/10" />
            <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-sm border border-white/[0.08] rounded-2xl" />
            <div className="relative z-10 py-16 px-8 text-center">
              <Sparkles className="w-8 h-8 text-brand-cyan mx-auto mb-4" />
              <h2 className="text-3xl md:text-4xl font-bold text-textPrimary mb-4">Ready to Ace Your Next Interview?</h2>
              <p className="text-textSecondary max-w-xl mx-auto mb-8">Join thousands of candidates who turned interview anxiety into offer letters. Start your free trial — no credit card required.</p>
              <Link href="/signup?next=/app">
                <NeonButton size="lg">
                  Start Free Trial <ArrowRight className="w-4 h-4 ml-2 inline" />
                </NeonButton>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
