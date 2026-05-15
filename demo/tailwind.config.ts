import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      colors: {
        ink: {
          950: "#070b14",
          900: "#0c1224",
          850: "#111827",
          800: "#172033",
          700: "#1f2937",
          500: "#64748b",
          400: "#94a3b8",
          300: "#cbd5e1",
          200: "#e2e8f0",
          100: "#f1f5f9",
          50: "#f8fafc",
        },
        beam: {
          DEFAULT: "#38bdf8",
          dim: "#0ea5e9",
          glow: "#7dd3fc",
        },
        flare: "#fbbf24",
        iris: "#a78bfa",
      },
      boxShadow: {
        panel: "0 0 0 1px rgb(148 163 184 / 0.08), 0 24px 80px rgb(2 6 23 / 0.45)",
        lift: "0 18px 60px rgb(2 6 23 / 0.55)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, rgb(15 23 42 / 0), rgb(15 23 42 / 0.92)), radial-gradient(circle at 20% 20%, rgb(56 189 248 / 0.14), transparent 40%), radial-gradient(circle at 80% 10%, rgb(167 139 250 / 0.12), transparent 35%), radial-gradient(circle at 50% 80%, rgb(251 191 36 / 0.06), transparent 40%)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
        aurora: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "shimmer-slide": {
          to: { transform: "translate(calc(100cqw - 100%), 0)" },
        },
        "spin-around": {
          "0%": { transform: "translateZ(0) rotate(0)" },
          "15%, 35%": { transform: "translateZ(0) rotate(90deg)" },
          "65%, 85%": { transform: "translateZ(0) rotate(270deg)" },
          "100%": { transform: "translateZ(0) rotate(360deg)" },
        },
        "shiny-text": {
          "0%, 90%, 100%": { backgroundPosition: "calc(-100% - var(--shiny-width)) 0" },
          "30%, 60%": { backgroundPosition: "calc(100% + var(--shiny-width)) 0" },
        },
        shine: {
          "0%": { backgroundPosition: "0% 0%" },
          "50%": { backgroundPosition: "100% 100%" },
          "100%": { backgroundPosition: "0% 0%" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap, 1rem)))" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "drift-1": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(40px,-30px,0) scale(1.05)" },
        },
        "drift-2": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(-60px,40px,0) scale(0.95)" },
        },
        "drift-3": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(30px,50px,0) scale(1.08)" },
        },
      },
      animation: {
        shimmer: "shimmer 8s linear infinite",
        pulseSoft: "pulseSoft 2.6s ease-in-out infinite",
        aurora: "aurora 10s ease-in-out infinite",
        "shimmer-slide": "shimmer-slide var(--speed, 3s) ease-in-out infinite alternate",
        "spin-around": "spin-around calc(var(--speed, 3s) * 2) infinite linear",
        "shiny-text": "shiny-text 8s infinite",
        shine: "shine var(--duration, 14s) infinite linear",
        marquee: "marquee var(--duration, 40s) linear infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        float: "float 6s ease-in-out infinite",
        "drift-1": "drift-1 14s ease-in-out infinite",
        "drift-2": "drift-2 18s ease-in-out infinite",
        "drift-3": "drift-3 22s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
