import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        // Triage levels — used consistently across intake, dashboard, rujukan
        merah: { DEFAULT: "#dc2626", soft: "#fef2f2", border: "#fecaca" },
        kuning: { DEFAULT: "#d97706", soft: "#fffbeb", border: "#fde68a" },
        hijau: { DEFAULT: "#16a34a", soft: "#f0fdf4", border: "#bbf7d0" },
        pmi: { DEFAULT: "#c8102e", dark: "#9b0c23" }, // PMI red
      },
      keyframes: {
        blinkRed: {
          "0%, 100%": { backgroundColor: "#fef2f2" },
          "50%": { backgroundColor: "#fecaca" },
        },
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blinkRed: "blinkRed 1s ease-in-out infinite",
        floaty: "floaty 6s ease-in-out infinite",
        fadeUp: "fadeUp 0.6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
