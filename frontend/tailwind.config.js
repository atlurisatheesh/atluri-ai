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
        canvas: "#131b2b",
        surface: "#1a2336",
        elevated: "#212c41",
        borderSubtle: "rgba(198, 214, 244, 0.14)",
        textPrimary: "#e8eef9",
        textSecondary: "#d6e0f1",
        textMuted: "#97a6bf",
        accent: "#6d92ff",
        accentHover: "#7da0ff",
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
        pill: "999px",
      },
      boxShadow: {
        none: "none",
        card: "0 1px 0 rgba(198, 214, 244, 0.06)",
        lift: "0 10px 24px rgba(8, 12, 24, 0.16)",
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
    },
  },
  plugins: [],
};
