import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
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
      },
      animation: {
        blinkRed: "blinkRed 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
