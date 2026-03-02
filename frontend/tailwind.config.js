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
        /* ── Original tokens ── */
        canvas: "#131b2b",
        surface: "#1a2336",
        elevated: "#212c41",
        borderSubtle: "rgba(198, 214, 244, 0.14)",
        textPrimary: "#e8eef9",
        textSecondary: "#d6e0f1",
        textMuted: "#97a6bf",
        accent: "#6d92ff",
        accentHover: "#7da0ff",
        /* ── Design-system additions ── */
        bg: {
          primary: "#0a1020",
          secondary: "#111827",
          card: "#151f32",
        },
        brand: {
          cyan: "#00D4FF",
          "cyan-dim": "#0099BB",
          purple: "#7B61FF",
          orange: "#FF6B35",
          green: "#00FF88",
          amber: "#FFB800",
          red: "#FF4466",
        },
        txt: {
          primary: "#e8eef9",
          secondary: "#97a6bf",
          muted: "#5a6a80",
        },
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
        heading: ["Inter", "sans-serif"],
        body: ["Inter", "Segoe UI", "Arial", "sans-serif"],
        code: ["JetBrains Mono", "Menlo", "monospace"],
      },
      fontSize: {
        hero: ["clamp(2.5rem, 6vw, 4.5rem)", { lineHeight: "0.98", letterSpacing: "-0.03em", fontWeight: "600" }],
        sectionTitle: ["clamp(2rem, 3.8vw, 2.5rem)", { lineHeight: "1.08", letterSpacing: "-0.02em", fontWeight: "600" }],
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
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1.25rem",
        "2xl": "1.5rem",
        pill: "999px",
      },
      boxShadow: {
        none: "none",
        card: "0 1px 0 rgba(198, 214, 244, 0.06)",
        lift: "0 10px 24px rgba(8, 12, 24, 0.16)",
        glow: "0 0 30px rgba(0,212,255,0.15)",
        "neon": "0 0 20px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.1)",
        "neon-lg": "0 0 30px rgba(0,212,255,0.5), 0 0 80px rgba(0,212,255,0.15)",
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
