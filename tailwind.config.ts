import type { Config } from "tailwindcss";

/**
 * Supanova design tokens.
 * - Low-saturation, high-end dark theme with a single restrained accent.
 * - Custom `ease-out-back` for spring-like hover physics.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Pretendard", "Pretendard Variable", "system-ui", "sans-serif"],
      },
      colors: {
        // Warm-tuned neutral surface ramp (dark base).
        ink: {
          900: "#0b0c10",
          800: "#121319",
          700: "#1a1c24",
          600: "#23262f",
        },
        // Single muted accent (desaturated amber/sand) + cool secondary.
        accent: {
          DEFAULT: "#d8b487",
          soft: "#e7cfae",
          cool: "#8fb3c9",
        },
      },
      boxShadow: {
        // Double-bezel: inner top-light + outer drop.
        bezel:
          "inset 0 1px 0 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.04), 0 10px 30px -12px rgba(0,0,0,0.6)",
        "bezel-lg":
          "inset 0 1px 0 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(255,255,255,0.05), 0 24px 60px -18px rgba(0,0,0,0.7)",
      },
      transitionTimingFunction: {
        "out-back": "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      scale: {
        "102": "1.02",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "fade-in": "fade-in 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
