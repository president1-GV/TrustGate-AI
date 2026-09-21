/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          card: "rgb(var(--color-ink-card) / <alpha-value>)",
          raised: "rgb(var(--color-ink-raised) / <alpha-value>)",
          border: "rgb(var(--color-ink-border) / <alpha-value>)",
        },
        signal: {
          blue: "#0EA5FF",
          cyan: "#22D3EE",
          purple: "#C084FC",
        },
        risk: {
          low: "#34D399",
          medium: "#FBBF24",
          high: "#F87171",
        },
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        panel: "0 18px 50px rgba(2, 6, 23, 0.45)",
        glow: "0 0 24px rgba(14, 165, 255, 0.28)",
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.55 },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
