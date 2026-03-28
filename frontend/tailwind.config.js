/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Deep-black base (ported from advanced-live-ai-tool) ── */
        canvas: "#050508",
        surface: "#12121F",
        elevated: "#191928",
        borderSubtle: "rgba(255, 255, 255, 0.08)",
        textPrimary: "#F0F0FF",
        textSecondary: "#8B8BA7",
        textMuted: "#4A4A6A",
        accent: "#00D4FF",
        accentHover: "#33DDFF",

        /* ── Design-system color scales ── */
        bg: {
          primary: "#050508",
          secondary: "#0D0D14",
          card: "#12121F",
        },
        brand: {
          cyan: "#00D4FF",
          "cyan-dim": "#0099BB",
          purple: "#7B2FFF",
          orange: "#FF6B35",
          green: "#00FF88",
          amber: "#FFB800",
          red: "#FF4466",
        },
        txt: {
          primary: "#F0F0FF",
          secondary: "#8B8BA7",
          muted: "#4A4A6A",
        },
      },
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        heading: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "Inter", "Segoe UI", "Arial", "sans-serif"],
        code: ["'JetBrains Mono'", "Menlo", "monospace"],
      },
      fontSize: {
        hero: ["clamp(2.5rem, 6vw, 4.5rem)", { lineHeight: "0.98", letterSpacing: "-0.03em", fontWeight: "700" }],
        sectionTitle: ["clamp(2rem, 3.8vw, 2.5rem)", { lineHeight: "1.08", letterSpacing: "-0.02em", fontWeight: "700" }],
        body: ["1.125rem", { lineHeight: "1.6", fontWeight: "400" }],
        muted: ["0.8125rem", { lineHeight: "1.45", letterSpacing: "0.01em", fontWeight: "500" }],
      },
      spacing: {
        "0.5": "0.125rem",
        "1.5": "0.375rem",
        "2.5": "0.625rem",
        "3.5": "0.875rem",
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "20px",
        xl: "32px",
        "2xl": "1.5rem",
        pill: "999px",
      },
      boxShadow: {
        none: "none",
        card: "0 4px 40px rgba(0,0,0,0.4)",
        lift: "0 10px 24px rgba(0, 0, 0, 0.25)",
        glow: "0 0 30px rgba(0,212,255,0.15)",
        neon: "0 0 20px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.1)",
        "neon-lg": "0 0 30px rgba(0,212,255,0.5), 0 0 80px rgba(0,212,255,0.15)",
        "neon-purple": "0 0 20px rgba(123,47,255,0.4), 0 0 60px rgba(123,47,255,0.1)",
      },
      transitionDuration: {
        120: "120ms",
        180: "180ms",
        240: "240ms",
      },
      transitionTimingFunction: {
        calm: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      maxWidth: {
        content: "1100px",
        measure: "46ch",
        narrow: "36ch",
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite alternate",
        float: "float 6s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        shimmer: "shimmer 2s linear infinite",
        ticker: "ticker 30s linear infinite",
      },
      keyframes: {
        "glow-pulse": {
          "0%": { boxShadow: "0 0 20px rgba(0,212,255,0.2)" },
          "100%": { boxShadow: "0 0 40px rgba(0,212,255,0.5), 0 0 80px rgba(0,212,255,0.15)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
