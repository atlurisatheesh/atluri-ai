"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface StatusBadgeProps {
  children: ReactNode;
  variant?: "cyan" | "green" | "amber" | "red" | "purple";
  pulse?: boolean;
  className?: string;
}

const colors: Record<string, string> = {
  cyan: "bg-brand-cyan/15 text-brand-cyan border-brand-cyan/30",
  green: "bg-brand-green/15 text-brand-green border-brand-green/30",
  amber: "bg-brand-amber/15 text-brand-amber border-brand-amber/30",
  red: "bg-brand-red/15 text-brand-red border-brand-red/30",
  purple: "bg-brand-purple/15 text-brand-purple border-brand-purple/30",
};

export default function StatusBadge({ children, variant = "cyan", pulse = false, className = "" }: StatusBadgeProps) {
  return (
    <motion.span
      className={`
        inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
        border ${colors[variant]} ${className}
      `}
      animate={pulse ? { boxShadow: ["0 0 0 0 currentColor", "0 0 0 8px transparent"] } : undefined}
      transition={pulse ? { duration: 2, repeat: Infinity } : undefined}
    >
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {children}
    </motion.span>
  );
}
