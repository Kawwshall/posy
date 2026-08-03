import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm boutique palette. Cream paper, ink, one confident claret,
        // a soft stem-green reserved for "sent/cleared".
        paper: "#F4EEE1",
        card: "#FCFAF4",
        ink: "#1C1712",
        muted: "#726A5C",
        line: "#E2D9C6",
        claret: {
          DEFAULT: "#8E2C3F",
          700: "#752333",
        },
        // posy scale kept as aliases so existing usage recolors cleanly
        posy: {
          50: "#F3E4DA",
          100: "#EAD3C6",
          200: "#E0BCAE",
          300: "#CE8C86",
          400: "#B5545A",
          500: "#9E2E42",
          600: "#8E2C3F",
          700: "#752333",
        },
        stem: {
          DEFAULT: "#3C6E56",
          bg: "#E7EFE7",
        },
        // authentic iMessage, intentional, not generic
        imsg: {
          blue: "#0a84ff",
          gray: "#e9e9eb",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "-apple-system", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(28,23,18,0.04), 0 8px 24px -16px rgba(28,23,18,0.18)",
        phone: "0 30px 60px -24px rgba(28,23,18,0.4)",
      },
      keyframes: {
        "bubble-in": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 100%": { opacity: "0.3" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "bubble-in": "bubble-in 0.28s cubic-bezier(0.22,1,0.36,1)",
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1)",
        blink: "blink 1.2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
